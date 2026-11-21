"""The health check.

``GET /api/health`` is **public on purpose**: Docker's health check and a
person checking the dev box both call it without signing in. It says only
that the backend is up, so it gives nothing away.
"""

from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    """Say that the backend is up and answering requests."""

    # Public on purpose, as the module says. Every other view is closed by
    # the default in REST_FRAMEWORK.
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request: Request) -> Response:
        """Answer ``{"status": "ok"}``."""
        return Response({"status": "ok"})
