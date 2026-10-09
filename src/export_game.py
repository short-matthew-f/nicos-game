"""Export the rig for the game (game/public/art, game/test/fixtures).

  python3 src/export_game.py

For each view, every leaf part of Nico is rasterized WITHOUT the sticker filter (the game
draws the outline live around the whole body) at RES px per rig unit, cropped to its
local bbox. nico.json lists, per view and in draw order, each part's image and where its
local origin sits in the image, so the game can apply the same transform-op lists.

poses.json holds sampled ops per part for a set of pose states, straight from rig.py, so
the TypeScript port is tested against the Python rig rather than against itself."""
import json, os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rig
from rig import Nico, plaid_defs
from playwright.sync_api import sync_playwright

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ART = os.path.join(ROOT, 'game', 'public', 'art', 'nico')
FIX = os.path.join(ROOT, 'game', 'test', 'fixtures')
RES = 2          # px per rig unit in the PNGs
PAD = 3          # rig units around getBBox (strokes are outside it)
PFX = 'e'

class CaptureScene:
    """Stand-in for Scene: records each leaf part's (name, track fn, inner svg)."""
    pfx = PFX
    def __init__(s): s.parts, s.defs = [], []
    def A(s, name, fn, inner, filt=None, extras=()):
        s.parts.append((name, fn, inner)); return ''

class FixedTL:
    """Stand-in for Timeline: the same state at every t."""
    def __init__(s, st): s.st = dict(rig.INIT, **st)
    def __call__(s, t): return s.st
    def extras(s, kind): return ()

def leaf_parts(view, st):
    S = CaptureScene()
    n = Nico(S, FixedTL(st), views=('side', 'front', 'back'), scale_of=lambda y: 1.0)
    if view == 'side': n.side_parts()
    else: n.fb_parts(view)
    return S.parts

def short(name, view):
    tag = {'front': 'fv', 'back': 'bv'}.get(view, '')
    return name[len(tag):] if tag and name.startswith(tag) else name

def rasterize():
    os.makedirs(ART, exist_ok=True)
    meta = {'res': RES, 'views': {}}
    with sync_playwright() as p:
        pg = p.chromium.launch().new_page()
        for view in ('side', 'front', 'back'):
            rows = []
            for name, _, inner in leaf_parts(view, {'view': view}):
                nm = short(name, view)
                if nm == 'bx': continue
                pg.set_content(f'<body style="margin:0;background:transparent"><svg xmlns="http://www.w3.org/2000/svg" id="s" '
                               f'width="10" height="10" overflow="visible"><defs>{plaid_defs(PFX)}</defs><g id="g">{inner}</g></svg></body>')
                b = pg.evaluate("()=>{const b=document.getElementById('g').getBBox();return [b.x,b.y,b.width,b.height]}")
                x0, y0 = math.floor(b[0] - PAD), math.floor(b[1] - PAD)
                w, h = math.ceil(b[0] + b[2] + PAD) - x0, math.ceil(b[1] + b[3] + PAD) - y0
                pg.evaluate("([x,y,w,h,r])=>{const s=document.getElementById('s');s.setAttribute('viewBox',`${x} ${y} ${w} ${h}`);"
                            "s.setAttribute('width',w*r);s.setAttribute('height',h*r)}", [x0, y0, w, h, RES])
                fn = f'{view}_{nm}.png'
                pg.locator('#s').screenshot(path=os.path.join(ART, fn), omit_background=True)
                rows.append({'part': nm, 'img': f'art/nico/{fn}', 'x': x0, 'y': y0, 'w': w, 'h': h})
            meta['views'][view] = rows
    json.dump(meta, open(os.path.join(ART, 'nico.json'), 'w'), indent=1)
    print('art:', sum(len(v) for v in meta['views'].values()), 'parts ->', ART)

def poses():
    os.makedirs(FIX, exist_ok=True)
    states = []
    for view in ('side', 'front', 'back'):
        for phase in (0, 0.1, 0.23, 0.35, 0.52, 0.66):
            for amp in (0, 0.4, 1):
                states.append(dict(view=view, face=1, phase=phase, amp=amp, stride_y=(-40 if view == 'back' else 40 if view == 'front' else 0)))
        states.append(dict(view=view, breath=0.8))
    states.append(dict(view='side', face=-1, phase=0.3, amp=1))
    states.append(dict(view='side', crouch=0.6, hold=0.5, phase=0.1, amp=0.2))
    out = []
    for st in states:
        parts = {short(n, st['view']): fn(0.0) for n, fn, _ in leaf_parts(st['view'], st)}
        parts.pop('bx', None)
        out.append({'state': dict(rig.INIT, **st), 'parts': parts})
    json.dump(out, open(os.path.join(FIX, 'poses.json'), 'w'))
    print('poses:', len(out), 'states ->', FIX)

if __name__ == '__main__':
    rasterize()
    poses()
