"""Character rig: pose channels driven by a Timeline of clips, drawn as swappable part
sets (side / front / back) on top of Scene. All pose math is plain Python, so it can be
checked without a browser.

Pose state channels (a dict):
  x, y     ground point in scene px (feet), y is the ground path
  face     side-view facing, +1 right / -1 left (passes through 0 during a flip)
  view     'side' | 'front' | 'back'
  sq       width squash of the active view during a quarter turn (1 = normal)
  phase    gait distance in seconds of full-speed walking (drives the leg cycle)
  amp      gait amplitude 0..1 (ramps in/out with walking)
  stride_y screen-y px per unit phase of the current walk (toward/away foot planting)
  crouch   0..1 knee bend for pickup / putdown
  hold     0..1 arms forward holding the box (1) vs free swing (0)
  carry    1 = box in hands, 0 = box on the ground
  breath   small idle chest rise (units)
"""
import math
from scene import sm

RAMP = 0.35      # walk speed-up / slow-down (s)
CYCLE = 0.7      # one full gait cycle at full speed (s of phase)
DC = 30.745      # crouch depth (hip drop at full crouch)
LEAN_C = 25.0    # forward lean at full crouch (deg)
BOXL = (50.0, -12.0)  # carried box, relative to the hip, before lean

INIT = dict(x=0.0, y=0.0, face=1, view='side', sq=1, phase=0, amp=0.0, stride_y=0.0,
            crouch=0, hold=0, carry=0.0, breath=0.0)

# ---------------------------------------------------------------- timeline
class Timeline:
    """events: (start, end, clip, kwargs). A clip is a pure function
    clip(state, u, dur, **kwargs) -> state of its local time u in [0, dur], given the
    state as it was when the clip started. Channels a clip doesn't set carry over."""
    def __init__(s, init, events):
        s.init = dict(INIT, **init)
        s.events = sorted(events, key=lambda e: e[0])
        s._cache = {}

    def __call__(s, t):
        st = s._cache.get(t)
        if st is None:
            st = dict(s.init)
            for ts, te, clip, kw in s.events:
                if t < ts: break
                st = clip(dict(st), min(t - ts, te - ts), te - ts, **kw)
            s._cache[t] = st
        return st

    def instants(s, kind):
        """Clips may declare swaps(state_at_start, dur, **kw) -> ((kind, local_t), ...).
        Absolute times of instant swaps of one kind ('carry' or 'view'), for Scene extras."""
        return [ts + du for ts, te, clip, kw in s.events
                for k, du in getattr(clip, 'swaps', lambda st, d, **_: ())(s(ts), te - ts, **kw) if k == kind]

    def extras(s, kind):
        return tuple(x for t in s.instants(kind) for x in (t - 0.001, t))

# ---------------------------------------------------------------- clips
def walk(st, u, dur, to):
    """Walk to `to` = (x, y) with eased start/stop. Cadence is fixed (phase advances one
    second per second at full speed) whatever the screen distance, so toward/away walks
    step at the same rate as side walks."""
    D, r = dur, RAMP
    if u < r: d = u * u / (2 * r)
    elif u < D - r: d = r / 2 + (u - r)
    else: d = (D - r) - (D - u) ** 2 / (2 * r)
    x0, y0 = st['x'], st['y']
    if u >= D:
        st['x'], st['y'] = to
    else:
        st['x'] = x0 + (to[0] - x0) * d / (D - r)
        st['y'] = y0 + (to[1] - y0) * d / (D - r)
    st['stride_y'] = (to[1] - y0) / (D - r)
    st['phase'] = st['phase'] + d
    st['amp'] = min(1.0, 2.0 * min(1.0, u / r, (D - u) / r))
    return st

def idle(st, u, dur, breathe=0.0):
    """Stand still; optional chest rise that is zero at both ends."""
    st['breath'] = breathe * math.sin(math.pi * u / dur) ** 2
    return st

def putdown(st, u, dur):
    """Crouch, release the box at 0.7s, drop the arms, stand up (1.4s)."""
    st['crouch'] = st['crouch'] + sm(u / 0.6) - sm((u - 0.8) / 0.6)
    st['hold'] = st['hold'] - sm((u - 0.7) / 0.5)
    if u >= 0.7: st['carry'] = 0.0
    return st
putdown.swaps = lambda st, dur, **_: (('carry', 0.7),)

def pickup(st, u, dur):
    """Crouch with arms reaching, grab the box at 0.7s, stand up (1.3s)."""
    st['crouch'] = st['crouch'] + sm(u / 0.6) - sm((u - 0.7) / 0.6)
    st['hold'] = st['hold'] + sm(u / 0.6)
    if u >= 0.7: st['carry'] = 1.0
    return st
pickup.swaps = lambda st, dur, **_: (('carry', 0.7),)

def turn(st, u, dur, to):
    """to = 'left' | 'right' | 'front' | 'back'.
    side -> other side: scaleX flip through 0 (the original turn).
    otherwise a quarter turn: squash the current view's width to 0.5, swap view at the
    midpoint, expand. Front <-> back is two quarter turns via the side view."""
    if st['view'] == 'side' and to in ('left', 'right'):
        s0 = st['face']
        if (to == 'right') == (s0 > 0): return st
        st['face'] = -s0 if u >= dur else s0 * math.cos(math.pi * sm(u / dur))
        return st
    st['sq'] = 1 if u >= dur else 0.5 + 0.5 * abs(math.cos(math.pi * sm(u / dur)))
    if u >= dur / 2:
        st['view'] = 'side' if to in ('left', 'right') else to
        if to in ('left', 'right'): st['face'] = 1 if to == 'right' else -1
    return st
turn.swaps = lambda st, dur, to: () if st['view'] == 'side' and to in ('left', 'right') else (('view', dur / 2),)

# ---------------------------------------------------------------- art
SK, SK2, HAIR = '#E8B48F', '#D6996F', '#6B4A35'
SH, SL, SL2 = '#5B8FD6', '#4F86D0', '#3F74BC'
PANT, PANT2, SHOE, SHOE2 = '#5B78AA', '#4A6590', '#34495E', '#2C3E52'
EYE, MOUTH, CHEEK = '#3A2E2A', '#A5583F', '#F29A8A'
COLLAR, POCKET, POCKET_HI = '#A9CCF2', '#3F78C6', '#6FA2E4'
HAIR_TOP = -119.56  # side hair bbox top (getBBox in Chromium); front/back hair must match

def arm_art(far):
    sk, sl = (SK2, SL2) if far else (SK, SL)
    return (f'<rect x="-6" y="6" width="12" height="34" rx="6" fill="{sk}"/>'
            f'<circle cx="0" cy="39" r="8" fill="{sk}"/>'
            f'<rect x="-8.5" y="-7" width="17" height="24" rx="8.5" fill="{sl}"/>')

def leg_art(far):
    return f'<rect x="-8.5" y="0" width="17" height="50" rx="7" fill="{PANT2 if far else PANT}"/>'

def shoe_art(far):
    c = SHOE2 if far else SHOE
    return (f'<rect x="-10" y="-13" width="31" height="13" rx="6.5" fill="{c}"/>'
            f'<rect x="-8" y="-4" width="27" height="4" rx="2" fill="#E9EEF3"/>')

def shoe_art_front():
    # side shoe seen end-on: same height and sole stripe, toe-width instead of length
    return (f'<rect x="-12" y="-13" width="24" height="13" rx="6.5" fill="{SHOE}"/>'
            f'<rect x="-10" y="-4" width="20" height="4" rx="2" fill="#E9EEF3"/>')

def fc(face_cls):
    return f' class="{face_cls}"' if face_cls else ''

def upper_side(face_cls=''):
    f = fc(face_cls)
    return (
        '<rect x="-5" y="-62" width="15" height="16" rx="5" fill="#D6996F"/>'
        f'<rect x="-20" y="-52" width="38" height="54" rx="15" fill="{SH}"/>'
        '<path d="M-5,-51 Q5,-38 16,-51" fill="none" stroke="#A9CCF2" stroke-width="4" stroke-linecap="round"/>'
        '<rect x="3" y="-30" width="12" height="14" rx="3" fill="#3F78C6"/>'
        '<rect x="5.5" y="-27.5" width="7" height="2" rx="1" fill="#6FA2E4"/>'
        f'<circle cx="-21" cy="-84" r="6.5" fill="{SK2}"/>'
        f'<circle cx="4" cy="-86" r="29" fill="{SK}"/>'
        f'<circle cx="31" cy="-81" r="4" fill="{SK}"/>'
        f'<path d="M-27,-82 C-36,-118 -4,-124 16,-117 C30,-113 38,-102 33,-92 C25,-101 15,-102 5,-100 C-8,-98 -17,-96 -21,-72 C-24,-74 -26,-78 -27,-82 Z" fill="{HAIR}"/>'
        f'<circle{f} cx="17" cy="-84" r="3.4" fill="#3A2E2A"/>'
        f'<path{f} d="M10,-70 Q18,-63 26,-71" fill="none" stroke="#A5583F" stroke-width="2.8" stroke-linecap="round"/>'
        f'<circle{f} cx="9" cy="-73" r="4.5" fill="#F29A8A" opacity=".55"/>'
    )

def _torso_front(back):
    s = (f'<rect x="-18" y="-6" width="36" height="14" rx="6" fill="{PANT}"/>'      # seat of the pants
         f'<rect x="-7" y="-62" width="14" height="16" rx="5" fill="{SK2}"/>'       # neck
         f'<rect x="-22" y="-52" width="44" height="54" rx="15" fill="{SH}"/>')
    if not back:
        s += (f'<path d="M-11,-51 Q0,-38 11,-51" fill="none" stroke="{COLLAR}" stroke-width="4" stroke-linecap="round"/>'
              f'<rect x="5" y="-30" width="12" height="14" rx="3" fill="{POCKET}"/>'
              f'<rect x="7.5" y="-27.5" width="7" height="2" rx="1" fill="{POCKET_HI}"/>')
    return s

def upper_front(face_cls=''):
    f = fc(face_cls)
    return (_torso_front(False) +
        f'<circle cx="-29" cy="-83" r="6.5" fill="{SK}"/><circle cx="29" cy="-83" r="6.5" fill="{SK}"/>'
        f'<circle cx="0" cy="-86" r="29" fill="{SK}"/>'
        # hair cap: crown at HAIR_TOP, side-swept fringe, short sideburns above the ears
        f'<path d="M-30,-82 C-34,-108 -18,{HAIR_TOP} 0,{HAIR_TOP} C18,{HAIR_TOP} 34,-108 30,-82 '
        f'C28,-92 24,-99 16,-101 C6,-96 -8,-95 -18,-100 C-24,-96 -27,-90 -30,-82 Z" fill="{HAIR}"/>'
        f'<circle{f} cx="-10" cy="-84" r="3.4" fill="{EYE}"/><circle{f} cx="10" cy="-84" r="3.4" fill="{EYE}"/>'
        f'<path{f} d="M-6,-71 Q0,-65 6,-71" fill="none" stroke="{MOUTH}" stroke-width="2.8" stroke-linecap="round"/>'
        f'<circle{f} cx="-17" cy="-74" r="4.5" fill="{CHEEK}" opacity=".55"/><circle{f} cx="17" cy="-74" r="4.5" fill="{CHEEK}" opacity=".55"/>'
    )

def upper_back():
    return (_torso_front(True) +
        f'<circle cx="-29" cy="-83" r="6.5" fill="{SK2}"/><circle cx="29" cy="-83" r="6.5" fill="{SK2}"/>'
        f'<circle cx="0" cy="-86" r="29" fill="{SK}"/>'
        # hair covers the whole head down to the nape
        f'<path d="M-30,-82 C-34,-108 -18,{HAIR_TOP} 0,{HAIR_TOP} C18,{HAIR_TOP} 34,-108 30,-82 '
        f'C30,-72 24,-63 12,-61 C4,-64 -4,-64 -12,-61 C-24,-63 -30,-72 -30,-82 Z" fill="{HAIR}"/>'
    )

def small_box():
    return ('<rect x="-20" y="-17" width="40" height="34" rx="5" fill="#E3A857"/>'
            '<rect x="-20" y="-17" width="40" height="10" rx="5" fill="#F0C27C"/>'
            '<rect x="-20" y="-12" width="40" height="5" fill="#F0C27C"/>'
            '<rect x="-4.5" y="-17" width="9" height="34" fill="#FFE7A6"/>'
            '<rect x="7" y="3" width="11" height="8" rx="1.5" fill="#fff"/>')

# ---------------------------------------------------------------- character
class Nico:
    """Parts are drawn hip-local: hip at (0,-58), ground at y=0, shoulder at hip+(2,-42)
    (side) or hip+(+-20,-42) (front/back). One Timeline drives every view; the views share
    gait math (phase, amplitude, hip drop) so they can't drift apart."""
    LX = 10.0     # front/back hip joint half-spacing
    AX = 20.0     # front/back shoulder half-spacing
    LIFT = 9.0    # front/back swing-foot lift at full amplitude
    SWAY = 1.5    # front/back hip shift toward the stance foot
    ARM_OUT = 7.0 # front/back arms angled out at rest (deg)

    def __init__(s, S, tl, views=('side',), scale_of=lambda y: 1.3, prop=False, face_cls=''):
        s.S, s.tl, s.views, s.scale_of, s.prop, s.face_cls = S, tl, views, scale_of, prop, face_cls

    # -- pose derivation (shared) --
    def gait(s, st):
        an = 28.0 * st['amp'] * math.sin(2 * math.pi * st['phase'] / CYCLE)
        dw = 29.0 * (1 - math.cos(math.radians(an)))
        return an, DC * st['crouch'] + dw

    def live(s, view, t):
        """Pose for a view's parts: live if the view is showing, else frozen at neutral
        (hidden parts then compile to a single keyframe)."""
        st = s.tl(t)
        if len(s.views) == 1 or st['view'] == view: return st
        return dict(st, amp=0.0, crouch=0, breath=0.0)

    # -- side view tracks (the original walk rig, unchanged) --
    def side_tracks(s):
        V = 'side'
        def lean(st): return LEAN_C * st['crouch'] + 3.0 * st['amp']
        def armang(st, far):
            an, _ = s.gait(st); w = st['hold']
            free = (0.85 * an) if far else (-0.85 * an)
            return (1 - w) * free + w * (-56.0)
        def f_upper(t):
            st = s.live(V, t); _, dd = s.gait(st)
            return [('t', 0, -58 + dd - st['breath']), ('r', lean(st))]
        def f_arm(far):
            def fn(t):
                st = s.live(V, t); _, dd = s.gait(st)
                return [('t', 0, -58 + dd - st['breath']), ('r', lean(st)), ('t', 2, -42), ('r', armang(st, far))]
            return fn
        def leg_params(st, far):
            an, _ = s.gait(st)
            return (-an if far else an), 58 - DC * st['crouch']
        def f_leg(far):
            def fn(t):
                st = s.live(V, t); _, dd = s.gait(st)
                a_, l = leg_params(st, far)
                return [('t', -3 if far else 3, -58 + dd), ('r', a_), ('s', 1 + 0.35 * st['crouch'], (l - 8) / 50.0)]
            return fn
        def f_shoe(far):
            def fn(t):
                st = s.live(V, t); _, dd = s.gait(st)
                a_, l = leg_params(st, far); r = math.radians(a_)
                hx = -3 if far else 3
                return [('t', hx - l * math.sin(r), -58 + dd + l * math.cos(r)), ('r', a_ * 0.4)]
            return fn
        def f_box(t):
            st = s.live(V, t); _, dd = s.gait(st)
            a = math.radians(lean(st)); px, py = BOXL
            x = px * math.cos(a) - py * math.sin(a)
            y = px * math.sin(a) + py * math.cos(a)
            return [('t', x, -58 + dd + y), ('s', st['carry'], st['carry'])]
        return f_upper, f_arm, f_leg, f_shoe, f_box

    def side_parts(s):
        S = s.S
        f_upper, f_arm, f_leg, f_shoe, f_box = s.side_tracks()
        return (S.A('ba', f_arm(True), arm_art(True)) +
                S.A('bl', f_leg(True), leg_art(True)) +
                S.A('bs', f_shoe(True), shoe_art(True)) +
                S.A('fl', f_leg(False), leg_art(False)) +
                S.A('fs', f_shoe(False), shoe_art(False)) +
                S.A('up', f_upper, upper_side(s.face_cls)) +
                (S.A('bx', f_box, small_box(), extras=s.tl.extras('carry')) if s.prop else '') +
                S.A('fa', f_arm(False), arm_art(False)))

    # -- front / back view tracks --
    def fb_pose(s, st):
        """Toward/away gait: same phase and hip drop as the side view, seen end-on.
        Returns per-side (i = -1 viewer-left, +1 viewer-right) foot lift, foot depth
        offset (local units, + = lower on screen) and arm swing, plus hip sway."""
        ph = 2 * math.pi * st['phase'] / CYCLE
        amp = st['amp']; _, dd = s.gait(st)
        k = s.scale_of(st['y'])
        # stance foot holds still on the ground: its depth offset cancels the body's motion
        off = st['stride_y'] * CYCLE / (2 * math.pi) * amp * math.sin(ph) / k
        out = {'dd': dd, 'sway': s.SWAY * amp * math.cos(ph)}
        for i, sg in ((-1, 1), (1, -1)):        # viewer-left leg leads with +sin(ph)
            out[i] = dict(lift=s.LIFT * amp * max(0.0, sg * math.cos(ph)),
                          off=sg * off,
                          arm=-sg * amp * math.sin(ph))  # arm swings opposite its leg
        return out

    def fb_parts(s, view):
        S, V = s.S, view
        tag = 'fv' if view == 'front' else 'bv'
        def f_leg(i):
            def fn(t):
                p = s.fb_pose(s.live(V, t)); q = p[i]
                l = 58 - p['dd'] - q['lift'] + q['off']
                return [('t', i * s.LX + p['sway'], -58 + p['dd']), ('r', math.degrees(math.asin(p['sway'] / l))), ('s', 1, (l - 8) / 50.0)]
            return fn
        def f_shoe(i):
            def fn(t):
                p = s.fb_pose(s.live(V, t)); q = p[i]
                return [('t', i * s.LX, -q['lift'] + q['off'])]
            return fn
        def f_upper(t):
            st = s.live(V, t); p = s.fb_pose(st)
            return [('t', p['sway'], -58 + p['dd'] - st['breath'])]
        def f_arm(i):
            def fn(t):
                st = s.live(V, t); p = s.fb_pose(st); a = p[i]['arm']
                # foreshortened swing: the arm shortens and tips out a little either way
                return [('t', i * s.AX + p['sway'], -100 + p['dd'] - st['breath']),
                        ('r', -i * (s.ARM_OUT + 3.0 * abs(a))), ('s', 1, 1 - 0.14 * abs(a))]
            return fn
        upper = upper_front(s.face_cls) if view == 'front' else upper_back()
        return (S.A(tag + 'legl', f_leg(-1), leg_art(False)) + S.A(tag + 'legr', f_leg(1), leg_art(False)) +
                S.A(tag + 'shl', f_shoe(-1), shoe_art_front()) + S.A(tag + 'shr', f_shoe(1), shoe_art_front()) +
                S.A(tag + 'up', f_upper, upper) +
                S.A(tag + 'arml', f_arm(-1), arm_art(False)) + S.A(tag + 'armr', f_arm(1), arm_art(False)))

    # -- assembly --
    def svg(s, filt='f'):
        S, tl = s.S, s.tl
        vx = tl.extras('view')
        def f_char(t):
            st = tl(t); k = s.scale_of(st['y'])
            return [('t', st['x'], st['y']), ('s', k, k)]
        def f_side(t):
            st = tl(t)
            if st['view'] != 'side': return [('s', 0, 0)]
            return [('s', st['face'] * st['sq'], 1)]
        def f_view(v):
            return lambda t: [('s', tl(t)['sq'], 1)] if tl(t)['view'] == v else [('s', 0, 0)]
        inner = S.A('fp', f_side, s.side_parts(), extras=vx)
        if 'front' in s.views: inner += S.A('vfr', f_view('front'), s.fb_parts('front'), extras=vx)
        if 'back' in s.views: inner += S.A('vbk', f_view('back'), s.fb_parts('back'), extras=vx)
        return S.A('c', f_char, inner, filt=filt)
