"""What a person may do: the catalogue of competencies, and the roles.

Quill Medical keeps its catalogue in YAML files shared with its frontend.
Juttu's is small enough to be an enum, and a grant names a competency by
its value, so a retired competency stays readable on old grants.

A role is a named set of competencies given together, as Quill's base
professions are. Granting a role writes one grant row for each of its
competencies, so each can later be taken away on its own.
"""

from enum import StrEnum


class Competency(StrEnum):
    """One thing a person may do, at an org unit and everything beneath it."""

    #: Invite people, remove them and make another member an admin.
    MANAGE_MEMBERS = "manage_members"
    #: Grant an AI agent each of its permissions.
    GRANT_AGENT_PERMISSIONS = "grant_agent_permissions"
    #: Make spaces and set their rules.
    MANAGE_SPACES = "manage_spaces"


class Role(StrEnum):
    """A named set of competencies, given together."""

    ORGANISATION_ADMIN = "organisation_admin"


#: What each role grants.
ROLE_COMPETENCIES: dict[Role, frozenset[Competency]] = {
    Role.ORGANISATION_ADMIN: frozenset(Competency),
}
