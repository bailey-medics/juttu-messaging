# Juttu's backend image: a Django project. Ported from Quill Medical's
# backend/Dockerfile, without its Google Cloud targets.
#
# Build context: the repository root, so the image can read .poetry-version.
#   docker build -f backend/Dockerfile --target dev .
#
# Targets:
#   dev   the dev group too (pytest, mypy), and Django's runserver,
#         which reloads on change
#   prod  the main group only, served by Gunicorn

# Pinned by digest, so a build is reproducible. To update, run:
#   docker pull public.ecr.aws/docker/library/python:3.14-slim
#   docker inspect --format='{{index .RepoDigests 0}}' public.ecr.aws/docker/library/python:3.14-slim
#
# Amazon's public copy of Docker Hub's official image. Docker Hub limits
# how often a machine with no login may pull, and the copy needs no login
# while holding the same image under the same digest.
ARG PYTHON_IMAGE=public.ecr.aws/docker/library/python:3.14-slim@sha256:9aaa474097d094040649f2162a627c0049b408f52138d980916788d80f04802f

# ---------- Base layer (dependencies and app) ----------
FROM ${PYTHON_IMAGE} AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    POETRY_REQUESTS_TIMEOUT=60

WORKDIR /app

# .poetry-version is the one place Poetry's version is written. Copied on
# its own, so a dependency change does not invalidate this layer.
COPY .poetry-version ./
RUN pip install --no-cache-dir "poetry==$(cat .poetry-version)"

# Into the system site-packages: an image needs no virtual environment.
COPY backend/pyproject.toml backend/poetry.lock ./

# Main group only. The prod image needs nothing from the dev group, and
# shipping it would widen what an advisory can reach. Poetry's cache sits
# on a BuildKit cache mount, so a retry resumes rather than restarting.
RUN --mount=type=cache,target=/root/.cache/pypoetry \
    poetry config virtualenvs.create false \
 && for attempt in 1 2 3; do \
        poetry install --only main --no-interaction --no-ansi && exit 0; \
        echo "poetry install failed (attempt $attempt of 3); retrying..." >&2; \
        sleep 5; \
    done; \
    exit 1

COPY backend/manage.py ./
COPY backend/config ./config
COPY backend/app ./app

# An unprivileged user. Never run the app as root.
RUN useradd --uid 10001 --create-home appuser \
 && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"]

# ---------- Dev target (reloads on change) ----------
FROM base AS dev
USER root
RUN --mount=type=cache,target=/root/.cache/pypoetry \
    for attempt in 1 2 3; do \
        poetry install --only dev --no-interaction --no-ansi && exit 0; \
        echo "poetry install failed (attempt $attempt of 3); retrying..." >&2; \
        sleep 5; \
    done; \
    exit 1
USER appuser
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# ---------- Prod target (no reload) ----------
FROM base AS prod
# JSON logs, no debug pages, and a refusal to start without its own
# JUTTU_SECRET_KEY and JUTTU_ALLOWED_HOSTS.
ENV BACKEND_ENV=production
# Django's own synchronous workers. The reverse proxy in front sets
# X-Forwarded-*, and only it can reach this port, so its headers are
# trusted. Each request is logged once, by Juttu's middleware, so
# Gunicorn's access log stays off.
CMD ["gunicorn", "config.wsgi", "--workers", "2", "--bind", "0.0.0.0:8000", "--forwarded-allow-ips", "*"]
