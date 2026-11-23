"""The one function that writes to the audit trail."""

import pytest
from django.test import RequestFactory

from app.accounts.models import User
from app.audit.models import AuditAction, AuditEvent
from app.audit.record import record

pytestmark = pytest.mark.django_db


def test_it_records_what_who_where_and_when() -> None:
    sam = User.objects.create_user("sam", "a long enough made-up password")
    request = RequestFactory().post(
        "/api/auth/sign-in", HTTP_X_FORWARDED_FOR="192.0.2.1, 10.0.0.1"
    )

    entry = record(
        AuditAction.SIGN_IN, actor=sam, request=request, detail={"n": 1}
    )

    saved = AuditEvent.objects.get(pk=entry.pk)
    assert saved.action == "sign_in"
    assert saved.actor == sam
    assert saved.address == "10.0.0.1"
    assert saved.detail == {"n": 1}
    assert saved.occurred_at is not None


def test_it_records_without_a_request_or_an_account() -> None:
    entry = record(AuditAction.SIGN_IN_FAILED)

    assert entry.address == ""
    assert entry.actor is None
