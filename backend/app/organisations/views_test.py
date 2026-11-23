"""The members endpoints: only an organisation admin may use them."""

from typing import TYPE_CHECKING

import pytest
from django.test import Client

from app.accounts.models import User
from app.audit.models import AuditEvent
from app.organisations.models import OrgUnitMember
from app.organisations.services import (
    add_member,
    is_member,
    is_organisation_admin,
    make_first_admin,
    the_organisation,
)

if TYPE_CHECKING:
    from django.test.client import _MonkeyPatchedWSGIResponse as TestResponse

pytestmark = pytest.mark.django_db

PASSWORD = "a long enough made-up password"
NEW_PASSWORD = "another long made-up passphrase"


@pytest.fixture
def admin() -> User:
    user = User.objects.create_user("sam", PASSWORD)
    make_first_admin(user)

    return user


@pytest.fixture
def member() -> User:
    user = User.objects.create_user("alex", PASSWORD)
    add_member(the_organisation(), user, by=None)

    return user


def signed_in(user: User) -> Client:
    client = Client()
    client.force_login(user)

    return client


def add(client: Client, **body: str) -> TestResponse:
    values = {
        "name": "Priya Shah",
        "username": "priya",
        "password": NEW_PASSWORD,
    }
    values.update(body)

    return client.post("/api/members", values, content_type="application/json")


def actions() -> list[str]:
    return list(
        AuditEvent.objects.order_by("id").values_list("action", flat=True)
    )


def test_an_admin_sees_the_members(admin: User, member: User) -> None:
    response = signed_in(admin).get("/api/members")

    assert response.status_code == 200
    assert response.json()["members"] == [
        {
            "id": member.pk,
            "username": "alex",
            "name": "alex",
            "is_admin": False,
        },
        {"id": admin.pk, "username": "sam", "name": "sam", "is_admin": True},
    ]


def test_an_admin_adds_a_person_who_can_then_sign_in(admin: User) -> None:
    response = add(signed_in(admin))

    assert response.status_code == 201
    priya = User.objects.get(username="priya")
    assert priya.name == "Priya Shah"
    assert priya.check_password(NEW_PASSWORD)
    assert is_member(priya, the_organisation())
    assert not is_organisation_admin(priya, the_organisation())
    assert Client().login(username="priya", password=NEW_PASSWORD)


def test_adding_a_person_is_audited_as_the_admin(admin: User) -> None:
    client = signed_in(admin)
    before = AuditEvent.objects.count()

    add(client)

    added = AuditEvent.objects.order_by("id")[before:]
    assert [(e.action, e.actor_id) for e in added] == [
        ("account_created", admin.pk),
        ("member_added", admin.pk),
    ]


def test_a_taken_username_is_refused_in_any_case(
    admin: User, member: User
) -> None:
    response = add(signed_in(admin), username="ALEX")

    assert response.status_code == 400
    assert response.json() == {"detail": "That username is taken."}


def test_a_short_password_is_refused(admin: User) -> None:
    response = add(signed_in(admin), password="too short")

    assert response.status_code == 400
    assert "at least 15 characters" in response.json()["detail"]
    assert not User.objects.filter(username="priya").exists()


def test_a_name_is_needed(admin: User) -> None:
    response = add(signed_in(admin), name="  ")

    assert response.status_code == 400
    assert not User.objects.filter(username="priya").exists()


def test_an_admin_removes_a_member(admin: User, member: User) -> None:
    client = signed_in(member)

    response = signed_in(admin).post(f"/api/members/{member.pk}/remove")

    assert response.status_code == 204
    member.refresh_from_db()
    assert member.is_active is False
    assert not is_member(member, the_organisation())
    assert OrgUnitMember.objects.filter(user=member).exists()
    assert actions()[-1] == "member_removed"
    assert client.get("/api/auth/me").json()["authenticated"] is False


def test_an_admin_cannot_remove_themself(admin: User) -> None:
    response = signed_in(admin).post(f"/api/members/{admin.pk}/remove")

    assert response.status_code == 400
    admin.refresh_from_db()
    assert admin.is_active is True


def test_an_admin_makes_a_member_an_admin(admin: User, member: User) -> None:
    response = signed_in(admin).post(f"/api/members/{member.pk}/make-admin")

    assert response.status_code == 204
    assert is_organisation_admin(member, the_organisation())
    assert actions()[-1] == "competency_granted"


def test_making_an_admin_an_admin_again_changes_nothing(admin: User) -> None:
    client = signed_in(admin)
    before = AuditEvent.objects.count()

    response = client.post(f"/api/members/{admin.pk}/make-admin")

    assert response.status_code == 204
    assert AuditEvent.objects.count() == before


def test_a_removed_member_cannot_be_made_an_admin(
    admin: User, member: User
) -> None:
    signed_in(admin).post(f"/api/members/{member.pk}/remove")

    response = signed_in(admin).post(f"/api/members/{member.pk}/make-admin")

    assert response.status_code == 400


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("get", "/api/members"),
        ("post", "/api/members"),
        ("post", "/api/members/{id}/remove"),
        ("post", "/api/members/{id}/make-admin"),
    ],
)
def test_a_member_who_is_not_an_admin_is_refused(
    admin: User, member: User, method: str, path: str
) -> None:
    client = signed_in(member)
    url = path.format(id=admin.pk)

    response = getattr(client, method)(
        url, {}, content_type="application/json"
    )

    assert response.status_code == 403
    assert User.objects.filter(is_active=True).count() == 2
    assert not is_organisation_admin(member, the_organisation())


@pytest.mark.parametrize(
    "path",
    ["/api/members", "/api/members/1/remove", "/api/members/1/make-admin"],
)
def test_somebody_not_signed_in_is_refused(path: str) -> None:
    response = Client().post(path, {}, content_type="application/json")

    assert response.status_code == 403


def test_me_says_whether_the_person_is_an_admin(
    admin: User, member: User
) -> None:
    assert (
        signed_in(admin).get("/api/auth/me").json()["user"]["is_admin"] is True
    )
    assert (
        signed_in(member).get("/api/auth/me").json()["user"]["is_admin"]
        is False
    )
