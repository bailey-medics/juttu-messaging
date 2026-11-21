"""Spaces: who can see one, who can make one and change who is in it."""

import pytest
from django.test import Client

from app.accounts.models import User
from app.audit.models import AuditEvent
from app.organisations.services import (
    add_member,
    make_first_admin,
    the_organisation,
)
from app.spaces.models import Space
from app.spaces.services import add_to_space, create_space, is_in

pytestmark = pytest.mark.django_db

PASSWORD = "a long enough made-up password"


@pytest.fixture
def admin() -> User:
    user = User.objects.create_user("sam", PASSWORD)
    make_first_admin(user)

    return user


@pytest.fixture
def alex() -> User:
    user = User.objects.create_user("alex", PASSWORD)
    add_member(the_organisation(), user, by=None)

    return user


@pytest.fixture
def release(admin: User) -> Space:
    return create_space(
        the_organisation(), "Release", is_clinical=False, by=admin
    )


def signed_in(user: User) -> Client:
    client = Client()
    client.force_login(user)

    return client


def test_a_new_space_is_not_clinical_unless_said(admin: User) -> None:
    response = signed_in(admin).post(
        "/api/spaces", {"name": "Release"}, content_type="application/json"
    )

    assert response.status_code == 201
    assert response.json()["is_clinical"] is False
    space = Space.objects.get(pk=response.json()["id"])
    assert is_in(admin, space)


def test_making_a_space_is_audited(admin: User) -> None:
    client = signed_in(admin)
    before = AuditEvent.objects.count()

    client.post(
        "/api/spaces", {"name": "Release"}, content_type="application/json"
    )

    made = AuditEvent.objects.order_by("id")[before:]
    assert [e.action for e in made] == ["space_created", "space_member_added"]


def test_only_somebody_who_manages_spaces_can_make_one(alex: User) -> None:
    response = signed_in(alex).post(
        "/api/spaces", {"name": "Mine"}, content_type="application/json"
    )

    assert response.status_code == 403
    assert not Space.objects.exists()


def test_a_member_lists_only_their_own_spaces(
    admin: User, alex: User, release: Space
) -> None:
    create_space(the_organisation(), "Social", is_clinical=False, by=admin)
    add_to_space(release, alex, by=admin)

    response = signed_in(alex).get("/api/spaces")

    assert [s["name"] for s in response.json()["spaces"]] == ["Release"]


@pytest.mark.parametrize(
    "path", ["/api/spaces/{id}", "/api/spaces/{id}/members"]
)
def test_a_space_somebody_is_not_in_is_not_found(
    alex: User, release: Space, path: str
) -> None:
    """Guessing a space's number reveals nothing, not even that it exists."""
    response = signed_in(alex).get(path.format(id=release.pk))

    assert response.status_code == 404
    assert "Release" not in response.content.decode()


def test_a_space_that_does_not_exist_answers_the_same(alex: User) -> None:
    response = signed_in(alex).get("/api/spaces/999999")

    assert response.status_code == 404


def test_a_member_sees_the_space_and_who_is_in_it(
    admin: User, alex: User, release: Space
) -> None:
    add_to_space(release, alex, by=admin)
    client = signed_in(alex)

    assert client.get(f"/api/spaces/{release.pk}").json()["name"] == "Release"
    names = [
        m["username"]
        for m in client.get(f"/api/spaces/{release.pk}/members").json()[
            "members"
        ]
    ]
    assert sorted(names) == ["alex", "sam"]


def test_an_admin_puts_a_member_in_a_space_and_takes_them_out(
    admin: User, alex: User, release: Space
) -> None:
    client = signed_in(admin)

    added = client.post(
        f"/api/spaces/{release.pk}/members",
        {"user_id": alex.pk},
        content_type="application/json",
    )
    assert added.status_code == 204
    assert is_in(alex, release)

    removed = client.post(f"/api/spaces/{release.pk}/members/{alex.pk}/remove")

    assert removed.status_code == 204
    assert not is_in(alex, release)
    assert AuditEvent.objects.order_by("-id").values_list("action", flat=True)[
        0
    ] == ("space_member_removed")


def test_only_an_organisation_member_can_be_put_in_a_space(
    admin: User, release: Space
) -> None:
    outsider = User.objects.create_user("outsider", PASSWORD)

    response = signed_in(admin).post(
        f"/api/spaces/{release.pk}/members",
        {"user_id": outsider.pk},
        content_type="application/json",
    )

    assert response.status_code == 400
    assert not is_in(outsider, release)


def test_a_member_without_manage_spaces_cannot_change_who_is_in_it(
    admin: User, alex: User, release: Space
) -> None:
    add_to_space(release, alex, by=admin)

    response = signed_in(alex).post(
        f"/api/spaces/{release.pk}/members/{admin.pk}/remove"
    )

    assert response.status_code == 403
    assert is_in(admin, release)


def test_a_closed_account_is_in_no_space(
    admin: User, alex: User, release: Space
) -> None:
    add_to_space(release, alex, by=admin)
    alex.is_active = False
    alex.save()

    assert not is_in(alex, release)


def test_somebody_not_signed_in_is_refused(release: Space) -> None:
    assert Client().get("/api/spaces").status_code == 403
    assert Client().get(f"/api/spaces/{release.pk}").status_code == 403
