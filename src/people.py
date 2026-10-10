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

    def torso_q(s, back, pfx):
        pants = f'url(#{pfx}camo)' if s.camo else s.pants
        t = (f'<rect x="-17" y="-6" width="34" height="14" rx="6" fill="{pants}"/>'
             f'<rect x="-6" y="-62" width="14" height="16" rx="5" fill="{rig.SK2}"/>'
             f'<rect x="-20" y="-52" width="40" height="54" rx="15" fill="{s.shirt}"/>'
             f'<rect x="-20" y="-50" width="9" height="50" rx="4.5" fill="{s.shirt2}"/>')    # the side turned toward us
        if s.top == 'hoodie':
            if back:
                t += f'<path d="M-19,-54 C-20,-38 -12,-30 -3,-30 C6,-30 13,-38 12,-54 Z" fill="{s.shirt2}"/>'
            else:
                t += (f'<path d="M-9,-55 C-8,-46 0,-42 6,-42 C12,-42 18,-46 19,-55 L14,-57 C12,-50 -2,-50 -4,-57 Z" fill="{s.shirt2}"/>'
                      f'<rect x="1" y="-46" width="2" height="12" rx="1" fill="{s.trim}"/><rect x="10" y="-46" width="2" height="12" rx="1" fill="{s.trim}"/>'
                      f'<path d="M-8,-18 L18,-18 L20,-4 L-11,-4 Z" fill="{s.shirt2}"/>')
        else:
            if not back:
                t += f'<path d="M-2,-52 Q6,-45 14,-52" fill="none" stroke="{s.shirt2}" stroke-width="3"/>'
                t += f'<path d="M9,-36 L16,-36 L16,-27 Q12.5,-23 9,-27 Z" fill="{s.trim}"/>'
            t += f'<rect x="17" y="-40" width="3" height="40" fill="{s.trim}"/>'
        return t

    def upper_qfront(s, pfx, face_cls=''):
        f = rig.fc(face_cls)
        hair = short_qfront(s.hair) if s.style == 'short' else shaggy_qfront(s.hair, s.hl)
        ear = f'<ellipse cx="-18" cy="-80" rx="4" ry="5.5" fill="{rig.SK2}"/>' if s.style == 'short' else ''
        return (s.torso_q(False, pfx) + f'<circle cx="2" cy="-86" r="29" fill="{rig.SK}"/>' + hair + ear +
            f'<circle{f} cx="0" cy="-84" r="3.6" fill="{rig.EYE}"/><ellipse{f} cx="17" cy="-84" rx="3" ry="3.6" fill="{rig.EYE}"/>'
            f'<path{f} d="M2,-72 Q9,-66 16,-72" fill="none" stroke="{rig.MOUTH}" stroke-width="2.8" stroke-linecap="round"/>'
            f'<circle{f} cx="-5" cy="-75" r="5" fill="{rig.CHEEK}" opacity=".45"/><circle{f} cx="19" cy="-75" r="4.2" fill="{rig.CHEEK}" opacity=".45"/>')

    def upper_qback(s, pfx):
        hair = short_qback(s.hair) if s.style == 'short' else shaggy_qback(s.hair, s.hl)
        ear = f'<ellipse cx="18" cy="-80" rx="3.5" ry="5" fill="{rig.SK2}"/>' if s.style == 'short' else ''
        return (s.torso_q(True, pfx) + f'<circle cx="-2" cy="-86" r="29" fill="{rig.SK}"/>'
                f'<circle cx="21" cy="-76" r="3.5" fill="{rig.CHEEK}" opacity=".45"/>' + hair + ear)

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
