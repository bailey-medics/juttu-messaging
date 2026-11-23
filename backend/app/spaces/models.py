"""A space, and who is in it."""

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from app.organisations.models import OrgUnit


class Space(models.Model):
    """A place for conversations, with its own members and rules.

    ``is_clinical`` is false unless somebody sets it. A clinical space
    allows patient details, so a developer or social space left clinical
    by mistake would never warn when they were typed; non-clinical by
    default means a forgotten flag still warns. The first version holds no
    patient data at all.
    """

    organisation = models.ForeignKey(
        OrgUnit, on_delete=models.PROTECT, related_name="spaces"
    )
    name = models.CharField(max_length=100)
    is_clinical = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="+",
    )

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
