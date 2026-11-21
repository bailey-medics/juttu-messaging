"""The database the backend and its tests run on."""

import pytest
from django.conf import settings
from django.db import connection


def test_the_database_is_postgres() -> None:
    assert (
        settings.DATABASES["default"]["ENGINE"]
        == "django.db.backends.postgresql"
    )


@pytest.mark.django_db
def test_the_tests_reach_a_real_postgres() -> None:
    with connection.cursor() as cursor:
        cursor.execute("SELECT version()")
        row = cursor.fetchone()

    assert row is not None
    assert str(row[0]).startswith("PostgreSQL 18")


def test_each_request_is_one_transaction() -> None:
    assert settings.DATABASES["default"]["ATOMIC_REQUESTS"] is True
