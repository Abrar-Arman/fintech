from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views


router = DefaultRouter()
router.register(r"services", views.ServiceViewSet, basename="service")
router.register(r"variants", views.PricingVariantViewSet, basename="variant")
router.register(r"projects", views.ProjectViewSet, basename="project")


urlpatterns = [
    path("auth/register/", views.RegisterView.as_view(), name="register"),
    path("auth/login/", views.LoginView.as_view(), name="login"),
    path("auth/me/", views.MeView.as_view(), name="me"),
    path("pricing-models/", views.pricing_models_view, name="pricing_models"),
    path("", include(router.urls)),
]
