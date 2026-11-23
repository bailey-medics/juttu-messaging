"""Uploading a conversation's own icon: what is taken, and who may."""

import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client
from django.test.client import BOUNDARY, MULTIPART_CONTENT, encode_multipart
from PIL import Image

from app.accounts.models import User
from app.audit.models import AuditAction, AuditEvent
from app.conversations.icons import ICON_SIZE, MAX_UPLOAD_BYTES
from app.conversations.models import Conversation
from app.conversations.services import start_channel
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


def picture(image_format: str, size: tuple[int, int] = (400, 300)) -> bytes:
    """A plain picture in *image_format*, made here."""
    drawn = io.BytesIO()
    Image.new("RGB", size, (200, 80, 40)).save(drawn, format=image_format)

    return drawn.getvalue()


def upload(
    user: User,
    conversation: Conversation,
    content: bytes,
    name: str = "icon.png",
) -> tuple[int, dict[str, object]]:
    response = signed_in(user).generic(
        "PUT",
        f"/api/conversations/{conversation.pk}/icon",
        encode_multipart(
            BOUNDARY, {"image": SimpleUploadedFile(name, content)}
        ),
        content_type=MULTIPART_CONTENT,
    )

    return response.status_code, response.json()


def fetched(user: User, conversation: Conversation) -> Image.Image:
    body = signed_in(user).get(f"/api/conversations/{conversation.pk}/icon")
    assert body.status_code == 200
    assert body["Content-Type"] == "image/png"

    return Image.open(io.BytesIO(body.content))


@pytest.mark.parametrize("image_format", ["PNG", "JPEG", "WEBP"])
def test_an_image_is_kept_as_a_256_pixel_png(
    sam: User, alex: User, general: Conversation, image_format: str
) -> None:
    code, body = upload(sam, general, picture(image_format))

    assert code == 200
    assert str(body["icon_url"]).startswith(
        f"/api/conversations/{general.pk}/icon?v="
    )
    kept = fetched(alex, general)
    assert kept.format == "PNG"
    assert kept.size == (ICON_SIZE, ICON_SIZE)


def test_a_photo_loses_what_it_carried(
    sam: User, general: Conversation
) -> None:
    photo = Image.new("RGB", (300, 300), (10, 120, 200))
    exif = Image.Exif()
    exif[0x010F] = "A camera maker"
    sent = io.BytesIO()
    photo.save(sent, format="JPEG", exif=exif)

    upload(sam, general, sent.getvalue(), "photo.jpg")

    kept = fetched(sam, general)
    assert not kept.getexif()
    assert "exif" not in kept.info


def test_a_file_over_1_mb_is_refused(sam: User, general: Conversation) -> None:
    code, body = upload(sam, general, b"0" * (MAX_UPLOAD_BYTES + 1))

    assert code == 400
    assert body["detail"] == "The image must be 1 MB or smaller."


def test_a_text_file_named_png_is_refused(
    sam: User, general: Conversation
) -> None:
    code, _ = upload(sam, general, b"not an image at all", "icon.png")

    assert code == 400
    general.refresh_from_db()
    assert general.icon_version is None


def test_an_image_of_another_format_is_refused(
    sam: User, general: Conversation
) -> None:
    code, body = upload(sam, general, picture("GIF"), "icon.png")

    assert code == 400
    assert body["detail"] == "The image must be a PNG, JPEG or WebP."


def test_a_member_cannot_upload_an_icon(
    alex: User, general: Conversation
) -> None:
    code, _ = upload(alex, general, picture("PNG"))

    assert code == 403


def test_somebody_outside_the_space_cannot_see_the_icon(
    sam: User, general: Conversation
) -> None:
    upload(sam, general, picture("PNG"))
    outsider = User.objects.create_user("priya", PASSWORD)
    add_member(the_organisation(), outsider, by=None)

    response = signed_in(outsider).get(f"/api/conversations/{general.pk}/icon")

    assert response.status_code == 404


def test_removing_the_icon_brings_the_random_one_back(
    sam: User, alex: User, general: Conversation
) -> None:
    upload(sam, general, picture("PNG"))

    response = signed_in(sam).delete(f"/api/conversations/{general.pk}/icon")

    assert response.status_code == 200
    assert response.json()["icon_url"] is None
    gone = signed_in(alex).get(f"/api/conversations/{general.pk}/icon")
    assert gone.status_code == 404


def test_a_new_upload_gets_a_new_address(
    sam: User, general: Conversation
) -> None:
    _, first = upload(sam, general, picture("PNG"))
    signed_in(sam).delete(f"/api/conversations/{general.pk}/icon")

    _, second = upload(sam, general, picture("PNG"))

    assert second["icon_url"] != first["icon_url"]


def test_uploading_and_removing_are_audited(
    sam: User, general: Conversation
) -> None:
    upload(sam, general, picture("PNG"))
    signed_in(sam).delete(f"/api/conversations/{general.pk}/icon")

    actions = list(
        AuditEvent.objects.filter(
            action__in=[
                AuditAction.CONVERSATION_ICON_UPLOADED,
                AuditAction.CONVERSATION_ICON_REMOVED,
            ]
        )
        .order_by("id")
        .values_list("action", flat=True)
    )
    assert actions == [
        AuditAction.CONVERSATION_ICON_UPLOADED,
        AuditAction.CONVERSATION_ICON_REMOVED,
    ]
