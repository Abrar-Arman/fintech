
from pathlib import Path
from datetime import timedelta
import os

# Project layout:
#   <repo>/backend/costforge/settings.py      <- this file
#   <repo>/backend/                            -> BASE_DIR
#   <repo>/frontend/dist/                      -> built React bundle
BASE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent
FRONTEND_DIST = REPO_ROOT / "frontend" / "dist"

# ---- Core ------------------------------------------------------------------

SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "dev-only-insecure-secret-key-replace-me-in-production",
)

# DEBUG defaults to True for local development; the deploy script flips it
# off via the DJANGO_DEBUG=0 environment variable.
DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"

# We don't bother enumerating allowed hosts on Replit (the platform is
# already a trusted reverse proxy). On a "real" production host you'd
# replace "*" with your actual domain(s).
ALLOWED_HOSTS = ["*"]

# ---- Apps ------------------------------------------------------------------

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "api",
    'drf_spectacular',
]

# ---- Middleware ------------------------------------------------------------
# Order matters here. CorsMiddleware must come first (so OPTIONS preflights
# get the right headers) and WhiteNoise must come right after Security
# so it can serve static assets without going through any other middleware.
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "costforge.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        # In production, look for the React build's index.html via the
        # template engine so Django can render it as the SPA shell.
        "DIRS": [FRONTEND_DIST],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "costforge.wsgi.application"

# ---- Database --------------------------------------------------------------
# SQLite keeps the demo zero-setup. Swap this to Postgres for a real deploy.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ---- Static files (Django + React build) -----------------------------------
# Django's own admin/CSS lives at /static/ via STATIC_ROOT.
# The React bundle (JS, CSS, images) is served from /assets/ via the
# `STATICFILES_DIRS` entry pointing at frontend/dist/assets.
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [
    # Only added if the React app has actually been built. In dev (where
    # Vite is serving the frontend) this directory does not exist and
    # WhiteNoise simply has nothing to serve here.
    *([FRONTEND_DIST / "assets"] if (FRONTEND_DIST / "assets").exists() else []),
]
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage" if not DEBUG else "django.contrib.staticfiles.storage.StaticFilesStorage"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---- Django REST Framework -------------------------------------------------
REST_FRAMEWORK = {
     'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    # JWT for the React client; SessionAuthentication kept around so the
    # built-in /admin/ login still works.
    # "DEFAULT_AUTHENTICATION_CLASSES": (
    #     "rest_framework_simplejwt.authentication.JWTAuthentication",
    #     "rest_framework.authentication.SessionAuthentication",
    # ),
    # Read endpoints (GET) are open so unauthenticated visitors can browse
    # the public service registry; writes require auth.
    # "DEFAULT_PERMISSION_CLASSES": (
    #     "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    # ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,

}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=12),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=14),
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# ---- CORS ------------------------------------------------------------------
# Frontend dev server lives on a different port — allow it during dev.
# In production, frontend and backend are the same origin so CORS is moot.
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# ---- Anthropic / Claude (optional) -----------------------------------------
# When ANTHROPIC_API_KEY is set, /api/services/suggest/ uses Claude.
# When unset (the default), the endpoint falls back to a deterministic
# heuristic that still produces useful demo suggestions.
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")


SPECTACULAR_SETTINGS = {
    'TITLE': 'My API',
    'DESCRIPTION': 'API documentation',
    'VERSION': '1.0.0',
}
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=10),  
}
