"""A space, and who is in it."""

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from app.organisations.models import OrgUnit


class SpaceKind(models.TextChoices):
    """What a space is for. Home lists spaces in this order, until a person
    sets their own."""

    DEV = "dev", "Dev"
    PERSONAL = "personal", "Personal"
    CLINICAL = "clinical", "Clinical"


#: The kinds, in the order Home lists them.
KIND_ORDER: tuple[SpaceKind, ...] = (
    SpaceKind.DEV,
    SpaceKind.PERSONAL,
    SpaceKind.CLINICAL,
)


class Space(models.Model):
    """A place for conversations, with its own members and rules.

    ``is_clinical`` is false unless somebody sets it. A clinical space
    allows patient details, so a developer or social space left clinical
    by mistake would never warn when they were typed; non-clinical by
    default means a forgotten flag still warns. The first version holds no
    patient data at all.

    ``kind`` says what the space is for, chosen when it is made and fixed
    after. ``is_clinical`` stays beside it, because access rules read it,
    and a constraint holds the two together: a space is clinical exactly
    when its kind is clinical.
    """

    organisation = models.ForeignKey(
        OrgUnit, on_delete=models.PROTECT, related_name="spaces"
    )
    name = models.CharField(max_length=100)
    is_clinical = models.BooleanField(default=False)
    kind = models.CharField(
        max_length=16, choices=SpaceKind.choices, default=SpaceKind.DEV
    )
    created_at = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="+",
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(kind=SpaceKind.CLINICAL, is_clinical=True)
                    | (~Q(kind=SpaceKind.CLINICAL) & Q(is_clinical=False))
                ),
                name="spaces_space_kind_matches_clinical",
            ),
        ]

    def __str__(self) -> str:
        return self.name


class SpaceMember(models.Model):
    """That a person is in a space, from one time until another."""

    space = models.ForeignKey(
        Space, on_delete=models.PROTECT, related_name="memberships"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="space_memberships",
    )
    joined_at = models.DateTimeField(default=timezone.now)
    left_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["space", "user"],
                condition=Q(left_at__isnull=True),
                name="spaces_member_one_current",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.user} in {self.space}"


class SpaceOrder(models.Model):
    """Where one person wants one space on their Home, by position.

    Each person's own: it changes only their Home. A space they have no
    row for comes after the rest, in kind order then A to Z.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="space_orders",
    )
    space = models.ForeignKey(
        Space, on_delete=models.PROTECT, related_name="orders"
    )
    position = models.PositiveIntegerField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "space"], name="spaces_order_one_per_space"
            ),
        ]
