"""Contact sheet of the Blender renders on the 2D scene background colour.

Usage: .venv/bin/python blender/contact_sheet.py [OUT_DIR] [SHEET_PNG]
"""
import json, os, sys
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'out', 'blender')
SHEET = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'reference', 'blender_sheet.png')
BG = (0xE9, 0xEE, 0xF3, 255)
INK = (0x2B, 0x3F, 0x55, 255)
CROP = (250, 125, 550, 425)      # 300x300 around the character (centre column 400, ground row 392)

ROWS = [
    ('walk_side', [0, 4, 8, 12, 16]),
    ('walk_threequarter', [0, 4, 8, 12, 16]),
    ('walk_front', [0, 4, 8, 12, 16]),
    ('walk_back', [0, 4, 8, 12, 16]),
    ('putdown_side', [0, 12, 20, 28, 43]),
    ('pickup_side', [0, 10, 20, 26, 40]),
    ('idle', [('idle_side', 0), ('idle_threequarter', 0), ('idle_front', 0), ('idle_back', 0), ('idle_front', 24)]),
]

def tile(d, f):
    im = Image.open(os.path.join(OUT, d, f'f{f:04d}.png')).convert('RGBA').crop(CROP)
    bg = Image.new('RGBA', im.size, BG)
    bg.alpha_composite(im)
    return bg

def main():
    tw, th = CROP[2] - CROP[0], CROP[3] - CROP[1]
    lab = 22
    cols = max(len(r[1]) for r in ROWS)
    sheet = Image.new('RGBA', (cols * tw, len(ROWS) * (th + lab)), BG)
    dr = ImageDraw.Draw(sheet)
    for ri, (name, frames) in enumerate(ROWS):
        y = ri * (th + lab)
        for ci, fr in enumerate(frames):
            d, f = (fr if isinstance(fr, tuple) else (name, fr))
            sheet.paste(tile(d, f), (ci * tw, y + lab))
            dr.text((ci * tw + 6, y + 5), f'{d}  f{f:02d}', fill=INK)
    sheet.convert('RGB').save(SHEET, optimize=True)
    print('wrote', SHEET, sheet.size)

if __name__ == '__main__':
    main()
