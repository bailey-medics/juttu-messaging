"""Adding a person, removing one, and making a member an admin.

As in Quill Medical's admin user form, without its invite email: an
organisation admin types the new person's name, username and password,
and tells them the password. Removing a person closes their account and
their membership; nothing is deleted, so what they wrote still names them.
"""

from dataclasses import dataclass

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from app.accounts.models import User
from app.audit.models import AuditAction
from app.audit.record import record
from app.organisations.competencies import ROLE_COMPETENCIES, Role
from app.organisations.models import CompetencyGrant, OrgUnit, OrgUnitMember
from app.organisations.services import add_member, current, grant_role


class MemberRefused(Exception):
    """A change to the members that is not allowed, with the reason."""


@dataclass(frozen=True)
class Member:
    """One current member of an organisation, as the admin screen lists them."""

    user: User
    is_admin: bool


def members_of(organisation: OrgUnit) -> list[Member]:
    """Every current member, with whether each is an admin, by name.

    Two queries whatever the number of members: one for the memberships
    and one for the admin grants, worked through in Python.
    """
    memberships = (
        OrgUnitMember.objects.filter(
            org_unit=organisation, left_at__isnull=True, user__is_active=True
        )
        .select_related("user")
        .order_by("user__name", "user__username")
    )
    users = [membership.user for membership in memberships]

    needed = {c.value for c in ROLE_COMPETENCIES[Role.ORGANISATION_ADMIN]}
    held: dict[int, set[str]] = {}
    grants = current(
        CompetencyGrant.objects.filter(
            org_unit=organisation, user__in=users, competency__in=needed
        ),
        timezone.now(),
    ).values_list("user_id", "competency")

    for user_id, competency in grants:
        held.setdefault(user_id, set()).add(competency)

    return [
        Member(user=user, is_admin=held.get(user.pk, set()) >= needed)
        for user in users
    ]


@transaction.atomic
def add_person(
    organisation: OrgUnit,
    *,
    name: str,
    username: str,
    password: str,
    by: User,
) -> User:
    """Make an account and a membership for somebody new.

    Raises:
        MemberRefused: If the username is taken, or the password breaks
            the password rules. Nothing is written.
    """
    if User.objects.filter(username__iexact=username).exists():
        raise MemberRefused("That username is taken.")

    candidate = User(username=username, name=name)
    try:
        validate_password(password, user=candidate)
    except ValidationError as error:
        raise MemberRefused(" ".join(error.messages)) from error

    user = User.objects.create_user(username, password)
    user.name = name
    user.save(update_fields=["name"])

    record(
        AuditAction.ACCOUNT_CREATED,
        actor=by,
        detail={"user": user.pk},
    )
    add_member(organisation, user, by=by)

    return user


@transaction.atomic
def remove_person(organisation: OrgUnit, user: User, *, by: User) -> None:
    """Close *user*'s account and end their membership.

    A closed account cannot sign in, and its session ends at its next
    request, because Django's session check refuses an inactive account.

    Raises:
        MemberRefused: If *user* is the admin asking, which would let the
            last admin lock everybody out, or is not a member.
    """
    if user.pk == by.pk:
        raise MemberRefused("You cannot remove yourself.")

    memberships = OrgUnitMember.objects.filter(
        user=user, org_unit=organisation, left_at__isnull=True
    )
    if not memberships.exists():
        raise MemberRefused("That person is not a member.")

    now = timezone.now()
    memberships.update(left_at=now)
    CompetencyGrant.objects.filter(user=user, ends_at__isnull=True).update(
        ends_at=now
    )
    user.is_active = False
    user.save(update_fields=["is_active"])

    record(
        AuditAction.MEMBER_REMOVED,
        actor=by,
        detail={"user": user.pk, "org_unit": organisation.pk},
    )


def make_admin(organisation: OrgUnit, user: User, *, by: User) -> None:
    """Give a current member every admin competency.

    An admin already is left as they are, with no new grants.

    Raises:
        MemberRefused: If *user* is not a current member.
    """
    member = next(
        (m for m in members_of(organisation) if m.user.pk == user.pk), None
    )
    if member is None:
        raise MemberRefused("That person is not a member.")

    if member.is_admin:
        return

    grant_role(user, Role.ORGANISATION_ADMIN, organisation, by=by)
