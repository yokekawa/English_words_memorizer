#!/usr/bin/env python3
"""
Generate the Google Play Feature Graphic (1024x500) from the app icon.

Layout:
  +-----------------------------------------------------+
  |                                                     |
  |   [icon]      英単語暗記                            |
  |                教科書を撮るだけで英単語登録          |
  |                                                     |
  +-----------------------------------------------------+

Run from repo root:
    python3 scripts/generate-feature-graphic.py
Output:
    assets/feature-graphic.png
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ICON_PATH = ROOT / "assets" / "icon.png"
OUTPUT_PATH = ROOT / "assets" / "feature-graphic.png"

WIDTH, HEIGHT = 1024, 500
BG_COLOR = (26, 86, 219)  # #1a56db, matches splash backgroundColor
TEXT_COLOR = (255, 255, 255)
SUBTITLE_COLOR = (220, 230, 255)

JP_FONT_PATH = "/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf"
TITLE_SIZE = 110
SUBTITLE_SIZE = 38

ICON_SIZE = 360
ICON_PADDING = 70


def main() -> None:
    canvas = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(canvas)

    # Resize the launcher icon and paste, vertically centred on the left.
    icon = Image.open(ICON_PATH).convert("RGBA")
    icon = icon.resize((ICON_SIZE, ICON_SIZE), Image.LANCZOS)
    icon_x = ICON_PADDING
    icon_y = (HEIGHT - ICON_SIZE) // 2
    canvas.paste(icon, (icon_x, icon_y), icon)

    # Title and subtitle, vertically centred on the right of the icon.
    title_font = ImageFont.truetype(JP_FONT_PATH, TITLE_SIZE)
    subtitle_font = ImageFont.truetype(JP_FONT_PATH, SUBTITLE_SIZE)

    title = "英単語暗記"
    subtitle = "教科書を撮るだけで英単語登録"

    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    title_h = title_bbox[3] - title_bbox[1]
    subtitle_bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
    subtitle_h = subtitle_bbox[3] - subtitle_bbox[1]

    text_block_h = title_h + 24 + subtitle_h
    text_x = icon_x + ICON_SIZE + 50
    text_y = (HEIGHT - text_block_h) // 2 - title_bbox[1]

    draw.text((text_x, text_y), title, font=title_font, fill=TEXT_COLOR)
    draw.text(
        (text_x, text_y + title_h + 24 - subtitle_bbox[1]),
        subtitle,
        font=subtitle_font,
        fill=SUBTITLE_COLOR,
    )

    canvas.save(OUTPUT_PATH, "PNG", optimize=True)
    print(f"Wrote {OUTPUT_PATH} ({WIDTH}x{HEIGHT})")


if __name__ == "__main__":
    main()
