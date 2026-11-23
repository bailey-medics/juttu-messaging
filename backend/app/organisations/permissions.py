"""Who may call the organisation's endpoints."""

from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

from app.accounts.models import User
from app.organisations.competencies import Competency
from app.organisations.services import holds, the_organisation


class ManagesMembers(BasePermission):
    """Signed in, and holding ``manage_members`` at the organisation.

    Anybody else is refused, signed in or not. The check reads the grants
    on every request, so a competency taken away stops working at once.
    """

    message = "Only an organisation admin can manage members."

    def has_permission(self, request: Request, view: APIView) -> bool:
        user = request.user

        if not isinstance(user, User) or not user.is_authenticated:
            return False

        return holds(user, Competency.MANAGE_MEMBERS, the_organisation())
