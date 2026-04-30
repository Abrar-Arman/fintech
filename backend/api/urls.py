"""
URL routes for the CostForge REST API.

These are mounted under /api/ by costforge/urls.py, so the final paths
are /api/auth/login/, /api/services/, /api/projects/<id>/calculate/, etc.
The DRF DefaultRouter generates the standard CRUD routes for each
ViewSet (list / create / retrieve / update / destroy).
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views


router = DefaultRouter()
router.register(r"services", views.ServiceViewSet, basename="service")
router.register(r"variants", views.PricingVariantViewSet, basename="variant")
router.register(r"projects", views.ProjectViewSet, basename="project")


urlpatterns = [
    # JWT auth
    path("auth/register/", views.RegisterView.as_view(), name="register"),
   path("auth/login/", views.LoginView.as_view(), name="login"),
    path("auth/me/", views.MeView.as_view(), name="me"),
    # Pricing model schema (used by the frontend to render variant forms)
    path("pricing-models/", views.pricing_models_view, name="pricing_models"),
    # Auto-generated viewset routes
    path("", include(router.urls)),
]
