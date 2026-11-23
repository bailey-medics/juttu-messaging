"""Django's sign-in signals, written to the audit trail.

Django sends ``user_logged_in`` from ``login``, ``user_logged_out`` from
``logout`` and ``user_login_failed`` from ``authenticate`` when no account
matched, so every way in or out is recorded, whichever view called them.

The sign-in view runs outside the per-request transaction, so a failed
sign-in's entry is kept, not rolled back with the refusal.
"""

from django.contrib.auth.signals import (
    user_logged_in,
    user_logged_out,
    user_login_failed,
)
from django.http import HttpRequest

from app.accounts.models import User
from app.audit.models import AuditAction
from app.audit.record import record


def on_sign_in(
    sender: object, request: HttpRequest | None, user: User, **_: object
) -> None:
    """Record a sign-in."""
    record(AuditAction.SIGN_IN, actor=user, request=request)


def on_sign_out(
    sender: object,
    request: HttpRequest | None,
    user: User | None,
    **_: object,
) -> None:
    """Record a sign-out. Signing out when nobody was signed in is not one."""
    if user is None:
        return

    record(AuditAction.SIGN_OUT, actor=user, request=request)


def on_sign_in_failed(
    sender: object,
    credentials: dict[str, object],
    request: HttpRequest | None = None,
    **_: object,
) -> None:
    """Record a failed sign-in, against the account it named if any.

    The username typed is not stored. People sometimes type a password
    into the username field, and OWASP's logging guidance says a log must
    never hold a password. The account it named, when there is one, says
    whose account was tried without keeping the text.
    """
    username = credentials.get("username")
    account = (
        User.objects.filter(username__iexact=username).first()
        if isinstance(username, str)
        else None
    )

    record(
        AuditAction.SIGN_IN_FAILED,
        actor=account,
        request=request,
        detail={"account_found": account is not None},
    )


def connect() -> None:
    """Connect the three receivers. Called once, from ``AuditConfig``."""
    user_logged_in.connect(on_sign_in, dispatch_uid="audit-sign-in")
    user_logged_out.connect(on_sign_out, dispatch_uid="audit-sign-out")
    user_login_failed.connect(
        on_sign_in_failed, dispatch_uid="audit-sign-in-failed"
    )
