"""The organisation tree's rules, held by the database."""

import pytest
from django.db import IntegrityError, transaction

from app.accounts.models import User
from app.organisations.models import OrgUnit, OrgUnitMember, OrgUnitType
from app.organisations.services import the_organisation

pytestmark = pytest.mark.django_db


def test_the_turva_team_has_its_organisation() -> None:
    """Made by the app's first migration."""
    organisation = the_organisation()

    assert organisation.type == OrgUnitType.ORGANISATION
    assert organisation.parent is None


def test_an_organisation_has_no_parent() -> None:
    with pytest.raises(IntegrityError), transaction.atomic():
        OrgUnit.objects.create(
            name="Nested",
            type=OrgUnitType.ORGANISATION,
            parent=the_organisation(),
        )


def test_a_team_sits_under_something() -> None:
    with pytest.raises(IntegrityError), transaction.atomic():
        OrgUnit.objects.create(name="Loose", type=OrgUnitType.TEAM)


def test_a_person_belongs_to_an_org_unit_once_at_a_time() -> None:
    sam = User.objects.create_user("sam", "a long enough made-up password")
    OrgUnitMember.objects.create(user=sam, org_unit=the_organisation())

    with pytest.raises(IntegrityError), transaction.atomic():
        OrgUnitMember.objects.create(user=sam, org_unit=the_organisation())
