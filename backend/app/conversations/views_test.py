"""Conversations and messages: who may read and post, and that nothing changes."""

from collections.abc import Callable
from contextlib import AbstractContextManager as ContextManager
from typing import TYPE_CHECKING

import pytest
from django.db import DatabaseError, connection, transaction
from django.test import Client
from django.test.utils import CaptureQueriesContext

from app.accounts.models import User
from app.audit.models import AuditEvent
from app.cards.models import Card
from app.cards.services import receive
from app.conversations.models import PROTECTION_NONE, Conversation, Message
from app.conversations.services import post, start_channel, start_direct
from app.organisations.services import (
    add_member,
    make_first_admin,
    the_organisation,
)
from app.spaces.models import Space, SpaceKind
from app.spaces.services import add_to_space, create_space

if TYPE_CHECKING:
    from django.test.client import _MonkeyPatchedWSGIResponse as TestResponse

pytestmark = pytest.mark.django_db

PASSWORD = "a long enough made-up password"


def person(username: str) -> User:
    user = User.objects.create_user(username, PASSWORD)
    add_member(the_organisation(), user, by=None)

    return user


@pytest.fixture
def sam() -> User:
    user = User.objects.create_user("sam", PASSWORD)
    make_first_admin(user)

    return user


@pytest.fixture
def alex() -> User:
    return person("alex")


@pytest.fixture
def priya() -> User:
    return person("priya")


@pytest.fixture
def release(sam: User, alex: User, priya: User) -> Space:
    space = create_space(
        the_organisation(), "Release", kind=SpaceKind.DEV, by=sam
    )
    add_to_space(space, alex, by=sam)
    add_to_space(space, priya, by=sam)

    return space


@pytest.fixture
def general(sam: User, release: Space) -> Conversation:
    return start_channel(release, "general", by=sam)


def signed_in(user: User) -> Client:
    client = Client()
    client.force_login(user)

    return client


def send(
    client: Client, conversation: Conversation, body: str, **extra: object
) -> TestResponse:
    return client.post(
        f"/api/conversations/{conversation.pk}/messages",
        {"body": body, **extra},
        content_type="application/json",
    )


def test_a_member_posts_and_reads_a_channel(
    alex: User, general: Conversation
) -> None:
    client = signed_in(alex)

    response = client.post(
        f"/api/conversations/{general.pk}/messages",
        {"body": "  Release notes are ready.  "},
        content_type="application/json",
    )

    assert response.status_code == 201
    messages = client.get(f"/api/conversations/{general.pk}/messages").json()[
        "messages"
    ]
    assert [m["body"] for m in messages] == ["Release notes are ready."]
    assert messages[0]["author"]["id"] == alex.pk


def test_a_stored_message_names_its_format_and_protection(
    alex: User, general: Conversation
) -> None:
    message = post(general, "Hello", by=alex)

    assert message.format_version == 1
    assert message.protection == PROTECTION_NONE == "none_at_application_level"


def test_posting_is_audited_without_the_text(
    alex: User, general: Conversation
) -> None:
    post(general, "Something private", by=alex)

    entry = AuditEvent.objects.order_by("-id").first()
    assert entry is not None and entry.action == "message_posted"
    assert "Something private" not in str(entry.detail)


def test_a_message_cannot_be_changed_or_deleted(
    alex: User, general: Conversation
) -> None:
    message = post(general, "Hello", by=alex)

    with (
        pytest.raises(DatabaseError, match="append-only"),
        transaction.atomic(),
    ):
        Message.objects.filter(pk=message.pk).update(body="Changed")

    with (
        pytest.raises(DatabaseError, match="append-only"),
        transaction.atomic(),
    ):
        Message.objects.filter(pk=message.pk).delete()

    assert Message.objects.get(pk=message.pk).body == "Hello"


def test_a_correction_is_a_new_message_that_amends_the_old(
    alex: User, general: Conversation
) -> None:
    original = post(general, "Releas on Friday", by=alex)

    response = send(
        signed_in(alex), general, "Release on Friday", amends=original.pk
    )

    assert response.status_code == 201
    assert response.json()["amends"] == original.pk
    assert Message.objects.get(pk=original.pk).body == "Releas on Friday"


def test_nobody_corrects_somebody_else_s_message(
    alex: User, priya: User, general: Conversation
) -> None:
    original = post(general, "Mine", by=alex)

    response = send(signed_in(priya), general, "Not yours", amends=original.pk)

    assert response.status_code == 400


def test_a_direct_conversation_is_only_for_its_people(
    sam: User, alex: User, priya: User, release: Space
) -> None:
    response = signed_in(alex).post(
        f"/api/spaces/{release.pk}/conversations",
        {"kind": "direct", "user_ids": [sam.pk]},
        content_type="application/json",
    )
    direct = Conversation.objects.get(pk=response.json()["id"])

    post(direct, "Just between us", by=alex)
    outsider = signed_in(priya)

    assert (
        outsider.get(f"/api/conversations/{direct.pk}/messages").status_code
        == 404
    )
    assert send(outsider, direct, "Let me in").status_code == 404
    listed = outsider.get(f"/api/spaces/{release.pk}/conversations").json()[
        "conversations"
    ]
    assert direct.pk not in [c["id"] for c in listed]


def test_a_member_lists_the_channels_and_their_own_direct_conversations(
    sam: User, alex: User, priya: User, release: Space, general: Conversation
) -> None:
    mine = start_direct(release, [sam], by=alex)
    start_direct(release, [sam], by=priya)

    listed = (
        signed_in(alex).get(f"/api/spaces/{release.pk}/conversations").json()
    )

    assert [c["id"] for c in listed["conversations"]] == [general.pk, mine.pk]
    assert listed["conversations"][1]["title"] == "sam"


def test_somebody_not_in_the_space_cannot_reach_its_channel(
    general: Conversation,
) -> None:
    """Guessing the conversation's number reveals nothing."""
    stranger = person("stranger")

    assert (
        signed_in(stranger)
        .get(f"/api/conversations/{general.pk}/messages")
        .status_code
        == 404
    )
    assert send(signed_in(stranger), general, "Hello?").status_code == 404


def test_somebody_taken_out_of_the_space_loses_its_conversations(
    sam: User, alex: User, release: Space, general: Conversation
) -> None:
    from app.spaces.services import remove_from_space

    remove_from_space(release, alex, by=sam)

    assert (
        signed_in(alex)
        .get(f"/api/conversations/{general.pk}/messages")
        .status_code
        == 404
    )


def test_only_somebody_who_manages_spaces_opens_a_channel(
    alex: User, release: Space
) -> None:
    response = signed_in(alex).post(
        f"/api/spaces/{release.pk}/conversations",
        {"kind": "channel", "name": "random"},
        content_type="application/json",
    )

    assert response.status_code == 403


def test_a_direct_conversation_needs_people_in_the_space(
    alex: User, release: Space
) -> None:
    stranger = person("stranger")

    response = signed_in(alex).post(
        f"/api/spaces/{release.pk}/conversations",
        {"kind": "direct", "user_ids": [stranger.pk]},
        content_type="application/json",
    )

    assert response.status_code == 400


@pytest.mark.parametrize("body", ["", "   "])
def test_an_empty_message_is_refused(
    alex: User, general: Conversation, body: str
) -> None:
    assert send(signed_in(alex), general, body).status_code == 400


def test_somebody_not_signed_in_is_refused(general: Conversation) -> None:
    assert (
        Client().get(f"/api/conversations/{general.pk}/messages").status_code
        == 403
    )


def test_a_reply_goes_in_its_message_s_thread(
    alex: User, priya: User, general: Conversation
) -> None:
    question = post(general, "Who is on call?", by=alex)

    response = send(signed_in(priya), general, "I am.", thread=question.pk)

    assert response.status_code == 201
    assert response.json()["thread"] == question.pk
    replies = (
        signed_in(alex)
        .get(f"/api/messages/{question.pk}/replies")
        .json()["replies"]
    )
    assert [r["body"] for r in replies] == ["I am."]


def test_the_conversation_lists_top_level_messages_with_their_reply_counts(
    alex: User, priya: User, general: Conversation
) -> None:
    question = post(general, "Who is on call?", by=alex)
    post(general, "I am.", by=priya, thread=question)
    post(general, "Me too.", by=alex, thread=question)

    messages = (
        signed_in(alex)
        .get(f"/api/conversations/{general.pk}/messages")
        .json()["messages"]
    )

    assert [(m["body"], m["reply_count"]) for m in messages] == [
        ("Who is on call?", 2)
    ]


def test_a_reply_to_a_reply_joins_the_same_thread(
    alex: User, priya: User, general: Conversation
) -> None:
    question = post(general, "Who is on call?", by=alex)
    answer = post(general, "I am.", by=priya, thread=question)

    follow_up = post(general, "Thanks.", by=alex, thread=answer)

    assert follow_up.thread_id == question.pk


def test_a_correction_stays_in_its_thread(
    alex: User, priya: User, general: Conversation
) -> None:
    question = post(general, "Who is on call?", by=alex)
    answer = post(general, "I am", by=priya, thread=question)

    fixed = post(general, "I am.", by=priya, amends=answer)

    assert fixed.thread_id == question.pk


def test_a_thread_must_be_in_the_same_conversation(
    sam: User, alex: User, release: Space, general: Conversation
) -> None:
    other = start_channel(release, "random", by=sam)
    question = post(other, "Elsewhere", by=alex)

    response = send(
        signed_in(alex), general, "Wrong place", thread=question.pk
    )

    assert response.status_code == 400


def test_somebody_who_cannot_read_the_conversation_cannot_read_its_threads(
    sam: User, alex: User, priya: User, release: Space
) -> None:
    direct = start_direct(release, [sam], by=alex)
    secret = post(direct, "Between us", by=alex)

    response = signed_in(priya).get(f"/api/messages/{secret.pk}/replies")

    assert response.status_code == 404


def unread_of(client: Client, space: Space) -> dict[int, int]:
    listed = client.get(f"/api/spaces/{space.pk}/conversations").json()
    return {c["id"]: c["unread_count"] for c in listed["conversations"]}


def test_messages_from_others_are_unread_until_marked(
    alex: User, priya: User, release: Space, general: Conversation
) -> None:
    post(general, "One", by=alex)
    latest = post(general, "Two", by=alex)
    post(general, "Mine", by=priya)
    client = signed_in(priya)

    assert unread_of(client, release)[general.pk] == 2

    marked = client.post(
        f"/api/conversations/{general.pk}/read",
        {"message_id": latest.pk},
        content_type="application/json",
    )

    assert marked.status_code == 204
    assert unread_of(client, release)[general.pk] == 0


def test_a_reply_in_a_thread_counts_as_unread(
    alex: User, priya: User, release: Space, general: Conversation
) -> None:
    question = post(general, "Who is on call?", by=priya)
    signed_in(priya).post(
        f"/api/conversations/{general.pk}/read",
        {"message_id": question.pk},
        content_type="application/json",
    )

    post(general, "I am.", by=alex, thread=question)

    assert unread_of(signed_in(priya), release)[general.pk] == 1


def test_the_read_point_never_moves_back(
    alex: User, priya: User, release: Space, general: Conversation
) -> None:
    first = post(general, "One", by=alex)
    second = post(general, "Two", by=alex)
    client = signed_in(priya)

    for message in (second, first):
        client.post(
            f"/api/conversations/{general.pk}/read",
            {"message_id": message.pk},
            content_type="application/json",
        )

    assert unread_of(client, release)[general.pk] == 0


def test_a_message_from_another_conversation_moves_nothing(
    sam: User, alex: User, priya: User, release: Space, general: Conversation
) -> None:
    other = start_channel(release, "random", by=sam)
    post(general, "Unread", by=alex)
    elsewhere = post(other, "Much later", by=alex)
    client = signed_in(priya)

    client.post(
        f"/api/conversations/{general.pk}/read",
        {"message_id": elsewhere.pk},
        content_type="application/json",
    )

    assert unread_of(client, release)[general.pk] == 1


def test_nobody_marks_a_conversation_they_cannot_read(
    sam: User, alex: User, priya: User, release: Space
) -> None:
    direct = start_direct(release, [sam], by=alex)
    message = post(direct, "Between us", by=alex)

    response = signed_in(priya).post(
        f"/api/conversations/{direct.pk}/read",
        {"message_id": message.pk},
        content_type="application/json",
    )

    assert response.status_code == 404


def run_card(conversation: Conversation, run: str, line: str) -> Card:
    """A living card, as the GitHub watcher sends one, made or changed."""
    event = receive(
        conversation,
        "outside",
        {
            "sender": 1,
            "key": run,
            "title": f"Run {run}",
            "line": line,
            "needs_somebody": False,
        },
    )

    return event.card


def mark(client: Client, conversation: Conversation, **seen: int) -> int:
    response = client.post(
        f"/api/conversations/{conversation.pk}/read",
        seen,
        content_type="application/json",
    )

    return response.status_code


def test_a_new_card_counts_as_unread_once_however_it_changes(
    priya: User, release: Space, general: Conversation
) -> None:
    run_card(general, "41", "Running")
    run_card(general, "41", "Passed")
    run_card(general, "42", "Running")

    assert unread_of(signed_in(priya), release)[general.pk] == 2


def test_cards_and_messages_add_up_until_both_are_marked(
    alex: User, priya: User, release: Space, general: Conversation
) -> None:
    message = post(general, "Deploying now.", by=alex)
    card = run_card(general, "41", "Running")
    client = signed_in(priya)

    assert unread_of(client, release)[general.pk] == 2

    assert mark(client, general, card_id=card.pk) == 204
    assert unread_of(client, release)[general.pk] == 1

    assert mark(client, general, message_id=message.pk, card_id=card.pk) == 204
    assert unread_of(client, release).get(general.pk, 0) == 0


def test_a_seen_card_changing_is_not_unread_again(
    priya: User, release: Space, general: Conversation
) -> None:
    card = run_card(general, "41", "Running")
    client = signed_in(priya)
    mark(client, general, card_id=card.pk)

    run_card(general, "41", "Passed")

    assert unread_of(client, release).get(general.pk, 0) == 0


def test_the_card_read_point_never_moves_back(
    priya: User, release: Space, general: Conversation
) -> None:
    first = run_card(general, "41", "Running")
    second = run_card(general, "42", "Running")
    client = signed_in(priya)

    for card in (second, first):
        mark(client, general, card_id=card.pk)

    assert unread_of(client, release).get(general.pk, 0) == 0


def test_a_card_from_another_conversation_moves_nothing(
    sam: User, priya: User, release: Space, general: Conversation
) -> None:
    other = start_channel(release, "ci", by=sam)
    run_card(general, "41", "Running")
    elsewhere = run_card(other, "99", "Running")
    client = signed_in(priya)

    mark(client, general, card_id=elsewhere.pk)

    assert unread_of(client, release)[general.pk] == 1


def test_marking_read_needs_a_message_or_a_card(
    priya: User, general: Conversation
) -> None:
    assert mark(signed_in(priya), general) == 400


def home_list(user: User) -> list[dict[str, object]]:
    response = signed_in(user).get("/api/conversations")
    assert response.status_code == 200

    conversations: list[dict[str, object]] = response.json()["conversations"]

    return conversations


def test_home_lists_every_conversation_across_spaces_newest_first(
    sam: User, alex: User, release: Space, general: Conversation
) -> None:
    design = create_space(
        the_organisation(), "Design", kind=SpaceKind.DEV, by=sam
    )
    add_to_space(design, alex, by=sam)
    ideas = start_channel(design, "ideas", by=sam)
    post(general, "Latest in Release.", by=sam)

    found = home_list(alex)

    assert [c["id"] for c in found] == [general.pk, ideas.pk]
    assert found[0]["space"] == {
        "id": release.pk,
        "name": "Release",
        "kind": "dev",
    }
    assert found[0]["title"] == "general"
    assert found[0]["kind"] == "channel"
    assert found[0]["unread_count"] == 1
    assert found[1]["space"] == {
        "id": design.pk,
        "name": "Design",
        "kind": "dev",
    }


def test_home_leaves_out_a_direct_conversation_somebody_is_not_in(
    sam: User, alex: User, priya: User, release: Space, general: Conversation
) -> None:
    direct = start_direct(release, [alex], by=sam)

    assert direct.pk in [c["id"] for c in home_list(alex)]
    assert [c["id"] for c in home_list(priya)] == [general.pk]


def test_home_leaves_out_a_space_somebody_has_left(
    sam: User, alex: User, release: Space, general: Conversation
) -> None:
    from app.spaces.services import remove_from_space

    remove_from_space(release, alex, by=sam)

    assert home_list(alex) == []


def test_home_lists_a_conversation_once_however_it_is_reached(
    sam: User, alex: User, release: Space
) -> None:
    direct = start_direct(release, [alex], by=sam)
    post(direct, "One.", by=sam)
    post(direct, "Two.", by=alex)

    assert [c["id"] for c in home_list(alex)] == [direct.pk]


def test_home_needs_somebody_signed_in(client: Client) -> None:
    assert client.get("/api/conversations").status_code == 403


def test_home_puts_a_conversation_with_a_new_card_first(
    sam: User, alex: User, release: Space, general: Conversation
) -> None:
    ci = start_channel(release, "ci", by=sam)
    post(general, "Morning.", by=sam)

    run_card(ci, "41", "Running")

    assert [c["id"] for c in home_list(alex)][:2] == [ci.pk, general.pk]


def test_a_card_changing_does_not_move_its_conversation_up(
    sam: User, alex: User, release: Space, general: Conversation
) -> None:
    ci = start_channel(release, "ci", by=sam)
    run_card(ci, "41", "Running")
    post(general, "Morning.", by=sam)

    run_card(ci, "41", "Passed")

    assert [c["id"] for c in home_list(alex)][:2] == [general.pk, ci.pk]


def home_entry(user: User, conversation: Conversation) -> dict[str, object]:
    return next(c for c in home_list(user) if c["id"] == conversation.pk)


def test_home_previews_the_newest_message(
    sam: User, alex: User, general: Conversation
) -> None:
    post(general, "Morning.", by=sam)
    post(general, "Deploying now.", by=sam)

    item = home_entry(alex, general)["last_item"]

    assert isinstance(item, dict)
    assert item["text"] == "Deploying now."


def test_home_previews_a_newer_card_change_by_its_title_and_line(
    sam: User, alex: User, general: Conversation
) -> None:
    post(general, "Morning.", by=sam)
    run_card(general, "41", "Running")
    run_card(general, "41", "Passed")

    item = home_entry(alex, general)["last_item"]

    assert isinstance(item, dict)
    assert item["text"] == "Run 41: Passed"


def test_home_previews_a_correction_as_corrected(
    sam: User, alex: User, general: Conversation
) -> None:
    wrong = post(general, "Deploy at 3.", by=sam)
    post(general, "Deploy at 4.", by=sam, amends=wrong)

    item = home_entry(alex, general)["last_item"]

    assert isinstance(item, dict)
    assert item["text"] == "Deploy at 4."


def test_home_previews_nothing_for_a_quiet_conversation(
    alex: User, general: Conversation
) -> None:
    assert home_entry(alex, general)["last_item"] is None


def test_a_channel_shows_up_to_four_others(
    sam: User, alex: User, priya: User, release: Space, general: Conversation
) -> None:
    for name in ("dana", "eli"):
        add_to_space(release, person(name), by=sam)

    people = home_entry(alex, general)["people"]

    assert isinstance(people, list)
    assert sorted(p["name"] for p in people) == ["dana", "eli", "priya", "sam"]


def test_a_channel_with_five_others_shows_its_icon(
    sam: User, alex: User, priya: User, release: Space, general: Conversation
) -> None:
    for name in ("dana", "eli", "fran"):
        add_to_space(release, person(name), by=sam)

    assert home_entry(alex, general)["people"] == []


def test_a_channel_with_its_circles_off_shows_its_icon(
    sam: User, alex: User, general: Conversation
) -> None:
    general.shows_people = False
    general.save(update_fields=["shows_people"])

    assert home_entry(alex, general)["people"] == []


def test_a_direct_conversation_shows_the_others(
    sam: User, alex: User, release: Space
) -> None:
    direct = start_direct(release, [alex], by=sam)

    people = home_entry(alex, direct)["people"]

    assert people == [{"id": sam.pk, "name": sam.display_name}]


def test_home_takes_the_same_queries_however_many_conversations(
    sam: User,
    alex: User,
    priya: User,
    release: Space,
    general: Conversation,
    django_assert_num_queries: Callable[[int], ContextManager[object]],
) -> None:
    # One of each kind to start with: Django skips a prefetch's second
    # query when the first found nothing, such as no direct conversations.
    post(general, "One.", by=sam)
    start_direct(release, [alex], by=sam)
    client = signed_in(alex)

    with CaptureQueriesContext(connection) as few:
        client.get("/api/conversations")

    for name in ("ops", "design", "random"):
        channel = start_channel(release, name, by=sam)
        post(channel, "Hello.", by=sam)
        run_card(channel, name, "Running")
    start_direct(release, [alex, priya], by=sam)

    with django_assert_num_queries(len(few.captured_queries)):
        client.get("/api/conversations")
