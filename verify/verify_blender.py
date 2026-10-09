"""Behavior checks for the Blender (Track B) renders. Pillow only; no GUI, no Blender needed.

Usage: .venv/bin/python verify/verify_blender.py [--dir out/blender]

Reads the rendered frames (sticker frames <clip>_<view>/fNNNN.png, flat renders <clip>_<view>/raw/),
meta.json (ground row) and bones.json (armature-space bone matrices per clip frame, dumped by Blender).
"""
import glob, json, os, statistics, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = sys.argv[sys.argv.index('--dir') + 1] if '--dir' in sys.argv else os.path.join(ROOT, 'out', 'blender')

FAILS, PASSES = [], 0
def check(cond, msg):
    global PASSES
    if cond: PASSES += 1
    else:
        FAILS.append(msg); print('  FAIL:', msg)

def hx(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
# palette: HANDOFF.md section 2 + the face/box/detail colours from src/gen.py (cheek pre-blended at 55%)
KEY = {'shirt': '#5B8FD6', 'pants': '#5B78AA', 'skin': '#E8B48F', 'hair': '#6B4A35'}
PALETTE = [hx(h) for h in (
    '#E8B48F', '#D6996F', '#6B4A35', '#5B8FD6', '#4F86D0', '#3F74BC', '#5B78AA', '#4A6590', '#34495E',
    '#2C3E52', '#E9EEF3', '#3A2E2A', '#A5583F', '#EEA68C', '#A9CCF2', '#3F78C6', '#6FA2E4',
    '#E3A857', '#F0C27C', '#FFE7A6', '#FFFFFF')]
TOL = 3

def load(path): return Image.open(path).convert('RGBA')
def frames(cv, raw=False):
    return sorted(glob.glob(os.path.join(D, cv, 'raw' if raw else '', 'f*.png')))
def near(p, q, tol=TOL): return all(abs(a - b) <= tol for a, b in zip(p, q))

meta = json.load(open(os.path.join(D, 'meta.json')))
GROUND = meta['ground_row']
present = sorted(k for k in meta['clips'])
print(f'Blender renders in {D}: {", ".join(present)}')

# ---------------------------------------------------------------- palette (flat shading, exact hex)
print('palette')
for view in ('side', 'front', 'back', 'threequarter'):
    cv = f'walk_{view}'
    if cv not in present: continue
    fs = frames(cv)
    im = load(fs[len(fs) // 4])          # mid-stride frame
    px = [p for p in im.get_flattened_data() if p[3] == 255]
    for name, h in KEY.items():
        if view == 'back' and name == 'skin':
            c = hx('#D6996F'); name = 'skin (neck, back view)'
        else:
            c = hx(h)
        n = sum(1 for p in px if near(p, c))
        check(n >= 60, f'{cv}: {name} {h} covers {n} px (need >=60 within +-{TOL})')
    on = sum(1 for p in px if any(near(p, q) for q in PALETTE))
    frac = on / max(1, len(px))
    check(frac >= 0.88, f"{cv}: {frac:.1%} of opaque pixels are exact palette colours (need >=88%; rest is edge AA)")

# ---------------------------------------------------------------- transparent background
print('transparent background')
bad = []
nfr = 0
for cv in present:
    for f in frames(cv):
        im = load(f); nfr += 1
        W, H = im.size
        for x, y in ((0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1)):
            if im.getpixel((x, y))[3] != 0: bad.append(f'{cv}/{os.path.basename(f)}@{x},{y}')
check(not bad and nfr > 0, f'corner pixels alpha 0 on all {nfr} sticker frames; non-zero at {bad[:4]}')

# ---------------------------------------------------------------- outline width
# Range 5..9 px, not the 5..8 guessed in BLENDER_TRACK.md: the SVG filter at the 2D scene's 1.3 scale gives
# dilate 6.5 px + ~1.5 px threshold overshoot, and the 2D golden frames measure 8-9 px on straight edges.
print('outline width')
def band_widths(cv, f):
    """Perpendicular width of the white band: for points on the outer sticker edge, distance to the
    nearest opaque pixel of the flat render (a horizontal scan overestimates on slanted edges)."""
    st, raw = load(frames(cv)[f]), load(frames(cv, raw=True)[f])
    W, H = st.size
    sa, ra, sp = st.getchannel('A').load(), raw.getchannel('A').load(), st.load()
    edge = []
    for y in range(2, H - 2, 3):          # outer edge points: sticker-opaque with a transparent left/right neighbour
        xs = [x for x in range(1, W - 1) if sa[x, y] >= 128 and (sa[x - 1, y] < 128 or sa[x + 1, y] < 128)]
        edge += [(x, y) for x in xs]
    out = []
    for x, y in edge[::2]:
        if min(sp[x, y][:3]) < 245: continue             # only where the edge is the white band
        best = None
        for dy in range(-16, 17):
            for dx in range(-16, 17):
                xx, yy = x + dx, y + dy
                if 0 <= xx < W and 0 <= yy < H and ra[xx, yy] >= 128:
                    d = (dx * dx + dy * dy) ** 0.5
                    if best is None or d < best: best = d
        if best is not None: out.append(best)
    return out
for view in ('side', 'front', 'back'):
    for cv in (f'walk_{view}', f'idle_{view}'):
        if cv not in present: continue
        ws = band_widths(cv, 0)
        med = statistics.median(ws) if ws else 0
        check(5 <= round(med) <= 9, f'{cv}: white sticker band median {med:.1f}px over {len(ws)} edge samples (need 5..9)')

# ---------------------------------------------------------------- size across views
print('size across views')
def bbox_h(path):
    bb = load(path).getchannel('A').point(lambda v: 255 if v >= 128 else 0).getbbox()
    return bb[3] - bb[1]
hs = {v: bbox_h(frames(f'idle_{v}', raw=True)[0]) for v in ('side', 'front', 'back') if f'idle_{v}' in present}
spread = (max(hs.values()) - min(hs.values())) / max(hs.values()) if len(hs) == 3 else 1
check(len(hs) == 3 and spread < 0.03, f'idle silhouette heights {hs} differ by {spread:.1%} (need <3%)')

# ---------------------------------------------------------------- feet planted
print('feet planted')
for cv in present:
    worst, wf = 0, None
    for f in frames(cv, raw=True):
        bb = load(f).getchannel('A').point(lambda v: 255 if v >= 128 else 0).getbbox()
        dev = abs(bb[3] - GROUND) if bb else 999
        if dev > worst: worst, wf = dev, os.path.basename(f)
    check(worst <= 7, f'{cv}: lowest opaque row strays {worst:.1f}px from ground row {GROUND:.0f} (worst {wf}; need <=7)')

# ---------------------------------------------------------------- loop seam (bone transforms)
print('loop seam')
bones = json.load(open(os.path.join(D, 'bones.json')))
def mdiff(a, b):
    return max(abs(x - y) for n in a for ra, rb in zip(a[n], b[n]) for x, y in zip(ra, rb))
for clip, info in bones.items():
    if not info['loops']: continue
    fr, n = info['frames'], info['n']
    wrap = mdiff(fr[n], fr[0])                       # baked frame n must be the pose of frame 0
    steps = [mdiff(fr[i], fr[i + 1]) for i in range(n - 1)]
    seam = mdiff(fr[n - 1], fr[0])                   # the step the player actually sees at the wrap
    check(wrap < 1e-3, f'{clip}: pose at frame {n} vs frame 0 differs by {wrap:.4f} (need <0.001)')
    check(0 < seam <= 1.25 * max(steps), f'{clip}: seam step {seam:.3f} vs largest in-cycle step {max(steps):.3f} (no hitch, no duplicate frame)')

print(f'\n{PASSES} checks passed, {len(FAILS)} failed')
sys.exit(1 if FAILS else 0)
