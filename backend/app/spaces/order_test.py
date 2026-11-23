"""Each person's own order of their spaces on Home."""

import pytest
from django.test import Client

from app.accounts.models import User
from app.organisations.services import (
    add_member,
    make_first_admin,
    the_organisation,
)
from app.spaces.models import Space, SpaceKind
from app.spaces.services import add_to_space, create_space

pytestmark = pytest.mark.django_db

PASSWORD = "a long enough made-up password"


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


def space(
    sam: User, name: str, kind: SpaceKind, *, also: User | None = None
) -> Space:
    made = create_space(the_organisation(), name, kind=kind, by=sam)
    if also is not None:
        add_to_space(made, also, by=sam)

    return made


def signed_in(user: User) -> Client:
    client = Client()
    client.force_login(user)

    return client


def order_of(user: User) -> list[str]:
    body = signed_in(user).get("/api/me/space-order").json()

    return [s["name"] for s in body["spaces"]]


def set_order(user: User, spaces: list[Space]) -> int:
    response = signed_in(user).put(
        "/api/me/space-order",
        {"space_ids": [s.pk for s in spaces]},
        content_type="application/json",
    )

    return response.status_code


def test_before_any_order_spaces_come_dev_then_personal_then_clinical(
    sam: User,
) -> None:
    space(sam, "Ward", SpaceKind.CLINICAL)
    space(sam, "Allotment", SpaceKind.PERSONAL)
    space(sam, "Release", SpaceKind.DEV)
    space(sam, "Design", SpaceKind.DEV)

    assert order_of(sam) == ["Design", "Release", "Allotment", "Ward"]


def test_a_persons_order_is_kept(sam: User) -> None:
    ward = space(sam, "Ward", SpaceKind.CLINICAL)
    release = space(sam, "Release", SpaceKind.DEV)

    assert set_order(sam, [ward, release]) == 200

    assert order_of(sam) == ["Ward", "Release"]


def test_a_space_joined_later_comes_at_the_end(sam: User) -> None:
    ward = space(sam, "Ward", SpaceKind.CLINICAL)
    release = space(sam, "Release", SpaceKind.DEV)
    set_order(sam, [ward, release])

    space(sam, "Design", SpaceKind.DEV)

    assert order_of(sam) == ["Ward", "Release", "Design"]


def test_each_persons_order_is_their_own(sam: User, alex: User) -> None:
    ward = space(sam, "Ward", SpaceKind.CLINICAL, also=alex)
    release = space(sam, "Release", SpaceKind.DEV, also=alex)

    set_order(sam, [ward, release])

    assert order_of(alex) == ["Release", "Ward"]


def test_a_space_the_person_is_not_in_is_refused(
    sam: User, alex: User
) -> None:
    release = space(sam, "Release", SpaceKind.DEV, also=alex)
    private = space(sam, "Board", SpaceKind.DEV)

    assert set_order(alex, [private, release]) == 400
    assert order_of(alex) == ["Release"]


def test_a_space_named_twice_is_refused(sam: User) -> None:
    release = space(sam, "Release", SpaceKind.DEV)

    assert set_order(sam, [release, release]) == 400


def test_the_order_needs_somebody_signed_in(client: Client) -> None:
    assert client.get("/api/me/space-order").status_code in (401, 403)
