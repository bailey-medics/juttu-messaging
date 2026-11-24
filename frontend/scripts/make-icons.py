"""Draw Juttu's app icons as PNGs from its SVG icons in frontend/public/.

The gold speech bubble with the "j" in it is drawn as SVG, in
public/juttu-icon.svg (on the brand navy square) and
public/juttu-icon-transparent.svg (the bubble alone). Browsers that take an
SVG favicon use the SVG itself; this script writes the PNGs for the rest,
and for the web app manifest. It uses only the standard library, so no
machine needs an image tool to make them again:

    python3 scripts/make-icons.py

It understands only what the two icons use: `rect`, `circle` and `path`,
each with a `fill`, and in a path the absolute commands M, L, H, V, Q, A
and Z. It refuses anything else rather than drawing it wrongly.

The bubble sits inside the middle 80% circle of the square, so a phone that
crops the icon to a circle or a rounded square (a "maskable" icon) never
cuts it.
"""

import itertools
import math
import re
import struct
import zlib
from dataclasses import dataclass
from pathlib import Path
from typing import Literal
from xml.etree import ElementTree

PUBLIC = Path(__file__).resolve().parent.parent / "public"
SVG_NAMESPACE = "{http://www.w3.org/2000/svg}"

# Each PNG, the SVG it is drawn from, and its width and height. The phone
# and manifest icons need a solid square, so they come from the navy one.
# The favicon sits on a browser tab, so it keeps the clear background.
ICONS: dict[str, tuple[str, int]] = {
    "android-chrome-192x192.png": ("juttu-icon.svg", 192),
    "android-chrome-512x512.png": ("juttu-icon.svg", 512),
    "apple-touch-icon.png": ("juttu-icon.svg", 180),
    "favicon-32x32.png": ("juttu-icon-transparent.svg", 32),
}

# Rows sampled within each row of pixels. Across a row the coverage is
# worked out exactly, so four rows give smooth edges.
SAMPLES_PER_ROW = 4

# Straight pieces each curve is cut into. Plenty at 512 pixels.
CURVE_STEPS = 48

Point = tuple[float, float]
Colour = tuple[int, int, int]
FillRule = Literal["nonzero", "evenodd"]


@dataclass(frozen=True)
class Shape:
    """One filled shape: its outlines, its colour and how overlaps fill."""

    outlines: list[list[Point]]
    colour: Colour
    rule: FillRule


def parse_colour(value: str) -> Colour:
    """A `#rgb` or `#rrggbb` colour, as three bytes."""
    text = value.strip().lstrip("#")

    if len(text) == 3:
        text = "".join(c * 2 for c in text)
    if len(text) != 6:
        raise ValueError(f"cannot read the colour {value!r}")

    return (int(text[0:2], 16), int(text[2:4], 16), int(text[4:6], 16))


def arc_points(
    start: Point,
    radius: float,
    large_arc: bool,
    sweep: bool,
    end: Point,
) -> list[Point]:
    """Points along a circular SVG arc, after its start, ending at its end.

    Follows the SVG specification's conversion from endpoints to a centre
    (appendix B.2.4), for a circle with no rotation.
    """
    x1, y1 = start
    x2, y2 = end
    half_x, half_y = (x1 - x2) / 2, (y1 - y2) / 2
    half_chord_squared = half_x**2 + half_y**2

    # A radius too small to reach is scaled up, as the specification says.
    radius = max(radius, math.sqrt(half_chord_squared))
    reach = math.sqrt(max(0.0, radius**2 - half_chord_squared) / half_chord_squared)
    if large_arc == sweep:
        reach = -reach

    centre_x = reach * half_y + (x1 + x2) / 2
    centre_y = -reach * half_x + (y1 + y2) / 2
    start_angle = math.atan2(y1 - centre_y, x1 - centre_x)
    turn = math.atan2(y2 - centre_y, x2 - centre_x) - start_angle

    if sweep and turn < 0:
        turn += 2 * math.pi
    elif not sweep and turn > 0:
        turn -= 2 * math.pi

    points = [
        (
            centre_x + radius * math.cos(start_angle + turn * step / CURVE_STEPS),
            centre_y + radius * math.sin(start_angle + turn * step / CURVE_STEPS),
        )
        for step in range(1, CURVE_STEPS)
    ]
    points.append(end)

    return points


def quadratic_points(start: Point, control: Point, end: Point) -> list[Point]:
    """Points along a quadratic Bézier curve, after its start."""
    points: list[Point] = []

    for step in range(1, CURVE_STEPS + 1):
        t = step / CURVE_STEPS
        u = 1 - t
        points.append(
            (
                u * u * start[0] + 2 * u * t * control[0] + t * t * end[0],
                u * u * start[1] + 2 * u * t * control[1] + t * t * end[1],
            )
        )

    return points


def path_outlines(data: str) -> list[list[Point]]:
    """A path's `d` attribute, as closed outlines of straight edges."""
    tokens = re.findall(r"[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)", data)
    outlines: list[list[Point]] = []
    current: list[Point] = []
    position: Point = (0.0, 0.0)
    index = 0

    def numbers(count: int) -> list[float]:
        nonlocal index
        values = [float(t) for t in tokens[index : index + count]]
        index += count
        return values

    while index < len(tokens):
        command = tokens[index]
        index += 1

        if command == "M":
            if current:
                outlines.append(current)
            x, y = numbers(2)
            position = (x, y)
            current = [position]
        elif command == "L":
            x, y = numbers(2)
            position = (x, y)
            current.append(position)
        elif command == "H":
            (x,) = numbers(1)
            position = (x, position[1])
            current.append(position)
        elif command == "V":
            (y,) = numbers(1)
            position = (position[0], y)
            current.append(position)
        elif command == "Q":
            cx, cy, x, y = numbers(4)
            current.extend(quadratic_points(position, (cx, cy), (x, y)))
            position = (x, y)
        elif command == "A":
            rx, ry, rotation, large_arc, sweep, x, y = numbers(7)
            if rx != ry or rotation != 0:
                raise ValueError("only circular arcs with no rotation are drawn")
            current.extend(
                arc_points(position, rx, bool(large_arc), bool(sweep), (x, y))
            )
            position = (x, y)
        elif command == "Z":
            if current:
                outlines.append(current)
                position = current[0]
            current = []
        else:
            raise ValueError(f"the path command {command!r} is not drawn")

    if current:
        outlines.append(current)

    return outlines


def read_shapes(svg: Path) -> tuple[float, list[Shape]]:
    """An SVG's width in its own units, and its shapes, in drawing order."""
    root = ElementTree.parse(svg).getroot()
    _, _, width, height = (float(v) for v in root.attrib["viewBox"].split())
    if width != height:
        raise ValueError(f"{svg.name} is not square")

    shapes: list[Shape] = []

    for element in root:
        tag = element.tag.removeprefix(SVG_NAMESPACE)
        if tag == "title":
            continue

        colour = parse_colour(element.attrib["fill"])
        rule: FillRule = (
            "evenodd" if element.get("fill-rule") == "evenodd" else "nonzero"
        )

        if tag == "rect":
            x, y = float(element.get("x", 0)), float(element.get("y", 0))
            w, h = float(element.attrib["width"]), float(element.attrib["height"])
            outlines = [[(x, y), (x + w, y), (x + w, y + h), (x, y + h)]]
        elif tag == "circle":
            cx, cy = float(element.attrib["cx"]), float(element.attrib["cy"])
            r = float(element.attrib["r"])
            outlines = path_outlines(
                f"M{cx - r} {cy}A{r} {r} 0 0 0 {cx + r} {cy}A{r} {r} 0 0 0 {cx - r} {cy}Z"
            )
        elif tag == "path":
            outlines = path_outlines(element.attrib["d"])
        else:
            raise ValueError(f"the element {tag!r} in {svg.name} is not drawn")

        shapes.append(Shape(outlines, colour, rule))

    return width, shapes


def coverage(shape: Shape, scale: float, size: int) -> list[float]:
    """How much of each pixel the shape covers, from 0 to 1, row by row."""
    covered = [0.0] * (size * size)
    weight = 1 / SAMPLES_PER_ROW
    edges = [
        (
            (outline[i][0] * scale, outline[i][1] * scale),
            (
                outline[(i + 1) % len(outline)][0] * scale,
                outline[(i + 1) % len(outline)][1] * scale,
            ),
        )
        for outline in shape.outlines
        for i in range(len(outline))
    ]

    for row in range(size):
        for sample in range(SAMPLES_PER_ROW):
            y = row + (sample + 0.5) / SAMPLES_PER_ROW
            crossings: list[tuple[float, int]] = []

            for (x1, y1), (x2, y2) in edges:
                if (y1 <= y < y2) or (y2 <= y < y1):
                    x = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
                    crossings.append((x, 1 if y2 > y1 else -1))

            crossings.sort()
            winding = 0

            for (x_from, direction), (x_to, _) in itertools.pairwise(crossings):
                winding += direction
                inside = winding % 2 == 1 if shape.rule == "evenodd" else winding != 0
                if inside:
                    _add_span(covered, row * size, size, x_from, x_to, weight)

    return covered


def _add_span(
    covered: list[float],
    row_start: int,
    size: int,
    x_from: float,
    x_to: float,
    weight: float,
) -> None:
    """Adds a filled span of one sample row to the pixels it passes over."""
    x_from, x_to = max(0.0, x_from), min(float(size), x_to)

    for column in range(int(x_from), min(size, math.ceil(x_to))):
        overlap = min(x_to, column + 1) - max(x_from, column)
        if overlap > 0:
            covered[row_start + column] += overlap * weight


def draw(svg: Path, size: int) -> bytes:
    """One icon's pixels, as PNG bytes with a clear background."""
    units, shapes = read_shapes(svg)
    scale = size / units
    pixels = [(0.0, 0.0, 0.0, 0.0)] * (size * size)

    for shape in shapes:
        red, green, blue = shape.colour
        for index, amount in enumerate(coverage(shape, scale, size)):
            alpha = min(1.0, amount)
            if alpha <= 0:
                continue

            # Painted over what is already there, colours premultiplied.
            r, g, b, a = pixels[index]
            keep = 1 - alpha
            pixels[index] = (
                red * alpha + r * keep,
                green * alpha + g * keep,
                blue * alpha + b * keep,
                alpha + a * keep,
            )

    rows = bytearray()

    for row in range(size):
        rows.append(0)
        for r, g, b, a in pixels[row * size : (row + 1) * size]:
            if a <= 0:
                rows.extend((0, 0, 0, 0))
            else:
                rows.extend((round(r / a), round(g / a), round(b / a), round(a * 255)))

    return _png(size, bytes(rows))


def _png(size: int, raw: bytes) -> bytes:
    def chunk(kind: bytes, data: bytes) -> bytes:
        body = kind + data
        return (
            struct.pack(">I", len(data))
            + body
            + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)
        )

    # Eight bits a channel, colour type 6: red, green, blue and alpha.
    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def main() -> None:
    for name, (source, size) in ICONS.items():
        (PUBLIC / name).write_bytes(draw(PUBLIC / source, size))
        print(f"wrote public/{name} ({size}x{size}) from public/{source}")


if __name__ == "__main__":
    main()
