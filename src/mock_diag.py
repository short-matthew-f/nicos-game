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

# ---------------------------------------------------------------- new 3/4 art
def shoe_q():
    # between end-on and side-on: a little longer, toe pointing right
    return (f'<rect x="-12" y="-13" width="28" height="13" rx="6.5" fill="{rig.SHOE}"/>'
            f'<rect x="-10" y="-4" width="24" height="4" rx="2" fill="#E9EEF3"/>')

def torso_q(back):
    s = (f'<rect x="-17" y="-6" width="34" height="14" rx="6" fill="{PANT}"/>'
         f'<rect x="-6" y="-62" width="14" height="16" rx="5" fill="{SK2}"/>'
         f'<rect x="-20" y="-52" width="40" height="54" rx="15" fill="url(#{PFX}plnear)"/>'
         # the side of the body turned toward us, a shade darker
         f'<rect x="-20" y="-50" width="9" height="50" rx="4.5" fill="url(#{PFX}plfar)"/>')
    if not back:
        c = PLAID['near'][4]
        s += (f'<path d="M-3,-52 L7,-46 L1,-38 Z" fill="{c}"/><path d="M15,-51 L7,-46 L12,-38 Z" fill="{c}"/>'
              + ''.join(f'<circle cx="7" cy="{y}" r="1.8" fill="{BUTTON}"/>' for y in (-36, -24, -12)))
    else:
        s += f'<path d="M-14,-52 Q-3,-47 9,-51 L8,-47 Q-3,-43 -12,-48 Z" fill="{PLAID["near"][4]}"/>'
    return s

def upper_q_front():
    # the ponytail hangs from the back of his head, so it is drawn first, behind his body:
    # only a little shows, past the far side of his neck and shoulder
    return (f'<path d="M-17,-72 C-23,-62 -22,-48 -17,-38 C-13,-48 -11,-60 -10,-68 Z" fill="{HAIR}"/>'
        f'<rect x="-23" y="-73" width="10" height="6" rx="3" fill="{HAIR_TIE}" transform="rotate(-30 -18 -70)"/>' +
        torso_q(False) +
        f'<circle cx="2" cy="-86" r="29" fill="{SK}"/>'
        # hair: part right of centre; on the right it falls to the jaw beside his face, on
        # the left it is pulled back over the ear to the tie at the nape (like the side view)
        f'<path d="M10,{T} C28,{T} 36,-102 32,-84 C32,-76 30,-68 27,-63 L22,-66 '
        f'C24,-80 21,-95 10,-104 C0,-99 -8,-96 -14,-92 C-20,-88 -22,-80 -21,-72 '
        f'L-25,-67 C-31,-73 -34,-84 -32,-94 C-28,-108 -12,{T} 10,{T} Z" fill="{HAIR}"/>'
        f'<ellipse cx="-18" cy="-80" rx="4" ry="5.5" fill="{SK2}"/>'   # near ear, in front of the pulled-back hair
        # face turned right: near eye round, far eye a little narrower
        f'<circle cx="0" cy="-85" r="3.6" fill="{EYE}"/><ellipse cx="17" cy="-85" rx="3" ry="3.6" fill="{EYE}"/>'
        f'<path d="M1,-72 Q9,-63 17,-72" fill="none" stroke="{MOUTH}" stroke-width="2.8" stroke-linecap="round"/>'
        f'<circle cx="-5" cy="-75" r="5" fill="{CHEEK}" opacity=".6"/><circle cx="22" cy="-75" r="4.2" fill="{CHEEK}" opacity=".6"/>')

def upper_q_back():
    return (torso_q(True) +
        f'<circle cx="-2" cy="-86" r="29" fill="{SK}"/>'
        f'<circle cx="21" cy="-76" r="3.5" fill="{CHEEK}" opacity=".5"/>'
        # hair pulled back from the turned-away face: cheek, jaw and ear show on the right
        f'<path d="M-33,-82 C-36,-108 -20,{T} -2,{T} C14,{T} 26,-110 24,-96 '
        f'C18,-92 14,-84 13,-74 C12,-68 10,-64 6,-62 C-2,-63 -10,-62 -16,-60 C-26,-62 -32,-72 -33,-82 Z" fill="{HAIR}"/>'
        f'<circle cx="15" cy="-80" r="5" fill="{SK2}"/>'              # ear, just behind the hairline
        f'<path d="M-13,-64 C-17,-50 -15,-36 -8,-24 C0,-36 2,-50 -2,-64 Z" fill="{HAIR}"/>'
        f'<rect x="-13" y="-66" width="12" height="6" rx="3" fill="{HAIR_TIE}"/>')

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
