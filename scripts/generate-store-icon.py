#!/usr/bin/env python3
"""
Resize the launcher icon to 512x512 for the Play Store listing.
Play Console requires the store icon to be exactly 512x512 PNG, while
the in-app launcher icon is kept at the higher resolution Android needs
for adaptive icons.

Run from repo root:
    python3 scripts/generate-store-icon.py
Output:
    docs/store-icon-512.png
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "icon.png"
DST = ROOT / "docs" / "store-icon-512.png"

icon = Image.open(SRC).convert("RGBA")
icon.thumbnail((512, 512), Image.LANCZOS)
canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
canvas.paste(icon, ((512 - icon.width) // 2, (512 - icon.height) // 2), icon)
canvas.save(DST, "PNG", optimize=True)
print(f"Wrote {DST.relative_to(ROOT)} ({canvas.size[0]}x{canvas.size[1]})")
