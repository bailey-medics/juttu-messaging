"""Draw Juttu's app icons: a light grey speech bubble on the brand navy.

Writes the PNGs the web app manifest names into frontend/public/. Uses only
the standard library, so no machine needs an image tool to make them again:

    python3 scripts/make-icons.py

The bubble sits inside the middle 60% of the square, so a phone that crops
the icon to a circle or a rounded square (a "maskable" icon) never cuts it.
"""

import struct
import zlib
from pathlib import Path

# The brand primary and the brand mark, from src/brand.json: the same navy
# and light grey as Quill Medical's icon. The grey sits back from the navy
# instead of glaring, as white would.
NAVY = (0x00, 0x1A, 0x36)
MARK = (0xC9, 0xC8, 0xCA)
PUBLIC = Path(__file__).resolve().parent.parent / "public"
SIZES = {
    "android-chrome-192x192.png": 192,
    "android-chrome-512x512.png": 512,
    "apple-touch-icon.png": 180,
    "favicon-32x32.png": 32,
}


def in_bubble(x: float, y: float) -> bool:
    """Whether a point, in a unit square, is inside the speech bubble."""
    centre_x, centre_y = 0.5, 0.46
    radius_x, radius_y = 0.30, 0.23

    inside_body = ((x - centre_x) / radius_x) ** 2 + (
        (y - centre_y) / radius_y
    ) ** 2 <= 1.0

    # The tail: a triangle below the body, towards the lower left.
    a, b, c = (0.34, 0.60), (0.48, 0.64), (0.30, 0.78)
    inside_tail = _in_triangle((x, y), a, b, c)

    return inside_body or inside_tail


def _in_triangle(
    p: tuple[float, float],
    a: tuple[float, float],
    b: tuple[float, float],
    c: tuple[float, float],
) -> bool:
    def side(
        p1: tuple[float, float],
        p2: tuple[float, float],
        p3: tuple[float, float],
    ) -> float:
        return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1])

    d1, d2, d3 = side(p, a, b), side(p, b, c), side(p, c, a)
    has_negative = d1 < 0 or d2 < 0 or d3 < 0
    has_positive = d1 > 0 or d2 > 0 or d3 > 0

    return not (has_negative and has_positive)


def draw(size: int) -> bytes:
    """One icon's pixels, as PNG bytes. Four samples a pixel smooth the edge."""
    rows = bytearray()
    offsets = (0.25, 0.75)

    for row in range(size):
        rows.append(0)

        for column in range(size):
            hits = sum(
                in_bubble((column + dx) / size, (row + dy) / size)
                for dx in offsets
                for dy in offsets
            )
            share = hits / 4
            rows.extend(
                round(t + (w - t) * share) for t, w in zip(NAVY, MARK, strict=True)
            )

    return _png(size, bytes(rows))


def _png(size: int, raw: bytes) -> bytes:
    def chunk(kind: bytes, data: bytes) -> bytes:
        body = kind + data
        return (
            struct.pack(">I", len(data))
            + body
            + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)
        )

    header = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def main() -> None:
    PUBLIC.mkdir(exist_ok=True)

    for name, size in SIZES.items():
        (PUBLIC / name).write_bytes(draw(size))
        print(f"wrote public/{name} ({size}x{size})")


if __name__ == "__main__":
    main()
