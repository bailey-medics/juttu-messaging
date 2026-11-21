"""Signing in, signing out, and who is signed in.

Each view states its own authorisation, as every endpoint must. All three
are public on purpose: a person who is not signed in has to be able to
ask whether they are, to sign in, and to sign out without an error.

Django REST framework marks its views exempt from Django's CSRF check and
makes the check itself, inside ``SessionAuthentication``, but only for a
signed-in request. A sign-in comes from somebody not signed in, so without
``csrf_protect`` another site could sign a person's browser in to an
account of its own choosing. Turva found this by probing a running server,
and Juttu protects all three views for the same reason.
"""

from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from app.accounts.models import User
from app.accounts.serializers import SignInSerializer, UserSerializer
from app.accounts.throttle import SignInThrottle

#: The one answer to a sign-in that fails, whatever the reason: no such
#: account, a wrong password or a closed account all read the same, so the
#: answer never says which usernames exist.
INVALID_SIGN_IN = "That username and password do not match an account."

csrf_protected = method_decorator(csrf_protect, name="dispatch")


def session_body(user: object) -> dict[str, object]:
    """Whether *user* is a signed-in person, and who."""
    if isinstance(user, User) and user.is_authenticated:
        return {"authenticated": True, "user": UserSerializer(user).data}

    return {"authenticated": False, "user": None}


class MeView(APIView):
    """Who is signed in, or that nobody is.

    The app asks this when it opens, to choose between the sign-in page and
    the rest, so "nobody" is an answer and not an error. It also sets the
    CSRF cookie, which the app needs before its first sign-in.
    """

    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        """Answer ``{"authenticated": ..., "user": ...}``."""
        get_token(request)

        return Response(session_body(request.user))


@csrf_protected
class SignInView(APIView):
    """Sign in with a username and a password.

    Django's ``authenticate`` checks a password even when there is no such
    account, so the time taken does not give one away, and it refuses a
    closed account only after checking the password. It also stores the
    password again under today's hasher settings when the stored hash is
    older. ``login`` gives the session a new key, so a key planted before
    signing in is useless after it.
    """

    permission_classes = [AllowAny]
    throttle_classes = [SignInThrottle]

    def post(self, request: Request) -> Response:
        """Sign in, or answer 400 with one message for every failure."""
        serializer = SignInSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"detail": INVALID_SIGN_IN},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(
            request._request,
            username=serializer.validated_data["username"],
            password=serializer.validated_data["password"],
        )
        if user is None:
            return Response(
                {"detail": INVALID_SIGN_IN},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Django's own request, which holds the session. DRF's wrapper
        # read the user before this, so the answer is built from ``user``.
        login(request._request, user)

        return Response(session_body(user))


@csrf_protected
class SignOutView(APIView):
    """Sign out, ending the session.

    Public, so signing out when already signed out succeeds quietly: what
    the app wants is to be signed out, and it is.
    """

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        """End the session and answer as ``MeView`` does for nobody."""
        logout(request._request)

        return Response(session_body(None))
