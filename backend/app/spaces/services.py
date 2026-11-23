"""Every change to spaces and their members, each with its audit entry.

Reads filter in the database: a person's spaces are found with one query
on their current memberships, never by loading every space and checking
each, which is the fault the plan names in Quill Medical's messaging.
"""

from django.db import transaction
from django.db.models import QuerySet
from django.utils import timezone

from app.accounts.models import User
from app.audit.models import AuditAction
from app.audit.record import record
from app.organisations.models import OrgUnit
from app.organisations.services import is_member as is_organisation_member
from app.spaces.models import Space, SpaceMember


class SpaceRefused(Exception):
    """A change to a space that is not allowed, with the reason."""


def spaces_of(user: User) -> QuerySet[Space]:
    """The spaces *user* is in now, by name."""
    return Space.objects.filter(
        memberships__user=user, memberships__left_at__isnull=True
    ).order_by("name", "pk")


def is_in(user: User, space: Space) -> bool:
    """Whether *user* is in *space* now. A closed account is in nothing."""
    if not user.is_active:
        return False

    return SpaceMember.objects.filter(
        space=space, user=user, left_at__isnull=True
    ).exists()


def members_of(space: Space) -> QuerySet[User]:
    """The people in *space* now, by name."""
    return User.objects.filter(
        space_memberships__space=space,
        space_memberships__left_at__isnull=True,
        is_active=True,
    ).order_by("name", "username")


@transaction.atomic
def create_space(
    organisation: OrgUnit, name: str, *, is_clinical: bool, by: User
) -> Space:
    """Make a space, with its maker as its first member."""
    space = Space.objects.create(
        organisation=organisation,
        name=name,
        is_clinical=is_clinical,
        created_by=by,
    )

    record(
        AuditAction.SPACE_CREATED,
        actor=by,
        detail={"space": space.pk, "is_clinical": is_clinical},
    )
    add_to_space(space, by, by=by)

    return space


@transaction.atomic
def add_to_space(space: Space, user: User, *, by: User) -> SpaceMember:
    """Put *user* in *space*.

    Raises:
        SpaceRefused: If *user* does not belong to the space's organisation,
            or is in the space already.
    """
    if not user.is_active or not is_organisation_member(
        user, space.organisation
    ):
        raise SpaceRefused("That person is not a member of the organisation.")

    if is_in(user, space):
        raise SpaceRefused("That person is in the space already.")

    membership = SpaceMember.objects.create(space=space, user=user)

    record(
        AuditAction.SPACE_MEMBER_ADDED,
        actor=by,
        detail={"space": space.pk, "user": user.pk},
    )

    return membership


@transaction.atomic
def remove_from_space(space: Space, user: User, *, by: User) -> None:
    """Take *user* out of *space*, keeping the record that they were in it.

    Raises:
        SpaceRefused: If *user* is not in the space.
    """
    memberships = SpaceMember.objects.filter(
        space=space, user=user, left_at__isnull=True
    )
    if not memberships.exists():
        raise SpaceRefused("That person is not in the space.")

    memberships.update(left_at=timezone.now())

    record(
        AuditAction.SPACE_MEMBER_REMOVED,
        actor=by,
        detail={"space": space.pk, "user": user.pk},
    )
