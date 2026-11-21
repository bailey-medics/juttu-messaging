"""Django's settings for Juttu, read from the environment.

The environment is read and checked once, by ``app.config.settings``, a
Pydantic class that refuses a bad value with an error that leaves the
value out. This module turns what it read into the names Django expects.
"""

from pathlib import Path

from app.config import settings as env
from app.logging_config import logging_settings

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = env.secret_key
DEBUG = env.dev_mode
ALLOWED_HOSTS = env.allowed_hosts

# No django.contrib.admin, auth or sessions yet: Juttu has no accounts, and
# the admin would put a sign-in page at /admin/ that nobody can use. The
# vision plan's Phase 8, accounts and sign-in, adds them.
INSTALLED_APPS = [
    "rest_framework",
    "app",
]

MIDDLEWARE = [
    # First, so every line logged while a request is handled carries its id,
    # the other middleware's included.
    "app.middleware.RequestIdMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

# Postgres, everywhere: development, the tests and the box copy. Never
# SQLite, so a test exercises the database Juttu runs on.
DATABASES = {"default": env.database}

# Caddy, and the private network's HTTPS proxy in front of the box copy,
# end TLS and say so in this header.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

LANGUAGE_CODE = "en-gb"
TIME_ZONE = "Europe/London"
USE_I18N = True
USE_TZ = True

REST_FRAMEWORK = {
    # No way to sign in yet, so no request is ever authenticated.
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "UNAUTHENTICATED_USER": None,
    # Signed in by default. A view that should be public says so itself, so
    # a view nobody thought about is closed, not open.
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    # JSON only: no browsable API pages.
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
    ],
}

LOGGING = logging_settings(dev_mode=env.dev_mode, level=env.LOG_LEVEL)
