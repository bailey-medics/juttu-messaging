"""Make the first account, by hand, once per environment.

Run through ``just first-account`` on the dev stack, or
``just box-first-account`` on the dev box. Nothing is seeded in code and
there is no default password: the person running it types both. Invites,
in Phase 12, make every account after this one, so the command refuses
once any account exists rather than becoming a way round them. Phase 11
makes this person an organisation admin.
"""

import getpass
from typing import Any

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from app.accounts.models import User

#: How the command asks. Module names, so a test can answer for a person.
ask = input
ask_secret = getpass.getpass


class Command(BaseCommand):
    """Ask for a username and a password, and make that account."""

    help = "Make the first account, asking for its username and password."

    def handle(self, *args: Any, **options: Any) -> None:
        """Make the account, or explain why not and change nothing."""
        if User.objects.exists():
            raise CommandError(
                "An account already exists. Every later account comes "
                "from an invite."
            )

        username = ask("Username: ").strip()
        candidate = User(username=username)
        try:
            candidate.clean_fields(exclude=["password"])
        except ValidationError as error:
            raise CommandError(_messages(error)) from error

        password = ask_secret("Password: ")
        if ask_secret("Password again: ") != password:
            raise CommandError("The two passwords differ.")

        try:
            validate_password(password, user=candidate)
        except ValidationError as error:
            raise CommandError(_messages(error)) from error

        with transaction.atomic():
            User.objects.create_user(username, password)

        self.stdout.write(f"Made the account {username}.")


def _messages(error: ValidationError) -> str:
    """Django's reasons for refusing, one sentence after another."""
    return " ".join(error.messages)
