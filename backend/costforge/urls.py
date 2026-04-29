from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenRefreshView


def root(_request):
    return JsonResponse({
        "name": "CostForge API",
        "version": "1.0.0",
        "docs": "/api/",
    })


urlpatterns = [
    path("", root),
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]
