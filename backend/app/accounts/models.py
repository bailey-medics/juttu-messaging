"""The account a person signs in with, and the sign-in attempts counted.

A username, a password and a name, as in Quill Medical. Roles live in
the organisations app. An email address arrives with the email work the
vision plan has postponed.
"""

from datetime import datetime
from typing import ClassVar

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone


class UserManager(BaseUserManager["User"]):
    """Make accounts, and find one by its username in any case."""

    use_in_migrations = True

    def create_user(self, username: str, password: str) -> User:
        """Make an active account with *password*, hashed with Argon2.

        Raises:
            ValueError: If the username or the password is empty. A blank
                password would make an account nobody can sign in to.
        """
        if not username:
            raise ValueError("An account needs a username")

        if not password:
            raise ValueError("An account needs a password")

        user = self.model(username=username)
        user.set_password(password)
        user.save(using=self._db)

        return user

    def get_by_natural_key(self, username: str | None) -> User:
        """The account named *username*, whatever its case.

        Django's sign-in looks an account up through this, so "Sam" and
        "sam" reach the same one, as the unique constraint on the
        lower-cased username already insists they are.
        """
        return self.get(username__iexact=username)


class User(AbstractBaseUser):
    """One person's account.

    ``AbstractBaseUser`` brings the password hash and ``last_login``.
    Django's permission tables are left out: Juttu decides access through
    its own rules, not Django's per-model permissions.
    """

    username = models.CharField(
        max_length=150,
        unique=True,
        validators=[UnicodeUsernameValidator()],
    )
    # The person's name, as others see it. Blank for an account made before
    # names were asked for; ``display_name`` then falls back to the username.
    name = models.CharField(max_length=200, blank=True, default="")
    # Closing an account keeps its row, so what the person wrote still
    # names them. A closed account cannot sign in.
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(default=timezone.now)

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS: ClassVar[list[str]] = []

    objects: ClassVar[UserManager] = UserManager()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                Lower("username"),
                name="accounts_user_username_unique_any_case",
            ),
        ]

    def __str__(self) -> str:
        return self.username

    @property
    def display_name(self) -> str:
        """Who to say this is: their name, or their username without one."""
        return self.name or self.username


class SignInAttempt(models.Model):
    """One request to sign in, counted by the rate limit.

    In Postgres rather than a cache in memory, so every Gunicorn worker
    counts the same attempts; a limit kept per worker would let through
    as many attempts as there are workers. Rows older than the limit's
    window are deleted as new ones arrive, so the table stays small.
    """

    address = models.CharField(max_length=64)
    attempted_at = models.DateTimeField(default=timezone.now)

    class Meta:
        indexes = [
            models.Index(
                fields=["address", "attempted_at"],
                name="accounts_attempt_by_address",
            ),
            models.Index(
                fields=["attempted_at"],
                name="accounts_attempt_by_time",
            ),
        ]

    def __str__(self) -> str:
        when: datetime = self.attempted_at

        return f"{self.address} at {when.isoformat()}"
