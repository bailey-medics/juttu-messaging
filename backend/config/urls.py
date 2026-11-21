"""Every route Juttu serves, under the API prefix."""

from django.urls import URLPattern, path

from app.health import HealthView

urlpatterns: list[URLPattern] = [
    path("api/health", HealthView.as_view(), name="health"),
]
