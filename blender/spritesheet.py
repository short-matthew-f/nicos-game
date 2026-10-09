"""Pack a clip's sticker frames into one horizontal spritesheet (shared crop box). Feasibility test.

Usage: .venv/bin/python blender/spritesheet.py out/blender/walk_side [more clip dirs...]
Writes <clip_dir>_spritesheet.png and prints cell size and bytes.
"""
import glob, json, os, sys
from PIL import Image

for d in sys.argv[1:]:
    fs = sorted(glob.glob(os.path.join(d, 'f*.png')))
    ims = [Image.open(f) for f in fs]
    bb = None
    for im in ims:
        b = im.getchannel('A').getbbox()
        bb = b if bb is None else (min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3]))
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    sheet = Image.new('RGBA', (w * len(ims), h))
    for i, im in enumerate(ims):
        sheet.paste(im.crop(bb), (i * w, 0))
    out = d.rstrip('/') + '_spritesheet.png'
    sheet.save(out, optimize=True)
    print(json.dumps(dict(sheet=out, frames=len(ims), cell=[w, h], origin=bb[:2],
                          sheet_kb=os.path.getsize(out) // 1024,
                          frames_kb=sum(os.path.getsize(f) for f in fs) // 1024)))
