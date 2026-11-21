"""Make a Web Push signing key pair, as environment settings.

``s/box push-keys`` runs this in the box's backend and adds what it prints
to ``local/box.env``. The keys are printed and never stored here.
"""

import base64
from argparse import ArgumentParser

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    PublicFormat,
)
from django.core.management.base import BaseCommand


def b64url(data: bytes) -> str:
    """URL-safe base64 without padding, as Web Push keys are written."""
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def key_pair() -> tuple[str, str]:
    """A new P-256 key pair: the public point, then the private number.

    The public key is the 65-byte uncompressed point browsers subscribe
    with; the private key is its 32-byte number. Ported from Quill
    Medical's ``generate_vapid_keys.py``.
    """
    private_key = ec.generate_private_key(ec.SECP256R1())
    public = private_key.public_key().public_bytes(
        encoding=Encoding.X962, format=PublicFormat.UncompressedPoint
    )
    number = private_key.private_numbers().private_value.to_bytes(32, "big")

    return b64url(public), b64url(number)


class Command(BaseCommand):
    help = "Print a new Web Push signing key pair, as environment settings."

    def add_arguments(self, parser: ArgumentParser) -> None:
        parser.add_argument(
            "--prefix",
            default="JUTTU_VAPID_",
            help="What each setting's name starts with.",
        )

    def handle(self, *args: object, **options: object) -> None:
        prefix = str(options["prefix"])
        public, private = key_pair()

        self.stdout.write(f"{prefix}PUBLIC_KEY={public}")
        self.stdout.write(f"{prefix}PRIVATE_KEY={private}")
