"""The organisation tree, membership, competency grants and positions.

Every row that says somebody belongs, may do something or holds a post is
dated, and is closed rather than deleted, as in Quill Medical: what
somebody could do last month stays answerable.
"""

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone


class OrgUnitType(models.TextChoices):
    """What an org unit is. Its type, never its place in the tree, says so."""

    ORGANISATION = "organisation", "Organisation"
    TEAM = "team", "Team"


class OrgUnit(models.Model):
    """One organisation, or one team inside one.

    An organisation is a root: it has no parent, and every other org unit
    has exactly one. A database constraint holds that, so the accountable
    organisation for any team is found by walking up its parents. A parent
    is never changed once set, so the tree cannot grow a loop.
    """

    name = models.CharField(max_length=200)
    type = models.CharField(max_length=32, choices=OrgUnitType.choices)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="children",
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(type=OrgUnitType.ORGANISATION, parent__isnull=True)
                    | (
                        ~Q(type=OrgUnitType.ORGANISATION)
                        & Q(parent__isnull=False)
                    )
                ),
                name="organisations_orgunit_only_organisations_are_roots",
            ),
        ]

    def __str__(self) -> str:
        return self.name


class OrgUnitMember(models.Model):
    """That a person belongs to an org unit, from one time until another."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="memberships",
    )
    org_unit = models.ForeignKey(
        OrgUnit, on_delete=models.PROTECT, related_name="memberships"
    )
    joined_at = models.DateTimeField(default=timezone.now)
    left_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            # One current membership of each org unit; past ones stay.
            models.UniqueConstraint(
                fields=["user", "org_unit"],
                condition=Q(left_at__isnull=True),
                name="organisations_member_one_current",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.user} in {self.org_unit}"


class CompetencyGrant(models.Model):
    """One competency, given to one person at one org unit, for a time.

    Held at an org unit, it holds everywhere beneath it too, so an
    organisation admin is somebody granted the admin competencies at the
    organisation's own row. No unique constraint: two current grants of
    the same competency may come from different sources, and ending one
    must not end the other. Taking a competency away sets ``ends_at``.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="competency_grants",
    )
    org_unit = models.ForeignKey(
        OrgUnit, on_delete=models.PROTECT, related_name="competency_grants"
    )
    # A value from ``Competency``. No choices, so a retired one stays
    # readable on the grants that name it.
    competency = models.CharField(max_length=64)
    starts_at = models.DateTimeField(default=timezone.now)
    ends_at = models.DateTimeField(null=True, blank=True)
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="+",
    )

    class Meta:
        indexes = [
            models.Index(
                fields=["user", "competency"],
                name="organisations_grant_lookup",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.competency} for {self.user} at {self.org_unit}"


class Position(models.Model):
    """A post an org unit has, which may be vacant, such as "on call".

    Ported from Quill Medical. A competency says what a person can do; a
    position says what the org unit needs somebody to be, filled by name,
    so a message can go to "the on-call registrar" rather than to everyone
    qualified. Who holds it is kept in ``PositionHolding``, so the post
    outlives its holders.
    """

    org_unit = models.ForeignKey(
        OrgUnit, on_delete=models.PROTECT, related_name="positions"
    )
    name = models.CharField(max_length=200)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["org_unit", "name"],
                name="organisations_position_name_unique",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.name}, {self.org_unit}"


class PositionHolding(models.Model):
    """That a person held a position, from one time until another."""

    position = models.ForeignKey(
        Position, on_delete=models.PROTECT, related_name="holdings"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="position_holdings",
    )
    starts_at = models.DateTimeField(default=timezone.now)
    ends_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return f"{self.user} as {self.position}"
