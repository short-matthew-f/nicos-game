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
                 shoe, shoe2, height=1.0, camo=None, trim='#FFFFFF', top='tee'):
        s.__dict__.update(locals()); del s.__dict__['s']
        s.hl = hl or hair

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
        else:          # tee / jersey: round neck, stripes down the sides
            if not back:
                t += f'<path d="M-9,-52 Q0,-44 9,-52" fill="none" stroke="{s.shirt2}" stroke-width="3"/>'
                t += f'<path d="M5,-36 L13,-36 L13,-26 Q9,-22 5,-26 Z" fill="{s.trim}"/><circle cx="9" cy="-31" r="2.4" fill="{s.shirt2}"/>'
            t += (f'<rect x="-21" y="-40" width="3" height="40" fill="{s.trim}"/>'
                  f'<rect x="18" y="-40" width="3" height="40" fill="{s.trim}"/>')
        return t

    def upper_side(s, pfx, face_cls=''):
        f = rig.fc(face_cls)
        hair = short_side(s.hair) if s.style == 'short' else shaggy_side(s.hair, s.hl)
        shirt = (f'<rect x="-5" y="-62" width="15" height="16" rx="5" fill="{rig.SK2}"/>'
                 f'<rect x="-20" y="-52" width="38" height="54" rx="15" fill="{s.shirt}"/>')
        if s.top == 'hoodie':
            shirt += f'<path d="M-18,-56 C-26,-50 -26,-36 -18,-30 C-14,-40 -12,-48 -10,-56 Z" fill="{s.shirt2}"/>'
        else:
            shirt += f'<rect x="-19" y="-40" width="3" height="40" fill="{s.trim}"/>'
        return (shirt +
            f'<circle cx="4" cy="-86" r="29" fill="{rig.SK}"/><circle cx="31" cy="-81" r="4" fill="{rig.SK}"/>' + hair +
            f'<circle{f} cx="17" cy="-85" r="3.6" fill="{rig.EYE}"/>'
            f'<path{f} d="M10,-71 Q18,-64 27,-71" fill="none" stroke="{rig.MOUTH}" stroke-width="2.8" stroke-linecap="round"/>'
            f'<circle{f} cx="9" cy="-74" r="5" fill="{rig.CHEEK}" opacity=".45"/>')

    def upper_front(s, pfx, face_cls=''):
        f = rig.fc(face_cls)
        hair = short_front(s.hair) if s.style == 'short' else shaggy_front(s.hair, s.hl)
        return (s.torso(False, pfx) + f'<circle cx="0" cy="-86" r="29" fill="{rig.SK}"/>' + hair +
            f'<circle{f} cx="-9.5" cy="-84" r="3.6" fill="{rig.EYE}"/><circle{f} cx="9.5" cy="-84" r="3.6" fill="{rig.EYE}"/>'
            f'<path{f} d="M-7,-72 Q0,-66 7,-72" fill="none" stroke="{rig.MOUTH}" stroke-width="2.8" stroke-linecap="round"/>'
            f'<circle{f} cx="-14" cy="-75" r="5" fill="{rig.CHEEK}" opacity=".45"/><circle{f} cx="14" cy="-75" r="5" fill="{rig.CHEEK}" opacity=".45"/>')

    def upper_back(s, pfx):
        hair = short_back(s.hair) if s.style == 'short' else shaggy_back(s.hair, s.hl)
        return s.torso(True, pfx) + f'<circle cx="0" cy="-86" r="29" fill="{rig.SK}"/>' + hair

    def arm_art(s, far, pfx):
        hand = rig.SK2 if far else rig.SK
        sl = s.sleeve if not far else s.shirt2 if s.top == 'hoodie' else s.sleeve
        if s.top == 'hoodie':   # long sleeve with a cuff
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
        return f'<rect x="-8.5" y="0" width="17" height="50" rx="7" fill="{fill}"/>'

    def defs(s, pfx):
        return camo_defs(pfx, s.camo) if s.camo else ''

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
}

@contextmanager
def wearing(look, pfx):
    """Draw with `look`'s colours and pieces for the duration of the block."""
    names = ['SK', 'SK2', 'PANT', 'PANT2', 'SHOE', 'SHOE2', 'upper_side', 'upper_front', 'upper_back', 'arm_art', 'leg_art']
    saved = {n: getattr(rig, n) for n in names}
    rig._PEOPLE_PFX = pfx
    rig.SK, rig.SK2 = look.skin, look.skin2
    rig.PANT, rig.PANT2, rig.SHOE, rig.SHOE2 = look.pants, look.pants2, look.shoe, look.shoe2
    rig.upper_side, rig.upper_front, rig.upper_back = look.upper_side, look.upper_front, look.upper_back
    rig.arm_art, rig.leg_art = look.arm_art, look.leg_art
    try:
        yield
    finally:
        for n, v in saved.items(): setattr(rig, n, v)
