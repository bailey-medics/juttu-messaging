"""A conversation's uploaded icon: checked, redrawn, kept and removed.

An upload is never kept as sent. Pillow opens it, Juttu refuses anything
that is not a PNG, JPEG or WebP image whatever its name says, and redraws
it as a centred square PNG of 256 pixels. Saving Pillow's own PNG drops
whatever else the file carried, such as where a photo was taken.
"""

import io

from django.db import transaction
from django.utils import timezone
from PIL import Image, ImageOps, UnidentifiedImageError

from app.accounts.models import User
from app.audit.models import AuditAction
from app.audit.record import record
from app.conversations.models import Conversation, ConversationIconImage

#: The largest upload taken, in bytes: 1 MB.
MAX_UPLOAD_BYTES = 1024 * 1024

#: The formats taken, as Pillow names them from the file's own bytes.
ACCEPTED_FORMATS = frozenset({"PNG", "JPEG", "WEBP"})

#: The side of the square an icon is redrawn as, in pixels.
ICON_SIZE = 256

#: The most pixels an upload may have. A small file can claim a huge
#: picture, which would take the server's memory to draw.
MAX_PIXELS = 40_000_000


class IconRefused(Exception):
    """The upload is not an image Juttu takes."""


def redraw(upload: bytes) -> bytes:
    """*upload* as a centred square PNG of ``ICON_SIZE`` pixels.

    Raises:
        IconRefused: If it is too big, not an image, or not PNG, JPEG or
            WebP.
    """
    if len(upload) > MAX_UPLOAD_BYTES:
        raise IconRefused("The image must be 1 MB or smaller.")

    try:
        with Image.open(io.BytesIO(upload)) as opened:
            if opened.format not in ACCEPTED_FORMATS:
                raise IconRefused("The image must be a PNG, JPEG or WebP.")
            if opened.width * opened.height > MAX_PIXELS:
                raise IconRefused("The image has too many pixels.")

            upright = ImageOps.exif_transpose(opened).convert("RGBA")
            square = ImageOps.fit(
                upright,
                (ICON_SIZE, ICON_SIZE),
                method=Image.Resampling.LANCZOS,
            )
    except (
        UnidentifiedImageError,
        OSError,
        Image.DecompressionBombError,
    ) as error:
        raise IconRefused(
            "The file is not an image Juttu can read."
        ) from error

    drawn = io.BytesIO()
    square.save(drawn, format="PNG")

    return drawn.getvalue()


@transaction.atomic
def set_icon_image(
    conversation: Conversation, upload: bytes, *, by: User
) -> None:
    """Make *upload*, redrawn, *conversation*'s icon, replacing any before.

    The caller has already checked *by* is an organisation admin.

    Raises:
        IconRefused: If the upload is not an image Juttu takes.
    """
    drawn = redraw(upload)

    now = timezone.now()

    ConversationIconImage.objects.update_or_create(
        conversation=conversation,
        defaults={"image": drawn, "uploaded_by": by, "uploaded_at": now},
    )
    conversation.icon_version = int(now.timestamp() * 1_000_000)
    conversation.save(update_fields=["icon_version"])

    record(
        AuditAction.CONVERSATION_ICON_UPLOADED,
        actor=by,
        detail={"conversation": conversation.pk, "bytes": len(drawn)},
    )


@transaction.atomic
def remove_icon_image(conversation: Conversation, *, by: User) -> None:
    """Take *conversation*'s uploaded icon away, so its random one shows.

    The caller has already checked *by* is an organisation admin.
    """
    removed, _ = ConversationIconImage.objects.filter(
        conversation=conversation
    ).delete()

    if removed == 0:
        return

    conversation.icon_version = None
    conversation.save(update_fields=["icon_version"])

    record(
        AuditAction.CONVERSATION_ICON_REMOVED,
        actor=by,
        detail={"conversation": conversation.pk},
    )


def icon_image(conversation: Conversation) -> bytes | None:
    """The PNG kept as *conversation*'s icon, or None."""
    kept = ConversationIconImage.objects.filter(
        conversation=conversation
    ).first()

    return None if kept is None else bytes(kept.image)
