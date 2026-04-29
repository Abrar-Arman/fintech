from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    PRICING_MODEL_CHOICES,
    PricingVariant,
    Project,
    ProjectService,
    Service,
    Vote,
)
from .pricing_models import PRICING_MODELS_BY_TYPE


User = get_user_model()


# ---- Auth ------------------------------------------------------------------

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("id", "username", "email", "password")

    def create(self, validated_data):
        user = User(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
        )
        user.set_password(validated_data["password"])
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email")


class TokenPairSerializer(serializers.Serializer):
    """Convenience output that bundles user + JWT tokens."""

    user = UserSerializer(read_only=True)
    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)

    @classmethod
    def for_user(cls, user):
        refresh = RefreshToken.for_user(user)
        return {
            "user": UserSerializer(user).data,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }


# ---- Service & Variant -----------------------------------------------------

class PricingVariantSerializer(serializers.ModelSerializer):
    upvotes = serializers.IntegerField(read_only=True)
    downvotes = serializers.IntegerField(read_only=True)
    net_score = serializers.IntegerField(read_only=True)
    is_outdated = serializers.BooleanField(read_only=True)
    user_vote = serializers.SerializerMethodField()
    created_by_username = serializers.SerializerMethodField()

    class Meta:
        model = PricingVariant
        fields = (
            "id", "service", "label", "model_type", "usage_inputs",
            "is_official", "notes", "created_by", "created_by_username",
            "created_at", "updated_at",
            "upvotes", "downvotes", "net_score", "is_outdated", "user_vote",
        )
        read_only_fields = ("created_by", "is_official")

    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else "community"

    def get_user_vote(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return 0
        vote = obj.votes.filter(user=request.user).first()
        return vote.value if vote else 0

    def validate(self, attrs):
        model_type = attrs.get("model_type") or getattr(self.instance, "model_type", None)
        if model_type not in PRICING_MODELS_BY_TYPE:
            raise serializers.ValidationError({"model_type": "Unknown pricing model type."})
        spec = PRICING_MODELS_BY_TYPE[model_type]
        inputs = attrs.get("usage_inputs", {})
        for field in spec["fields"]:
            if field.get("required") and inputs.get(field["name"]) in (None, ""):
                raise serializers.ValidationError({
                    "usage_inputs": f"Missing required field '{field['name']}' for model '{model_type}'."
                })
        return attrs


class ServiceSerializer(serializers.ModelSerializer):
    variant_count = serializers.SerializerMethodField()
    project_count = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = (
            "id", "name", "slug", "category", "description", "official_url",
            "is_official", "icon_color", "status", "submitted_by",
            "created_at", "variant_count", "project_count",
        )
        read_only_fields = ("slug", "status", "submitted_by", "is_official")

    def get_variant_count(self, obj):
        return obj.variants.count()

    def get_project_count(self, obj):
        return ProjectService.objects.filter(service=obj).values("project").distinct().count()


class ServiceDetailSerializer(ServiceSerializer):
    variants = PricingVariantSerializer(many=True, read_only=True)

    class Meta(ServiceSerializer.Meta):
        fields = ServiceSerializer.Meta.fields + ("variants",)


# ---- Project ---------------------------------------------------------------

class ProjectServiceSerializer(serializers.ModelSerializer):
    service = ServiceSerializer(read_only=True)
    service_id = serializers.PrimaryKeyRelatedField(
        source="service", queryset=Service.objects.all(), write_only=True
    )
    variant = PricingVariantSerializer(read_only=True)
    variant_id = serializers.PrimaryKeyRelatedField(
        source="variant",
        queryset=PricingVariant.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = ProjectService
        fields = (
            "id", "service", "service_id", "variant", "variant_id",
            "custom_model_type", "custom_inputs", "created_at",
        )


class ProjectSerializer(serializers.ModelSerializer):
    services = ProjectServiceSerializer(source="project_services", many=True, read_only=True)
    owner_username = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = (
            "id", "name", "description", "budget_target", "tech_stack",
            "usage_inputs", "owner", "owner_username", "services",
            "created_at", "updated_at",
        )
        read_only_fields = ("owner",)

    def get_owner_username(self, obj):
        return obj.owner.username


# ---- Vote ------------------------------------------------------------------

class VoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vote
        fields = ("id", "variant", "value", "created_at")
        read_only_fields = ("created_at",)

    def validate_value(self, value):
        if value not in (1, -1):
            raise serializers.ValidationError("Vote value must be 1 or -1.")
        return value
