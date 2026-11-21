"""One row for each thing that happened, kept for good."""

from enum import StrEnum

from django.conf import settings
from django.db import models
from django.utils import timezone


class AuditAction(StrEnum):
    """What happened. Each phase that changes data adds its own.

    An enum in Python rather than choices on the column, so a new action
    needs no migration.
    """

    SIGN_IN = "sign_in"
    SIGN_OUT = "sign_out"
    SIGN_IN_FAILED = "sign_in_failed"
    ACCOUNT_CREATED = "account_created"
    ORG_UNIT_CREATED = "org_unit_created"
    MEMBER_ADDED = "member_added"
    COMPETENCY_GRANTED = "competency_granted"
    POSITION_FILLED = "position_filled"
    MEMBER_REMOVED = "member_removed"
    SPACE_CREATED = "space_created"
    SPACE_MEMBER_ADDED = "space_member_added"
    SPACE_MEMBER_REMOVED = "space_member_removed"


class AuditEvent(models.Model):
    """One thing that happened: what, who, from where and when.

    Append-only. A trigger in this app's first migration makes Postgres
    refuse every ``UPDATE``, ``DELETE`` and ``TRUNCATE`` on the table,
    whether it comes from ``save``, a queryset or a person at ``psql``.
    """

    occurred_at = models.DateTimeField(default=timezone.now, db_index=True)
    action = models.CharField(max_length=64)
    # The account it concerns. Accounts are closed, never deleted, so an
    # entry never loses the person it names.
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="+",
    )
    address = models.CharField(max_length=64, blank=True)
    # Anything else the action needs, never a password or message text.
    detail = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["actor", "occurred_at"],
                name="audit_event_by_actor",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.action} at {self.occurred_at.isoformat()}"
