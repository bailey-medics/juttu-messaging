"""The cards app's configuration."""

from django.apps import AppConfig


class CardsConfig(AppConfig):
    """Labelled ``cards``. Each kind of card registers itself in its own app."""

    name = "app.cards"
    label = "cards"
    default_auto_field = "django.db.models.BigAutoField"
