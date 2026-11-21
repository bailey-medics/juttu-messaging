"""The organisations app's configuration."""

from django.apps import AppConfig


class OrganisationsConfig(AppConfig):
    """Labelled ``organisations``."""

    name = "app.organisations"
    label = "organisations"
    default_auto_field = "django.db.models.BigAutoField"
