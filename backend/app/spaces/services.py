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
from app.spaces.models import (
    KIND_ORDER,
    Space,
    SpaceKind,
    SpaceMember,
    SpaceOrder,
)


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
    organisation: OrgUnit, name: str, *, kind: SpaceKind, by: User
) -> Space:
    """Make a space of *kind*, with its maker as its first member. A
    Clinical space is clinical, and no other kind is."""
    is_clinical = kind == SpaceKind.CLINICAL
    space = Space.objects.create(
        organisation=organisation,
        name=name,
        kind=kind,
        is_clinical=is_clinical,
        created_by=by,
    )

    record(
        AuditAction.SPACE_CREATED,
        actor=by,
        detail={
            "space": space.pk,
            "kind": str(kind),
            "is_clinical": is_clinical,
        },
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


class SpaceOrderRefused(Exception):
    """An order that names a space the person is not in, or one twice."""


def kind_then_name(space: Space) -> tuple[int, str, int]:
    """Where *space* comes before anybody orders it: kind order, then A to Z."""
    return (
        KIND_ORDER.index(SpaceKind(space.kind)),
        space.name.casefold(),
        space.pk,
    )


def space_order_for(user: User) -> list[Space]:
    """The spaces *user* is in now, in their own order.

    Spaces they have placed come first, by their positions. Any other, such
    as one they joined since, follows in kind order, Dev, then Personal,
    then Clinical, and A to Z within a kind.
    """
    spaces = list(spaces_of(user))
    positions = dict(
        SpaceOrder.objects.filter(user=user).values_list(
            "space_id", "position"
        )
    )

    placed = sorted(
        (s for s in spaces if s.pk in positions), key=lambda s: positions[s.pk]
    )
    unplaced = sorted(
        (s for s in spaces if s.pk not in positions), key=kind_then_name
    )

    return placed + unplaced


@transaction.atomic
def set_space_order(user: User, space_ids: list[int]) -> list[Space]:
    """Keep *space_ids* as *user*'s order of their spaces, replacing any
    before, and answer their spaces in it.

    Raises:
        SpaceOrderRefused: If it names a space they are not in, or one twice.
    """
    theirs = {s.pk for s in spaces_of(user)}

    if len(set(space_ids)) != len(space_ids):
        raise SpaceOrderRefused("Each space can come only once.")
    if not set(space_ids) <= theirs:
        raise SpaceOrderRefused("You can only order the spaces you are in.")

    SpaceOrder.objects.filter(user=user).delete()
    SpaceOrder.objects.bulk_create(
        SpaceOrder(user=user, space_id=space_id, position=position)
        for position, space_id in enumerate(space_ids)
    )

    return space_order_for(user)
