#!/usr/bin/env python3
"""Build an installable TrueType font from the PNG glyph atlas."""

from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path

import cv2
import numpy as np
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen


UNITS_PER_EM = 1000
ASCENDER = 1350
DESCENDER = -250
FAMILY = "Zhe Pian Da Di Fanmade"
STYLE = "Regular"
FULL_NAME = f"{FAMILY} {STYLE}"
VERSION = "Version 1.100"
POSTSCRIPT_NAME = "ZhePianDaDiFanmade-Regular"
DEFAULT_OUTPUT = "assets/fonts/ZhePianDaDiFanmade-Regular.ttf"
MAC_EPOCH_OFFSET = 2082844800
# 2026-08-06T00:00:00Z. Override with SOURCE_DATE_EPOCH when packaging.
DEFAULT_SOURCE_DATE_EPOCH = 1785974400


def glyph_name(codepoint: int) -> str:
    return f"uni{codepoint:04X}" if codepoint <= 0xFFFF else f"u{codepoint:X}"


def resolve_image(repo: Path, file_value: str) -> Path:
    relative = re.sub(r"^\./", "", file_value.split("?", 1)[0])
    return repo / Path(relative)


def contour_depth(hierarchy: np.ndarray, index: int) -> int:
    depth = 0
    parent = int(hierarchy[index][3])
    while parent >= 0:
        depth += 1
        parent = int(hierarchy[parent][3])
    return depth


def signed_area(points: list[tuple[int, int]]) -> float:
    return sum(
        x1 * y2 - x2 * y1
        for (x1, y1), (x2, y2) in zip(points, points[1:] + points[:1])
    ) / 2


def build_outline(image_path: Path, meta: dict) -> tuple[object, int]:
    image = cv2.imread(str(image_path), cv2.IMREAD_UNCHANGED)
    if image is None:
        raise FileNotFoundError(image_path)
    alpha = image[:, :, 3] if image.ndim == 3 and image.shape[2] == 4 else image
    _, mask = cv2.threshold(alpha, 48, 255, cv2.THRESH_BINARY)
    contours, hierarchy = cv2.findContours(
        mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE
    )

    pen = TTGlyphPen(None)
    if hierarchy is not None:
        hierarchy = hierarchy[0]
        scale = UNITS_PER_EM / float(meta["emHeight"])
        center_x = float(meta.get("centerX", meta["width"] / 2))
        baseline = float(meta["baseline"])

        for index, contour in enumerate(contours):
            perimeter = cv2.arcLength(contour, True)
            simplified = cv2.approxPolyDP(
                contour, max(0.65, perimeter * 0.0012), True
            )
            if len(simplified) < 3:
                continue
            points = [
                (
                    round((float(point[0][0]) - center_x) * scale),
                    round((baseline - float(point[0][1])) * scale),
                )
                for point in simplified
            ]
            points = list(dict.fromkeys(points))
            if len(points) < 3 or abs(signed_area(points)) < 2:
                continue

            # TrueType convention: filled outer contours clockwise, holes opposite.
            should_be_clockwise = contour_depth(hierarchy, index) % 2 == 0
            is_clockwise = signed_area(points) < 0
            if is_clockwise != should_be_clockwise:
                points.reverse()

            pen.moveTo(points[0])
            for point in points[1:]:
                pen.lineTo(point)
            pen.closePath()

    advance = max(
        1,
        round(
            float(meta.get("advance", meta["width"]))
            / float(meta["emHeight"])
            * UNITS_PER_EM
        ),
    )
    return pen.glyph(), advance


def empty_glyph() -> object:
    return TTGlyphPen(None).glyph()


def build_font(repo: Path, output: Path) -> None:
    manifest_path = repo / "assets/font-atlas/runtime-glyph-index.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    selected: dict[int, dict] = {}
    for character, entry in manifest["glyphs"].items():
        if len(character) != 1:
            continue
        variants = entry.get("variants", [])
        if variants:
            selected[ord(character)] = variants[0]

    glyph_order = [".notdef", "space"] + [
        glyph_name(codepoint) for codepoint in sorted(selected)
    ]
    glyphs = {".notdef": empty_glyph(), "space": empty_glyph()}
    metrics = {".notdef": (UNITS_PER_EM, 0), "space": (300, 0)}
    cmap = {0x20: "space"}

    total = len(selected)
    for number, codepoint in enumerate(sorted(selected), start=1):
        meta = selected[codepoint]
        name = glyph_name(codepoint)
        outline, advance = build_outline(resolve_image(repo, meta["file"]), meta)
        glyphs[name] = outline
        metrics[name] = (advance, 0)
        cmap[codepoint] = name
        if number % 250 == 0 or number == total:
            print(f"Vectorized {number}/{total} glyphs")

    builder = FontBuilder(UNITS_PER_EM, isTTF=True)
    builder.setupGlyphOrder(glyph_order)
    builder.setupCharacterMap(cmap)
    builder.setupGlyf(glyphs)
    builder.setupHorizontalMetrics(metrics)
    builder.setupHorizontalHeader(ascent=ASCENDER, descent=DESCENDER, lineGap=100)
    builder.setupNameTable(
        {
            "familyName": FAMILY,
            "styleName": STYLE,
            "uniqueFontIdentifier": f"2026;Fanmade;{POSTSCRIPT_NAME}",
            "fullName": FULL_NAME,
            "psName": POSTSCRIPT_NAME,
            "version": VERSION,
            "manufacturer": "Unofficial fan conversion",
            "designer": "Source glyph atlas contributors",
            "description": (
                "Unofficial fan-made TrueType conversion of the "
                "Zhe Pian Da Di PNG glyph atlas."
            ),
            "licenseDescription": (
                "The fan-made glyph material is not covered by the repository "
                "MIT license. Users must assess rights for their use case."
            ),
        }
    )
    builder.setupOS2(
        sTypoAscender=ASCENDER,
        sTypoDescender=DESCENDER,
        sTypoLineGap=100,
        usWinAscent=1350,
        usWinDescent=300,
        usWeightClass=400,
        usWidthClass=5,
        fsSelection=0x40,
        # Latin 1 and Simplified Chinese.
        # Office consults these flags before deciding whether to use CJK fallback.
        ulCodePageRange1=(1 << 0) | (1 << 18),
        ulCodePageRange2=0,
    )
    builder.setupPost(keepGlyphNames=False)
    builder.setupMaxp()
    source_date_epoch = int(
        os.environ.get("SOURCE_DATE_EPOCH", DEFAULT_SOURCE_DATE_EPOCH)
    )
    opentype_timestamp = source_date_epoch + MAC_EPOCH_OFFSET
    builder.setupHead(created=opentype_timestamp, modified=opentype_timestamp)

    output.parent.mkdir(parents=True, exist_ok=True)
    builder.save(output)
    print(f"Saved {output} ({output.stat().st_size / 1024 / 1024:.2f} MiB)")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"output .ttf path (default: {DEFAULT_OUTPUT})",
    )
    args = parser.parse_args()
    repo = Path(__file__).resolve().parent.parent
    output = args.output if args.output.is_absolute() else repo / args.output
    build_font(repo, output)


if __name__ == "__main__":
    main()
