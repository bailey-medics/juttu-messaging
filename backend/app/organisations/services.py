"""Every change to the organisation tree, membership and grants.

Each function here writes its change and its audit entry together, so no
caller can do one without the other. The checks read only current rows:
one whose start has come and whose end, if any, has not.
"""

from datetime import datetime

from django.db import transaction
from django.db.models import Q, QuerySet
from django.utils import timezone

from app.accounts.models import User
from app.audit.models import AuditAction
from app.audit.record import record
from app.organisations.competencies import ROLE_COMPETENCIES, Competency, Role
from app.organisations.models import (
    CompetencyGrant,
    OrgUnit,
    OrgUnitMember,
    OrgUnitType,
    Position,
    PositionHolding,
)

#: The one organisation of the first version, made by this app's first
#: migration.
THE_ORGANISATION_NAME = "Turva"


class NotAMember(Exception):
    """A position can be filled only by somebody who belongs where it is."""


def current(
    rows: QuerySet[CompetencyGrant], now: datetime
) -> QuerySet[CompetencyGrant]:
    """The grants in force at *now*."""
    return rows.filter(starts_at__lte=now).filter(
        Q(ends_at__isnull=True) | Q(ends_at__gt=now)
    )


def the_organisation() -> OrgUnit:
    """The organisation of the first version: the Turva team's."""
    return OrgUnit.objects.get(
        type=OrgUnitType.ORGANISATION, name=THE_ORGANISATION_NAME
    )


def lineage(unit: OrgUnit) -> list[OrgUnit]:
    """*unit*, then its parent, and so on up to its organisation."""
    found: list[OrgUnit] = []
    step: OrgUnit | None = unit

    while step is not None:
        found.append(step)
        step = step.parent

    return found


def organisation_of(unit: OrgUnit) -> OrgUnit:
    """The organisation accountable for *unit*: the root above it."""
    return lineage(unit)[-1]


@transaction.atomic
def add_team(parent: OrgUnit, name: str, *, by: User | None) -> OrgUnit:
    """Make a team under *parent*."""
    team = OrgUnit.objects.create(
        name=name, type=OrgUnitType.TEAM, parent=parent
    )

    record(
        AuditAction.ORG_UNIT_CREATED,
        actor=by,
        detail={"org_unit": team.pk, "parent": parent.pk},
    )

    return team


@transaction.atomic
def add_member(unit: OrgUnit, user: User, *, by: User | None) -> OrgUnitMember:
    """Make *user* a member of *unit*."""
    membership = OrgUnitMember.objects.create(user=user, org_unit=unit)

    record(
        AuditAction.MEMBER_ADDED,
        actor=by,
        detail={"user": user.pk, "org_unit": unit.pk},
    )

    return membership


def is_member(user: User, unit: OrgUnit) -> bool:
    """Whether *user* belongs to *unit* now."""
    return OrgUnitMember.objects.filter(
        user=user, org_unit=unit, left_at__isnull=True
    ).exists()


@transaction.atomic
def grant(
    user: User, competency: Competency, unit: OrgUnit, *, by: User | None
) -> CompetencyGrant:
    """Give *user* one competency at *unit*, and everywhere beneath it."""
    given = CompetencyGrant.objects.create(
        user=user, competency=competency.value, org_unit=unit, granted_by=by
    )

    record(
        AuditAction.COMPETENCY_GRANTED,
        actor=by,
        detail={
            "user": user.pk,
            "competency": competency.value,
            "org_unit": unit.pk,
        },
    )

    return given


@transaction.atomic
def grant_role(
    user: User, role: Role, unit: OrgUnit, *, by: User | None
) -> list[CompetencyGrant]:
    """Give *user* every competency *role* carries, one grant each."""
    return [
        grant(user, competency, unit, by=by)
        for competency in sorted(ROLE_COMPETENCIES[role])
    ]


def holds(user: User, competency: Competency, unit: OrgUnit) -> bool:
    """Whether *user* may do *competency* at *unit* now.

    A grant at *unit* or at any org unit above it counts. A closed account
    holds nothing, whatever its grants say.
    """
    if not user.is_active:
        return False

    grants = CompetencyGrant.objects.filter(
        user=user,
        competency=competency.value,
        org_unit__in=lineage(unit),
    )

    return current(grants, timezone.now()).exists()


def is_organisation_admin(user: User, organisation: OrgUnit) -> bool:
    """Whether *user* holds every admin competency at *organisation*."""
    return all(
        holds(user, competency, organisation)
        for competency in ROLE_COMPETENCIES[Role.ORGANISATION_ADMIN]
    )


@transaction.atomic
def appoint(
    position: Position, user: User, *, by: User | None
) -> PositionHolding:
    """Put *user* in *position*.

    Raises:
        NotAMember: If *user* does not belong to the position's org unit or
            to one above it.
    """
    belongs = OrgUnitMember.objects.filter(
        user=user,
        org_unit__in=lineage(position.org_unit),
        left_at__isnull=True,
    ).exists()
    if not belongs:
        raise NotAMember(f"{user} does not belong where {position} is")

    holding = PositionHolding.objects.create(position=position, user=user)

    record(
        AuditAction.POSITION_FILLED,
        actor=by,
        detail={"user": user.pk, "position": position.pk},
    )

    return holding


def holders(position: Position) -> list[User]:
    """Who holds *position* now."""
    now = timezone.now()
    holdings = (
        position.holdings.filter(starts_at__lte=now)
        .filter(Q(ends_at__isnull=True) | Q(ends_at__gt=now))
        .select_related("user")
        .order_by("starts_at")
    )

    return [holding.user for holding in holdings]


@transaction.atomic
def make_first_admin(user: User) -> None:
    """Make *user* a member and an admin of the organisation.

    For the first account, which nobody invited, so nobody is recorded as
    having granted it.
    """
    organisation = the_organisation()

    add_member(organisation, user, by=None)
    grant_role(user, Role.ORGANISATION_ADMIN, organisation, by=None)
