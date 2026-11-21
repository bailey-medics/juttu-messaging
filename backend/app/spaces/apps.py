"""The spaces app's configuration."""

from django.apps import AppConfig


class SpacesConfig(AppConfig):
    """Labelled ``spaces``."""

    name = "app.spaces"
    label = "spaces"
    default_auto_field = "django.db.models.BigAutoField"
