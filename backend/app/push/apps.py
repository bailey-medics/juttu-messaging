"""The push notifications app's configuration."""

from django.apps import AppConfig


class PushConfig(AppConfig):
    """Labelled ``push``."""

    name = "app.push"
    label = "push"
    default_auto_field = "django.db.models.BigAutoField"
