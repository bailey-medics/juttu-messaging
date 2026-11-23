"""Each conversation's kept random icon, and turning a channel's circles off."""

import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import Client

from app.accounts.models import User
from app.audit.models import AuditAction, AuditEvent
from app.conversations.models import (
    ICON_COLOURS,
    Conversation,
    ConversationIcon,
)
from app.conversations.services import start_channel, start_direct
from app.organisations.services import (
    add_member,
    make_first_admin,
    the_organisation,
)
from app.spaces.models import Space, SpaceKind
from app.spaces.services import add_to_space, create_space

pytestmark = pytest.mark.django_db

PASSWORD = "a long enough made-up password"

BEFORE_ICONS = [("conversations", "0004_add_card_read_points")]
WITH_ICONS = [("conversations", "0005_add_conversation_icons")]


@pytest.fixture
def sam() -> User:
    user = User.objects.create_user("sam", PASSWORD)
    make_first_admin(user)

    return user


@pytest.fixture
def alex(sam: User) -> User:
    user = User.objects.create_user("alex", PASSWORD)
    add_member(the_organisation(), user, by=None)

    return user


@pytest.fixture
def release(sam: User, alex: User) -> Space:
    space = create_space(
        the_organisation(), "Release", kind=SpaceKind.DEV, by=sam
    )
    add_to_space(space, alex, by=sam)

    return space


@pytest.fixture
def general(sam: User, release: Space) -> Conversation:
    return start_channel(release, "general", by=sam)


def signed_in(user: User) -> Client:
    client = Client()
    client.force_login(user)

    return client


def listed(user: User, space: Space) -> dict[str, object]:
    body = signed_in(user).get(f"/api/spaces/{space.pk}/conversations").json()
    found: dict[str, object] = body["conversations"][0]

    return found


def set_shows_people(
    user: User, conversation: Conversation, shows: bool
) -> int:
    response = signed_in(user).post(
        f"/api/conversations/{conversation.pk}/shows-people",
        {"shows_people": shows},
        content_type="application/json",
    )

    return response.status_code


def test_a_new_conversation_keeps_the_icon_it_was_given(
    alex: User, release: Space, general: Conversation
) -> None:
    first = listed(alex, release)
    again = listed(alex, release)

    assert first["icon"] in ConversationIcon.values
    assert 0 <= int(str(first["icon_colour"])) < ICON_COLOURS
    assert (again["icon"], again["icon_colour"]) == (
        first["icon"],
        first["icon_colour"],
    )
    assert first["shows_people"] is True


def test_an_admin_turns_a_channels_circles_off_for_everybody(
    sam: User, alex: User, release: Space, general: Conversation
) -> None:
    assert set_shows_people(sam, general, False) == 200

    assert listed(alex, release)["shows_people"] is False
    changed = AuditEvent.objects.filter(
        action=AuditAction.CONVERSATION_SHOWS_PEOPLE_CHANGED
    ).get()
    assert changed.detail == {
        "conversation": general.pk,
        "shows_people": False,
    }


def test_a_member_cannot_turn_a_channels_circles_off(
    alex: User, general: Conversation
) -> None:
    assert set_shows_people(alex, general, False) == 403

    general.refresh_from_db()
    assert general.shows_people is True


def test_a_direct_conversation_always_shows_its_people(
    sam: User, alex: User, release: Space
) -> None:
    direct = start_direct(release, [alex], by=sam)

    assert set_shows_people(sam, direct, False) == 400


def test_an_admin_outside_the_space_finds_no_channel(
    sam: User, alex: User
) -> None:
    elsewhere = create_space(
        the_organisation(), "Design", kind=SpaceKind.DEV, by=alex
    )
    ideas = start_channel(elsewhere, "ideas", by=alex)

    assert set_shows_people(sam, ideas, False) == 404


# Postgres changes tables inside a transaction, so the migrations run
# inside the test's own one, and all of it is rolled back afterwards.
def test_the_migration_gives_every_conversation_an_icon(
    sam: User, release: Space
) -> None:
    executor = MigrationExecutor(connection)
    executor.migrate(BEFORE_ICONS)
    old = executor.loader.project_state(BEFORE_ICONS).apps
    old_conversation = old.get_model("conversations", "Conversation")
    made = [
        old_conversation.objects.create(
            space_id=release.pk, kind="channel", name=f"channel {n}"
        ).pk
        for n in range(3)
    ]

    # Run the foreign key checks Django defers now, since Postgres will not
    # change a table while they are waiting.
    with connection.cursor() as cursor:
        cursor.execute("SET CONSTRAINTS ALL IMMEDIATE")

    try:
        executor = MigrationExecutor(connection)
        executor.migrate(WITH_ICONS)
        new = executor.loader.project_state(WITH_ICONS).apps
        given = list(
            new.get_model("conversations", "Conversation")
            .objects.filter(pk__in=made)
            .values_list("icon", "icon_colour", "shows_people")
        )
    finally:
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())

    assert len(given) == 3
    for icon, colour, shows_people in given:
        assert icon in ConversationIcon.values
        assert 0 <= colour < ICON_COLOURS
        assert shows_people is True


def test_one_conversation_is_read_with_its_setting(
    sam: User, alex: User, general: Conversation
) -> None:
    set_shows_people(sam, general, False)

    response = signed_in(alex).get(f"/api/conversations/{general.pk}")

    assert response.status_code == 200
    assert response.json()["title"] == "general"
    assert response.json()["shows_people"] is False


def test_a_conversation_somebody_cannot_read_is_not_found(
    sam: User, alex: User
) -> None:
    elsewhere = create_space(
        the_organisation(), "Design", kind=SpaceKind.DEV, by=alex
    )
    ideas = start_channel(elsewhere, "ideas", by=alex)

    assert (
        signed_in(sam).get(f"/api/conversations/{ideas.pk}").status_code == 404
    )
