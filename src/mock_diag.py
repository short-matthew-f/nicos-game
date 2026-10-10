"""Mock-up: Nico's diagonal (3/4) views beside the existing side, front and back views.

  python3 src/mock_diag.py      -> out/mock_diag.svg (+ .png)

Static, standing poses only, for sign-off before the diagonals are rigged. The existing
views are drawn from rig.py as they are; the 3/4 views are new art in this file.

Facing down-right (3/4 front): we see his front plus a little of the side nearest the
viewer's left, so the face shifts right, his ear and the back of his hair show on the
left, the near (viewer-left) arm is in front and the far arm tucks behind. Facing
up-right (3/4 back) mirrors that from behind: a sliver of cheek and ear on the right.
Walking left uses the same art flipped."""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rig
from rig import (Nico, plaid_defs, arm_art, leg_art, shoe_art_front, SK, SK2, HAIR, HAIR_TIE, PANT,
                 EYE, MOUTH, CHEEK, BUTTON, PLAID, HAIR_TOP as T)
from scene import Scene, ops_css, NAVY, FONT, OUT

PFX = 'm'

# ---------------------------------------------------------------- 3/4 art
# (now lives in rig.py, used by the game; the mock-up draws the same art)
shoe_q = rig.shoe_art_q
torso_q = lambda back: rig._torso_q(back, PFX)
upper_q_front = lambda: rig.upper_qfront(PFX)
upper_q_back = lambda: rig.upper_qback(PFX)

def quarter(view):
    """Standing 3/4 Nico, hip-local like the rig (ground y=0). Far arm behind the body,
    near (viewer-left) arm in front; the near leg sits a touch lower (closer to us)."""
    upper = upper_q_front() if view == 'qfront' else upper_q_back()
    leg = lambda x, dy: f'<g transform="translate({x},{-58 + dy}) scale(1,1)">{leg_art(False)}</g>'
    shoe = lambda x, dy: f'<g transform="translate({x},{dy})">{shoe_art_front() if view == "qback" else shoe_q()}</g>'
    arm = lambda x, ang: f'<g transform="translate({x},-100) rotate({ang})">{arm_art(False, PFX)}</g>'
    return (arm(15, -6) +                      # far arm, behind
            leg(9, 0) + shoe(9, 0) + leg(-10, 2) + shoe(-10, 2) +   # far leg, then near leg
            f'<g transform="translate(0,-58)">{upper}</g>' +   # torso art is hip-local
            arm(-19, 8))                       # near arm, in front

# ---------------------------------------------------------------- existing views, standing
class Capture:
    pfx = PFX
    def __init__(s): s.parts, s.defs = [], []
    def A(s, name, fn, inner, filt=None, extras=()):
        s.parts.append((fn, inner)); return ''

class Still:
    def __init__(s, view): s.st = dict(rig.INIT, view=view)
    def __call__(s, t): return s.st
    def extras(s, kind): return ()

def existing(view):
    S = Capture()
    n = Nico(S, Still(view), views=('side', 'front', 'back'), scale_of=lambda y: 1.0)
    n.side_parts() if view == 'side' else n.fb_parts(view)
    return ''.join(f'<g style="transform:{ops_css(fn(0))};transform-origin:0 0">{inner}</g>' for fn, inner in S.parts)

# ---------------------------------------------------------------- sheet
COLS = [('side', 'Side (right)', 'have'), ('qfront', '3/4 front: down-right', 'new'), ('front', 'Front: down', 'have'),
        ('qback', '3/4 back: up-right', 'new'), ('back', 'Back: up', 'have')]

def build():
    W, H, cw = 1100, 470, 210
    S = Scene(PFX, 1, w=W, h=H)
    S.filt('f', -130, -240, 260, 280)
    body = [f'<rect width="{W}" height="{H}" fill="#E9EEF3"/>']
    for i, (v, label, tag) in enumerate(COLS):
        cx = 30 + cw * i + cw / 2 - 20
        art = quarter(v) if v.startswith('q') else existing(v)
        if tag == 'new':
            body.append(f'<rect x="{cx - 92}" y="40" width="184" height="360" rx="18" fill="#FFF4DA"/>')
        body.append(f'<g transform="translate({cx},330) scale(1.75)"><g filter="url(#{PFX}f)">{art}</g></g>')
        body.append(f'<text x="{cx}" y="430" text-anchor="middle" font-family="{FONT}" font-size="17" font-weight="700" fill="{NAVY}">{label}</text>')
        body.append(f'<text x="{cx}" y="452" text-anchor="middle" font-family="{FONT}" font-size="14" fill="{NAVY}" opacity=".7">{"NEW" if tag == "new" else "existing"}</text>')
    # walking left = the same art, flipped
    S.defs.append(plaid_defs(PFX))
    return S.svg(''.join(body))

if __name__ == '__main__':
    svg = build()
    path = os.path.join(OUT, 'mock_diag.svg')
    open(path, 'w').write(svg)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        pg = p.chromium.launch().new_page(viewport={'width': 1100, 'height': 470}, device_scale_factor=2)
        pg.set_content(f'<body style="margin:0">{svg}</body>'); pg.wait_for_timeout(200)
        pg.locator('svg').screenshot(path=path.replace('.svg', '.png'))
    print('->', path)
