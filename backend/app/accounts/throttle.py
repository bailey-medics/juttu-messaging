"""The rate limit on signing in.

Ported from Quill Medical's limit on ``/auth/login``: five attempts a
minute from one address, whether they succeed or not, so a password
cannot be guessed at speed. Quill keeps its count in slowapi's memory;
Juttu keeps it in Postgres (see ``SignInAttempt``), so both Gunicorn
workers share one count.

The address is the one Django REST framework's ``get_ident`` reads with
``NUM_PROXIES`` set to one: the last entry of ``X-Forwarded-For``, the one
Caddy wrote, never the first, which the client wrote. Behind the private
network's HTTPS proxy on the dev box every phone arrives from that proxy's
address, so there the team shares one count. That errs towards refusing,
and is noted in the plan.
"""

from datetime import timedelta

from django.utils import timezone
from rest_framework.request import Request
from rest_framework.throttling import BaseThrottle
from rest_framework.views import APIView

from app.accounts.models import SignInAttempt

#: How many attempts one address may make in each window.
SIGN_IN_LIMIT = 5

#: The window the attempts are counted over.
SIGN_IN_WINDOW = timedelta(minutes=1)


class SignInThrottle(BaseThrottle):
    """Refuse a sixth attempt to sign in from one address in a minute."""

    def __init__(self) -> None:
        self._wait: float | None = None

    def allow_request(self, request: Request, view: APIView) -> bool:
        """Count this attempt, unless the address has used up its limit.

        The view runs outside the per-request transaction, so the row is
        kept even when the attempt fails; inside it, a refused sign-in
        would roll its own count back.
        """
        address = self.get_ident(request)
        now = timezone.now()
        since = now - SIGN_IN_WINDOW

        SignInAttempt.objects.filter(attempted_at__lt=since).delete()

        recent = SignInAttempt.objects.filter(
            address=address, attempted_at__gte=since
        ).order_by("attempted_at")

        if recent.count() >= SIGN_IN_LIMIT:
            oldest = recent.values_list("attempted_at", flat=True).first()
            if oldest is not None:
                self._wait = (oldest + SIGN_IN_WINDOW - now).total_seconds()

            return False

        SignInAttempt.objects.create(address=address, attempted_at=now)

        return True

    def wait(self) -> float | None:
        """Seconds until the oldest counted attempt leaves the window."""
        return self._wait
