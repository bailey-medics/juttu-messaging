"""Who a message mentions, by ``@username``.

A username may hold letters, digits and ``@ . + - _``, as Django allows, so
a mention runs until the first character that cannot be in one. It starts
with a letter, digit or underscore, so "@@sam" mentions nobody, and a
username that starts with punctuation cannot be mentioned. A full
stop or comma at its end is taken as punctuation, so "thanks @sam." still
mentions sam.
"""

import re

from django.db.models import QuerySet

from app.accounts.models import User

#: An ``@`` that starts a word, then what could be a username.
_MENTION = re.compile(r"(?<![\w.@+-])@(\w[\w.@+-]*)")


def mentioned_usernames(body: str) -> set[str]:
    """The usernames *body* mentions, lower-cased, as accounts store them."""
    found: set[str] = set()

    for match in _MENTION.finditer(body):
        name = match.group(1).rstrip(".,").lower()
        if name:
            found.add(name)

    return found


def mentioned(body: str) -> QuerySet[User]:
    """The accounts *body* mentions. Names that match nobody are ignored."""
    return User.objects.filter(username__in=mentioned_usernames(body))
