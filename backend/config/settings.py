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

# No django.contrib.admin: Juttu signs people in through its own API, and
# the admin would put a second sign-in page at /admin/.
INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "rest_framework",
    "app",
    "app.accounts",
    "app.audit",
    "app.organisations",
    "app.spaces",
    "app.conversations",
]

MIDDLEWARE = [
    # First, so every line logged while a request is handled carries its id,
    # the other middleware's included.
    "app.middleware.RequestIdMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
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

# Accounts are Juttu's own, keyed on a username. See app/accounts/models.py.
AUTH_USER_MODEL = "accounts.User"

# Argon2id, as Quill Medical and Turva store passwords. The others stay
# listed only so Django can still read a hash made by one of them; a
# sign-in with such a hash stores the password again as Argon2.
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.ScryptPasswordHasher",
]

# Fifteen characters at least: NIST SP 800-63B-4 asks for fifteen where a
# password is the only factor, as it is here.
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation."
        "UserAttributeSimilarityValidator"
    },
    {
        "NAME": "django.contrib.auth.password_validation."
        "MinimumLengthValidator",
        "OPTIONS": {"min_length": 15},
    },
    {
        "NAME": "django.contrib.auth.password_validation."
        "CommonPasswordValidator"
    },
    {
        "NAME": "django.contrib.auth.password_validation."
        "NumericPasswordValidator"
    },
]

# Sessions live in Postgres, in Django's own table, and are read by Django's
# middleware. The cookie is named for Juttu: cookies on localhost ignore the
# port, so Quill Medical's and Turva's stacks on the same machine would
# otherwise share it.
SESSION_ENGINE = "django.contrib.sessions.backends.db"
SESSION_COOKIE_NAME = "juttu_session"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = not env.dev_mode
# Two weeks, counted again from each request, so a phone in daily use stays
# signed in and one left in a drawer does not.
SESSION_COOKIE_AGE = 14 * 24 * 60 * 60
SESSION_SAVE_EVERY_REQUEST = True

# The app reads the CSRF token from this cookie and sends it back in the
# X-CSRFToken header, Django's documented pattern for a single-page app. The
# defence is that another site cannot read the cookie to write the header,
# so the page itself may read it.
CSRF_COOKIE_NAME = "juttu_csrftoken"
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = not env.dev_mode
# Pages a request may come from beyond its own host: the dev box's address,
# which s/box passes in. See Settings.csrf_trusted_origins.
CSRF_TRUSTED_ORIGINS = env.csrf_trusted_origins
# A CSRF refusal answers in JSON, as the rest of the API does.
CSRF_FAILURE_VIEW = "app.csrf.csrf_failure"

REST_FRAMEWORK = {
    # Django's session, which also enforces the CSRF check on every unsafe
    # request from a signed-in person. Never swap it for a class that skips
    # that check.
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
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
    # Caddy is the one proxy in front of the backend, in development and on
    # the dev box, and it writes X-Forwarded-For itself. So the client's
    # address is that header's last entry, never its first, which the
    # client can write. The sign-in rate limit is keyed on it.
    "NUM_PROXIES": 1,
}

LOGGING = logging_settings(dev_mode=env.dev_mode, level=env.LOG_LEVEL)
