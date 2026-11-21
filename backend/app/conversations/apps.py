"""The conversations app's configuration."""

from django.apps import AppConfig


class ConversationsConfig(AppConfig):
    """Labelled ``conversations``."""

    name = "app.conversations"
    label = "conversations"
    default_auto_field = "django.db.models.BigAutoField"
