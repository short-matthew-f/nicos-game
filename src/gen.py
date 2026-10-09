#!/usr/bin/env python3
import math, os

OUT = os.environ.get('OUT', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'out'))
os.makedirs(OUT, exist_ok=True)

# ---------- helpers ----------
def sm(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)

def ramp(t, a, b):
    return sm((t - a) / (b - a))

def num(v):
    s = f"{v:.2f}".rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s

def ops_css(ops):
    out = []
    for o in ops:
        if o[0] == 't': out.append(f"translate({num(o[1])}px,{num(o[2])}px)")
        elif o[0] == 'r': out.append(f"rotate({num(o[1])}deg)")
        elif o[0] == 's': out.append(f"scale({num(o[1])},{num(o[2])})")
    return ' '.join(out)

class Scene:
    def __init__(s, pfx, T, w=800, h=460, dt=0.05):
        s.pfx, s.T, s.w, s.h, s.dt = pfx, T, w, h, dt
        s.tracks, s.defs, s.css = [], [], []

    def A(s, name, fn, inner, filt=None, extras=()):
        cls = s.pfx + name
        s.tracks.append((cls, fn, extras))
        f = f' filter="url(#{s.pfx}{filt})"' if filt else ''
        return f'<g class="{cls}"{f}>{inner}</g>'

    def filt(s, fid, x, y, w, h, r=5, blur=3, dx=5, dy=9, op=0.22, sd=6):
        s.defs.append(f'''<filter id="{s.pfx}{fid}" filterUnits="userSpaceOnUse" x="{x}" y="{y}" width="{w}" height="{h}" color-interpolation-filters="sRGB">
<feMorphology in="SourceAlpha" operator="dilate" radius="{r}" result="d1"/>
<feGaussianBlur in="d1" stdDeviation="{blur}" result="d2"/>
<feComponentTransfer in="d2" result="d3"><feFuncA type="linear" slope="6" intercept="-1.6"/></feComponentTransfer>
<feFlood flood-color="#fff" result="wh"/>
<feComposite in="wh" in2="d3" operator="in" result="ol"/>
<feGaussianBlur in="d3" stdDeviation="{sd}" result="sb"/>
<feOffset in="sb" dx="{dx}" dy="{dy}" result="so"/>
<feColorMatrix in="so" type="matrix" values="0 0 0 0 0.17 0 0 0 0 0.25 0 0 0 0 0.33 0 0 0 {op} 0" result="sc"/>
<feMerge><feMergeNode in="sc"/><feMergeNode in="ol"/><feMergeNode in="SourceGraphic"/></feMerge></filter>''')

    def keyframes(s):
        T, dt = s.T, s.dt
        n = int(round(T / dt))
        out = []
        for cls, fn, extras in s.tracks:
            times = sorted(set([round(i * dt, 4) for i in range(n + 1)] + [round(e, 4) for e in extras]))
            vals = [ops_css(fn(t)) for t in times]
            keys = []
            for i, (t, v) in enumerate(zip(times, vals)):
                if 0 < i < len(vals) - 1 and vals[i - 1] == v == vals[i + 1]:
                    continue
                keys.append(f"{t / T * 100:.4f}%{{transform:{v}}}")
            out.append(f"@keyframes {cls}{{{''.join(keys)}}}")
            out.append(f".{cls}{{animation:{cls} {T}s linear infinite;transform-origin:0 0}}")
        return '\n'.join(out)

    def svg(s, body, extra_css=''):
        css = s.keyframes() + '\n' + extra_css
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {s.w} {s.h}" width="{s.w}" height="{s.h}">'
                f'<style>{css}</style><defs>{"".join(s.defs)}</defs>{body}</svg>')

BG = '#E9EEF3'
NAVY = '#2B3F55'
FONT = "'DejaVu Sans',Verdana,Arial,sans-serif"

# =====================================================================
# SCENE 1 : Nico walks, turns, puts a box down, picks it up
# =====================================================================
def build_walk():
    S = Scene('w', 19.0)
    T = 19.0
    G = 392
    RAMP = 0.35
    walks = [(0, 3.5, 120, 470), (5.5, 8.5, 470, 170), (9.2, 12.2, 170, 470), (14.7, 18.2, 470, 120)]
    turns = [(5.0, 5.5, 1), (8.7, 9.2, -1), (14.2, 14.7, 1), (18.2, 18.7, -1)]
    T_PUT_H, T_PICK_H = 4.2, 13.3
    DC = 30.745
    LEAN_C = 25.0
    BOXL = (50.0, -12.0)

    def Iseg(ts, te, t):
        D = te - ts
        u = min(max(t - ts, 0.0), D)
        r = RAMP
        if u < r: return u * u / (2 * r)
        if u < D - r: return r / 2 + (u - r)
        return (D - r) - (D - u) ** 2 / (2 * r)

    def env(t):
        for ts, te, _, _ in walks:
            if ts <= t <= te: return min(1.0, (t - ts) / RAMP, (te - t) / RAMP)
        return 0.0

    def X(t):
        x = 120
        for ts, te, x0, x1 in walks:
            if t >= te: x = x1
            elif t >= ts: return x0 + (x1 - x0) * Iseg(ts, te, t) / (te - ts - RAMP)
            else: return x
        return x

    def PH(t): return sum(Iseg(ts, te, t) for ts, te, _, _ in walks)

    def S_(t):
        s = 1
        for ts, te, s0 in turns:
            if t >= te: s = -s0
            elif t >= ts: return s0 * math.cos(math.pi * sm((t - ts) / (te - ts)))
            else: return s
        return s

    def c_(t): return ramp(t, 3.5, 4.1) - ramp(t, 4.3, 4.9) + ramp(t, 12.6, 13.2) - ramp(t, 13.3, 13.9)
    def w_(t): return 1 - ramp(t, 4.2, 4.7) + ramp(t, 12.6, 13.2)
    def amp(t): return min(1.0, 2.0 * env(t))
    def an(t): return 28.0 * amp(t) * math.sin(2 * math.pi * PH(t) / 0.7)
    def dw(t): return 29.0 * (1 - math.cos(math.radians(an(t))))
    def dd(t): return DC * c_(t) + dw(t)
    def lean(t): return LEAN_C * c_(t) + 3.0 * amp(t)
    def armang(t, far):
        free = (0.85 * an(t)) if far else (-0.85 * an(t))
        return (1 - w_(t)) * free + w_(t) * (-56.0)
    def carried(t): return 1.0 if (t < T_PUT_H or t >= T_PICK_H) else 0.0

    def boxpos(t):
        a = math.radians(lean(t)); px, py = BOXL
        x = px * math.cos(a) - py * math.sin(a)
        y = px * math.sin(a) + py * math.cos(a)
        return x, -58 + dd(t) + y

    # resting position of the dropped box (world)
    a = math.radians(LEAN_C); px, py = BOXL
    gx_off = px * math.cos(a) - py * math.sin(a)
    GROUND_BOX_X = 470 + gx_off * 1.3

    # ---- tracks ----
    def f_char(t): return [('t', X(t), G), ('s', 1.3, 1.3)]
    def f_flip(t): return [('s', S_(t), 1)]
    def f_upper(t): return [('t', 0, -58 + dd(t)), ('r', lean(t))]
    def f_arm(far):
        return lambda t: [('t', 0, -58 + dd(t)), ('r', lean(t)), ('t', 2, -42), ('r', armang(t, far))]
    def leg_params(t, far):
        a_ = -an(t) if far else an(t)
        cc = c_(t)
        l = 58 - DC * cc
        return a_, l
    def f_leg(far):
        def fn(t):
            a_, l = leg_params(t, far)
            sy = (l - 8) / 50.0
            sx = 1 + 0.35 * c_(t)
            return [('t', -3 if far else 3, -58 + dd(t)), ('r', a_), ('s', sx, sy)]
        return fn
    def f_shoe(far):
        def fn(t):
            a_, l = leg_params(t, far)
            r = math.radians(a_)
            hx = -3 if far else 3
            return [('t', hx - l * math.sin(r), -58 + dd(t) + l * math.cos(r)), ('r', a_ * 0.4)]
        return fn
    def f_box(t):
        x, y = boxpos(t)
        return [('t', x, y), ('s', carried(t), carried(t))]

    # ---- art ----
    SK, SK2, HAIR = '#E8B48F', '#D6996F', '#6B4A35'
    SH, SL, SL2 = '#5B8FD6', '#4F86D0', '#3F74BC'
    PANT, PANT2, SHOE = '#5B78AA', '#4A6590', '#34495E'

    def arm_art(far):
        sk, sl = (SK2, SL2) if far else (SK, SL)
        return (f'<rect x="-6" y="6" width="12" height="34" rx="6" fill="{sk}"/>'
                f'<circle cx="0" cy="39" r="8" fill="{sk}"/>'
                f'<rect x="-8.5" y="-7" width="17" height="24" rx="8.5" fill="{sl}"/>')
    def leg_art(far):
        return f'<rect x="-8.5" y="0" width="17" height="50" rx="7" fill="{PANT2 if far else PANT}"/>'
    def shoe_art(far):
        c = '#2C3E52' if far else SHOE
        return (f'<rect x="-10" y="-13" width="31" height="13" rx="6.5" fill="{c}"/>'
                f'<rect x="-8" y="-4" width="27" height="4" rx="2" fill="#E9EEF3"/>')
    upper = (
        '<rect x="-5" y="-62" width="15" height="16" rx="5" fill="#D6996F"/>'
        f'<rect x="-20" y="-52" width="38" height="54" rx="15" fill="{SH}"/>'
        '<path d="M-5,-51 Q5,-38 16,-51" fill="none" stroke="#A9CCF2" stroke-width="4" stroke-linecap="round"/>'
        '<rect x="3" y="-30" width="12" height="14" rx="3" fill="#3F78C6"/>'
        '<rect x="5.5" y="-27.5" width="7" height="2" rx="1" fill="#6FA2E4"/>'
        f'<circle cx="-21" cy="-84" r="6.5" fill="{SK2}"/>'
        f'<circle cx="4" cy="-86" r="29" fill="{SK}"/>'
        f'<circle cx="31" cy="-81" r="4" fill="{SK}"/>'
        f'<path d="M-27,-82 C-36,-118 -4,-124 16,-117 C30,-113 38,-102 33,-92 C25,-101 15,-102 5,-100 C-8,-98 -17,-96 -21,-72 C-24,-74 -26,-78 -27,-82 Z" fill="{HAIR}"/>'
        '<circle cx="17" cy="-84" r="3.4" fill="#3A2E2A"/>'
        '<path d="M10,-70 Q18,-63 26,-71" fill="none" stroke="#A5583F" stroke-width="2.8" stroke-linecap="round"/>'
        '<circle cx="9" cy="-73" r="4.5" fill="#F29A8A" opacity=".55"/>'
    )
    def small_box():
        return ('<rect x="-20" y="-17" width="40" height="34" rx="5" fill="#E3A857"/>'
                '<rect x="-20" y="-17" width="40" height="10" rx="5" fill="#F0C27C"/>'
                '<rect x="-20" y="-12" width="40" height="5" fill="#F0C27C"/>'
                '<rect x="-4.5" y="-17" width="9" height="34" fill="#FFE7A6"/>'
                '<rect x="7" y="3" width="11" height="8" rx="1.5" fill="#fff"/>')

    S.filt('f', -130, -230, 280, 270)
    S.filt('g', -50, -60, 110, 120)

    parts = (
        S.A('ba', f_arm(True), arm_art(True)) +
        S.A('bl', f_leg(True), leg_art(True)) +
        S.A('bs', f_shoe(True), shoe_art(True)) +
        S.A('fl', f_leg(False), leg_art(False)) +
        S.A('fs', f_shoe(False), shoe_art(False)) +
        S.A('up', f_upper, upper) +
        S.A('bx', f_box, small_box(), extras=(T_PUT_H - 0.001, T_PICK_H - 0.001)) +
        S.A('fa', f_arm(False), arm_art(False))
    )
    char = S.A('c', f_char, S.A('fp', f_flip, parts), filt='f')

    # ground (dropped) box visibility track
    def f_gbox(t):
        v = 1.0 - carried(t)
        return [('t', GROUND_BOX_X, G - 17 * 1.3), ('s', 1.3 * v, 1.3 * v)]
    gbox = S.A('gb', f_gbox, small_box(), filt='g', extras=(T_PUT_H - 0.001, T_PICK_H - 0.001))

    bg = f'<rect width="800" height="460" fill="{BG}"/>'
    bg += '<g fill="#DDE5EE"><rect x="30" y="150" width="130" height="212" rx="12"/><rect x="180" y="95" width="110" height="267" rx="12"/><rect x="310" y="175" width="150" height="187" rx="12"/><rect x="480" y="120" width="120" height="242" rx="12"/><rect x="620" y="170" width="150" height="192" rx="12"/></g>'
    bg += '<g fill="#E9EEF3">'
    for bx_, by_, bw_, bh_ in [(30, 150, 130, 212), (180, 95, 110, 267), (310, 175, 150, 187), (480, 120, 120, 242), (620, 170, 150, 192)]:
        cols = max(2, int(bw_ // 38)); rows = int((bh_ - 30) // 46)
        for r_ in range(min(rows, 4)):
            for c__ in range(cols):
                gx = bx_ + 18 + c__ * ((bw_ - 36 - 20) / max(1, cols - 1)) if cols > 1 else bx_ + 40
                bg += f'<rect x="{gx:.0f}" y="{by_ + 22 + r_ * 46}" width="20" height="26" rx="5"/>'
    bg += '</g>'
    bg += '<rect y="362" width="800" height="98" fill="#D6DFE8"/><rect y="358" width="800" height="9" fill="#CCD6E1"/>'
    bg += f'<ellipse cx="{GROUND_BOX_X:.0f}" cy="{G}" rx="56" ry="10" fill="#C6D1DD"/>'

    body = bg + gbox + char
    svg = S.svg(body)
    return svg, S

# =====================================================================
# SCENE 2 : City taxi driving
# =====================================================================
def build_taxi():
    S = Scene('t', 4.0)
    V = 240.0
    CIRC = 2 * math.pi * 27
    wheel_p = CIRC / V
    S.filt('f', -170, -190, 340, 220)
    css = f'''
.tspin{{animation:tspin {wheel_p:.4f}s linear infinite;transform-origin:0 0}}
@keyframes tspin{{to{{transform:rotate(360deg)}}}}
.tbob{{animation:tbob .34s ease-in-out infinite alternate}}
@keyframes tbob{{from{{transform:translateY(0)}}to{{transform:translateY(-3px)}}}}
.tdash{{animation:tdash {160 / V:.4f}s linear infinite}}
@keyframes tdash{{to{{transform:translateX(-160px)}}}}
.tfar{{animation:tfar {800 / (0.2 * V):.3f}s linear infinite}}
@keyframes tfar{{to{{transform:translateX(-800px)}}}}
.tmid{{animation:tmid {800 / (0.55 * V):.3f}s linear infinite}}
@keyframes tmid{{to{{transform:translateX(-800px)}}}}
.tlamp{{animation:tlamp {800 / V:.4f}s linear infinite}}
@keyframes tlamp{{to{{transform:translateX(-800px)}}}}
.tpuff{{animation:tpuff 1.05s ease-out infinite;opacity:0;transform-origin:0 0}}
@keyframes tpuff{{0%{{opacity:.9;transform:translate(0,0) scale(.5)}}100%{{opacity:0;transform:translate(-70px,-26px) scale(1.7)}}}}
.tspeed{{animation:tspeed 0.8s linear infinite}}
@keyframes tspeed{{from{{transform:translateX(0)}}to{{transform:translateX(-1000px)}}}}
.tantenna{{animation:tant .34s ease-in-out infinite alternate;transform-origin:0 0}}
@keyframes tant{{from{{transform:rotate(-2deg)}}to{{transform:rotate(2deg)}}}}
'''

    far = ''
    for i, (bx_, bw_, bh_) in enumerate([(0, 120, 150), (140, 100, 210), (260, 140, 120), (420, 110, 190), (550, 130, 160), (700, 90, 230)]):
        far += f'<rect x="{bx_}" y="{338 - bh_}" width="{bw_}" height="{bh_ + 4}" rx="12" fill="#DDE5EE"/>'
        for r_ in range(int((bh_ - 20) // 44)):
            for c_ in range(max(1, int(bw_ // 44))):
                far += f'<rect x="{bx_ + 16 + c_ * 36}" y="{338 - bh_ + 18 + r_ * 44}" width="20" height="26" rx="5" fill="#E9EEF3"/>'
    far_g = f'<g class="tfar"><g>{far}</g><g transform="translate(800,0)">{far}</g></g>'

    def tree(x):
        return (f'<rect x="{x - 5}" y="318" width="10" height="46" rx="4" fill="#CDBBAA"/>'
                f'<circle cx="{x}" cy="300" r="26" fill="#BCD7D1"/><circle cx="{x - 18}" cy="316" r="17" fill="#BCD7D1"/><circle cx="{x + 18}" cy="316" r="17" fill="#BCD7D1"/>')
    mid = ''.join(tree(x) for x in (90, 330, 590, 760))
    mid_g = f'<g class="tmid"><g>{mid}</g><g transform="translate(800,0)">{mid}</g></g>'

    def lamp(x):
        return (f'<rect x="{x - 3}" y="262" width="6" height="104" rx="3" fill="#8497AB"/>'
                f'<rect x="{x - 3}" y="262" width="26" height="6" rx="3" fill="#8497AB"/>'
                f'<rect x="{x + 14}" y="266" width="16" height="9" rx="4.5" fill="#FFE29A"/>')
    lamps = lamp(180) + lamp(580)
    lamp_g = f'<g class="tlamp"><g>{lamps}</g><g transform="translate(800,0)">{lamps}</g></g>'

    dashes = ''.join(f'<rect x="{i * 160}" y="422" width="84" height="9" rx="4.5" fill="#fff"/>' for i in range(-1, 7))
    dash_g = f'<g class="tdash">{dashes}</g>'

    ground = ('<rect y="362" width="800" height="30" fill="#DCE4EC"/><rect y="356" width="800" height="9" fill="#CCD6E1"/>'
              '<rect y="392" width="800" height="68" fill="#A9B8C7"/><rect y="388" width="800" height="7" fill="#9AABBC"/>')

    speed = ''
    for y, off, dly in [(150, 0, 0), (205, 500, -0.35), (260, 250, -0.6)]:
        speed += f'<g class="tspeed" style="animation-delay:{dly}s"><rect x="{900 + off % 300}" y="{y}" width="{120 + off % 90}" height="6" rx="3" fill="#fff" opacity=".85"/></g>'

    # taxi, local origin = car centre, ground at y=0
    def wheel(cx):
        spokes = ''.join(f'<rect x="-2.2" y="-14" width="4.4" height="14" rx="2.2" fill="#7D8FA1" transform="rotate({a})"/>' for a in range(0, 360, 72))
        bolts = ''.join(f'<circle cx="0" cy="-10" r="2.2" fill="#5C7087" transform="rotate({a + 36})"/>' for a in range(0, 360, 72))
        return (f'<g transform="translate({cx},-27)"><circle r="27" fill="#3C4858"/><g class="tspin"><circle r="16" fill="#A9B8C6"/>{spokes}{bolts}</g>'
                f'<circle r="6" fill="#fff"/></g>')
    car_body = (
        '<path d="M-72,-78 L-44,-120 L58,-120 L96,-78 Z" fill="#E8B64A" stroke="#E8B64A" stroke-width="10" stroke-linejoin="round"/>'
        '<path d="M-56,-82 L-34,-112 L-6,-112 L-6,-82 Z" fill="#B8D7E6" stroke="#B8D7E6" stroke-width="6" stroke-linejoin="round"/>'
        '<path d="M6,-82 L6,-112 L48,-112 L78,-82 Z" fill="#B8D7E6" stroke="#B8D7E6" stroke-width="6" stroke-linejoin="round"/>'
        '<rect x="-26" y="-136" width="62" height="20" rx="7" fill="#FFE29A"/>'
        '<rect x="-14" y="-129" width="10" height="5" rx="2" fill="#8B6A3A"/><rect x="-1" y="-129" width="10" height="5" rx="2" fill="#8B6A3A"/><rect x="12" y="-129" width="10" height="5" rx="2" fill="#8B6A3A"/>'
        '<rect x="-136" y="-82" width="272" height="60" rx="26" fill="#E8B64A"/>'
        '<path d="M-136,-52 H136 V-48 Q136,-22 110,-22 H-110 Q-136,-22 -136,-48 Z" fill="#F9A826"/>'
        '<rect x="-4" y="-80" width="3.5" height="38" rx="1.7" fill="#D49A3A"/>'
        '<rect x="-24" y="-60" width="16" height="5" rx="2.5" fill="#B97F35"/>'
        '<rect x="-141" y="-64" width="14" height="16" rx="5" fill="#E86A64"/>'
        '<rect x="124" y="-66" width="16" height="16" rx="6" fill="#FFE29A"/>'
    )
    car = (f'<g class="tbob">{car_body}</g>' + wheel(-80) + wheel(82))
    puffs = ''.join(f'<circle class="tpuff" style="animation-delay:{-i * 0.35}s" cx="-142" cy="-30" r="9" fill="#C3CFDB"/>' for i in range(3))
    shadow = '<ellipse cx="0" cy="3" rx="128" ry="8" fill="#2B3F55" opacity=".16"/>'
    taxi = f'<g transform="translate(400,408) scale(1.18)">{shadow}{puffs}<g filter="url(#tf)">{car}</g></g>'

    body = (f'<rect width="800" height="460" fill="{BG}"/>' + speed + far_g + ground + mid_g + lamp_g + dash_g + taxi)
    svg = S.svg(body, css)
    return svg, S

# =====================================================================
# SCENE 3 : packing line
# =====================================================================
def build_factory():
    S = Scene('f', 16.4)
    T = 16.4
    BELT_Y = 300
    BASE = (330.0, 100.0)
    L1, L2 = 118.0, 112.0
    R_ = (400.0, 165.0); H1 = (455.0, 122.0); GR = (455.0, 158.0)
    H2 = (230.0, 140.0); DR = (230.0, 205.0)
    BX0, BX1, BX2, BX3 = -150.0, 230.0, 590.0, 900.0
    TOTAL = BX3 - BX0  # belt travel per loop; must be a multiple of the 30px tread spacing
    WHEEL_R = TOTAL / (2 * math.pi * 12)  # 12 whole turns per loop so the roller loops seamlessly
    OPEN = -125.0

    def bx(t):
        if t < 2.0:
            u = t / 2.0; return BX0 + (BX1 - BX0) * (1 - (1 - u) ** 2)
        if t < 8.9: return BX1
        if t < 11.1: return BX1 + (BX2 - BX1) * sm((t - 8.9) / 2.2)
        if t < 13.9: return BX2
        if t < 15.9:
            u = (t - 13.9) / 2.0; return BX2 + (BX3 - BX2) * u * u
        return BX3
    def travel(t): return bx(t) - BX0

    def thL(t): return OPEN * (1 - ramp(t, 6.7, 7.3))
    def thR(t): return OPEN * (1 - ramp(t, 7.9, 8.5))
    def tipL(t, x):
        th = math.radians(thL(t)); return (x - 55 + 55 * math.cos(th), 300 - 72 + 55 * math.sin(th))
    def tipR(t, x):
        th = math.radians(thR(t)); return (x + 55 - 55 * math.cos(th), 300 - 72 + 55 * math.sin(th))

    def lerp(a, b, u): return (a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u)
    OFFL, OFFR = (-18, -26), (18, -26)
    def P(t):
        x = BX1
        PL0 = (tipL(6.7, x)[0] + OFFL[0], tipL(6.7, x)[1] + OFFL[1])
        PLf = (tipL(7.3, x)[0] + OFFL[0], tipL(7.3, x)[1] + OFFL[1])
        PR0 = (tipR(7.9, x)[0] + OFFR[0], tipR(7.9, x)[1] + OFFR[1])
        PRf = (tipR(8.5, x)[0] + OFFR[0], tipR(8.5, x)[1] + OFFR[1])
        MID = (250.0, 125.0)
        seq = [(2.0, 2.6, R_, H1), (2.6, 3.1, H1, GR), (3.4, 3.9, GR, H1), (3.9, 4.9, H1, H2), (4.9, 5.4, H2, DR),
               (5.9, 6.3, DR, H2), (6.3, 6.7, H2, PL0), (7.3, 7.6, PLf, MID), (7.6, 7.9, MID, PR0), (8.5, 9.1, PRf, R_)]
        if t < 2.0: return R_
        for a, b, p0, p1 in seq:
            if a <= t <= b: return lerp(p0, p1, sm((t - a) / (b - a)))
        if 6.7 < t < 7.3:
            p = tipL(t, x); return (p[0] + OFFL[0], p[1] + OFFL[1])
        if 7.9 < t < 8.5:
            p = tipR(t, x); return (p[0] + OFFR[0], p[1] + OFFR[1])
        if 3.1 < t < 3.4: return GR
        if 5.4 < t < 5.9: return DR
        return R_ if t > 9.1 else R_

    def ik(Pt):
        dx, dy = Pt[0] - BASE[0], Pt[1] - BASE[1]
        d = math.hypot(dx, dy); d = max(abs(L1 - L2) + 2, min(L1 + L2 - 2, d))
        ux, uy = dx / math.hypot(dx, dy), dy / math.hypot(dx, dy)
        a = (L1 * L1 - L2 * L2 + d * d) / (2 * d)
        h = math.sqrt(max(0.0, L1 * L1 - a * a))
        sign = -1
        ex = BASE[0] + a * ux - sign * h * uy
        ey = BASE[1] + a * uy + sign * h * ux
        px, py = BASE[0] + ux * d, BASE[1] + uy * d
        th1 = math.degrees(math.atan2(ey - BASE[1], ex - BASE[0]))
        th2 = math.degrees(math.atan2(py - ey, px - ex))
        return (ex, ey), th1, th2, (px, py)

    def grip(t):
        g = 38.0
        g -= 11 * ramp(t, 3.1, 3.4)
        g += 11 * ramp(t, 5.4, 5.7)
        g -= 11 * ramp(t, 6.3, 6.6)
        g += 11 * ramp(t, 8.5, 8.8)
        return g

    def toy(t):
        if t < 0.8: return (455, 186, 0.0)
        pop = ramp(t, 0.8, 1.1)
        k = pop * (1 + 0.15 * math.sin(math.pi * pop)) if t < 1.1 else 1.0
        if t < 3.1: return (455, 186, k)
        if t < 5.5:
            p = P(t); return (p[0], p[1] + 28, 1.0)
        if t < 5.9:
            u = (t - 5.5) / 0.4; return (BX1, 233 + 29 * u * u, 1.0)
        return (bx(t), 262, 1.0 if t < 15.9 else 0.0)

    # tracks
    def f_upper(t): return [('t', BASE[0], BASE[1]), ('r', ik(P(t))[1])]
    def f_fore(t):
        e = ik(P(t))[0]; return [('t', e[0], e[1]), ('r', ik(P(t))[2])]
    def f_wrist(t):
        p = ik(P(t))[3]; return [('t', p[0], p[1])]
    def f_fL(t): return [('t', -grip(t), 10)]
    def f_fR(t): return [('t', grip(t), 10), ('s', -1, 1)]
    def f_toy(t):
        x, y, k = toy(t); return [('t', x, y), ('s', k, k)]
    def f_box(t): return [('t', bx(t), BELT_Y)]
    def f_flapL(t): return [('t', -55, -72), ('r', thL(t))]
    def f_flapR(t): return [('t', 55, -72), ('s', -1, 1), ('r', thR(t))]
    def f_tread(t): return [('t', travel(t), 0)]
    def f_wheel(t): return [('r', travel(t) * 12 * 360 / TOTAL)]
    def head_dy(t):
        return 76 * sm((t - 11.3) / 0.7) - 76 * sm((t - 12.0) / 0.5)
    def f_head(t): return [('t', BX2, 150 + head_dy(t))]
    def f_roller(t): return [('r', head_dy(t) * 6.4)]
    def f_tape(t):
        k = max(0.0, min(1.0, (76 * sm((t - 11.3) / 0.7) - 34) / 42.0))
        return [('t', 0, -84), ('s', 1, k)]
    def f_label(t):
        pop = ramp(t, 12.4, 12.7); k = pop * (1 + 0.2 * math.sin(math.pi * pop))
        return [('t', -24, -22), ('s', k, k)]
    def f_badge(t):
        k = ramp(t, 12.7, 13.0) * (1 + 0.25 * math.sin(math.pi * ramp(t, 12.7, 13.0))) * (1 - ramp(t, 13.7, 14.0))
        return [('t', BX2, 180), ('s', k, k)]

    # filters
    S.filt('arm', 40, -30, 560, 400)
    S.filt('box', -135, -150, 270, 220)
    S.filt('toy', -45, -50, 100, 120)
    S.filt('head', -60, -115, 120, 220)
    S.filt('belt', 0, 270, 800, 130)
    S.filt('arch', 470, 90, 250, 330)
    S.filt('shelf', 385, 195, 140, 220)
    S.filt('badge', -45, -45, 100, 100)

    TEAL, TEAL2 = '#5FAFA5', '#3E8F8A'
    def capsule(L, w, fill): return f'<rect x="{-w / 2}" y="{-w / 2}" width="{L + w}" height="{w}" rx="{w / 2}" fill="{fill}"/>'

    upper = capsule(L1, 28, TEAL) + '<circle cx="62" cy="0" r="5.5" fill="#FFE29A"/><circle r="17" fill="' + TEAL2 + '"/>'
    fore = capsule(L2, 24, TEAL) + '<circle r="15" fill="' + TEAL2 + '"/><rect x="40" y="-4" width="30" height="8" rx="4" fill="#8CCFC6"/>'
    finger = '<rect x="-4" y="0" width="8" height="30" rx="4" fill="#3E8F8A"/><rect x="-4" y="22" width="14" height="8" rx="4" fill="#3E8F8A"/>'
    wrist = ('<rect x="-6" y="0" width="12" height="12" fill="#3E8F8A"/><rect x="-22" y="6" width="44" height="10" rx="5" fill="#3E8F8A"/><circle r="12" fill="' + TEAL2 + '"/>'
             + S.A('gl', f_fL, finger) + S.A('gr', f_fR, finger))
    arm = S.A('up', f_upper, upper) + S.A('fo', f_fore, fore) + S.A('wr', f_wrist, wrist)
    arm_g = f'<g filter="url(#farm)">{arm}</g>'

    toy_art = ('<g transform="translate(0,-2)">'
               '<rect x="-26" y="12" width="48" height="6" rx="3" fill="#5FAFA5"/>'
               '<circle cx="-14" cy="22" r="8" fill="#D77B72"/><circle cx="-14" cy="22" r="3" fill="#FFD3C4"/>'
               '<circle cx="12" cy="22" r="8" fill="#D77B72"/><circle cx="12" cy="22" r="3" fill="#FFD3C4"/>'
               '<rect x="-26" y="-8" width="34" height="22" rx="9" fill="#E8B64A"/>'
               '<ellipse cx="-14" cy="-10" rx="7" ry="14" fill="#F4A62A" transform="rotate(30 -14 -10)"/>'
               '<circle cx="8" cy="-12" r="14" fill="#E8B64A"/><ellipse cx="17" cy="-6" rx="10" ry="7" fill="#FFE29A"/>'
               '<circle cx="10" cy="-15" r="2.4" fill="#5A4030"/><path d="M14,-3 Q18,0 22,-3" fill="none" stroke="#A5583F" stroke-width="1.8" stroke-linecap="round"/></g>')
    toy_g = S.A('toy', f_toy, f'<g filter="url(#ftoy)">{toy_art}</g>')

    box_back = S.A('bb', f_box, '<rect x="-55" y="-84" width="110" height="16" rx="6" fill="#B07E3E"/>')
    flap = '<rect x="0" y="-12" width="55" height="12" rx="4" fill="#F3C985"/><rect x="2" y="-4" width="51" height="3" rx="1.5" fill="#E5B26A"/>'
    label = ('<rect x="-18" y="-12" width="36" height="24" rx="4" fill="#fff"/>'
             '<rect x="-12" y="-6" width="3" height="12" fill="#3C4858"/><rect x="-7" y="-6" width="2" height="12" fill="#3C4858"/><rect x="-3" y="-6" width="4" height="12" fill="#3C4858"/>'
             '<rect x="4" y="-6" width="2" height="12" fill="#3C4858"/><rect x="8" y="-6" width="4" height="12" fill="#3C4858"/>')
    tape = '<rect x="-9" y="0" width="18" height="46" rx="3" fill="#FFF0C4"/><rect x="-9" y="0" width="18" height="46" rx="3" fill="none" stroke="#F1D58A" stroke-width="2"/>'
    front_inner = ('<rect x="-55" y="-72" width="110" height="72" rx="7" fill="#E3A857"/>'
                   '<rect x="-55" y="-72" width="110" height="14" rx="7" fill="#EEBE74"/><rect x="-55" y="-66" width="110" height="8" fill="#EEBE74"/>'
                   '<rect x="-55" y="-9" width="110" height="9" rx="4.5" fill="#D69A45" opacity=".55"/>'
                   + S.A('fl', f_flapL, flap) + S.A('fr', f_flapR, flap)
                   + S.A('tp', f_tape, tape) + S.A('lb', f_label, label))
    box_front = S.A('bf', f_box, f'<g filter="url(#fbox)">{front_inner}</g>')

    # head (tape applicator) + rod
    head_art = ('<rect x="-4" y="-90" width="8" height="90" fill="#8497AB"/>'
                '<rect x="-21" y="0" width="42" height="28" rx="9" fill="#D77B72"/><rect x="-13" y="6" width="26" height="6" rx="3" fill="#E9A199"/>'
                + S.A('rl', f_roller, '<g transform="translate(0,36)"><circle r="10" fill="#3C4858"/><circle r="4" fill="#fff"/><rect x="-1.5" y="-9" width="3" height="6" fill="#8497AB"/></g>'))
    head = S.A('hd', f_head, f'<g filter="url(#fhead)">{head_art}</g>')

    badge_art = '<circle r="17" fill="#5FAFA5"/><path d="M-8,0 L-2,7 L9,-6" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>'
    badge = S.A('bd', f_badge, f'<g filter="url(#fbadge)">{badge_art}</g>')

    # static stuff
    wall = f'<rect width="800" height="460" fill="{BG}"/>'
    wall += '<rect x="40" y="130" width="150" height="86" rx="14" fill="#DDE8F0"/><path d="M115,130 V216 M40,173 H190" stroke="#E9EEF3" stroke-width="5"/>'
    wall += '<rect x="40" y="60" width="150" height="42" rx="12" fill="#D77B72"/>'
    wall += f'<text x="115" y="88" text-anchor="middle" font-family="{FONT}" font-weight="700" font-size="18" letter-spacing="2" fill="#fff">TOY WORKS</text>'
    wall += '<rect y="372" width="800" height="88" fill="#D6DFE8"/><rect y="368" width="800" height="8" fill="#CCD6E1"/>'
    rail = '<rect x="240" y="64" width="250" height="18" rx="9" fill="#8497AB"/><rect x="302" y="78" width="56" height="12" rx="6" fill="#6F8296"/><rect x="322" y="86" width="16" height="22" fill="#6F8296"/>'
    shelf = (f'<g filter="url(#fshelf)"><rect x="447" y="222" width="16" height="150" fill="#8497AB"/>'
             '<rect x="418" y="214" width="74" height="12" rx="6" fill="#8497AB"/></g>')

    # belt
    marks = ''.join(f'<rect x="{k * 30 + 12}" y="306" width="7" height="14" rx="3.5" fill="#7A8DA1"/>' for k in range(-36, 27))
    belt = ('<defs><clipPath id="fbc"><rect x="30" y="300" width="740" height="26" rx="13"/></clipPath></defs>'
            + ''.join(f'<rect x="{x}" y="326" width="14" height="46" fill="#8497AB"/><rect x="{x - 8}" y="366" width="30" height="8" rx="4" fill="#6F8296"/>' for x in (90, 300, 500, 700))
            + '<rect x="30" y="300" width="740" height="26" rx="13" fill="#3C4858"/>'
            + f'<g clip-path="url(#fbc)">{S.A("tr", f_tread, marks)}</g>'
            + '<rect x="46" y="300" width="708" height="5" rx="2.5" fill="#55677A"/>')
    wheels = ''
    for i, cx in enumerate((44, 756)):
        spokes = ''.join(f'<rect x="-2" y="-11" width="4" height="11" rx="2" fill="#7A8DA1" transform="rotate({a})"/>' for a in range(0, 360, 120))
        wheels += f'<g transform="translate({cx},313)"><circle r="{WHEEL_R:.2f}" fill="#55677A"/>{S.A("wh" + str(i), f_wheel, spokes)}<circle r="3.5" fill="#fff"/></g>'
    belt_g = f'<g filter="url(#fbelt)">{belt}{wheels}</g>'

    # arch (sealer)
    arch = ('<rect x="506" y="130" width="16" height="242" rx="6" fill="#8497AB"/><rect x="658" y="130" width="16" height="242" rx="6" fill="#8497AB"/>')
    beam = '<rect x="496" y="118" width="188" height="32" rx="12" fill="#6F8296"/><rect x="560" y="126" width="60" height="8" rx="4" fill="#8CA0B3"/><circle cx="510" cy="134" r="4" fill="#FFE29A"/>'
    arch_g = f'<g filter="url(#farch)">{arch}</g>'

    body = (wall + rail + shelf + box_back + toy_g + arm_g + belt_g + arch_g + box_front + head
            + f'<g filter="url(#farch)">{beam}</g>' + badge)
    svg = S.svg(body)
    return svg, S

if __name__ == '__main__':
    for name, fn in (('walk', build_walk), ('taxi', build_taxi), ('factory', build_factory)):
        svg, S = fn()
        open(f'{OUT}/{name}.svg', 'w').write(svg)
        print(name, len(svg) // 1024, 'KB')
