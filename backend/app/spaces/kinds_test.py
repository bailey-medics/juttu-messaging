"""Each space's kind: chosen when it is made, and held to its clinical flag."""

import pytest
from django.db import IntegrityError, connection, transaction
from django.db.migrations.executor import MigrationExecutor
from django.test import Client

from app.accounts.models import User
from app.organisations.services import make_first_admin, the_organisation
from app.spaces.models import Space, SpaceKind
from app.spaces.services import create_space

PASSWORD = "a long enough made-up password"

BEFORE_KINDS = [("spaces", "0001_add_spaces")]
WITH_KINDS = [("spaces", "0002_add_space_kinds")]


@pytest.fixture
def admin(db: None) -> User:
    user = User.objects.create_user("sam", PASSWORD)
    make_first_admin(user)

    return user


def make(admin: User, **sent: object) -> dict[str, object]:
    client = Client()
    client.force_login(admin)
    response = client.post(
        "/api/spaces",
        {"name": "Ward", **sent},
        content_type="application/json",
    )
    body: dict[str, object] = response.json()
    body["status"] = response.status_code

    return body


@pytest.mark.parametrize(
    ("kind", "is_clinical"),
    [("dev", False), ("personal", False), ("clinical", True)],
)
def test_each_kind_is_made_through_the_route(
    admin: User, kind: str, is_clinical: bool
) -> None:
    made = make(admin, kind=kind)

    assert made["status"] == 201
    assert made["kind"] == kind
    assert made["is_clinical"] is is_clinical


def test_a_space_is_dev_unless_said(admin: User) -> None:
    made = make(admin)

    assert made["kind"] == "dev"
    assert made["is_clinical"] is False


def test_the_old_clinical_flag_still_makes_a_clinical_space(
    admin: User,
) -> None:
    made = make(admin, is_clinical=True)

    assert made["kind"] == "clinical"
    assert made["is_clinical"] is True


def test_a_kind_and_a_flag_that_disagree_are_refused(admin: User) -> None:
    made = make(admin, kind="dev", is_clinical=True)

    assert made["status"] == 400
    assert not Space.objects.filter(name="Ward").exists()


def test_an_unknown_kind_is_refused(admin: User) -> None:
    assert make(admin, kind="social")["status"] == 400


def test_the_database_refuses_a_clinical_space_of_another_kind(
    admin: User,
) -> None:
    space = create_space(
        the_organisation(), "Ward", kind=SpaceKind.CLINICAL, by=admin
    )

    with pytest.raises(IntegrityError), transaction.atomic():
        Space.objects.filter(pk=space.pk).update(kind=SpaceKind.DEV)


# Postgres changes tables inside a transaction, so the migrations run
# inside the test's own one, and all of it is rolled back afterwards. A
# test with real transactions cannot be used: the audit table refuses the
# TRUNCATE that would clear up after it.
@pytest.mark.django_db
def test_the_migration_gives_existing_spaces_their_kind() -> None:
    executor = MigrationExecutor(connection)
    executor.migrate(BEFORE_KINDS)
    old = executor.loader.project_state(BEFORE_KINDS).apps
    organisation = old.get_model("organisations", "OrgUnit").objects.first()
    old_space = old.get_model("spaces", "Space")
    ward = old_space.objects.create(
        organisation=organisation, name="Ward", is_clinical=True
    )
    release = old_space.objects.create(
        organisation=organisation, name="Release", is_clinical=False
    )

    # Run the foreign key checks Django defers now, since Postgres will not
    # change a table while they are waiting.
    with connection.cursor() as cursor:
        cursor.execute("SET CONSTRAINTS ALL IMMEDIATE")

    try:
        executor = MigrationExecutor(connection)
        executor.migrate(WITH_KINDS)
        new = executor.loader.project_state(WITH_KINDS).apps
        kinds = dict(
            new.get_model("spaces", "Space").objects.values_list("pk", "kind")
        )
    finally:
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())

    assert kinds[ward.pk] == "clinical"
    assert kinds[release.pk] == "dev"
