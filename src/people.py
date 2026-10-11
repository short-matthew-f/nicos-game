"""People in town besides Nico, drawn on the same rig.

Each look sets the rig's colours and swaps in its own hair, shirt, sleeves and trousers.
`wearing(look)` patches them into the `rig` module while a person is being drawn (the
rig's drawing code looks these names up when it runs), then puts Nico's back, so
rig.py and Nico's art stay exactly as they were.

James and Primo follow photos of the real kids (2026-10-09). The photos are reference
only and are not kept in the repo."""
from contextlib import contextmanager
import rig

# ---------------------------------------------------------------- hair
# Head circle: side (4,-86) r29, front/back (0,-86) r29. Hair tops sit near rig.HAIR_TOP.
T = rig.HAIR_TOP

def short_side(h):
    # short, side-swept: a cap over the crown, tapered at the nape, fringe brushed forward
    return (f'<path d="M33,-96 C30,-121 -20,-126 -31,-99 C-35,-87 -31,-76 -24,-70 L-19,-74 '
            f'C-20,-86 -15,-95 -5,-99 C8,-104 22,-103 33,-96 Z" fill="{h}"/>')

def short_front(h):
    # the fringe sweeps across the forehead from his right to left
    return (f'<path d="M-31,-84 C-34,-108 -16,{T} 0,{T} C18,{T} 34,-108 31,-84 L28,-86 '
            f'C26,-96 18,-102 8,-100 C-2,-96 -14,-98 -24,-92 C-27,-90 -29,-87 -31,-84 Z" fill="{h}"/>')

def short_back(h):
    return (f'<path d="M-31,-84 C-34,-110 -16,{T} 0,{T} C16,{T} 34,-110 31,-84 '
            f'C30,-74 22,-68 0,-67 C-22,-68 -30,-74 -31,-84 Z" fill="{h}"/>')

def shaggy_side(h, hl):
    # loose, wavy, down to the shoulders; bangs over the forehead
    return (f'<path d="M31,-97 C26,-124 -24,-128 -33,-98 C-39,-80 -36,-60 -27,-50 C-22,-54 -17,-56 -13,-63 '
            f'C-17,-78 -13,-91 -2,-97 C8,-101 20,-99 25,-92 C28,-94 30,-95 31,-97 Z" fill="{h}"/>'
            f'<path d="M-20,-112 C-6,-120 12,-118 22,-108" fill="none" stroke="{hl}" stroke-width="3.5" stroke-linecap="round"/>'
            f'<path d="M-28,-90 C-31,-78 -29,-66 -24,-58" fill="none" stroke="{hl}" stroke-width="3" stroke-linecap="round"/>')

def shaggy_front(h, hl):
    # from the front it only reaches about the jaw (Matthew, 2026-10-09: shorter than it looks from behind)
    return (f'<path d="M0,{T} C22,{T} 36,-104 34,-84 C34,-76 33,-68 30,-62 C27,-64 24,-65 22,-68 '
            f'C23,-78 22,-88 18,-94 C10,-90 4,-95 0,-97 C-4,-95 -10,-90 -18,-94 C-22,-88 -23,-78 -22,-68 '
            f'C-24,-65 -27,-64 -30,-62 C-33,-68 -34,-76 -34,-84 C-36,-104 -22,{T} 0,{T} Z" fill="{h}"/>'
            f'<path d="M-14,-112 C-4,-116 8,-115 16,-110" fill="none" stroke="{hl}" stroke-width="3.5" stroke-linecap="round"/>')

def shaggy_back(h, hl):
    return (f'<path d="M-33,-82 C-36,-110 -18,{T} 0,{T} C18,{T} 36,-110 33,-82 C34,-68 32,-56 28,-48 '
            f'C20,-52 14,-48 8,-52 C2,-48 -4,-52 -10,-48 C-16,-52 -22,-48 -28,-48 C-32,-56 -34,-68 -33,-82 Z" fill="{h}"/>'
            f'<path d="M-16,-106 C-4,-112 10,-110 18,-104" fill="none" stroke="{hl}" stroke-width="3.5" stroke-linecap="round"/>')

# 3/4 (diagonal) versions, facing right: drawn the way Nico's were (see rig.upper_qfront)
def short_qfront(h):
    # cap over the crown and round the back to the nape; the near ear shows below it; the
    # fringe sweeps across the forehead toward the far side
    return (f'<path d="M30,-92 C30,-110 16,{T} 0,{T} C-16,{T} -31,-106 -33,-88 C-34,-80 -31,-72 -25,-68 '
            f'L-21,-71 C-22,-78 -20,-86 -16,-92 C-8,-96 4,-94 12,-99 C18,-102 25,-99 30,-92 Z" fill="{h}"/>')

def short_qback(h):
    return (f'<path d="M-33,-84 C-35,-108 -18,{T} -2,{T} C12,{T} 25,-108 22,-96 '
            f'C18,-90 16,-82 16,-74 C12,-69 4,-67 -4,-67 C-20,-67 -31,-73 -33,-84 Z" fill="{h}"/>')

def shaggy_qfront(h, hl):
    # loose hair to the jaw, bangs across the forehead, more hair on the near side
    return (f'<path d="M28,-61 C32,-70 34,-80 33,-90 C32,-108 18,{T} 2,{T} C-14,{T} -31,-108 -34,-88 '
            f'C-35,-76 -32,-64 -25,-56 L-21,-58 L-16,-62 C-17,-76 -16,-88 -12,-96 '
            f'C-4,-94 4,-99 10,-96 C16,-100 22,-96 24,-92 C24,-82 24,-72 24,-62 Z" fill="{h}"/>'
            f'<path d="M-12,-110 C0,-116 12,-115 20,-108" fill="none" stroke="{hl}" stroke-width="3.5" stroke-linecap="round"/>')

def shaggy_qback(h, hl):
    return (f'<path d="M-34,-82 C-37,-110 -20,{T} -2,{T} C12,{T} 24,-110 22,-98 '
            f'C17,-92 14,-80 15,-62 C10,-54 4,-50 -2,-52 C-8,-48 -14,-52 -20,-48 C-26,-52 -31,-58 -33,-66 C-35,-72 -34,-78 -34,-82 Z" fill="{h}"/>'
            f'<path d="M-18,-106 C-6,-112 6,-110 14,-104" fill="none" stroke="{hl}" stroke-width="3.5" stroke-linecap="round"/>')

# Poppop (redrawn from photos, 2026-10-10): short, fluffy, wavy white hair, receding at the front corners,
# cut above the ears. (The style is still called 'bald': the first try was.)
def _ear(x, y, rx=4.5, ry=6.5):
    return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{rig.SK2}"/>'

_LINE = 'fill="none" stroke="#000" stroke-opacity=".09" stroke-width="2.4" stroke-linecap="round"'

def bald_side(h):
    # hairline set back from the brow, fluffy over the crown, round the back to the nape;
    # the ear shows below it
    return (f'<path d="M20,-104 C24,-110 22,-116 15,-117 C11,-122 2,-123 -3,-119 '
        f'C-9,-123 -19,-120 -21,-113 C-29,-112 -34,-104 -32,-97 C-37,-92 -36,-82 -32,-78 '
        f'C-35,-71 -30,-63 -23,-63 C-20,-60 -15,-60 -12,-63 C-11,-70 -8,-75 -7,-80 '
        f'C-8,-86 -4,-91 2,-91 C4,-88 5,-85 7,-84 C9,-88 9,-93 12,-97 C14,-101 17,-103 20,-104 Z" fill="{h}"/>'
        f'<path d="M-6,-112 C-14,-108 -20,-100 -22,-92" {_LINE}/>'
        f'<path d="M8,-110 C2,-108 -2,-104 -4,-99" {_LINE}/>'
        + _ear(-1, -82))

def bald_front(h):
    # receding at both corners, a fluffy forelock in the middle, short over the ears
    return (_ear(-29, -81, 5, 7) + _ear(29, -81, 5, 7) +
        f'<path d="M0,-120 C6,-123 14,-121 17,-116 C24,-117 31,-111 31,-104 C36,-99 35,-91 31,-87 '
        f'L28,-88 C28,-94 26,-98 22,-100 C20,-104 17,-107 13,-106 C10,-103 7,-102 4,-103 '
        f'C2,-101 -2,-101 -4,-103 C-7,-102 -10,-103 -13,-106 C-17,-107 -20,-104 -22,-100 '
        f'C-26,-98 -28,-94 -28,-88 L-31,-87 C-35,-91 -36,-99 -31,-104 C-31,-111 -24,-117 -17,-116 '
        f'C-14,-121 -6,-123 0,-120 Z" fill="{h}"/>'
        f'<path d="M-12,-113 C-6,-116 4,-116 10,-112" {_LINE}/>')

def bald_back(h):
    return (_ear(-29, -81, 5, 7) + _ear(29, -81, 5, 7) +
        f'<path d="M0,-120 C6,-123 14,-121 17,-116 C24,-117 31,-111 31,-104 C36,-99 35,-91 31,-86 '
        f'C33,-78 29,-70 23,-67 C19,-63 13,-64 9,-65 C5,-62 -5,-62 -9,-65 C-13,-64 -19,-63 -23,-67 '
        f'C-29,-70 -33,-78 -31,-86 C-35,-91 -36,-99 -31,-104 C-31,-111 -24,-117 -17,-116 '
        f'C-14,-121 -6,-123 0,-120 Z" fill="{h}"/>'
        f'<path d="M-16,-104 C-8,-109 6,-109 14,-103" {_LINE}/>'
        f'<path d="M-14,-80 C-6,-76 6,-76 14,-80" {_LINE}/>')

def bald_qfront(h):
    # head centre (2,-86): receded hairline across the brow, fluffy over the crown and back,
    # the near ear (drawn by the rig) showing at the left
    return (f'<path d="M2,-120 C8,-123 16,-121 19,-116 C26,-116 32,-110 32,-103 C34,-98 33,-93 31,-90 '
        f'C29,-95 27,-99 23,-101 C19,-105 15,-106 11,-104 C7,-102 3,-103 0,-105 C-4,-104 -8,-101 -11,-98 '
        f'C-14,-96 -16,-92 -16,-88 C-19,-89 -22,-87 -23,-84 C-23,-79 -23,-74 -24,-69 '
        f'C-28,-67 -32,-69 -33,-73 C-37,-78 -36,-86 -33,-90 C-37,-97 -33,-106 -27,-109 '
        f'C-25,-116 -17,-120 -11,-118 C-7,-122 -2,-122 2,-120 Z" fill="{h}"/>'
        f'<path d="M-6,-113 C-14,-110 -20,-104 -23,-96" {_LINE}/>'
        f'<path d="M14,-114 C8,-113 4,-111 1,-108" {_LINE}/>')

def bald_qback(h):
    # head centre (-2,-86): the near ear (drawn by the rig) on the right
    return (f'<path d="M-2,-120 C4,-123 12,-121 15,-116 C21,-115 25,-109 24,-103 C26,-98 23,-93 20,-90 '
        f'C18,-86 18,-82 18,-78 C18,-72 14,-67 9,-66 C5,-62 -3,-62 -7,-65 C-11,-63 -17,-63 -21,-66 '
        f'C-27,-68 -32,-74 -33,-80 C-37,-86 -37,-96 -33,-102 C-34,-110 -27,-117 -20,-116 '
        f'C-16,-121 -8,-122 -2,-120 Z" fill="{h}"/>'
        f'<path d="M-20,-104 C-12,-109 0,-109 8,-104" {_LINE}/>'
        f'<path d="M-18,-80 C-10,-76 0,-76 8,-79" {_LINE}/>')

# short and curly (Nonna): a close cap with a row of curls round the crown
def _curls(h, hl, cx, cy, a0, a1, n=7, r=30):
    import math
    out = ''
    for i in range(n):
        a = math.radians(a0 + (a1 - a0) * i / (n - 1))
        x, y = cx + r * math.cos(a), cy + r * math.sin(a)
        out += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="6.5" fill="{h}"/><path d="M{x - 3:.1f},{y:.1f} a3,3 0 0 1 6,0" fill="none" stroke="{hl}" stroke-width="1.6"/>'
    return out
def curly_side(h, hl): return short_side(h) + _curls(h, hl, 2, -92, -190, -40, 5, 26)
def curly_front(h, hl): return short_front(h) + _curls(h, hl, 0, -90, -160, -20, 5, 26)
def curly_back(h, hl): return short_back(h) + _curls(h, hl, 0, -90, -170, -10, 6, 26)
def curly_qfront(h, hl): return short_qfront(h) + _curls(h, hl, -2, -90, -175, -25, 5, 26)
def curly_qback(h, hl): return short_qback(h) + _curls(h, hl, -4, -90, -180, -20, 6, 26)

HAIR = {
    'short': (short_side, short_front, short_back, short_qfront, short_qback),
    'shaggy': (shaggy_side, shaggy_front, shaggy_back, shaggy_qfront, shaggy_qback),
    'bald': (bald_side, bald_front, bald_back, bald_qfront, bald_qback),
    'curly': (curly_side, curly_front, curly_back, curly_qfront, curly_qback),
}
def hair_of(look, view):
    fn = HAIR[look.style][('side', 'front', 'back', 'qfront', 'qback').index(view)]
    return fn(look.hair) if look.style in ('short', 'bald') else fn(look.hair, look.hl)

# glasses and a mustache, over the face (eye positions: side (17,-85); front (+-9.5,-84); 3/4 (0,-84), (17,-84))
def face_extras(look, view):
    out = ''
    if look.mustache:
        m = look.mustache
        if view == 'side':
            out += f'<path d="M6,-75 Q16,-84 31,-76 Q30,-66 22,-69 Q15,-66 6,-75 Z" fill="{m}"/>'
        elif view == 'front':
            out += f'<path d="M-17,-70 Q-12,-81 0,-77 Q12,-81 17,-70 Q12,-64 6,-69 Q0,-67 -6,-69 Q-12,-64 -17,-70 Z" fill="{m}"/>'
        elif view == 'qfront':
            out += f'<path d="M-6,-70 Q-1,-81 9,-77 Q19,-81 24,-70 Q19,-64 14,-69 Q9,-67 3,-69 Q-2,-64 -6,-70 Z" fill="{m}"/>'
    if look.glasses:
        frame, lens = look.glasses[:2]
        st = f'fill="{lens}" stroke="{frame}" stroke-width="2.6"'
        if len(look.glasses) > 2 and look.glasses[2] == 'rect':   # rectangular frames (Yia-Yia)
            st = f'fill="{lens}" stroke="{frame}" stroke-width="3.4"'
            if view == 'side': return out + f'<rect x="10" y="-91" width="17" height="11" rx="3" {st}/><path d="M10,-86 L-6,-84" stroke="{frame}" stroke-width="2.6"/>'
            if view == 'front': return out + f'<rect x="-19" y="-90" width="17" height="11" rx="3" {st}/><rect x="2" y="-90" width="17" height="11" rx="3" {st}/><path d="M-2,-86 L2,-86" stroke="{frame}" stroke-width="2.6"/>'
            if view == 'qfront': return out + f'<rect x="-8" y="-90" width="15" height="11" rx="3" {st}/><rect x="11" y="-90" width="12" height="11" rx="3" {st}/><path d="M7,-86 L11,-86" stroke="{frame}" stroke-width="2.4"/>'
            return out
        if view == 'side':
            out += f'<circle cx="18" cy="-85" r="8" {st}/><path d="M10,-86 L-6,-84" stroke="{frame}" stroke-width="2.4"/>'
        elif view == 'front':
            out += f'<circle cx="-10" cy="-84" r="8" {st}/><circle cx="10" cy="-84" r="8" {st}/><path d="M-2,-85 Q0,-88 2,-85" fill="none" stroke="{frame}" stroke-width="2.2"/>'
        elif view == 'qfront':
            out += f'<circle cx="0" cy="-84" r="7.5" {st}/><ellipse cx="17" cy="-84" rx="6" ry="7.5" {st}/><path d="M7,-85 L11,-85" stroke="{frame}" stroke-width="2.2"/>'
    return out

# ---------------------------------------------------------------- clothes
def camo_defs(pfx, c):
    base, a, b, d = c
    return (f'<pattern id="{pfx}camo" width="28" height="28" patternUnits="userSpaceOnUse">'
            f'<rect width="28" height="28" fill="{base}"/>'
            f'<path d="M2,3 C8,0 13,5 10,10 C6,14 0,10 2,3 Z" fill="{a}"/>'
            f'<path d="M15,13 C22,10 27,16 24,21 C20,26 13,21 15,13 Z" fill="{b}"/>'
            f'<path d="M4,18 C8,16 11,20 9,24 C6,27 2,23 4,18 Z" fill="{d}"/>'
            f'<path d="M18,1 C22,0 25,4 22,7 C19,9 16,5 18,1 Z" fill="{d}"/></pattern>')

class Look:
    def __init__(s, id, *, skin, skin2, hair, hl=None, style, shirt, shirt2, sleeve, pants, pants2,
                 shoe, shoe2, height=1.0, camo=None, trim='#FFFFFF', top='tee', stripe=None, glasses=None, mustache=None, plaid=None):
        s.__dict__.update(locals()); del s.__dict__['s']
        s.hl = hl or hair
        if plaid: s.shirt = s.sleeve = 'url(#eplaid2)'   # (a plaid flannel: the pattern is in defs; the game export's prefix is 'e')

    # -- torso, front and back views (replaces the flannel)
    def torso(s, back, pfx):
        pants = f'url(#{pfx}camo)' if s.camo else s.pants
        t = (f'<rect x="-18" y="-6" width="36" height="14" rx="6" fill="{pants}"/>'
             f'<rect x="-7" y="-62" width="14" height="16" rx="5" fill="{rig.SK2}"/>'
             f'<rect x="-22" y="-52" width="44" height="54" rx="15" fill="{s.shirt}"/>')
        if s.top == 'hoodie':
            if back:   # the hood lies on the shoulders
                t += f'<path d="M-17,-54 C-18,-38 -10,-30 0,-30 C10,-30 18,-38 17,-54 Z" fill="{s.shirt2}"/>'
            else:      # hood round the neck, drawstrings, kangaroo pocket
                t += (f'<path d="M-15,-55 C-14,-46 -6,-42 0,-42 C6,-42 14,-46 15,-55 L10,-57 C8,-50 -8,-50 -10,-57 Z" fill="{s.shirt2}"/>'
                      f'<rect x="-6" y="-46" width="2" height="12" rx="1" fill="{s.trim}"/><rect x="4" y="-46" width="2" height="12" rx="1" fill="{s.trim}"/>'
                      f'<path d="M-14,-18 L14,-18 L17,-4 L-17,-4 Z" fill="{s.shirt2}"/>')
        elif s.top == 'cardigan':   # an open cardigan over a collared shirt (shirt2 shows down the front)
            if not back: t += (f'<path d="M-9,-52 L9,-52 L7,0 L-7,0 Z" fill="{s.shirt2}"/>'
                               f'<path d="M-10,-54 L0,-44 L-4,-56 Z M10,-54 L0,-44 L4,-56 Z" fill="{s.trim}"/>')
        elif s.top == 'gi':      # a karate gi: the jacket's lapels crossing over, and the belt (trim) tied at the front
            if not back: t += (f'<path d="M-12,-53 L9,-13 L15,-13 L-4,-53 Z" fill="{s.shirt2}"/>'
                               f'<path d="M12,-53 L4,-38 L1,-44 L5,-53 Z" fill="{s.shirt2}"/>')
            t += f'<rect x="-22" y="-13" width="44" height="8" rx="2" fill="{s.trim}"/>'
            if not back: t += (f'<rect x="-5" y="-15" width="10" height="11" rx="3" fill="{s.trim}"/>'
                               f'<path d="M-3,-6 L-8,10 L-3,11 L0,-5 Z M3,-6 L8,10 L3,11 L0,-5 Z" fill="{s.trim}"/>')
        elif s.top == 'track':   # track jacket: a stand-up collar, a zip down the front, stripes down the sides
            t += f'<rect x="-14" y="-56" width="28" height="9" rx="4" fill="{s.shirt2}"/>'
            if not back: t += f'<rect x="-1.5" y="-50" width="3" height="50" fill="{s.trim}"/><rect x="-3" y="-50" width="6" height="5" rx="1.5" fill="{s.trim}"/>'
            t += (f'<rect x="-21" y="-40" width="3" height="40" fill="{s.trim}"/>'
                  f'<rect x="18" y="-40" width="3" height="40" fill="{s.trim}"/>')
        else:          # tee / jersey: round neck, stripes down the sides
            if not back:
                t += f'<path d="M-9,-52 Q0,-44 9,-52" fill="none" stroke="{s.shirt2}" stroke-width="3"/>'
                t += f'<path d="M5,-36 L13,-36 L13,-26 Q9,-22 5,-26 Z" fill="{s.trim}"/><circle cx="9" cy="-31" r="2.4" fill="{s.shirt2}"/>'
            t += (f'<rect x="-21" y="-40" width="3" height="40" fill="{s.trim}"/>'
                  f'<rect x="18" y="-40" width="3" height="40" fill="{s.trim}"/>')
        return t

    def upper_side(s, pfx, face_cls=''):
        f = rig.fc(face_cls)
        hair = hair_of(s, 'side')
        shirt = (f'<rect x="-5" y="-62" width="15" height="16" rx="5" fill="{rig.SK2}"/>'
                 f'<rect x="-20" y="-52" width="38" height="54" rx="15" fill="{s.shirt}"/>')
        if s.top == 'hoodie':
            shirt += f'<path d="M-18,-56 C-26,-50 -26,-36 -18,-30 C-14,-40 -12,-48 -10,-56 Z" fill="{s.shirt2}"/>'
        elif s.top == 'gi':
            shirt += (f'<path d="M-2,-53 L14,-20 L18,-24 L6,-53 Z" fill="{s.shirt2}"/>'
                      f'<rect x="-20" y="-13" width="38" height="8" rx="2" fill="{s.trim}"/>'
                      f'<path d="M12,-7 L15,10 L19,9 L16,-6 Z" fill="{s.trim}"/>')
        elif s.top == 'track':
            shirt += (f'<rect x="-10" y="-56" width="20" height="9" rx="4" fill="{s.shirt2}"/>'
                      f'<rect x="15" y="-48" width="3" height="48" fill="{s.trim}"/>')
        else:
            shirt += f'<rect x="-19" y="-40" width="3" height="40" fill="{s.trim}"/>'
        return (shirt +
            f'<circle cx="4" cy="-86" r="29" fill="{rig.SK}"/><circle cx="31" cy="-81" r="4" fill="{rig.SK}"/>' + hair +
            f'<circle{f} cx="17" cy="-85" r="3.6" fill="{rig.EYE}"/>'
            f'<path{f} d="M10,-71 Q18,-64 27,-71" fill="none" stroke="{rig.MOUTH}" stroke-width="2.8" stroke-linecap="round"/>'
            f'<circle{f} cx="9" cy="-74" r="5" fill="{rig.CHEEK}" opacity=".45"/>' + face_extras(s, 'side'))

    def upper_front(s, pfx, face_cls=''):
        f = rig.fc(face_cls)
        hair = hair_of(s, 'front')
        return (s.torso(False, pfx) + f'<circle cx="0" cy="-86" r="29" fill="{rig.SK}"/>' + hair +
            f'<circle{f} cx="-9.5" cy="-84" r="3.6" fill="{rig.EYE}"/><circle{f} cx="9.5" cy="-84" r="3.6" fill="{rig.EYE}"/>'
            f'<path{f} d="M-7,-72 Q0,-66 7,-72" fill="none" stroke="{rig.MOUTH}" stroke-width="2.8" stroke-linecap="round"/>'
            f'<circle{f} cx="-14" cy="-75" r="5" fill="{rig.CHEEK}" opacity=".45"/><circle{f} cx="14" cy="-75" r="5" fill="{rig.CHEEK}" opacity=".45"/>' + face_extras(s, 'front'))

    def upper_back(s, pfx):
        hair = hair_of(s, 'back')
        return s.torso(True, pfx) + f'<circle cx="0" cy="-86" r="29" fill="{rig.SK}"/>' + hair

    def torso_q(s, back, pfx):
        pants = f'url(#{pfx}camo)' if s.camo else s.pants
        t = (f'<rect x="-17" y="-6" width="34" height="14" rx="6" fill="{pants}"/>'
             f'<rect x="-6" y="-62" width="14" height="16" rx="5" fill="{rig.SK2}"/>'
             f'<rect x="-20" y="-52" width="40" height="54" rx="15" fill="{s.shirt}"/>'
             f'<rect x="-20" y="-50" width="9" height="50" rx="4.5" fill="{s.shirt2}"/>')    # the side turned toward us
        if s.top == 'cardigan':
            if not back: t += f'<path d="M-1,-52 L13,-52 L11,0 L-1,0 Z" fill="{s.shirt2}"/>'
        elif s.top == 'hoodie':
            if back:
                t += f'<path d="M-19,-54 C-20,-38 -12,-30 -3,-30 C6,-30 13,-38 12,-54 Z" fill="{s.shirt2}"/>'
            else:
                t += (f'<path d="M-9,-55 C-8,-46 0,-42 6,-42 C12,-42 18,-46 19,-55 L14,-57 C12,-50 -2,-50 -4,-57 Z" fill="{s.shirt2}"/>'
                      f'<rect x="1" y="-46" width="2" height="12" rx="1" fill="{s.trim}"/><rect x="10" y="-46" width="2" height="12" rx="1" fill="{s.trim}"/>'
                      f'<path d="M-8,-18 L18,-18 L20,-4 L-11,-4 Z" fill="{s.shirt2}"/>')
        elif s.top == 'gi':
            if not back: t += f'<path d="M-6,-53 L13,-13 L19,-13 L3,-53 Z" fill="{s.shirt2}"/>'
            t += f'<rect x="-20" y="-13" width="40" height="8" rx="2" fill="{s.trim}"/>'
            if not back: t += f'<rect x="4" y="-15" width="10" height="11" rx="3" fill="{s.trim}"/><path d="M6,-6 L2,10 L6,11 L9,-5 Z M12,-6 L16,10 L12,11 L9,-5 Z" fill="{s.trim}"/>'
        elif s.top == 'track':
            t += f'<rect x="-10" y="-56" width="26" height="9" rx="4" fill="{s.shirt2}"/>'
            if not back: t += f'<rect x="5.5" y="-50" width="3" height="50" fill="{s.trim}"/>'
            t += f'<rect x="17" y="-40" width="3" height="40" fill="{s.trim}"/>'
        else:
            if not back:
                t += f'<path d="M-2,-52 Q6,-45 14,-52" fill="none" stroke="{s.shirt2}" stroke-width="3"/>'
                t += f'<path d="M9,-36 L16,-36 L16,-27 Q12.5,-23 9,-27 Z" fill="{s.trim}"/>'
            t += f'<rect x="17" y="-40" width="3" height="40" fill="{s.trim}"/>'
        return t

    def upper_qfront(s, pfx, face_cls=''):
        f = rig.fc(face_cls)
        hair = hair_of(s, 'qfront')
        ear = f'<ellipse cx="-18" cy="-80" rx="4" ry="5.5" fill="{rig.SK2}"/>' if s.style in ('short', 'bald', 'curly') else ''
        return (s.torso_q(False, pfx) + f'<circle cx="2" cy="-86" r="29" fill="{rig.SK}"/>' + hair + ear +
            f'<circle{f} cx="0" cy="-84" r="3.6" fill="{rig.EYE}"/><ellipse{f} cx="17" cy="-84" rx="3" ry="3.6" fill="{rig.EYE}"/>'
            f'<path{f} d="M2,-72 Q9,-66 16,-72" fill="none" stroke="{rig.MOUTH}" stroke-width="2.8" stroke-linecap="round"/>'
            f'<circle{f} cx="-5" cy="-75" r="5" fill="{rig.CHEEK}" opacity=".45"/><circle{f} cx="19" cy="-75" r="4.2" fill="{rig.CHEEK}" opacity=".45"/>' + face_extras(s, 'qfront'))

    def upper_qback(s, pfx):
        hair = hair_of(s, 'qback')
        ear = f'<ellipse cx="18" cy="-80" rx="3.5" ry="5" fill="{rig.SK2}"/>' if s.style in ('short', 'bald', 'curly') else ''
        return (s.torso_q(True, pfx) + f'<circle cx="-2" cy="-86" r="29" fill="{rig.SK}"/>'
                f'<circle cx="21" cy="-76" r="3.5" fill="{rig.CHEEK}" opacity=".45"/>' + hair + ear)

    def arm_art(s, far, pfx):
        hand = rig.SK2 if far else rig.SK
        sl = s.sleeve if not far else s.shirt2 if s.top == 'hoodie' else s.sleeve
        if s.top == 'track':    # long sleeve, a white stripe down it, a ribbed cuff
            return (f'<circle cx="0" cy="39" r="8" fill="{hand}"/>'
                    f'<rect x="-8.5" y="-7" width="17" height="42" rx="8.5" fill="{sl}"/>'
                    f'<rect x="-1.5" y="-4" width="3" height="31" fill="{s.trim}"/>'
                    f'<rect x="-8" y="28" width="16" height="6" rx="3" fill="{s.shirt2}"/>')
        if s.top in ('hoodie', 'cardigan'):   # long sleeve with a cuff
            return (f'<circle cx="0" cy="39" r="8" fill="{hand}"/>'
                    f'<rect x="-8.5" y="-7" width="17" height="42" rx="8.5" fill="{sl}"/>'
                    f'<rect x="-8" y="27" width="16" height="7" rx="3.5" fill="{s.shirt2}"/>')
        # short sleeve, bare forearm
        return (f'<circle cx="0" cy="39" r="8" fill="{hand}"/>'
                f'<rect x="-6.5" y="8" width="13" height="30" rx="6.5" fill="{hand}"/>'
                f'<rect x="-9" y="-7" width="18" height="21" rx="8" fill="{sl}"/>'
                f'<rect x="-9" y="8" width="18" height="3" fill="{s.trim}"/>')

    def leg_art(s, far):
        fill = f'url(#{rig._PEOPLE_PFX}camo)' if s.camo else (s.pants2 if far else s.pants)
        leg = f'<rect x="-8.5" y="0" width="17" height="50" rx="7" fill="{fill}"/>'
        if s.stripe: leg += f'<rect x="-1.5" y="2" width="3" height="46" fill="{s.stripe}"/>'   # track pants: a stripe down the side
        return leg

    def defs(s, pfx):
        out = camo_defs(pfx, s.camo) if s.camo else ''
        if s.plaid:
            base, band, line = s.plaid
            out += (f'<pattern id="{pfx}plaid2" width="26" height="26" patternUnits="userSpaceOnUse"><rect width="26" height="26" fill="{base}"/>'
                    f'<rect x="0" y="8" width="26" height="8" fill="{band}" opacity=".85"/><rect x="8" y="0" width="8" height="26" fill="{band}" opacity=".7"/>'
                    f'<rect x="0" y="20" width="26" height="2" fill="{line}"/><rect x="20" y="0" width="2" height="26" fill="{line}"/></pattern>')
        return out

LOOKS = {
    # James: short brown hair brushed to the side, navy hoodie, khakis
    'james': Look('james', skin='#EFC4A2', skin2='#DDA684', hair='#5B3B26', style='short', top='hoodie',
                  shirt='#2E3A66', shirt2='#26305A', sleeve='#2E3A66', trim='#E9EEF3',
                  pants='#C9B48A', pants2='#B39E76', shoe='#2F343C', shoe2='#272B32', height=1.02),
    # Primo: younger and smaller; long wavy light-brown hair worn loose, blue soccer jersey
    # with white stripes, camo cargo pants
    'primo': Look('primo', skin='#F2CAA9', skin2='#E0AE8A', hair='#8A5E3B', hl='#B8895B', style='shaggy', top='tee',
                  shirt='#2456C8', shirt2='#1C45A6', sleeve='#2456C8', trim='#FFFFFF',
                  pants='#A39B78', pants2='#8E8766', shoe='#3A3D44', shoe2='#30333A', height=0.86,
                  camo=('#A39B78', '#6E6A4C', '#8C6F5E', '#C9C0A0')),
    # Poppop (Nico's grandpa): bald on top with white hair round the sides, a big white walrus
    # mustache, glasses, an orange-and-green plaid flannel shirt, dark trousers
    'poppop': Look('poppop', skin='#F0C4A8', skin2='#DDA88A', hair='#EDEDED', style='bald', top='tee',
                   shirt='#2F6E62', shirt2='#2F6E62', sleeve='#2F6E62', trim='#2F6E62', plaid=('#2F6E62', '#E07A3A', '#F4EBD6'),
                   pants='#3E4A5A', pants2='#334050', shoe='#5A4131', shoe2='#4A3628', height=1.24,
                   glasses=('#2B3F55', '#DCEAF5'), mustache='#F4F4F4'),
    # Nonna (Nico's grandma): short wavy grey hair, thin rimless glasses, a blue shirt under a grey cardigan
    'nonna': Look('nonna', skin='#F0C9AE', skin2='#DDAE90', hair='#B9BCC0', hl='#E2E4E6', style='curly', top='cardigan',
                  shirt='#C9C6BC', shirt2='#6E8FC4', sleeve='#C9C6BC', trim='#8FAAD6',
                  pants='#4A4E7A', pants2='#3E4268', shoe='#C9A08E', shoe2='#B58C7A', height=1.04,   # (4'11": Nico's almost as tall as her)
                  glasses=('#C9CED6', '#EEF4FA')),
    # Yia-Yia (Nico's other grandma, an artist): short straight grey hair, dark rectangular glasses,
    # a bright blue fleece zipped over a blue top, dark trousers, sneakers
    'yiayia': Look('yiayia', skin='#F2CDB4', skin2='#E0B398', hair='#BDBDB8', hl='#D8D8D4', style='short', top='track',
                   shirt='#2F6FD0', shirt2='#2559B0', sleeve='#2F6FD0', trim='#1E4C9A',
                   pants='#23262E', pants2='#1B1E25', shoe='#2B2E36', shoe2='#F4F6F8', height=1.12, glasses=('#1E2733', '#DCEAF5', 'rect')),
    # Tempo: short dark-brown hair, brown eyes; an all-red tracksuit (white zip and stripes)
    'tempo': Look('tempo', skin='#EDC3A0', skin2='#DBA682', hair='#3B271B', style='short', top='track',
                  shirt='#D9322E', shirt2='#B82723', sleeve='#D9322E', trim='#FFFFFF',
                  pants='#D9322E', pants2='#B82723', shoe='#F4F6F8', shoe2='#D3DAE1', height=0.9, stripe='#FFFFFF'),
    # townspeople (made up, not real people): a spread of skin tones, hair and clothes
    'maya': Look('maya', skin='#C68B62', skin2='#B07650', hair='#2A1E18', hl='#4A362A', style='shaggy', top='tee',
                 shirt='#F07B5F', shirt2='#D9654B', sleeve='#F07B5F', trim='#FFFFFF',
                 pants='#4A6FA5', pants2='#3E5F8E', shoe='#E9EEF3', shoe2='#C9D0D8', height=0.95),
    'leo': Look('leo', skin='#8D5A3B', skin2='#7A4C31', hair='#1E1612', style='short', top='hoodie',
                shirt='#3E8F5A', shirt2='#33774A', sleeve='#3E8F5A', trim='#E9EEF3',
                pants='#5A6472', pants2='#4B545F', shoe='#2F343C', shoe2='#272B32', height=1.0),
    'mrskim': Look('mrskim', skin='#F1C6A6', skin2='#DFA683', hair='#C9C9C9', hl='#E6E6E6', style='shaggy', top='hoodie',
                   shirt='#7B5BA6', shirt2='#684C8F', sleeve='#7B5BA6', trim='#F4F6F8',
                   pants='#C9B48A', pants2='#B39E76', shoe='#6B4E3A', shoe2='#5A4131', height=1.22),
    'sam': Look('sam', skin='#F3CFB3', skin2='#E2B497', hair='#C46A2C', style='short', top='tee',
                shirt='#F2C14E', shirt2='#D9A93A', sleeve='#F2C14E', trim='#FFFFFF',
                pants='#34466B', pants2='#2A3957', shoe='#E5484D', shoe2='#C2353A', height=0.9),
    'ava': Look('ava', skin='#A86F4B', skin2='#94603F', hair='#3B2618', hl='#5C3E28', style='shaggy', top='tee',
                shirt='#2FA4A0', shirt2='#278A87', sleeve='#2FA4A0', trim='#FFFFFF',
                pants='#E8E1D3', pants2='#D3CBBB', shoe='#5B8FD6', shoe2='#4A79B8', height=0.92),
    'mrbrooks': Look('mrbrooks', skin='#7A4A2E', skin2='#673D25', hair='#1A1411', style='short', top='hoodie',
                     shirt='#C7443B', shirt2='#A93830', sleeve='#C7443B', trim='#F4F6F8',
                     pants='#34466B', pants2='#2A3957', shoe='#2F343C', shoe2='#272B32', height=1.24),
    # people who work inside the other buildings, and the grown-ups at home in the houses (made up)
    # Sensei at the dojo: a white gi and a black belt, grey hair, barefoot on the mats
    'sensei': Look('sensei', skin='#E3B48C', skin2='#CF9F78', hair='#9AA0A6', hl='#B8BDC2', style='short', top='gi',
                   shirt='#FAFAF7', shirt2='#DCDCD3', sleeve='#FAFAF7', trim='#1F1F24', pants='#FAFAF7', pants2='#E4E4DC', shoe='#E3B48C', shoe2='#CF9F78', height=1.2),
    'nurse': Look('nurse', skin='#D9A07A', skin2='#C48B66', hair='#2A1E18', hl='#4A362A', style='shaggy', top='tee',
                  shirt='#4FB3A9', shirt2='#3E978E', sleeve='#4FB3A9', trim='#FFFFFF', pants='#4FB3A9', pants2='#3E978E', shoe='#F4F6F8', shoe2='#D3DAE1', height=1.15),
    'firefighter': Look('firefighter', skin='#E8B48E', skin2='#D69C76', hair='#5B3B26', style='short', top='hoodie',
                        shirt='#C9A35A', shirt2='#B08A44', sleeve='#C9A35A', trim='#F9E04A', pants='#C9A35A', pants2='#B08A44', shoe='#2F343C', shoe2='#272B32', height=1.22, stripe='#F9E04A'),
    'farmer': Look('farmer', skin='#E8B48E', skin2='#D69C76', hair='#8A5E3B', style='short', top='tee',
                   shirt='#5B8FD6', shirt2='#4A79B8', sleeve='#5B8FD6', trim='#5B8FD6', pants='#7A5236', pants2='#664430', shoe='#5A4131', shoe2='#4A3628', height=1.2),
    'ranger': Look('ranger', skin='#A86F4B', skin2='#94603F', hair='#2A1E18', style='short', top='tee',
                   shirt='#4E7A44', shirt2='#3F6537', sleeve='#4E7A44', trim='#C9B48A', pants='#C9B48A', pants2='#B39E76', shoe='#5A4131', shoe2='#4A3628', height=1.2),
    'lifeguard': Look('lifeguard', skin='#E8B48E', skin2='#D69C76', hair='#E3C27A', hl='#F2DDA0', style='shaggy', top='tee',
                      shirt='#E5484D', shirt2='#C93B40', sleeve='#E5484D', trim='#FFFFFF', pants='#E5484D', pants2='#C93B40', shoe='#F4F6F8', shoe2='#D3DAE1', height=1.12),
    'scoop': Look('scoop', skin='#F1C6A6', skin2='#DFA683', hair='#C46A2C', style='shaggy', top='tee',
                  shirt='#F7C8D0', shirt2='#E8A9B4', sleeve='#F7C8D0', trim='#FFFFFF', pants='#7FD1C1', pants2='#66B8A8', shoe='#F4F6F8', shoe2='#D3DAE1', height=1.1),
    'toyshop': Look('toyshop', skin='#7A4A2E', skin2='#673D25', hair='#1A1411', style='short', top='hoodie',
                    shirt='#7B5BA6', shirt2='#684C8F', sleeve='#7B5BA6', trim='#F9C846', pants='#34466B', pants2='#2A3957', shoe='#F9C846', shoe2='#D9A93A', height=1.18),
    'janitor': Look('janitor', skin='#C68B62', skin2='#B07650', hair='#5A5A5A', hl='#7A7A7A', style='short', top='hoodie',
                    shirt='#5B6E86', shirt2='#4B5D73', sleeve='#5B6E86', trim='#E9EEF3', pants='#5B6E86', pants2='#4B5D73', shoe='#2F343C', shoe2='#272B32', height=1.2),
    'mom': Look('mom', skin='#E8B48E', skin2='#D69C76', hair='#3B2618', hl='#5C3E28', style='shaggy', top='tee',
                shirt='#F28C38', shirt2='#D9772A', sleeve='#F28C38', trim='#FFFFFF', pants='#34466B', pants2='#2A3957', shoe='#F4F6F8', shoe2='#D3DAE1', height=1.16),
    'dad': Look('dad', skin='#C68B62', skin2='#B07650', hair='#1E1612', style='short', top='hoodie',
                shirt='#3E8F8A', shirt2='#337A76', sleeve='#3E8F8A', trim='#E9EEF3', pants='#C9B48A', pants2='#B39E76', shoe='#2F343C', shoe2='#272B32', height=1.22, glasses=('#2B3F55', '#DCEAF5')),
    'grandma': Look('grandma', skin='#F1C6A6', skin2='#DFA683', hair='#E6E6E6', hl='#FFFFFF', style='curly', top='cardigan',
                    shirt='#E8A9B4', shirt2='#FFFFFF', sleeve='#E8A9B4', trim='#F7C8D0', pants='#7B5BA6', pants2='#684C8F', shoe='#6B4E3A', shoe2='#5A4131', height=1.1, glasses=('#B8554D', '#F4F1EA')),
    # works the counter at Burger Barn: red-and-white uniform
    'cook': Look('cook', skin='#E8B48E', skin2='#D69C76', hair='#3A2A20', style='short', top='tee',
                 shirt='#E5484D', shirt2='#C93B40', sleeve='#FFFFFF', trim='#FFFFFF',
                 pants='#2F343C', pants2='#272B32', shoe='#2F343C', shoe2='#272B32', height=1.12),
    # runs the storage office: an orange work vest
    'clerk': Look('clerk', skin='#C68B62', skin2='#B07650', hair='#5A5A5A', hl='#7A7A7A', style='shaggy', top='hoodie',
                  shirt='#F28C38', shirt2='#D9772A', sleeve='#5B8FD6', trim='#F9E39A',
                  pants='#3E4A5A', pants2='#334050', shoe='#7A5236', shoe2='#664430', height=1.18),
}

@contextmanager
def wearing(look, pfx):
    """Draw with `look`'s colours and pieces for the duration of the block."""
    names = ['SK', 'SK2', 'PANT', 'PANT2', 'SHOE', 'SHOE2', 'upper_side', 'upper_front', 'upper_back', 'upper_qfront', 'upper_qback', 'arm_art', 'leg_art']
    saved = {n: getattr(rig, n) for n in names}
    rig._PEOPLE_PFX = pfx
    rig.SK, rig.SK2 = look.skin, look.skin2
    rig.PANT, rig.PANT2, rig.SHOE, rig.SHOE2 = look.pants, look.pants2, look.shoe, look.shoe2
    rig.upper_side, rig.upper_front, rig.upper_back = look.upper_side, look.upper_front, look.upper_back
    rig.upper_qfront, rig.upper_qback = look.upper_qfront, look.upper_qback
    rig.arm_art, rig.leg_art = look.arm_art, look.leg_art
    try:
        yield
    finally:
        for n, v in saved.items(): setattr(rig, n, v)
