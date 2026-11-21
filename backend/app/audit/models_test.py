"""The audit table is append-only, enforced by Postgres itself."""

import pytest
from django.db import DatabaseError, connection, transaction

from app.audit.models import AuditAction, AuditEvent
from app.audit.record import record

pytestmark = pytest.mark.django_db


@pytest.fixture
def entry() -> AuditEvent:
    return record(AuditAction.SIGN_IN_FAILED)


def test_an_entry_cannot_be_changed(entry: AuditEvent) -> None:
    entry.action = AuditAction.SIGN_IN.value

    with pytest.raises(DatabaseError, match="append-only"):
        with transaction.atomic():
            entry.save()


def test_entries_cannot_be_changed_in_bulk(entry: AuditEvent) -> None:
    with pytest.raises(DatabaseError, match="append-only"):
        with transaction.atomic():
            AuditEvent.objects.update(address="198.51.100.7")


def test_an_entry_cannot_be_deleted(entry: AuditEvent) -> None:
    with pytest.raises(DatabaseError, match="append-only"):
        with transaction.atomic():
            entry.delete()


def test_the_table_cannot_be_emptied(entry: AuditEvent) -> None:
    with connection.cursor() as cursor:
        # Django's foreign keys are checked at commit, and Postgres will not
        # truncate a table with such a check pending. Checking them now
        # leaves the trigger as the only thing that can refuse.
        cursor.execute("SET CONSTRAINTS ALL IMMEDIATE")

        with pytest.raises(DatabaseError, match="append-only"):
            with transaction.atomic():
                cursor.execute("TRUNCATE audit_auditevent")


def test_a_refused_change_leaves_the_entry_as_it_was(
    entry: AuditEvent,
) -> None:
    with pytest.raises(DatabaseError):
        with transaction.atomic():
            AuditEvent.objects.filter(pk=entry.pk).delete()

    assert AuditEvent.objects.get(pk=entry.pk).action == "sign_in_failed"
