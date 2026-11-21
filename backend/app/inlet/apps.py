"""The event inlet's configuration."""

from django.apps import AppConfig


class InletConfig(AppConfig):
    """Labelled ``inlet``. Registers the ``outside`` kind of card."""

    name = "app.inlet"
    label = "inlet"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        from app.cards.kinds import register
        from app.inlet.kinds import OutsideKind

        register(OutsideKind())
