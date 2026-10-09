#!/usr/bin/env python3
"""
Behavior checks for the animated sticker SVGs. Renders in headless Chromium,
seeks CSS animations to exact times, and asserts what you would see on screen
(feet planted, box stays where it was set down, belt and box move together,
nothing clipped by a filter region, loops are seamless).

Usage:
  python verify/verify.py                 run everything
  python verify/verify.py walk            one scene (walk | taxi | factory | walk3d)
  python verify/verify.py --update-golden regenerate reference/golden/*.png
Env: OUT=<dir with the .svg files> (default ../out)
"""
import io, math, os, re, sys
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get('OUT', os.path.join(HERE, '..', 'out'))
GOLD = os.path.join(HERE, '..', 'reference', 'golden')
W, H = 800, 460
FAILS, PASSES = [], 0

def check(cond, msg):
    global PASSES
    if cond: PASSES += 1
    else:
        FAILS.append(msg); print('  FAIL:', msg)

def load(pg, name):
    svg = open(os.path.join(OUT, name + '.svg')).read()
    pg.set_content(f'<body style="margin:0;background:#E9EEF3">{svg}</body>')

def seek(pg, t):
    pg.evaluate("t=>document.getAnimations().forEach(a=>{a.pause();a.currentTime=t*1000})", t)
    pg.wait_for_timeout(30)

def img(pg):
    return Image.open(io.BytesIO(pg.screenshot())).convert('RGB')

def diff_frac(a, b, box=None, thresh=24):
    if box: a, b = a.crop(box), b.crop(box)
    d = ImageChops.difference(a, b).convert('L').point(lambda v: 255 if v > thresh else 0)
    return d.histogram()[255] / (d.size[0] * d.size[1])

def rect(pg, sel):
    return pg.evaluate("""s=>{const e=document.querySelector(s); if(!e) return null;
      const r=e.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height,b:r.bottom,r:r.right}}""", sel)

def flap_rot_right(m):
    # the right flap is drawn mirrored (scale(-1,1)), so its true hinge angle is 180 - rot
    r = 180 - m['rot']
    return (r + 180) % 360 - 180

def matrix(pg, sel):
    return pg.evaluate("""s=>{const m=new DOMMatrix(getComputedStyle(document.querySelector(s)).transform);
      return {a:m.a,b:m.b,c:m.c,d:m.d,e:m.e,f:m.f,rot:Math.atan2(m.b,m.a)*180/Math.PI}}""", sel)

def filter_regions_ok(pg, times, margin_lo=8, margin_hi=24, skip=('fbelt',)):
    """Every filtered group's content (local bbox) must sit inside its filter region,
    with room for the 5px outline and the offset soft shadow. Otherwise the sticker edge clips."""
    js = """()=>[...document.querySelectorAll('g[filter]')].map(g=>{
      const id=g.getAttribute('filter').match(/#([^)]+)/)[1];
      const f=document.getElementById(id); const b=g.getBBox();
      return {id, bx:b.x, by:b.y, bw:b.width, bh:b.height, rx:+f.getAttribute('x'), ry:+f.getAttribute('y'),
              rw:+f.getAttribute('width'), rh:+f.getAttribute('height')}})"""
    worst = {}
    for t in times:
        seek(pg, t)
        for r in pg.evaluate(js):
            if r['bw'] == 0 or r['bh'] == 0 or r['id'] in skip: continue  # fbelt: bbox ignores its clip-path
            slack = min(r['bx'] - r['rx'] - margin_lo, r['by'] - r['ry'] - margin_lo,
                        r['rx'] + r['rw'] - (r['bx'] + r['bw']) - margin_hi,
                        r['ry'] + r['rh'] - (r['by'] + r['bh']) - margin_hi)
            if r['id'] not in worst or slack < worst[r['id']][0]: worst[r['id']] = (slack, t)
    for fid, (slack, t) in worst.items():
        check(slack >= 0, f'filter region #{fid} clips content by {-slack:.0f}px at t={t}s (widen its region)')

# ------------------------------------------------------------------ walk
def test_walk(pg):
    print('walk')
    load(pg, 'walk'); T = 19.0; G = 392
    # loop seam: end of loop looks like the start
    seek(pg, 0.0); a = img(pg); seek(pg, T - 0.001); b = img(pg)
    check(diff_frac(a, b) < 0.0005, 'walk loop seam: last frame differs from first frame')
    # put-down / pick-up handover: swapping carried box for resting box must not visibly jump
    # (geometry, not pixels: the sticker outline legitimately changes when the box leaves/joins the character's group)
    for th in (4.2, 13.3):
        seek(pg, th - 0.002); a = rect(pg, '.wbx')
        seek(pg, th + 0.002); b = rect(pg, '.wgb')
        dx = abs((a['x'] + a['w'] / 2) - (b['x'] + b['w'] / 2)); dy = abs((a['y'] + a['h'] / 2) - (b['y'] + b['h'] / 2))
        check(dx < 1.5 and dy < 1.5 and abs(a['w'] - b['w']) < 1.5, f'box jumps at handover t={th}s (dx={dx:.1f}, dy={dy:.1f})')
    # feet: while the character is on screen, at least one shoe is planted on the ground line
    step = 0.1
    for i in range(int(T / step)):
        t = round(i * step, 2); seek(pg, t)
        fs, bs = rect(pg, '.wfs'), rect(pg, '.wbs')
        bottom = max(fs['b'], bs['b'])
        if not (G - 7 <= bottom <= G + 3):
            check(False, f'feet not on ground at t={t}s (lowest shoe bottom {bottom:.1f}, ground {G})'); break
    else:
        check(True, '')
    # box resting on the ground while set down, and it stays put (world x constant)
    xs = []
    for t in (4.6, 6.0, 8.0, 10.0, 12.0):
        seek(pg, t); r = rect(pg, '.wgb')
        check(abs(r['b'] - G) <= 2.5, f'resting box not sitting on ground at t={t}s (bottom {r["b"]:.1f})')
        xs.append(r['x'])
    check(max(xs) - min(xs) < 0.5, f'resting box drifts: x range {min(xs):.1f}..{max(xs):.1f}')
    # only one of carried / resting box is visible at any time
    for t in (1.0, 4.0, 4.5, 9.0, 13.0, 14.0):
        seek(pg, t)
        c, g = matrix(pg, '.wbx'), matrix(pg, '.wgb')
        vis_c, vis_g = abs(c['a']) > 0.05, abs(g['a']) > 0.05
        check(vis_c != vis_g, f'carried/resting box visibility wrong at t={t}s (carried={vis_c}, resting={vis_g})')
    # direction changes: facing flips between walking right and walking left
    seek(pg, 3.0); s1 = matrix(pg, '.wfp')['a']
    seek(pg, 7.0); s2 = matrix(pg, '.wfp')['a']
    check(s1 > 0.9 and s2 < -0.9, f'facing did not flip between right-walk and left-walk ({s1:.2f}, {s2:.2f})')
    filter_regions_ok(pg, [i * 0.5 for i in range(38)])

# ------------------------------------------------------------------ taxi
def test_taxi(pg):
    print('taxi')
    load(pg, 'taxi')
    durs = pg.evaluate("""()=>{const o={};document.getAnimations().forEach(a=>{
      const c=a.effect.target.getAttribute('class')||''; o[c]=a.effect.getTiming().duration/1000}); return o}""")
    wheel, dash = durs.get('tspin'), durs.get('tdash')
    check(wheel and dash, 'taxi: missing wheel or dash animation')
    if wheel and dash:
        rim = 2 * math.pi * 27 / wheel; road = 160 / dash
        check(abs(rim - road) / road < 0.02, f'wheels slip: rim speed {rim:.0f}px/s vs road {road:.0f}px/s')
        for cls, tile, ratio in (('tfar', 800, 0.2), ('tmid', 800, 0.55), ('tlamp', 800, 1.0)):
            sp = tile / durs[cls]
            check(abs(sp / road - ratio) < 0.02, f'parallax {cls}: {sp / road:.2f}x road speed, expected {ratio}x')
    # tiles must repeat exactly: scrolled-by-one-tile frame equals the unscrolled one (road layers only)
    seek(pg, 0.0); a = img(pg)
    pg.evaluate("""()=>document.getAnimations().forEach(a=>{const c=a.effect.target.getAttribute('class');
      if(c==='tdash') a.currentTime=a.effect.getTiming().duration})""")
    b = img(pg)
    check(diff_frac(a, b, (0, 415, W, 440)) < 0.001, 'lane dashes do not tile seamlessly')
    filter_regions_ok(pg, [0, 0.1, 0.2])

# ------------------------------------------------------------------ factory
def test_factory(pg):
    print('factory')
    load(pg, 'factory'); T = 16.4
    seek(pg, 0.0); a = img(pg); seek(pg, T - 0.001); b = img(pg)
    check(diff_frac(a, b) < 0.0005, 'factory loop seam: last frame differs from first frame')
    # belt and box move together: tread offset equals box travel; roller angle matches travel
    for t in (0.5, 1.5, 2.5, 9.5, 10.5, 12.0, 14.5, 15.5):
        seek(pg, t)
        bx = matrix(pg, '.fbf')['e']; tr = matrix(pg, '.ftr')['e']
        check(abs((bx + 150) - tr) < 0.6, f'belt/box out of sync at t={t}s (box travel {bx + 150:.1f}, belt {tr:.1f})')
        ang = matrix(pg, '.fwh0')['rot'] % 360
        want = (tr * 12 * 360 / 1050) % 360
        dd = min(abs(ang - want), 360 - abs(ang - want))
        check(dd < 1.0, f'belt roller angle off by {dd:.1f} deg at t={t}s')
    # belt stands still while the arm works
    seek(pg, 4.0); t1 = matrix(pg, '.ftr')['e']; seek(pg, 7.0); t2 = matrix(pg, '.ftr')['e']
    check(abs(t1 - t2) < 0.01, 'belt moves while the arm is packing')
    # toy: rides with the gripper, ends inside the box (hidden behind front face), then travels with the box
    seek(pg, 4.3); toy = matrix(pg, '.ftoy'); wr = matrix(pg, '.fwr')
    check(abs(toy['e'] - wr['e']) < 1 and abs(toy['f'] - (wr['f'] + 28)) < 1, 'toy not held by gripper during transfer')
    for t in (6.5, 9.0, 10.0, 12.0):
        seek(pg, t); toy = matrix(pg, '.ftoy'); box = matrix(pg, '.fbf')
        check(abs(toy['e'] - box['e']) < 1, f'toy not inside box horizontally at t={t}s')
        check(toy['f'] - 26 >= 300 - 72 - 1, f'toy sticks out above the box rim at t={t}s')
    # flaps: open before sealing, both closed after the arm closes them, in order left then right
    seek(pg, 3.0); check(abs(matrix(pg, '.ffl')['rot'] + 125) < 1, 'flaps should be open before packing')
    seek(pg, 7.5); l, r = matrix(pg, '.ffl')['rot'], flap_rot_right(matrix(pg, '.ffr'))
    check(abs(l) < 1 and r < -100, f'left flap should be closed before right flap starts (left {l:.0f}, right {r:.0f})')
    seek(pg, 9.0); check(abs(matrix(pg, '.ffl')['rot']) < 1 and abs(flap_rot_right(matrix(pg, '.ffr'))) < 1, 'flaps not closed after packing')
    # tape and label appear only after flaps are shut, during sealing
    seek(pg, 8.0); check(matrix(pg, '.ftp')['d'] < 0.01, 'tape present before sealing')
    seek(pg, 13.0); check(matrix(pg, '.ftp')['d'] > 0.99 and matrix(pg, '.flb')['a'] > 0.99, 'tape/label missing after sealing')
    # arm stays attached at the base and keeps both links the right length
    for t in (1.0, 3.0, 5.0, 7.0, 8.0):
        seek(pg, t)
        u, f_, w_ = matrix(pg, '.fup'), matrix(pg, '.ffo'), matrix(pg, '.fwr')
        l1 = math.hypot(f_['e'] - u['e'], f_['f'] - u['f']); l2 = math.hypot(w_['e'] - f_['e'], w_['f'] - f_['f'])
        check(abs(l1 - 118) < 0.5 and abs(l2 - 112) < 0.5, f'arm links stretch at t={t}s ({l1:.1f}, {l2:.1f})')
    filter_regions_ok(pg, [i * 0.4 for i in range(41)])

# ------------------------------------------------------------------ walk3d
W3_T = 17.7
W3_WALKS = [(0.2, 4.2, (180, 376), (560, 376)), (5.2, 7.8, (560, 376), (560, 442)),   # right, toward camera
            (9.3, 11.9, (560, 442), (560, 376)), (12.8, 16.8, (560, 376), (180, 376))]  # away, back left
W3_SWAPS = [(4.7, 'side', 'front'), (8.35, 'front', 'side'), (8.85, 'side', 'back'), (12.35, 'back', 'side')]
W3_VIEWS = {'side': '.dfp', 'front': '.dvfr', 'back': '.dvbk'}
W3_SHOES = '.dfs,.dbs,.dfvshl,.dfvshr,.dbvshl,.dbvshr'

def w3_path_err(t, x, y):
    """Distance from the intended ground path: on the straight segment during a walk
    (eased speed, so position along it isn't pinned), exactly on the waypoint while standing."""
    pos = W3_WALKS[0][2]
    for t0, t1, a, b in W3_WALKS:
        if t >= t1: pos = b
        elif t > t0:
            dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy)
            u = ((x - a[0]) * dx + (y - a[1]) * dy) / L ** 2
            return math.hypot(x - a[0] - u * dx, y - a[1] - u * dy) + L * max(0, -u, u - 1)
        else: break
    return math.hypot(x - pos[0], y - pos[1])

def w3_state(pg):
    return pg.evaluate("""([views, shoes])=>{
      const v={}; for(const [k,s] of Object.entries(views)){const m=new DOMMatrix(getComputedStyle(document.querySelector(s)).transform); v[k]=Math.abs(m.d)>1e-3}  // hidden = scale(0,0); a flip passes through scale(0,1)
      const sh=[...document.querySelectorAll(shoes)].map(e=>e.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0);
      const c=document.querySelector('.dc').getBoundingClientRect(); const m=new DOMMatrix(getComputedStyle(document.querySelector('.dc')).transform);
      const face=[...document.querySelectorAll('.dface')].map(e=>{const r=e.getBoundingClientRect(); return r.width*r.height});
      return {v, feet:Math.max(...sh.map(r=>r.bottom)), n:sh.length, h:c.height, gx:m.e, gy:m.f, face:Math.max(...face), nface:face.length}}""",
      [W3_VIEWS, W3_SHOES])

def test_walk3d(pg):
    print('walk3d')
    load(pg, 'walk3d'); T = W3_T
    seek(pg, 0.0); a = img(pg); seek(pg, T - 0.001); b = img(pg)
    check(diff_frac(a, b) < 0.0005, 'walk3d loop seam: last frame differs from first frame')
    bad_feet = bad_path = bad_face = bad_view = None; nback = 0
    for i in range(int(round(T / 0.05))):
        t = round(i * 0.05, 3); seek(pg, t); s = w3_state(pg)
        # (a swap instant itself is a 1ms crossfade of keyframes; the swap checks below cover it)
        at_swap = any(abs(t - ts) < 0.001 for ts, _, _ in W3_SWAPS)
        if sum(s['v'].values()) != 1 and not at_swap and bad_view is None: bad_view = (t, s['v'])
        # feet planted: the lowest shoe sits on the character's ground point
        # (a planted front foot is a few px ahead of it during toward/away walks)...
        if abs(s['feet'] - s['gy']) > 7 and bad_feet is None: bad_feet = (t, s['feet'], s['gy'])
        # ...and the ground point follows the intended path
        e = w3_path_err(t, s['gx'], s['gy'])
        if e > 1 and bad_path is None: bad_path = (t, s['gx'], s['gy'], e)
        if s['v']['back']:
            nback += 1
            if s['face'] > 0 and bad_face is None: bad_face = (t, s['face'])
    check(bad_view is None, f'walk3d: exactly one view should show, at t={bad_view and bad_view[0]}s: {bad_view and bad_view[1]}')
    check(bad_feet is None, 'walk3d feet not on the ground at t=%ss (lowest shoe %.1f, ground %.1f)' % (bad_feet or (0, 0, 0)))
    check(bad_path is None, 'walk3d off the path at t=%ss (at %.1f,%.1f, %.1fpx off)' % (bad_path or (0,) * 4))
    check(nback > 20, f'walk3d: back view shown at only {nback} samples')
    check(bad_face is None, 'walk3d: face visible while the back view shows at t=%ss (area %.1f)' % (bad_face or (0, 0)))
    # view swaps don't pop: same height and feet line just before and after the swap
    for ts, v0, v1 in W3_SWAPS:
        seek(pg, ts - 0.002); a = w3_state(pg); seek(pg, ts + 0.002); b = w3_state(pg)
        check(a['v'][v0] and b['v'][v1], f'walk3d: expected {v0} -> {v1} swap at t={ts}s, saw {a["v"]} -> {b["v"]}')
        dh = abs(a['h'] - b['h']) / a['h']; df = abs(a['feet'] - b['feet'])
        check(dh < 0.03 and df < 2, f'walk3d swap pops at t={ts}s (height {dh * 100:.1f}%, feet {df:.1f}px)')
    # depth: bigger after walking toward the camera, back to size after walking away
    seek(pg, 5.1); h0 = w3_state(pg)['h']; seek(pg, 8.0); h1 = w3_state(pg)['h']; seek(pg, 12.0); h2 = w3_state(pg)['h']
    check(h1 / h0 > 1.15 and abs(h2 / h0 - 1) < 0.03, f'walk3d depth scale wrong (heights {h0:.0f}, {h1:.0f}, {h2:.0f})')
    # front view at the neutral stance is symmetric: shoes mirror about the body centre
    for t in (5.1, 8.0):
        seek(pg, t); up = rect(pg, '.dfvup'); l, r = rect(pg, '.dfvshl'), rect(pg, '.dfvshr')
        cx = up['x'] + up['w'] / 2; dl = cx - (l['x'] + l['w'] / 2); dr = (r['x'] + r['w'] / 2) - cx
        check(abs(dl - dr) < 2 and dl > 3, f'walk3d front view not symmetric at t={t}s (shoe offsets {dl:.1f} / {dr:.1f})')
    filter_regions_ok(pg, [i * 0.25 for i in range(int(T / 0.25))])

# ------------------------------------------------------------------ golden frames
GOLD_TIMES = {'walk': [0.5, 4.0, 5.2, 7.0, 12.8, 16.0], 'taxi': [0.2, 0.5], 'factory': [1.0, 4.4, 7.0, 10.0, 12.5, 14.5],
             'walk3d': [0.1, 2.0, 4.6, 6.5, 8.4, 10.6, 12.4, 14.0]}

def golden(pg, names, update):
    for n in names:
        load(pg, n)
        for t in GOLD_TIMES[n]:
            seek(pg, t); im = img(pg); p = os.path.join(GOLD, f'{n}_{t}.png')
            if update:
                im.save(p); continue
            if not os.path.exists(p): print(f'  (no golden for {n} t={t})'); continue
            d = diff_frac(im, Image.open(p).convert('RGB'))
            # Informational: a design change will move pixels. Look at the frame and decide.
            print(f'  golden {n} t={t}: {d * 100:.2f}% pixels differ' + ('  <-- review' if d > 0.02 else ''))

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    names = args or ['walk', 'taxi', 'factory', 'walk3d']
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': W, 'height': H})
        errs = []; pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        if '--update-golden' in sys.argv:
            os.makedirs(GOLD, exist_ok=True); golden(pg, names, True); print('golden frames updated'); return
        for n in names: {'walk': test_walk, 'taxi': test_taxi, 'factory': test_factory, 'walk3d': test_walk3d}[n](pg)
        check(not errs, f'browser errors: {errs[:3]}')
        print('golden frames (informational)'); golden(pg, names, False)
    print(f'\n{PASSES} checks passed, {len(FAILS)} failed')
    sys.exit(1 if FAILS else 0)

if __name__ == '__main__':
    main()
