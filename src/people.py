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

# ---- the dojo (Litchfield Tang Soo Do, 2026-10-11): drawn from photos the user shared (reference only)
# Mr. Master Krantz: salt-and-pepper hair swept back, receding high at the temples, fuller and wavy over the ears
_LIGHT = 'stroke="#FFFFFF" stroke-opacity=".38" fill="none" stroke-linecap="round"'
def _streaks(d, hl, w=2): return f'<path d="{d}" stroke="{hl}" stroke-width="{w}" fill="none" stroke-linecap="round"/>'
def neat_side(h, hl):
    return (_ear(-1, -82) +
        f'<path d="M20,-108 C14,-118 0,-121 -12,-119 C-26,-116 -34,-104 -34,-92 C-35,-80 -31,-70 -25,-65 C-21,-63 -16,-64 -13,-67 '
        f'C-11,-72 -9,-76 -8,-82 C-9,-88 -5,-92 1,-92 C5,-92 8,-95 10,-99 C13,-103 16,-106 20,-108 Z" fill="{h}"/>'
        f'<path d="M-8,-88 C-4,-92 2,-92 6,-89 L4,-86 C0,-88 -4,-88 -7,-86 Z" fill="{h}"/>'
        + _streaks('M10,-113 C0,-116 -12,-113 -22,-104 M4,-106 C-6,-108 -16,-102 -22,-92 M-28,-92 C-31,-84 -30,-76 -26,-70', hl)
        + f'<path d="M14,-111 C6,-114 -2,-114 -10,-111" {_LIGHT} stroke-width="2"/>')
def neat_front(h, hl):
    return (_ear(-29, -81, 5, 7) + _ear(29, -81, 5, 7) +
        f'<path d="M-30,-95 C-32,-112 -17,-121 0,-121 C17,-121 32,-112 30,-95 C29,-90 31,-84 33,-80 C34,-74 31,-70 28,-71 '
        f'C28,-76 27,-81 26,-86 C26,-92 25,-96 22,-100 C19,-104 14,-108 9,-109 C5,-107 2,-106 0,-107 C-2,-106 -5,-107 -9,-109 '
        f'C-14,-108 -19,-104 -22,-100 C-25,-96 -26,-92 -26,-86 C-27,-81 -28,-76 -28,-71 C-31,-70 -34,-74 -33,-80 C-31,-84 -29,-90 -30,-95 Z" fill="{h}"/>'
        + _streaks('M-5,-111 C-9,-116 -16,-117 -23,-112 M5,-111 C9,-116 16,-117 23,-112 M-28,-93 C-31,-87 -31,-80 -30,-75 M28,-93 C31,-87 31,-80 30,-75', hl)
        + f'<path d="M-3,-116 C3,-119 10,-119 17,-115 M-27,-100 C-29,-96 -30,-92 -30,-88" {_LIGHT} stroke-width="2"/>')
def neat_back(h, hl):
    return (_ear(-29, -81, 5, 7) + _ear(29, -81, 5, 7) +
        f'<path d="M-31,-90 C-33,-110 -16,-121 0,-121 C16,-121 33,-110 31,-90 C32,-82 30,-74 25,-69 C20,-66 15,-67 12,-65 '
        f'C6,-63 -6,-63 -12,-65 C-15,-67 -20,-66 -25,-69 C-30,-74 -32,-82 -31,-90 Z" fill="{h}"/>'
        + _streaks('M-20,-110 C-10,-105 -6,-96 -8,-84 M20,-110 C10,-105 6,-96 8,-84 M0,-119 C2,-108 0,-96 -2,-80', hl)
        + f'<path d="M-14,-114 C-6,-117 6,-117 14,-114 M-27,-92 C-26,-84 -22,-76 -16,-71" {_LIGHT} stroke-width="2"/>')
def neat_qfront(h, hl):
    return (f'<path d="M24,-104 C16,-116 4,-121 -8,-120 C-22,-117 -32,-106 -33,-94 C-34,-84 -32,-74 -27,-68 C-23,-66 -20,-68 -19,-72 '
            f'C-21,-78 -21,-84 -18,-89 C-14,-94 -8,-97 -2,-99 C2,-103 6,-106 10,-107 C14,-106 18,-106 22,-103 Z" fill="{h}"/>'
            f'<path d="M29,-98 C31,-91 31,-85 30,-80 L27,-82 C27,-88 27,-93 26,-97 Z" fill="{h}"/>'
            + _streaks('M6,-113 C-4,-115 -14,-112 -22,-104 M-2,-106 C-10,-104 -16,-98 -20,-90 M-29,-90 C-31,-84 -30,-76 -27,-70', hl)
            + f'<path d="M14,-112 C6,-116 -4,-117 -12,-114" {_LIGHT} stroke-width="2"/>')
def neat_qback(h, hl):
    return (f'<path d="M-2,-121 C12,-121 24,-113 25,-102 C26,-96 24,-90 21,-86 C20,-80 20,-75 17,-70 C12,-66 4,-65 -6,-65 '
            f'C-16,-65 -26,-69 -31,-77 C-35,-86 -35,-100 -29,-110 C-23,-118 -12,-121 -2,-121 Z" fill="{h}"/>'
            + _streaks('M-22,-108 C-12,-104 -8,-96 -10,-84 M12,-112 C6,-104 4,-94 6,-82', hl)
            + f'<path d="M-16,-115 C-8,-118 4,-118 12,-114" {_LIGHT} stroke-width="2"/>')

# Master Schindewolf: shaved on top, a short grey band low round the sides and back
_FRINGE = 'opacity=".55"'
def shaved_side(h): return (f'<path d="M-20,-100 C-17,-94 -13,-88 -10,-78 C-11,-74 -14,-70 -17,-69 C-23,-76 -24,-90 -20,-100 Z" fill="{h}" {_FRINGE}/>'
                            + _ear(-1, -82) + f'<ellipse cx="-2" cy="-108" rx="11" ry="5" fill="#FFFFFF" opacity=".28"/>')
def shaved_front(h): return (f'<path d="M-29,-97 C-26,-90 -25,-82 -25,-74 L-28,-72 C-30,-80 -30,-90 -29,-97 Z M29,-97 C26,-90 25,-82 25,-74 L28,-72 C30,-80 30,-90 29,-97 Z" fill="{h}" {_FRINGE}/>'
                             + _ear(-29, -81, 5, 7) + _ear(29, -81, 5, 7) + f'<ellipse cx="-6" cy="-108" rx="12" ry="5" fill="#FFFFFF" opacity=".28"/>')
def shaved_back(h): return (_ear(-29, -81, 5, 7) + _ear(29, -81, 5, 7) +
                            f'<path d="M-28,-90 C-27,-78 -19,-70 0,-68 C19,-70 27,-78 28,-90 C25,-83 16,-77 0,-76 C-16,-77 -25,-83 -28,-90 Z" fill="{h}" opacity=".4"/>'
                            f'<ellipse cx="0" cy="-108" rx="12" ry="5" fill="#FFFFFF" opacity=".22"/>')
def shaved_qfront(h): return (f'<path d="M-24,-96 C-21,-88 -20,-80 -19,-73 L-22,-71 C-25,-79 -26,-89 -24,-96 Z" fill="{h}" {_FRINGE}/>'
                              f'<ellipse cx="-2" cy="-108" rx="12" ry="5" fill="#FFFFFF" opacity=".28"/>')
def shaved_qback(h): return f'<path d="M-31,-94 C-30,-80 -21,-70 -4,-68 C7,-68 14,-71 18,-77 C12,-76 4,-77 -4,-78 C-18,-79 -27,-86 -31,-94 Z" fill="{h}" {_FRINGE}/>'

# Erin: dark-blonde, darker at the roots, parted on her right, pulled back smooth into a ponytail, a loose wisp at the temple
def tail_side(h, hl):
    return (f'<path d="M-22,-98 C-38,-94 -40,-72 -35,-54 C-32,-46 -27,-42 -25,-48 C-29,-60 -27,-78 -17,-92 Z" fill="{h}"/>'
            f'<path d="M-30,-86 C-33,-74 -32,-62 -29,-54" stroke="{hl}" stroke-width="2" fill="none" stroke-linecap="round"/>'
            f'<path d="M26,-102 C20,-122 -22,-124 -32,-98 C-35,-90 -33,-84 -30,-80 L-22,-86 C-18,-94 -10,-100 0,-102 C10,-104 18,-104 26,-102 Z" fill="{h}"/>'
            f'<path d="M14,-112 C0,-116 -14,-112 -24,-100 M8,-106 C-2,-108 -12,-104 -19,-96" stroke="{hl}" stroke-width="2" fill="none" stroke-linecap="round"/>'
            f'<rect x="-33" y="-98" width="10" height="5" rx="2.5" fill="#3A2E2A" transform="rotate(-60 -28 -95)"/>' + _ear(-3, -82))
def tail_front(h, hl):
    return (_ear(-29, -81, 5, 7) + _ear(29, -81, 5, 7) +
        f'<path d="M-7,-121 C12,-123 31,-112 31,-94 C31,-89 30,-86 29,-84 L26,-86 C25,-96 20,-104 8,-107 C2,-108 -4,-106 -7,-104 '
        f'C-14,-104 -22,-99 -26,-90 L-29,-84 C-31,-88 -31,-92 -31,-96 C-31,-110 -22,-120 -7,-121 Z" fill="{h}"/>'
        f'<path d="M-7,-121 L-7,-105" stroke="#000" stroke-opacity=".25" stroke-width="1.6"/>'
        f'<path d="M-2,-116 C8,-117 18,-112 24,-103 M-12,-115 C-18,-112 -23,-106 -26,-98" stroke="{hl}" stroke-width="2.2" fill="none" stroke-linecap="round"/>'
        f'<path d="M-25,-95 C-28,-89 -28,-83 -26,-77" stroke="{h}" stroke-width="2.2" fill="none" stroke-linecap="round"/>')
def tail_back(h, hl):
    return (_ear(-29, -81, 5, 7) + _ear(29, -81, 5, 7) +
        f'<path d="M-31,-90 C-33,-110 -16,-119 0,-119 C16,-119 33,-110 31,-90 C30,-80 24,-73 14,-70 C6,-69 -6,-69 -14,-70 C-24,-73 -30,-80 -31,-90 Z" fill="{h}"/>'
        f'<path d="M-24,-104 C-16,-96 -8,-90 -2,-86 M24,-104 C16,-96 8,-90 2,-86 M0,-118 L0,-88" stroke="{hl}" stroke-width="2" fill="none" stroke-linecap="round"/>'
        f'<path d="M-6,-86 C-11,-66 -9,-46 0,-34 C9,-46 11,-66 6,-86 Z" fill="{h}"/>'
        f'<path d="M-2,-78 C-4,-62 -3,-50 0,-42 M3,-76 C4,-64 3,-54 1,-46" fill="none" stroke="{hl}" stroke-width="1.8" stroke-linecap="round"/>'
        f'<rect x="-5" y="-89" width="10" height="7" rx="3" fill="#3A2E2A"/>')
def tail_qfront(h, hl):
    return (f'<path d="M-4,-121 C15,-122 32,-110 32,-94 C32,-90 31,-88 30,-86 L27,-88 C25,-97 18,-104 6,-106 '
            f'C-8,-104 -14,-98 -17,-90 L-20,-84 C-24,-84 -28,-82 -31,-80 C-34,-86 -34,-96 -30,-104 C-25,-113 -16,-120 -4,-121 Z" fill="{h}"/>'
            f'<path d="M-30,-92 C-38,-80 -37,-62 -32,-50 C-28,-46 -26,-52 -27,-60 C-28,-72 -26,-82 -22,-90 Z" fill="{h}"/>'
            f'<path d="M-4,-121 L-3,-106" stroke="#000" stroke-opacity=".25" stroke-width="1.6"/>'
            f'<path d="M4,-116 C14,-115 22,-109 27,-100 M-8,-114 C-14,-110 -18,-104 -20,-96" fill="none" stroke="{hl}" stroke-width="2.2" stroke-linecap="round"/>')
def tail_qback(h, hl):
    return (f'<path d="M-2,-119 C14,-119 26,-110 24,-98 C22,-92 18,-86 17,-80 C14,-72 6,-70 -4,-70 C-16,-70 -28,-74 -32,-84 C-35,-104 -18,-119 -2,-119 Z" fill="{h}"/>'
            f'<path d="M-24,-104 C-16,-96 -10,-90 -6,-86 M14,-108 C8,-98 2,-92 -4,-88" stroke="{hl}" stroke-width="2" fill="none" stroke-linecap="round"/>'
            f'<path d="M-12,-86 C-17,-66 -15,-46 -6,-36 C3,-46 5,-66 0,-86 Z" fill="{h}"/>'
            f'<rect x="-11" y="-89" width="10" height="7" rx="3" fill="#3A2E2A"/>')

# Mrs. Master Krantz: long honey-blonde hair from a centre part, falling to cover the tops of her ears, gathered into a
# long braid over her shoulder
def _braid(x0, y0, x1, y1, h, hl, w=8, n=7):
    out = f'<path d="M{x0},{y0} L{x1},{y1}" stroke="{h}" stroke-width="{w * 1.6}" stroke-linecap="round"/>'
    for i in range(n):
        t = (i + 0.5) / n; x = x0 + (x1 - x0) * t; y = y0 + (y1 - y0) * t
        out += (f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{w * 0.85:.1f}" ry="{w * 0.62:.1f}" fill="{h}" stroke="{hl}" stroke-width="1.3"/>'
                f'<path d="M{x - w * 0.4:.1f},{y - w * 0.2:.1f} q{w * 0.4:.1f},-{w * 0.3:.1f} {w * 0.8:.1f},0" {_LIGHT} stroke-width="1.4"/>')
    return (out + f'<rect x="{x1 - 4}" y="{y1 - 1}" width="8" height="4" rx="2" fill="#2B2B30"/>'
            f'<path d="M{x1 - 4},{y1 + 3} C{x1 - 6},{y1 + 9} {x1 - 3},{y1 + 13} {x1},{y1 + 14} C{x1 + 3},{y1 + 13} {x1 + 6},{y1 + 9} {x1 + 4},{y1 + 3} Z" fill="{h}"/>')
def braid_side(h, hl):
    return (f'<path d="M26,-102 C20,-123 -22,-125 -32,-98 C-37,-86 -34,-74 -26,-66 L-18,-70 C-20,-80 -16,-92 -6,-99 '
            f'C6,-105 16,-104 26,-102 Z" fill="{h}"/>'
            f'<path d="M12,-113 C-2,-117 -16,-112 -26,-98 M2,-106 C-10,-104 -18,-96 -22,-84" fill="none" stroke="{hl}" stroke-width="2" stroke-linecap="round"/>'
            f'<path d="M8,-116 C-4,-118 -14,-114 -20,-108" {_LIGHT} stroke-width="2.2"/>'
            + _braid(-24, -68, -28, -12, h, hl, 7, 6))
def braid_front(h, hl):
    return (f'<path d="M0,-121 C20,-121 33,-109 33,-92 C33,-82 31,-74 27,-70 L24,-73 C25,-84 24,-94 18,-101 '
            f'C13,-106 6,-108 0,-108 C-6,-108 -13,-106 -18,-101 C-24,-94 -25,-84 -24,-73 L-27,-70 C-31,-74 -33,-82 -33,-92 C-33,-109 -20,-121 0,-121 Z" fill="{h}"/>'
            f'<path d="M0,-121 L0,-108" stroke="{hl}" stroke-width="1.8"/>'
            f'<path d="M-4,-113 C-14,-111 -22,-104 -26,-94 M4,-113 C14,-111 22,-104 26,-94" fill="none" stroke="{hl}" stroke-width="2" stroke-linecap="round"/>'
            f'<path d="M-8,-118 C-18,-116 -26,-108 -29,-98 M8,-118 C18,-116 26,-108 29,-98" {_LIGHT} stroke-width="2.2"/>'
            + _braid(-25, -72, -20, -6, h, hl, 7, 7))
def braid_back(h, hl):
    return (f'<path d="M-31,-88 C-34,-110 -16,-119 0,-119 C16,-119 34,-110 31,-88 C30,-76 24,-68 12,-66 C4,-65 -4,-65 -12,-66 C-24,-68 -30,-76 -31,-88 Z" fill="{h}"/>'
            f'<path d="M-24,-106 C-14,-98 -4,-86 4,-72 M24,-106 C18,-96 10,-84 6,-72 M0,-118 C2,-100 4,-86 5,-72" fill="none" stroke="{hl}" stroke-width="2" stroke-linecap="round"/>'
            f'<path d="M-16,-112 C-6,-104 0,-94 2,-84" {_LIGHT} stroke-width="2.2"/>'
            + _braid(4, -70, 22, -30, h, hl, 7, 5))
def braid_qfront(h, hl):
    return (f'<path d="M2,-121 C20,-121 33,-108 33,-92 C33,-84 31,-77 28,-72 L24,-75 C25,-88 20,-101 8,-106 '
            f'C-8,-103 -15,-94 -17,-84 L-20,-80 C-24,-80 -28,-78 -31,-75 C-34,-82 -34,-94 -30,-104 C-25,-113 -12,-121 2,-121 Z" fill="{h}"/>'
            f'<path d="M6,-120 L7,-106" stroke="{hl}" stroke-width="1.8"/>'
            f'<path d="M4,-114 C-6,-111 -13,-104 -17,-94 M10,-114 C18,-110 25,-102 28,-92" fill="none" stroke="{hl}" stroke-width="2" stroke-linecap="round"/>'
            f'<path d="M0,-118 C-10,-116 -18,-110 -22,-102" {_LIGHT} stroke-width="2.2"/>'
            + _braid(-22, -72, -14, -6, h, hl, 7, 7))
def braid_qback(h, hl):
    return (f'<path d="M-2,-119 C14,-119 26,-110 24,-98 C22,-90 18,-84 17,-78 C14,-70 6,-67 -4,-67 C-16,-67 -28,-72 -32,-84 C-35,-104 -18,-119 -2,-119 Z" fill="{h}"/>'
            f'<path d="M-24,-104 C-16,-96 -8,-84 -4,-72 M14,-110 C8,-98 2,-86 -2,-72" fill="none" stroke="{hl}" stroke-width="2" stroke-linecap="round"/>'
            + _braid(-6, -70, 8, -28, h, hl, 7, 5))

# Nico himself, for his dojo whites (the dobok): his own hair, copied from rig.py
def nico_side(h, hl):
    return (f'<path d="M27,-103 C20,-123 -22,-125 -31,-98 C-36,-84 -31,-71 -21,-64 L-13,-68 '
            f'C-16,-78 -13,-90 -3,-98 C7,-104 17,-103 27,-103 Z" fill="{h}"/>'
            f'<rect x="-28" y="-73" width="11" height="6" rx="3" fill="{rig.HAIR_TIE}" transform="rotate(-20 -22 -70)"/>')
def nico_front(h, hl):
    return (f'<path d="M0,{T} C20,{T} 35,-104 32,-84 C32,-74 31,-65 27,-59 L21,-63 '
            f'C22,-80 18,-96 0,-106 C-18,-96 -22,-80 -21,-63 L-27,-59 C-31,-65 -32,-74 -32,-84 '
            f'C-35,-104 -20,{T} 0,{T} Z" fill="{h}"/>')
def nico_back(h, hl):
    return (f'<path d="M-31,-82 C-34,-108 -18,{T} 0,{T} C18,{T} 34,-108 31,-82 '
            f'C31,-72 26,-63 14,-60 C5,-63 -5,-63 -14,-60 C-26,-63 -31,-72 -31,-82 Z" fill="{h}"/>'
            f'<path d="M-6,-64 C-10,-50 -8,-36 0,-24 C8,-36 10,-50 6,-64 Z" fill="{h}"/>'
            f'<rect x="-6" y="-66" width="12" height="6" rx="3" fill="{rig.HAIR_TIE}"/>')
def nico_qfront(h, hl):
    return (f'<path d="M28,-61 C32,-70 34,-80 33,-90 C32,-108 18,{T} 2,{T} C-14,{T} -30,-108 -33,-90 '
            f'C-34,-80 -31,-70 -24,-62 L-22,-60 L-16,-63 C-17,-80 -12,-96 8,-106 C17,-98 23,-84 24,-62 Z" fill="{h}"/>')
def nico_qback(h, hl):
    return (f'<path d="M-33,-82 C-36,-108 -20,{T} -2,{T} C12,{T} 24,-110 22,-98 '
            f'C17,-92 14,-80 15,-66 C12,-61 6,-60 0,-61 C-10,-60 -18,-59 -24,-62 C-30,-66 -33,-74 -33,-82 Z" fill="{h}"/>'
            f'<path d="M-13,-64 C-17,-50 -15,-36 -8,-24 C0,-36 2,-50 -2,-64 Z" fill="{h}"/>'
            f'<rect x="-13" y="-66" width="12" height="6" rx="3" fill="{rig.HAIR_TIE}"/>')
# ---- Nico's friends (2026-10-11), drawn from photos the user shared (reference only)
# Yarosh: a big tousled mop of brown curls on top, falling forward over his forehead, short at the back and sides
def _puffs(h, hl, pts):
    out = ''.join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{h}"/>' for x, y, r in pts)
    return out + ''.join(f'<path d="M{x - r * .45:.1f},{y + r * .1:.1f} a{r * .45:.1f},{r * .45:.1f} 0 0 1 {r * .9:.1f},0" fill="none" stroke="{hl}" stroke-width="1.8" stroke-linecap="round"/>' for x, y, r in pts[::2])
def _arc(cx, cy, r, a0, a1, n, size):
    import math
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / (n - 1))), cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / (n - 1))), size) for i in range(n)]
def tousle_side(h, hl):
    return short_side(h) + _puffs(h, hl, _arc(0, -98, 25, -195, -35, 7, 9) + [(-6, -112, 9), (10, -114, 9), (24, -104, 8), (31, -97, 6.5), (27, -93, 5.5)])
def tousle_front(h, hl):
    return short_front(h) + _puffs(h, hl, _arc(0, -96, 27, -178, -2, 8, 8.5) + [(-8, -116, 9), (9, -117, 9), (-16, -100, 7), (-4, -101, 7.5), (9, -99, 7), (20, -96, 6)])
def tousle_back(h, hl):
    return short_back(h) + _puffs(h, hl, _arc(0, -96, 27, -182, 2, 8, 8.5) + [(-9, -114, 9), (9, -115, 9)])
def tousle_qfront(h, hl):
    return short_qfront(h) + _puffs(h, hl, _arc(-1, -96, 27, -190, -15, 8, 8.5) + [(-6, -116, 9), (10, -116, 9), (-2, -101, 7), (11, -100, 7), (22, -96, 6)])
def tousle_qback(h, hl):
    return short_qback(h) + _puffs(h, hl, _arc(-4, -96, 26, -185, -20, 7, 8.5) + [(-12, -114, 9), (4, -116, 9)])

# Alpha: a thick dark mop: heavy bangs straight down to his eyebrows, over his ears, down to his jaw
_TOP = -122
def mop_side(h, hl):
    return (f'<path d="M36,-96 C35,-116 16,{_TOP} -6,{_TOP} C-27,-120 -39,-104 -38,-86 C-38,-72 -35,-60 -29,-52 '
            f'C-23,-54 -18,-55 -12,-56 C-8,-62 -4,-68 0,-74 C3,-79 6,-84 9,-88 C12,-90 14,-90 17,-90 '
            f'L21,-93 L25,-89 L29,-93 L33,-90 C35,-92 36,-94 36,-96 Z" fill="{h}"/>'
            f'<path d="M-24,-110 C-8,-118 10,-117 24,-108 M-30,-92 C-32,-78 -30,-66 -25,-58 M-14,-104 C-20,-92 -18,-80 -12,-70" fill="none" stroke="{hl}" stroke-width="3" stroke-linecap="round"/>')
def mop_front(h, hl):
    return (f'<path d="M0,{_TOP} C24,{_TOP} 39,-106 38,-84 C38,-72 36,-62 31,-55 C28,-57 25,-59 22,-61 '
            f'C23,-72 23,-82 22,-90 L17,-92 L13,-89 L8,-93 L3,-90 L-2,-93 L-7,-90 L-12,-93 L-17,-90 L-22,-91 '
            f'C-23,-82 -23,-72 -22,-61 C-25,-59 -28,-57 -31,-55 C-36,-62 -38,-72 -38,-84 C-39,-106 -24,{_TOP} 0,{_TOP} Z" fill="{h}"/>'
            f'<path d="M-16,-114 C-4,-118 8,-117 18,-112 M-30,-86 C-31,-76 -30,-66 -27,-60 M30,-86 C31,-76 30,-66 27,-60 M-6,-108 L-8,-96 M8,-108 L9,-96" fill="none" stroke="{hl}" stroke-width="2.8" stroke-linecap="round"/>')
def mop_back(h, hl):
    return (f'<path d="M-37,-84 C-39,-108 -20,{_TOP} 0,{_TOP} C20,{_TOP} 39,-108 37,-84 C38,-70 35,-60 30,-52 '
            f'C22,-56 16,-52 9,-55 C3,-51 -3,-55 -9,-51 C-16,-55 -22,-51 -30,-52 C-35,-60 -38,-70 -37,-84 Z" fill="{h}"/>'
            f'<path d="M-18,-108 C-6,-113 8,-112 18,-106 M-20,-90 C-22,-78 -20,-66 -16,-58 M4,-96 C3,-82 4,-70 6,-60 M24,-92 C25,-80 24,-68 21,-60" fill="none" stroke="{hl}" stroke-width="2.6" stroke-linecap="round"/>')
def mop_qfront(h, hl):
    return (f'<path d="M30,-60 C35,-70 37,-82 36,-92 C35,-110 20,{_TOP} 2,{_TOP} C-16,{_TOP} -36,-108 -37,-86 '
            f'C-38,-72 -34,-60 -27,-52 C-22,-55 -18,-58 -14,-62 C-15,-72 -14,-82 -11,-90 '
            f'L-6,-92 L-1,-89 L4,-93 L9,-90 L14,-93 L19,-90 L24,-92 C25,-84 25,-72 25,-62 Z" fill="{h}"/>'
            f'<path d="M-14,-112 C0,-118 14,-116 24,-108 M-28,-90 C-30,-78 -28,-66 -23,-58 M30,-88 C31,-78 30,-70 28,-64" fill="none" stroke="{hl}" stroke-width="2.8" stroke-linecap="round"/>')
def mop_qback(h, hl):
    return (f'<path d="M-37,-84 C-40,-110 -20,{_TOP} -2,{_TOP} C14,{_TOP} 28,-110 26,-96 '
            f'C20,-90 18,-78 18,-62 C12,-54 6,-52 0,-54 C-6,-50 -12,-54 -18,-50 C-26,-53 -33,-60 -36,-68 C-38,-74 -37,-80 -37,-84 Z" fill="{h}"/>'
            f'<path d="M-20,-108 C-8,-114 6,-112 16,-106 M-24,-90 C-26,-78 -24,-66 -19,-58 M2,-96 C1,-82 2,-70 4,-60" fill="none" stroke="{hl}" stroke-width="2.6" stroke-linecap="round"/>')

# (hair that hangs behind the body: drawn before the torso)
BEHIND = {
    'nico': {'side': lambda h: f'<path d="M-24,-71 C-36,-60 -34,-40 -27,-27 C-22,-36 -18,-52 -15,-66 Z" fill="{h}"/>',
             'qfront': lambda h: f'<path d="M-11,-72 C-15,-62 -14,-50 -10,-42 C-6,-50 -4,-60 -3,-68 Z" fill="{h}"/>'},
}

HAIR = {
    'short': (short_side, short_front, short_back, short_qfront, short_qback),
    'shaggy': (shaggy_side, shaggy_front, shaggy_back, shaggy_qfront, shaggy_qback),
    'bald': (bald_side, bald_front, bald_back, bald_qfront, bald_qback),
    'curly': (curly_side, curly_front, curly_back, curly_qfront, curly_qback),
    'neat': (neat_side, neat_front, neat_back, neat_qfront, neat_qback),
    'shaved': (shaved_side, shaved_front, shaved_back, shaved_qfront, shaved_qback),
    'tail': (tail_side, tail_front, tail_back, tail_qfront, tail_qback),
    'braid': (braid_side, braid_front, braid_back, braid_qfront, braid_qback),
    'nico': (nico_side, nico_front, nico_back, nico_qfront, nico_qback),
    'tousle': (tousle_side, tousle_front, tousle_back, tousle_qfront, tousle_qback),
    'mop': (mop_side, mop_front, mop_back, mop_qfront, mop_qback),
}
def behind_of(look, view):
    f = BEHIND.get(look.style, {}).get(view)
    return f(look.hair) if f else ''
def hair_of(look, view):
    fn = HAIR[look.style][('side', 'front', 'back', 'qfront', 'qback').index(view)]
    return fn(look.hair) if look.style in ('short', 'bald', 'shaved') else fn(look.hair, look.hl)

def _beard(look, view):
    kind, c, hl = look.beard
    mouth = rig.MOUTH
    if kind == 'goatee':   # Mr. Master Krantz: a white mustache and a short beard round the chin
        if view == 'front':
            return (f'<path d="M-13,-71 Q-12,-79 0,-77 Q12,-79 13,-71 Q14,-62 9,-58 Q0,-53 -9,-58 Q-14,-62 -13,-71 Z M-7,-70 Q0,-65 7,-70 Q6,-63 0,-62 Q-6,-63 -7,-70 Z" fill="{c}" fill-rule="evenodd"/>'
                    f'<path d="M-6,-70 Q0,-66 6,-70" fill="none" stroke="{mouth}" stroke-width="2.4" stroke-linecap="round"/>')
        if view == 'qfront':
            return (f'<path d="M-3,-71 Q-2,-79 9,-77 Q20,-79 21,-71 Q21,-62 17,-58 Q9,-53 1,-58 Q-3,-62 -3,-71 Z M3,-70 Q9,-65 15,-70 Q14,-63 9,-62 Q4,-63 3,-70 Z" fill="{c}" fill-rule="evenodd"/>'
                    f'<path d="M4,-70 Q9,-66 14,-70" fill="none" stroke="{mouth}" stroke-width="2.4" stroke-linecap="round"/>')
        if view == 'side':
            # (covers the mouth's whole curve, so the smile drawn on top never pokes out past the beard)
            return (f'<path d="M7,-74 Q19,-82 31,-75 Q33,-64 27,-57 Q18,-53 10,-59 Q6,-66 7,-74 Z" fill="{c}"/>'
                    f'<path d="M15,-69 Q21,-65 27,-69" fill="none" stroke="{mouth}" stroke-width="2.4" stroke-linecap="round"/>')
        return ''
    if kind == 'full':     # Master Schindewolf: a short full beard and mustache, grey through the brown
        if view == 'front':
            return (f'<path d="M-27,-82 C-27,-70 -21,-60 -11,-56 Q0,-52 11,-56 C21,-60 27,-70 27,-82 C24,-77 19,-73 13,-72 Q11,-78 0,-76.5 Q-11,-78 -13,-72 C-19,-73 -24,-77 -27,-82 Z" fill="{c}"/>'
                    f'<path d="M-6,-70 Q0,-66 6,-70" fill="none" stroke="{mouth}" stroke-width="2.4" stroke-linecap="round"/>'
                    f'<path d="M-18,-66 Q-14,-62 -10,-64 M10,-64 Q14,-62 18,-66 M-4,-58 Q0,-56 4,-58" fill="none" stroke="{hl}" stroke-width="1.6" stroke-linecap="round"/>')
        if view == 'qfront':
            return (f'<path d="M-23,-79 C-21,-67 -14,-59 -4,-55 Q8,-52 18,-56 C25,-61 28,-70 29,-80 C26,-76 22,-73 19,-72 Q18,-78 9,-76.5 Q0,-78 -2,-72 C-9,-72 -17,-74 -23,-79 Z" fill="{c}"/>'
                    f'<path d="M3,-70 Q9,-66 15,-70" fill="none" stroke="{mouth}" stroke-width="2.4" stroke-linecap="round"/>')
        if view == 'side':
            return (f'<path d="M-4,-84 C-6,-70 0,-58 10,-54 Q20,-51 28,-56 C32,-61 33,-68 31,-74 Q22,-80 12,-74 C6,-72 0,-76 -4,-84 Z" fill="{c}"/>'
                    f'<path d="M18,-69 Q24,-66 29,-69" fill="none" stroke="{mouth}" stroke-width="2.4" stroke-linecap="round"/>')
        return ''
    return ''

# glasses and a mustache, over the face (eye positions: side (17,-85); front (+-9.5,-84); 3/4 (0,-84), (17,-84))
def face_extras(look, view):
    out = _beard(look, view) if look.beard else ''
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
        if frame == 'tortoise': frame = f'url(#{rig._PEOPLE_PFX}tort)'
        # (the lenses are just a hint of tint, so the eyes show through: the user, 2026-10-11)
        st = f'fill="{lens}" fill-opacity=".22" stroke="{frame}" stroke-width="2.6"'
        if len(look.glasses) > 2 and look.glasses[2] == 'wire':   # thin round wire rims (Master Schindewolf)
            st = f'fill="{lens}" fill-opacity=".15" stroke="{frame}" stroke-width="1.7"'
            if view == 'side': return out + f'<circle cx="18" cy="-85" r="7.5" {st}/><path d="M11,-86 L-6,-84" stroke="{frame}" stroke-width="1.5"/>'
            if view == 'front': return out + f'<circle cx="-10" cy="-84" r="8" {st}/><circle cx="10" cy="-84" r="8" {st}/><path d="M-2,-85 Q0,-87 2,-85" fill="none" stroke="{frame}" stroke-width="1.5"/>'
            if view == 'qfront': return out + f'<circle cx="0" cy="-84" r="7.5" {st}/><ellipse cx="17" cy="-84" rx="6" ry="7.5" {st}/><path d="M7,-85 L11,-85" stroke="{frame}" stroke-width="1.5"/>'
            return out
        if len(look.glasses) > 2 and look.glasses[2] == 'bold':   # thick black rectangles (Mr. Master Krantz)
            st = f'fill="{lens}" fill-opacity=".15" stroke="{frame}" stroke-width="2.8"'
            if view == 'side': return out + f'<rect x="11" y="-90" width="14" height="10" rx="2" {st}/><path d="M11,-86 L-6,-84" stroke="{frame}" stroke-width="2.4"/>'
            if view == 'front': return out + f'<rect x="-19" y="-90" width="16" height="11" rx="2" {st}/><rect x="3" y="-90" width="16" height="11" rx="2" {st}/><path d="M-3,-86 L3,-86" stroke="{frame}" stroke-width="2.4"/>'
            if view == 'qfront': return out + f'<rect x="-8" y="-90" width="15" height="11" rx="2" {st}/><rect x="11" y="-90" width="11" height="11" rx="2" {st}/><path d="M7,-86 L11,-86" stroke="{frame}" stroke-width="2.4"/>'
            return out
        if len(look.glasses) > 2 and look.glasses[2] == 'soft':   # rounded rectangles, thinner (Erin)
            st = f'fill="{lens}" fill-opacity=".15" stroke="{frame}" stroke-width="3.2"'
            if view == 'side': return out + f'<rect x="11" y="-90" width="14" height="10" rx="4" {st}/><path d="M11,-86 L-4,-84" stroke="{frame}" stroke-width="1.8"/>'
            if view == 'front': return out + f'<rect x="-18" y="-90" width="15" height="11" rx="4.5" {st}/><rect x="3" y="-90" width="15" height="11" rx="4.5" {st}/><path d="M-3,-86 Q0,-88 3,-86" fill="none" stroke="{frame}" stroke-width="1.8"/>'
            if view == 'qfront': return out + f'<rect x="-7" y="-90" width="14" height="11" rx="4.5" {st}/><rect x="11" y="-90" width="11" height="11" rx="4" {st}/><path d="M7,-86 L11,-86" stroke="{frame}" stroke-width="1.8"/>'
            return out
        if len(look.glasses) > 2 and look.glasses[2] == 'rect':   # rectangular frames (Yia-Yia)
            st = f'fill="{lens}" fill-opacity=".22" stroke="{frame}" stroke-width="3.4"'
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
                 shoe, shoe2, height=1.0, camo=None, trim='#FFFFFF', top='tee', stripe=None, glasses=None, mustache=None, plaid=None, beard=None, belt=None, under=None, head=None, shorts=False, socks=None, watch=None):
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
        elif s.top == 'dobok':   # a Tang Soo Do dobok: white, black edging down the lapels and round the hem; the school patch and Korean lettering
            if not back:
                t += ((f'<path d="M-9,-53 L0,-36 L9,-53 Z" fill="{s.under}"/>' if s.under else '') +
                      f'<path d="M-15,-52 L4,-14 L10,-14 L-8,-52 Z" fill="{s.shirt2}"/><path d="M-12,-53 L6,-15" stroke="#1F1F24" stroke-width="7"/>'
                      f'<path d="M12,-53 L3,-35" stroke="#1F1F24" stroke-width="7"/>'
                      f'<circle cx="12" cy="-36" r="4.6" fill="#24357A" stroke="#C8282D" stroke-width="1.2"/><path d="M9.5,-36 a2.5,2.5 0 0 1 5,0" fill="#C8282D"/>'
                      f'<path d="M-15,-42 h4 M-13,-44 v4 M-15,-37 h5 M-14,-35 v3" stroke="#1F1F24" stroke-width="1.2"/>')
            else:
                t += f'<path d="M-12,-53 Q0,-47 12,-53" fill="none" stroke="#1F1F24" stroke-width="4"/>'
            if s.belt: t += s.belt_svg(-22, 44, back, 0)
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
        hair = s.fit(hair_of(s, 'side'), 4)
        shirt = (f'<rect x="-5" y="-62" width="15" height="16" rx="5" fill="{rig.SK2}"/>'
                 f'<rect x="-20" y="-52" width="38" height="54" rx="15" fill="{s.shirt}"/>')
        if s.top == 'hoodie':
            shirt += f'<path d="M-18,-56 C-26,-50 -26,-36 -18,-30 C-14,-40 -12,-48 -10,-56 Z" fill="{s.shirt2}"/>'
        elif s.top == 'dobok':
            shirt += (f'<path d="M-2,-53 L14,-18" stroke="#1F1F24" stroke-width="7"/>'
                      )
            if s.belt: shirt += s.belt_svg(-20, 38, False, 14)
        elif s.top == 'gi':
            shirt += (f'<path d="M-2,-53 L14,-20 L18,-24 L6,-53 Z" fill="{s.shirt2}"/>'
                      f'<rect x="-20" y="-13" width="38" height="8" rx="2" fill="{s.trim}"/>'
                      f'<path d="M12,-7 L15,10 L19,9 L16,-6 Z" fill="{s.trim}"/>')
        elif s.top == 'track':
            shirt += (f'<rect x="-10" y="-56" width="20" height="9" rx="4" fill="{s.shirt2}"/>'
                      f'<rect x="15" y="-48" width="3" height="48" fill="{s.trim}"/>')
        else:
            shirt += f'<rect x="-19" y="-40" width="3" height="40" fill="{s.trim}"/>'
        return (behind_of(s, 'side') + shirt +
            s.skull(4) + f'<circle cx="31" cy="-81" r="4" fill="{rig.SK}"/>' + hair +
            f'<circle{f} cx="17" cy="-85" r="3.6" fill="{rig.EYE}"/>'
            f'<path{f} d="M10,-71 Q18,-64 27,-71" fill="none" stroke="{rig.MOUTH}" stroke-width="2.8" stroke-linecap="round"/>'
            f'<circle{f} cx="9" cy="-74" r="5" fill="{rig.CHEEK}" opacity=".45"/>' + face_extras(s, 'side'))

    def upper_front(s, pfx, face_cls=''):
        f = rig.fc(face_cls)
        hair = s.fit(hair_of(s, 'front'), 0)
        return (s.torso(False, pfx) + s.skull(0) + hair +
            f'<circle{f} cx="-9.5" cy="-84" r="3.6" fill="{rig.EYE}"/><circle{f} cx="9.5" cy="-84" r="3.6" fill="{rig.EYE}"/>'
            f'<path{f} d="M-7,-72 Q0,-66 7,-72" fill="none" stroke="{rig.MOUTH}" stroke-width="2.8" stroke-linecap="round"/>'
            f'<circle{f} cx="-14" cy="-75" r="5" fill="{rig.CHEEK}" opacity=".45"/><circle{f} cx="14" cy="-75" r="5" fill="{rig.CHEEK}" opacity=".45"/>' + face_extras(s, 'front'))

    def upper_back(s, pfx):
        hair = s.fit(hair_of(s, 'back'), 0)
        return s.torso(True, pfx) + s.skull(0) + hair

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
        elif s.top == 'dobok':
            if not back:
                t += ((f'<path d="M-1,-53 L7,-37 L15,-53 Z" fill="{s.under}"/>' if s.under else '') +
                      f'<path d="M-5,-53 L12,-15" stroke="#1F1F24" stroke-width="7"/><path d="M18,-52 L10,-36" stroke="#1F1F24" stroke-width="7"/>'
                      f'<circle cx="16" cy="-35" r="4" fill="#24357A" stroke="#C8282D" stroke-width="1.1"/>'
                      f'<path d="M-9,-42 h4 M-7,-44 v4 M-9,-37 h4" stroke="#1F1F24" stroke-width="1.1"/>')
            if s.belt: t += s.belt_svg(-20, 40, back, 9)
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
        hair = s.fit(hair_of(s, 'qfront'), 2)
        ear = f'<ellipse cx="-18" cy="-80" rx="4" ry="5.5" fill="{rig.SK2}"/>' if s.style in ('short', 'bald', 'curly', 'neat', 'shaved', 'tail', 'tousle') else ''
        return (behind_of(s, 'qfront') + s.torso_q(False, pfx) + s.skull(2) + hair + ear +
            f'<circle{f} cx="0" cy="-84" r="3.6" fill="{rig.EYE}"/><ellipse{f} cx="17" cy="-84" rx="3" ry="3.6" fill="{rig.EYE}"/>'
            f'<path{f} d="M2,-72 Q9,-66 16,-72" fill="none" stroke="{rig.MOUTH}" stroke-width="2.8" stroke-linecap="round"/>'
            f'<circle{f} cx="-5" cy="-75" r="5" fill="{rig.CHEEK}" opacity=".45"/><circle{f} cx="19" cy="-75" r="4.2" fill="{rig.CHEEK}" opacity=".45"/>' + face_extras(s, 'qfront'))

    def upper_qback(s, pfx):
        hair = s.fit(hair_of(s, 'qback'), -2)
        ear = f'<ellipse cx="18" cy="-80" rx="3.5" ry="5" fill="{rig.SK2}"/>' if s.style in ('short', 'bald', 'curly', 'neat', 'shaved', 'tail', 'tousle') else ''
        return (s.torso_q(True, pfx) + s.skull(-2) +
                f'<circle cx="21" cy="-76" r="3.5" fill="{rig.CHEEK}" opacity=".45"/>' + hair + ear)

    def skull(s, cx):
        """The head: round, or (head=(rx, ry)) a longer, narrower oval (Erin, 2026-10-11)."""
        if not s.head: return f'<circle cx="{cx}" cy="-86" r="29" fill="{rig.SK}"/>'
        rx, ry = s.head
        return f'<ellipse cx="{cx}" cy="{-86 + (ry - 29) * 0.6:.1f}" rx="{rx}" ry="{ry}" fill="{rig.SK}"/>'
    def fit(s, svg, cx):
        """Hair (and ears) drawn for the round head, squeezed to fit an oval one."""
        if not s.head or not svg: return svg
        rx, ry = s.head
        return f'<g transform="translate({cx},-86) scale({rx / 29:.3f},{ry / 29:.3f}) translate({-cx},86)">{svg}</g>'

    def belt_svg(s, x, w, back, knot):
        """The belt round the waist: its colour, a stripe down the middle (masters: red), the knot and tails at the front."""
        col, stripe = s.belt
        t = f'<rect x="{x}" y="-13" width="{w}" height="8" rx="2" fill="{col}"/>'
        if stripe: t += f'<rect x="{x}" y="-10.5" width="{w}" height="3" fill="{stripe}"/>'
        if not back:
            k = knot
            t += (f'<path d="M{k - 3},-6 L{k - 8},10 L{k - 3},11 L{k},-5 Z M{k + 3},-6 L{k + 8},10 L{k + 3},11 L{k},-5 Z" fill="{col}"/>'
                  f'<rect x="{k - 5}" y="-15" width="10" height="11" rx="3" fill="{col}"/>')
            if stripe: t += f'<path d="M{k - 5.5},2 L{k - 4},-4 M{k + 5.5},2 L{k + 4},-4" stroke="{stripe}" stroke-width="2"/>'
        return t

    def arm_art(s, far, pfx):
        hand = rig.SK2 if far else rig.SK
        if s.top == 'dobok':    # long white sleeve, black edging at the cuff
            return (f'<circle cx="0" cy="39" r="8" fill="{hand}"/>'
                    f'<rect x="-9" y="-7" width="18" height="41" rx="8.5" fill="{s.sleeve if not far else s.shirt2}"/>'
                    f'<rect x="-9" y="28" width="18" height="6" rx="2.5" fill="#1F1F24"/>')
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
                f'<rect x="-9" y="8" width="18" height="3" fill="{s.trim}"/>'
                + (f'<rect x="-6.8" y="30" width="13.6" height="4" rx="1.5" fill="{s.watch}"/>' if s.watch and not far else ''))

    def leg_art(s, far):
        fill = f'url(#{rig._PEOPLE_PFX}camo)' if s.camo else (s.pants2 if far else s.pants)
        if s.shorts:   # bare legs below the knee, socks above the shoes
            sk = rig.SK2 if far else rig.SK
            leg = (f'<rect x="-7.5" y="0" width="15" height="50" rx="7" fill="{sk}"/>'
                   + (f'<rect x="-7.5" y="36" width="15" height="12" rx="2" fill="{s.socks}"/>' if s.socks else '')
                   + f'<rect x="-9.5" y="0" width="19" height="24" rx="6" fill="{fill}"/>')
            return leg
        leg = f'<rect x="-8.5" y="0" width="17" height="50" rx="7" fill="{fill}"/>'
        if s.stripe: leg += f'<rect x="-1.5" y="2" width="3" height="46" fill="{s.stripe}"/>'   # track pants: a stripe down the side
        return leg

    def defs(s, pfx):
        out = camo_defs(pfx, s.camo) if s.camo else ''
        if s.glasses and s.glasses[0] == 'tortoise':   # tortoiseshell frames: amber and brown, mottled dark (Erin)
            out += (f'<pattern id="{pfx}tort" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#8A5428"/>'
                    f'<circle cx="2" cy="2" r="2.2" fill="#3A2210"/><circle cx="6.5" cy="5.5" r="1.8" fill="#2E1A0C"/><circle cx="7" cy="1" r="1.2" fill="#C98A3E"/>'
                    f'<circle cx="2.5" cy="7" r="1.4" fill="#C98A3E"/><circle cx="4.5" cy="3.5" r="1" fill="#5A3416"/></pattern>')
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
    # Nico's friends (2026-10-11), drawn from photos the user shared (reference only)
    # Yarosh: older and taller; a big mop of curly brown hair, a black tee, grey shorts, white socks, black sneakers, a black watch
    'yarosh': Look('yarosh', skin='#EDC4A3', skin2='#DBA987', hair='#5A3B27', hl='#7C573A', style='tousle', top='tee',
                   shirt='#222429', shirt2='#191B1F', sleeve='#222429', trim='#2C2F35', pants='#6B6B70', pants2='#5C5C61',
                   shoe='#1F2125', shoe2='#18191C', height=1.17, shorts=True, socks='#F4F6F8', watch='#1A1B1E'),
    # Alpha: younger and smaller; a thick dark mop with heavy bangs, a white tee, black sweatpants, black sneakers
    'alpha': Look('alpha', skin='#EAC09E', skin2='#D8A884', hair='#2C1F19', hl='#463229', style='mop', top='tee',
                  shirt='#F7F7F4', shirt2='#E3E3DE', sleeve='#F7F7F4', trim='#ECECE8', pants='#232428', pants2='#1B1C20',
                  shoe='#2B2D32', shoe2='#232529', height=0.9),
    # people who work inside the other buildings, and the grown-ups at home in the houses (made up)
    # Litchfield Tang Soo Do (2026-10-11), drawn from photos the user shared: everyone in a white dobok edged
    # in black, barefoot; the masters' belts black with a red stripe down the middle
    # Mr. Master Krantz: short grey hair combed back and receding, thick black rectangular glasses, a white goatee
    'krantz': Look('krantz', skin='#F2C3A6', skin2='#DFA88C', hair='#B5B2AC', style='neat', top='dobok',
                   shirt='#FAFAF7', shirt2='#E4E4DC', sleeve='#FAFAF7', trim='#1F1F24', pants='#FAFAF7', pants2='#E4E4DC', shoe='#F2C3A6', shoe2='#DFA88C', height=1.3,
                   glasses=('#1A1A1E', '#DCEAF5', 'bold'), beard=('goatee', '#ECEAE4', '#C9C6BE'), belt=('#1F1F24', '#C8282D')),
    # Mrs. Master Krantz: long strawberry-blonde hair pulled back into a long braid over her shoulder
    'mrskrantz': Look('mrskrantz', skin='#F3C9AE', skin2='#E2AE92', hair='#C99862', hl='#A97A45', style='braid', top='dobok',
                      shirt='#FAFAF7', shirt2='#E4E4DC', sleeve='#FAFAF7', trim='#1F1F24', pants='#FAFAF7', pants2='#E4E4DC', shoe='#F3C9AE', shoe2='#E2AE92', height=1.16,
                      belt=('#1F1F24', '#C8282D')),
    # Master Schindewolf: shaved head, round wire glasses, a short grey-brown beard
    'schindewolf': Look('schindewolf', skin='#F0C2A4', skin2='#DDA587', hair='#9B8F84', style='shaved', top='dobok',
                        shirt='#FAFAF7', shirt2='#E4E4DC', sleeve='#FAFAF7', trim='#1F1F24', pants='#FAFAF7', pants2='#E4E4DC', shoe='#F0C2A4', shoe2='#DDA587', height=1.24,
                        glasses=('#8C8A86', '#DCEAF5', 'wire'), beard=('full', '#9C9084', '#C4BCB2'), belt=('#1F1F24', '#C8282D')),
    # Erin: dark-blonde hair pulled back in a ponytail, glasses, a black belt
    'erin': Look('erin', skin='#F2C8AC', skin2='#E0AD90', hair='#A88456', hl='#C7A472', style='tail', top='dobok',
                 shirt='#FAFAF7', shirt2='#E4E4DC', sleeve='#FAFAF7', trim='#1F1F24', pants='#FAFAF7', pants2='#E4E4DC', shoe='#F2C8AC', shoe2='#E0AD90', height=1.18,
                 glasses=('tortoise', '#DCEAF5', 'soft'), belt=('#1F1F24', None), under='#26346A', head=(25, 32)),
    # Nico in his whites, for the dojo (his own hair and face; his belt is drawn over it in the game)
    'nicodobok': Look('nicodobok', skin=rig.SK, skin2=rig.SK2, hair=rig.HAIR, style='nico', top='dobok',
                      shirt='#FAFAF7', shirt2='#E4E4DC', sleeve='#FAFAF7', trim='#1F1F24', pants='#FAFAF7', pants2='#E4E4DC', shoe=rig.SK, shoe2=rig.SK2, height=1.0),
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
