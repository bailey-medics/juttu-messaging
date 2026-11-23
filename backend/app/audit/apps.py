"""The audit app's configuration."""

from django.apps import AppConfig


class AuditConfig(AppConfig):
    """Labelled ``audit``. Connects the sign-in signals once Django is up."""

    name = "app.audit"
    label = "audit"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        """Record every sign-in, sign-out and failed sign-in."""
        from app.audit import signals

        signals.connect()
