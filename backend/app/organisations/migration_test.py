"""The data step in the first migration: an account made before it."""

from importlib import import_module

import pytest
from django.apps import apps

from app.accounts.models import User
from app.organisations.models import CompetencyGrant, OrgUnit, OrgUnitMember

pytestmark = pytest.mark.django_db

migration = import_module(
    "app.organisations.migrations.0001_add_organisations"
)


def test_an_account_made_before_organisations_becomes_their_admin() -> None:
    """`just first-account` may run before this migration does."""
    sam = User.objects.create_user("sam", "a long enough made-up password")

    migration.make_the_organisation(apps, None)

    made = OrgUnit.objects.order_by("-pk").first()
    assert made is not None and made.name == "Turva"
    assert OrgUnitMember.objects.filter(user=sam, org_unit=made).exists()
    assert set(
        CompetencyGrant.objects.filter(user=sam, org_unit=made).values_list(
            "competency", flat=True
        )
    ) == set(migration.ADMIN_COMPETENCIES)
