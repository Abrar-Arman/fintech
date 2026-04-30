"""
Top-level URL routing for the Django project.

Order:
    /admin/      -> Django admin
    /api/        -> The REST API (defined in api/urls.py)
    /api/auth/refresh/ -> JWT refresh endpoint
    everything else -> the React SPA shell (so client-side routes like
                       /projects/1/usage work on a hard refresh)

The catch-all SPA route only kicks in once you've built the frontend
(`cd frontend && npm run build`). If the build doesn't exist (e.g. you
just cloned the repo) it returns a friendly 200 telling you what to do.
"""
from django.contrib import admin
from django.http import JsonResponse, HttpResponse, Http404
from django.urls import path, include, re_path
from django.conf import settings
from rest_framework_simplejwt.views import TokenRefreshView


def api_root(_request):
    """GET /api/ — tiny welcome JSON. Useful as a healthcheck too."""
    return JsonResponse({
        "name": "CostForge API",
        "version": "1.0.0",
        "endpoints": "/api/",
    })


def spa_index(_request):
    """Serve the built React app's index.html for any non-API URL."""
    index_file = settings.FRONTEND_DIST / "index.html"
    if not index_file.exists():
        # Friendly developer message when the React build hasn't been run.
        return HttpResponse(
            "<h1>CostForge backend is running</h1>"
            "<p>The frontend has not been built yet. Run "
            "<code>cd frontend &amp;&amp; npm install &amp;&amp; npm run build</code>"
            " to enable the SPA, or visit <a href='/api/'>/api/</a> for the REST API.</p>",
            content_type="text/html",
            status=200,
        )
    return HttpResponse(index_file.read_bytes(), content_type="text/html")


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", api_root),                                  # GET /api/
    path("api/auth/refresh/", TokenRefreshView.as_view()),   # JWT refresh
    path("api/", include("api.urls")),                       # all REST routes
    # Catch-all for the SPA — must be last so it doesn't shadow /api or /admin.
    re_path(r"^(?!api/|admin/|static/).*$", spa_index),
]
