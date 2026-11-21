"""Fixtures every backend test can use.

pytest-django supplies ``client``, Django's test client, and sets Django up
from ``DJANGO_SETTINGS_MODULE`` in pyproject.toml. It builds its test
database on the throwaway Postgres compose.unit-tests.yml starts, and rolls
back each test that touches it.
"""

import pytest
from django.conf import settings

POSTGRES = "django.db.backends.postgresql"


def pytest_configure(config: pytest.Config) -> None:
    """Stop the whole run if the tests would use anything but Postgres.

    A test passing on SQLite says little about Postgres: their types,
    constraints and transactions differ. So a settings change that falls
    back to SQLite fails every test, instead of passing them quietly.
    """
    engine = settings.DATABASES["default"]["ENGINE"]

    if engine != POSTGRES:
        raise pytest.UsageError(
            f"The backend tests run on Postgres only, not {engine}."
        )
