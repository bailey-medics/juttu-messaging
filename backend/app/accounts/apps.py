"""The accounts app's configuration."""

from django.apps import AppConfig


class AccountsConfig(AppConfig):
    """Labelled ``accounts``, so the user model is ``accounts.User``."""

    name = "app.accounts"
    label = "accounts"
    default_auto_field = "django.db.models.BigAutoField"
