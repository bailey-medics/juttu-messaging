"""The one function that writes to the audit trail."""

from collections.abc import Mapping

from django.http import HttpRequest

from app.accounts.models import User
from app.audit.models import AuditAction, AuditEvent
from app.client_address import client_address

#: What ``detail`` may hold: plain values, so an entry reads the same in
#: ten years as it does today.
DetailValue = str | int | bool | None


def record(
    action: AuditAction,
    *,
    actor: User | None = None,
    request: HttpRequest | None = None,
    detail: Mapping[str, DetailValue] | None = None,
) -> AuditEvent:
    """Write one audit entry and return it.

    Args:
        action: What happened.
        actor: The account it concerns, if there is one.
        request: The request it happened in, for the client's address.
        detail: Anything else the action needs. Never a password, a token
            or a message's text.
    """
    address = "" if request is None else client_address(request)

    return AuditEvent.objects.create(
        action=action.value,
        actor=actor,
        address=address,
        detail=dict(detail or {}),
    )
