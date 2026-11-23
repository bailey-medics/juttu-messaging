"""The interface a kind of card implements, and the register of kinds.

The core knows only what a card is. Each kind of card is its own module:
it says which events it accepts, what an event does to the card, and
whether the card needs somebody now. A module registers its kind when its
app is ready, so a new kind is added without touching the core or the
other kinds.
"""

from abc import ABC, abstractmethod
from collections.abc import Mapping
from dataclasses import dataclass

#: A card's state or an event, as JSON holds them.
JsonObject = Mapping[str, object]


class EventRefused(Exception):
    """An event a kind of card does not accept, with the reason."""


@dataclass(frozen=True)
class Update:
    """What one event does to a card, as its kind judges it."""

    #: The card's title now.
    title: str
    #: Where things stand now, replacing the card's state.
    state: JsonObject
    #: One line for the card's thread, such as "Failed on lint".
    summary: str
    #: Whether this event needs somebody, and so sends a push.
    notify: bool


class CardKind(ABC):
    """One kind of card. Subclass it, and register an instance."""

    #: The kind's name, stored on each of its cards. Never change it once
    #: cards exist, or they lose their kind.
    name: str

    @abstractmethod
    def accept(self, event: Mapping[str, object]) -> tuple[str, JsonObject]:
        """Check an event, and say which card it is about.

        Returns:
            The card's key within this kind, and the event as accepted.

        Raises:
            EventRefused: If the event is not one this kind understands.
        """

    @abstractmethod
    def apply(self, state: JsonObject | None, event: JsonObject) -> Update:
        """What *event* does to a card whose state is *state*.

        *state* is None for a card the event is about to create.
        """


_KINDS: dict[str, CardKind] = {}


def register(kind: CardKind) -> None:
    """Make *kind* known. Each name may be registered once."""
    if kind.name in _KINDS and _KINDS[kind.name] is not kind:
        raise ValueError(f"A kind of card named {kind.name!r} exists already")

    _KINDS[kind.name] = kind


def unregister(name: str) -> None:
    """Forget a kind. For tests, which register their own."""
    _KINDS.pop(name, None)


def kind_named(name: str) -> CardKind | None:
    """The registered kind with this name, if there is one."""
    return _KINDS.get(name)
