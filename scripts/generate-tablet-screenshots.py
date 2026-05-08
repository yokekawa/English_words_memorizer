#!/usr/bin/env python3
"""
Generate Play Store 10-inch-tablet screenshots from the existing phone
screenshots by centering each one on a 1080x1920 canvas (exact 9:16).

The originals are 858x1907 — Play Store accepts these for the phone
slot (aspect inside 1:2..2:1) but rejects them for the tablet slot
which requires strict 16:9 or 9:16 with sides 1080..7680 px.

Run from repo root:
    python3 scripts/generate-tablet-screenshots.py
Output:
    docs/screenshots/tablet/01-wordlist.png ... 06-result.png
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "docs" / "screenshots"
DST_DIR = ROOT / "docs" / "screenshots" / "tablet"

CANVAS_W, CANVAS_H = 1080, 1920
BG = (26, 86, 219)  # #1a56db, matches splash background


def main() -> None:
    DST_DIR.mkdir(parents=True, exist_ok=True)
    sources = sorted(p for p in SRC_DIR.glob("*.png") if p.is_file())
    for src in sources:
        phone = Image.open(src).convert("RGB")
        scale = CANVAS_H / phone.height
        new_w = round(phone.width * scale)
        new_h = CANVAS_H
        if new_w > CANVAS_W:
            scale = CANVAS_W / phone.width
            new_w = CANVAS_W
            new_h = round(phone.height * scale)
        resized = phone.resize((new_w, new_h), Image.LANCZOS)
        canvas = Image.new("RGB", (CANVAS_W, CANVAS_H), BG)
        canvas.paste(resized, ((CANVAS_W - new_w) // 2, (CANVAS_H - new_h) // 2))
        out = DST_DIR / src.name
        canvas.save(out, "PNG", optimize=True)
        print(f"Wrote {out.relative_to(ROOT)} ({CANVAS_W}x{CANVAS_H})")


if __name__ == "__main__":
    main()
