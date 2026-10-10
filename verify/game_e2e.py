"""End-to-end checks for the game in WebKit with an emulated iPad (touch, landscape).
usage: python verify/game_e2e.py [url]   (default http://localhost:5173/, run `npm run dev` in game/)"""
import sys, math
from playwright.sync_api import sync_playwright
url = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5173/'
ok = bad = 0
def check(c, msg):
    global ok, bad
    if c: ok += 1
    else: bad += 1; print('FAIL', msg)

with sync_playwright() as p:
    b = p.webkit.launch()
    ctx = b.new_context(**p.devices['iPad Pro 11 landscape'])
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url); pg.wait_for_function('window.__game && window.__game.nico', timeout=15000)
    pg.wait_for_timeout(800)
    G = lambda: pg.evaluate('()=>JSON.parse(JSON.stringify(window.__game))')
    g0 = G()
    check(not errs, f'page errors: {errs}')
    check(g0['fps'] > 0, 'fps counter running')
    check(g0['nico']['art'], 'every rig part image loaded')
    W, H = pg.viewport_size['width'], pg.viewport_size['height']
    s = g0['nico']['screen']
    check(abs(s['x'] + s['w'] / 2 - W / 2) < 60, f'Nico centred horizontally by the camera ({s})')
    check(H / 8 < s['h'] < H / 4, f'Nico is about 1/6 of the screen tall ({s["h"]:.0f} of {H})')

    # drag right on the screen: Nico walks right, side view facing right, camera follows
    def drag(dx, dy, ms):
        pg.mouse.move(W * 0.3, H * 0.6); pg.mouse.down(); pg.mouse.move(W * 0.3 + dx, H * 0.6 + dy, steps=4)
        pg.wait_for_timeout(ms); after = G(); pg.mouse.up(); pg.wait_for_timeout(250); return after
    g1 = drag(80, 0, 900)
    check(g1['nico']['x'] - g0['nico']['x'] > 100, f"drag right moves Nico right ({g0['nico']['x']:.0f} -> {g1['nico']['x']:.0f})")
    check(g1['nico']['view'] == 'side' and g1['nico']['face'] == 1, f"faces right while walking right ({g1['nico']})")
    check(g1['nico']['amp'] > 0.8, 'legs are walking')
    s1 = g1['nico']['screen']
    check(abs(s1['x'] + s1['w'] / 2 - W / 2) < 60, f'camera keeps Nico centred ({s1})')
    g2 = drag(0, -80, 700)
    check(g2['nico']['y'] < g1['nico']['y'] - 60 and g2['nico']['view'] == 'back', f"drag up walks away from the camera, back view ({g2['nico']})")
    g3 = drag(0, 80, 700)
    check(g3['nico']['view'] == 'front', f"drag down shows the front view ({g3['nico']['view']})")
    g3b = drag(-80, 0, 600)
    check(g3b['nico']['view'] == 'side' and g3b['nico']['face'] == -1, f"drag left faces left ({g3b['nico']})")
    g4 = G()
    check(g4['nico']['amp'] < 0.2, f"stops walking when the finger lifts (amp {g4['nico']['amp']:.2f})")

    # a finger that slides over the HUD buttons keeps steering (pointer capture), and
    # doesn't press them
    bb = pg.locator('#more').bounding_box()
    pg.mouse.move(W * 0.5, H * 0.5); pg.mouse.down()
    pg.mouse.move(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2, steps=8)
    pg.wait_for_timeout(150); a = G()['nico']; pg.wait_for_timeout(500); z = G()['nico']; pg.mouse.up()
    check(z['x'] > a['x'] + 40 and z['y'] < a['y'] - 20, f"stick keeps steering with the finger over the HUD ({a['x']:.0f},{a['y']:.0f} -> {z['x']:.0f},{z['y']:.0f})")
    check(G()['people'] == 1, 'sliding over a button does not press it')

    # cars stop for Nico: stand in the lane ahead of a car, then step away and it moves on
    # pick a car on a straight (heading near a multiple of 90 degrees)
    ci = next(i for i, c in enumerate(G()['cars']) if min(abs(math.sin(c['heading'])), abs(math.cos(c['heading']))) < 0.05)
    pg.evaluate(f'()=>window.__game.inFrontOf({ci}, 100)')
    pg.wait_for_timeout(1200)
    sp = G()['cars'][ci]['speed']
    check(sp < 5, f'a car stops for Nico standing in its lane (speed {sp:.0f})')
    pg.evaluate('()=>window.__game.place(60, 620)')
    pg.wait_for_timeout(1500)
    check(G()['cars'][ci]['speed'] > 100, 'and drives on once he steps away')
    speeds = [c['speed'] for c in G()['cars']]
    check(all(v >= 0 for v in speeds), 'no car reverses')

    # +10 people
    pg.click('#more'); pg.wait_for_timeout(600)
    check(G()['people'] == 11, f"+10 people adds ten walkers ({G()['people']})")
    pg.click('#fewer'); pg.wait_for_timeout(300)
    check(G()['people'] == 1, 'Clear removes them')
    # driving: walk up to the car, get in, steer with the same stick, get out
    pg.evaluate('()=>window.__game.place(560, 1230)'); pg.wait_for_timeout(250)
    check(G()['action'] == 'car' and pg.locator('#action').inner_text() == 'Get in', 'next to the car: a Get in button')
    pg.click('#action'); pg.wait_for_timeout(200)
    check(G()['mode'] == 'drive', 'tapping it gets in')
    c0 = G()['car']
    pg.mouse.move(W * 0.3, H * 0.6); pg.mouse.down(); pg.mouse.move(W * 0.3 + 80, H * 0.6, steps=4); pg.wait_for_timeout(500)
    mid = G()
    check(mid['car']['speed'] > 150 and mid['car']['x'] > c0['x'] + 40, f"stick right drives right ({c0['x']:.0f} -> {mid['car']['x']:.0f}, speed {mid['car']['speed']:.0f})")
    check(not pg.locator('#action').is_visible(), 'no Get out button while moving fast')
    pg.mouse.move(W * 0.3, H * 0.6 + 80, steps=4); pg.wait_for_timeout(800)
    g = G()
    check(math.sin(g['car']['h']) > 0.7, f"stick down turns the car down ({g['car']['h']:.2f} rad)")
    check(g['zoom'] < g0['zoom'] * 0.9, f"the camera pulls back while driving ({g0['zoom']:.2f} -> {g['zoom']:.2f})")
    pg.mouse.up(); pg.wait_for_timeout(2200)
    g = G()
    check(g['car']['speed'] == 0 and pg.locator('#action').inner_text() == 'Get out', f"released: the car rolls to a stop and offers Get out ({g['car']['speed']:.0f})")
    pg.click('#action'); pg.wait_for_timeout(200); g = G()
    check(g['mode'] == 'walk' and math.hypot(g['nico']['x'] - g['car']['x'], g['nico']['y'] - g['car']['y']) < 120, 'Get out puts Nico beside the car')
    # traffic brakes for Nico's car parked in its lane
    ci = next(i for i, c in enumerate(G()['cars']) if min(abs(math.sin(c['heading'])), abs(math.cos(c['heading']))) < 0.05)
    cc = G()['cars'][ci]
    pg.evaluate(f"()=>window.__game.placeCar({cc['pos'][0] + math.cos(cc['heading']) * 160}, {cc['pos'][1] + math.sin(cc['heading']) * 160}, {cc['heading']})")
    pg.evaluate('()=>window.__game.place(60, 620)'); pg.wait_for_timeout(1500)
    check(G()['cars'][ci]['speed'] < 5, f"a car stops behind Nico's parked car ({G()['cars'][ci]['speed']:.0f})")
    # the save keeps money and where things are across a reload
    pg.evaluate('()=>window.__game.placeCar(560, 1130, 0)'); pg.evaluate('()=>window.__game.place(700, 1250)'); pg.wait_for_timeout(5300)
    pg.reload(); pg.wait_for_function('window.__game && window.__game.nico', timeout=15000); pg.wait_for_timeout(300)
    g = G()
    check(abs(g['nico']['x'] - 700) < 2 and abs(g['nico']['y'] - 1250) < 2 and g['money'] == 20, f"a reload keeps Nico where he was ({g['nico']['x']:.0f},{g['nico']['y']:.0f}, ${g['money']})")
    check(not errs, f'page errors: {errs}')
    pg.screenshot(path='/tmp/game_e2e.png')
print(f'{ok} checks passed, {bad} failed')
sys.exit(1 if bad else 0)
