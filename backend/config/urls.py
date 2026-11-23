"""Every route Juttu serves, under the API prefix."""

from django.db import transaction
from django.urls import URLPattern, URLResolver, include, path

from app.health import HealthView

urlpatterns: list[URLPattern | URLResolver] = [
    # Outside the per-request transaction: the health check reads no table,
    # and must answer even when the database is away.
    path(
        "api/health",
        transaction.non_atomic_requests(HealthView.as_view()),
        name="health",
    ),
    path("api/auth/", include("app.accounts.urls")),
    path("api/", include("app.organisations.urls")),
    path("api/", include("app.spaces.urls")),
    path("api/", include("app.conversations.urls")),
    path("api/push/", include("app.push.urls")),
    path("api/", include("app.cards.urls")),
    path("api/inlet/", include("app.inlet.urls")),
]
