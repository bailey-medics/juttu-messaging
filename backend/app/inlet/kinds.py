"""The ``outside`` kind of card: the sender decides what it says.

An outside tool knows what its events mean; Juttu does not. So the event
carries the card's key, its title, its current line and whether it needs
somebody, and this kind checks only their types and lengths. A new tool
needs no new code here.
"""

from collections.abc import Mapping

from app.cards.kinds import CardKind, EventRefused, JsonObject, Update

#: The fields an event carries, as the sender sends them.
SENT_FIELDS = frozenset({"key", "title", "line", "needs_somebody"})

MAX_KEY_LENGTH = 150
MAX_TITLE_LENGTH = 200
MAX_LINE_LENGTH = 300


def text(event: Mapping[str, object], field: str, longest: int) -> str:
    """One required piece of text from *event*, stripped and checked."""
    value = event.get(field)
    if not isinstance(value, str) or not value.strip():
        raise EventRefused(f"An event needs some text in {field!r}.")

    value = value.strip()
    if len(value) > longest:
        raise EventRefused(f"{field!r} is longer than {longest} characters.")

    return value


class OutsideKind(CardKind):
    """A card an outside tool keeps up to date, saying what it likes."""

    name = "outside"

    def accept(self, event: Mapping[str, object]) -> tuple[str, JsonObject]:
        sender = event.get("sender")
        if not isinstance(sender, int) or isinstance(sender, bool):
            raise EventRefused("An outside event must come from a sender.")

        unknown = sorted(set(event) - SENT_FIELDS - {"sender"})
        if unknown:
            raise EventRefused(f"An event cannot carry {', '.join(unknown)}.")

        key = text(event, "key", MAX_KEY_LENGTH)
        needs_somebody = event.get("needs_somebody", False)
        if not isinstance(needs_somebody, bool):
            raise EventRefused("'needs_somebody' must be true or false.")

        accepted: JsonObject = {
            "sender": sender,
            "key": key,
            "title": text(event, "title", MAX_TITLE_LENGTH),
            "line": text(event, "line", MAX_LINE_LENGTH),
            "needs_somebody": needs_somebody,
        }

        # Two senders in one channel may use the same key for different
        # things, so each sender's keys are its own.
        return f"{sender}:{key}", accepted

    def apply(self, state: JsonObject | None, event: JsonObject) -> Update:
        line = str(event["line"])
        needs_somebody = event["needs_somebody"] is True

        return Update(
            title=str(event["title"]),
            state={"line": line, "needs_somebody": needs_somebody},
            summary=line,
            notify=needs_somebody,
        )
