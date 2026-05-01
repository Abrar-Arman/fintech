"""
HTTP endpoints for the PricePilot Ai REST API.

Layout:
    - RegisterView / LoginView / MeView      → JWT auth
    - ServiceViewSet                         → /api/services/  (CRUD + suggest + fuzzy)
    - PricingVariantViewSet                  → /api/variants/ (CRUD + voting)
    - ProjectViewSet                         → /api/projects/ (CRUD + add/remove
                                               services + cost calculation)
    - pricing_models_view                    → /api/pricing-models/ (schema lookup)

Permissions follow DRF defaults set in settings.REST_FRAMEWORK:
read endpoints are open, writes require a valid JWT.
"""
from decimal import Decimal

from django.contrib.auth import authenticate, get_user_model
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils.text import slugify

from rest_framework import status, viewsets, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .calculator import calculate_project
from .fuzzy import fuzzy_match
from .llm import suggest_services
from .models import PricingVariant, Project, ProjectService, Service, Vote
from .pricing_models import PRICING_MODELS
from .serializers import (
    PricingVariantSerializer,
    ProjectSerializer,
    ProjectServiceSerializer,
    RegisterSerializer,
    ServiceDetailSerializer,
    ServiceSerializer,
    TokenPairSerializer,
    UserSerializer,
    VoteSerializer,
)


User = get_user_model()


# ---- Auth ------------------------------------------------------------------

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(TokenPairSerializer.for_user(user), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        user = authenticate(username=username, password=password)
        if not user:
            return Response(
                {"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED
            )
        return Response(TokenPairSerializer.for_user(user))


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


# ---- Pricing model definitions --------------------------------------------

@api_view(["GET"])
@permission_classes([AllowAny])
def pricing_models_view(_request):
    """Return the static schema + explanations for each pricing model."""
    return Response({"models": PRICING_MODELS})


# ---- Services --------------------------------------------------------------

class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.all()
    def get_serializer_class(self):
        if self.action == "retrieve":
            return ServiceDetailSerializer
        return ServiceSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search)
        only = self.request.query_params.get("status")
        if only:
            qs = qs.filter(status=only)
        return qs

    def perform_create(self, serializer):
        """Community submissions land in the 'pending' state and start
        out unofficial. The slug is auto-derived from the name."""
        name = serializer.validated_data["name"]
        slug = slugify(name)[:140] or f"service-{Service.objects.count() + 1}"
        serializer.save(
            slug=slug,
            status="pending",
            is_official=False,
            submitted_by=self.request.user if self.request.user.is_authenticated else None,
        )

    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def fuzzy(self, request):
        """GET /api/services/fuzzy/?q=ginini  -> {matched, suggestions}"""
        return Response(fuzzy_match(request.query_params.get("q", "")))

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def suggest(self, request):
        """LLM-powered service suggestion for a given project context.

        Body: { name, description, tech_stack: [...] }"""
        return Response(suggest_services(
            name=request.data.get("name", ""),
            description=request.data.get("description", ""),
            tech_stack=request.data.get("tech_stack", []),
        ))


# ---- Pricing variants ------------------------------------------------------

class PricingVariantViewSet(viewsets.ModelViewSet):
    queryset = PricingVariant.objects.all()
    serializer_class = PricingVariantSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        service_id = self.request.query_params.get("service")
        if service_id:
            qs = qs.filter(service_id=service_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user if self.request.user.is_authenticated else None
        )

    @action(detail=True, methods=["post"])
    def vote(self, request, pk=None):
        """Toggle / flip the requesting user's vote on this variant.

        Body: { value: 1 | -1 | 0 } (0 removes the vote)."""
        variant = self.get_object()
        value = request.data.get("value")
        try:
            value = int(value)
        except (TypeError, ValueError):
            return Response({"detail": "value must be 1, -1, or 0."},
                            status=status.HTTP_400_BAD_REQUEST)

        if value == 0:
            Vote.objects.filter(variant=variant, user=request.user).delete()
        elif value in (1, -1):
            Vote.objects.update_or_create(
                variant=variant,
                user=request.user,
                defaults={"value": value},
            )
        else:
            return Response({"detail": "value must be 1, -1, or 0."},
                            status=status.HTTP_400_BAD_REQUEST)

        return Response(PricingVariantSerializer(variant, context={"request": request}).data)


# ---- Projects --------------------------------------------------------------

class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    # permission_classes = [IsAuthenticated]
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Project.objects.all().prefetch_related(
            "project_services__service",
            "project_services__variant",
        )
    def perform_create(self, serializer):
            serializer.save()



    @action(detail=True, methods=["post"])
    def add_service(self, request, pk=None):
        """Attach a Service (with optional variant) to this project.

        Body: { service_id, variant_id?, custom_model_type?, custom_inputs? }
        """
        project = self.get_object()
        serializer = ProjectServiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            project_service, _created = ProjectService.objects.update_or_create(
                project=project,
                service=serializer.validated_data["service"],
                defaults={
                    "variant": serializer.validated_data.get("variant"),
                    "custom_model_type":
                        serializer.validated_data.get("custom_model_type", ""),
                    "custom_inputs":
                        serializer.validated_data.get("custom_inputs", {}),
                },
            )
        return Response(
            ProjectServiceSerializer(project_service).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["delete"], url_path="services/(?P<service_id>[^/.]+)")
    def remove_service(self, request, pk=None, service_id=None):
        project = self.get_object()
        ProjectService.objects.filter(project=project, service_id=service_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def calculate(self, request, pk=None):
        """Run the cost engine for this project against a usage payload.

        Body: { usage: { active_users, tokens_per_request, requests_per_user,
                         storage_gb, bandwidth_gb, compute_hours } }
        """
        project = self.get_object()
        usage = request.data.get("usage") or project.usage_inputs or {}
        # Persist the latest usage so reloads stay consistent.
        project.usage_inputs = usage
        project.save(update_fields=["usage_inputs", "updated_at"])
        return Response(calculate_project(project, usage))
