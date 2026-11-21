"""Membership, competencies and positions, and their audit entries."""

from datetime import timedelta

import pytest
from django.utils import timezone

from app.accounts.models import User
from app.audit.models import AuditEvent
from app.organisations.competencies import Competency, Role
from app.organisations.models import CompetencyGrant, OrgUnit, Position
from app.organisations.services import (
    NotAMember,
    add_member,
    add_team,
    appoint,
    grant,
    grant_role,
    holders,
    holds,
    is_member,
    is_organisation_admin,
    make_first_admin,
    organisation_of,
    the_organisation,
)

pytestmark = pytest.mark.django_db

PASSWORD = "a long enough made-up password"


@pytest.fixture
def sam() -> User:
    return User.objects.create_user("sam", PASSWORD)


@pytest.fixture
def alex() -> User:
    return User.objects.create_user("alex", PASSWORD)


@pytest.fixture
def release() -> OrgUnit:
    return add_team(the_organisation(), "Release", by=None)


def last_action() -> str:
    return AuditEvent.objects.order_by("-id").values_list("action", flat=True)[
        0
    ]


def test_a_team_belongs_to_its_organisation(release: OrgUnit) -> None:
    assert organisation_of(release) == the_organisation()
    assert last_action() == "org_unit_created"


def test_adding_a_member_is_recorded(sam: User, alex: User) -> None:
    add_member(the_organisation(), sam, by=alex)

    assert is_member(sam, the_organisation())
    entry = AuditEvent.objects.order_by("-id").first()
    assert entry is not None
    assert (entry.action, entry.actor) == ("member_added", alex)
    assert entry.detail["user"] == sam.pk


def test_a_competency_held_above_holds_beneath(
    sam: User, release: OrgUnit
) -> None:
    grant(sam, Competency.MANAGE_SPACES, the_organisation(), by=None)

    assert holds(sam, Competency.MANAGE_SPACES, release)
    assert last_action() == "competency_granted"


def test_a_competency_held_beneath_does_not_hold_above(
    sam: User, release: OrgUnit
) -> None:
    grant(sam, Competency.MANAGE_SPACES, release, by=None)

    assert not holds(sam, Competency.MANAGE_SPACES, the_organisation())


def test_a_competency_is_only_the_one_granted(sam: User) -> None:
    grant(sam, Competency.MANAGE_SPACES, the_organisation(), by=None)

    assert not holds(sam, Competency.MANAGE_MEMBERS, the_organisation())


def test_an_ended_grant_holds_nothing(sam: User) -> None:
    given = grant(sam, Competency.MANAGE_SPACES, the_organisation(), by=None)
    CompetencyGrant.objects.filter(pk=given.pk).update(
        ends_at=timezone.now() - timedelta(seconds=1)
    )

    assert not holds(sam, Competency.MANAGE_SPACES, the_organisation())


def test_a_closed_account_holds_nothing(sam: User) -> None:
    grant(sam, Competency.MANAGE_SPACES, the_organisation(), by=None)
    sam.is_active = False
    sam.save()

    assert not holds(sam, Competency.MANAGE_SPACES, the_organisation())


def test_the_admin_role_makes_an_organisation_admin(sam: User) -> None:
    grants = grant_role(
        sam, Role.ORGANISATION_ADMIN, the_organisation(), by=None
    )

    assert {g.competency for g in grants} == {c.value for c in Competency}
    assert is_organisation_admin(sam, the_organisation())


def test_one_competency_short_is_not_an_admin(sam: User) -> None:
    grant(sam, Competency.MANAGE_SPACES, the_organisation(), by=None)
    grant(sam, Competency.MANAGE_MEMBERS, the_organisation(), by=None)

    assert not is_organisation_admin(sam, the_organisation())


def test_the_first_admin_is_a_member_and_an_admin(sam: User) -> None:
    make_first_admin(sam)

    assert is_member(sam, the_organisation())
    assert is_organisation_admin(sam, the_organisation())


def test_a_member_can_hold_a_position(sam: User, release: OrgUnit) -> None:
    on_call = Position.objects.create(org_unit=release, name="On call")
    add_member(the_organisation(), sam, by=None)

    appoint(on_call, sam, by=None)

    assert holders(on_call) == [sam]
    assert last_action() == "position_filled"


def test_a_position_is_empty_until_filled(release: OrgUnit) -> None:
    on_call = Position.objects.create(org_unit=release, name="On call")

    assert holders(on_call) == []


def test_only_a_member_can_hold_a_position(
    sam: User, release: OrgUnit
) -> None:
    on_call = Position.objects.create(org_unit=release, name="On call")

    with pytest.raises(NotAMember):
        appoint(on_call, sam, by=None)

    assert holders(on_call) == []
