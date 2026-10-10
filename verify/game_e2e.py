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
    pg.goto(url + ('&' if '?' in url else '?') + 'debug'); pg.wait_for_function('window.__game && window.__game.nico', timeout=15000)   # ?debug: the stress-test buttons
    pg.wait_for_timeout(800)
    G = lambda: pg.evaluate('()=>JSON.parse(JSON.stringify(window.__game))')
    # place Nico relative to a named spot (doors, car, slide...), so map changes don't break checks
    def at(spot, dx=0, dy=0):
        p = G()['spots'][spot]; x, y = p['x'] + dx, p['y'] + dy
        pg.evaluate(f'()=>window.__game.place({x}, {y})'); return x, y
    away = lambda: at('home')   # somewhere well off the roads
    CARLEN = 112
    at('home', 700, 230); pg.wait_for_timeout(300)   # open ground, away from the world's edge
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
    # diagonals: the 3/4 views, flipped for the left
    for (dx, dy), want in [((60, 60), ('qfront', 1)), ((-60, 60), ('qfront', -1)), ((60, -60), ('qback', 1)), ((-60, -60), ('qback', -1))]:
        gd = drag(dx, dy, 400)
        check((gd['nico']['view'], gd['nico']['face']) == want, f"drag ({dx},{dy}) faces {want} ({gd['nico']['view']}, {gd['nico']['face']})")
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
    away()
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
    at('car', 0, 100); pg.wait_for_timeout(250)
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
    pg.evaluate(f"()=>window.__game.placeCar({cc['pos'][0] + math.cos(cc['heading']) * CARLEN * 1.4}, {cc['pos'][1] + math.sin(cc['heading']) * CARLEN * 1.4}, {cc['heading']})")
    away(); pg.wait_for_timeout(1500)
    check(G()['cars'][ci]['speed'] < 5, f"a car stops behind Nico's parked car ({G()['cars'][ci]['speed']:.0f})")
    # the save keeps money and where things are across a reload
    pg.evaluate('()=>{const p=window.__game.parked; window.__game.placeCar(p.x, p.y, p.h)}'); hx, hy = at('home', 30, 10); pg.wait_for_timeout(5300)
    pg.reload(); pg.wait_for_function('window.__game && window.__game.nico', timeout=15000); pg.wait_for_timeout(300)
    g = G()
    check(abs(g['nico']['x'] - hx) < 2 and abs(g['nico']['y'] - hy) < 2 and g['money'] == 20, f"a reload keeps Nico where he was ({g['nico']['x']:.0f},{g['nico']['y']:.0f}, ${g['money']})")
    # Burger Barn: the door offers lunch; buying costs money and makes Nico speedy
    at('burger'); pg.wait_for_timeout(250)
    check(G()['action'] == 'burger' and pg.locator('#action').inner_text() == 'Order lunch', 'Burger Barn door: Order lunch')
    pg.click('#action'); pg.wait_for_timeout(200)
    check(pg.locator('#place').is_visible() and pg.locator('#place-title').inner_text() == 'Burger Barn', 'the menu opens')
    x0 = G()['nico']['x']; pg.keyboard.down('d'); pg.wait_for_timeout(400); pg.keyboard.up('d')
    check(abs(G()['nico']['x'] - x0) < 1, 'Nico stays put while the menu is open')
    pg.click('#place-menu button[data-item="fries"]'); pg.wait_for_timeout(200); g = G()
    check(g['money'] == 17 and g['boost'] > 30 and not pg.locator('#place').is_visible(), f"fries cost $3 and give a boost (${g['money']}, {g['boost']:.0f}s)")
    check(pg.locator('#money').inner_text() == '$17' and pg.locator('#boost').is_visible(), 'the HUD shows the new money and the boost')
    at('burger', 0, 140); pg.wait_for_timeout(100)   # (below the patio tables)
    x0 = G()['nico']['x']; pg.keyboard.down('a'); pg.wait_for_timeout(1000); pg.keyboard.up('a'); fast = x0 - G()['nico']['x']
    check(fast > 240 * 1.2, f"boosted walking is faster ({fast:.0f} px in 1 s)")
    pg.evaluate('()=>window.__game.setMoney(2)'); at('burger'); pg.wait_for_timeout(250)
    pg.click('#action'); pg.wait_for_timeout(200)
    check(pg.locator('#place-menu button[data-item="burger"]').is_disabled(), "can't buy a $5 burger with $2")
    pg.click('#place-close'); pg.wait_for_timeout(150)
    check(not pg.locator('#place').is_visible() and G()['money'] == 2, 'Leave closes it, money unchanged')
    pg.click('#action'); pg.wait_for_timeout(150); pg.mouse.click(12, H - 12); pg.wait_for_timeout(150)
    check(not pg.locator('#place').is_visible(), 'a tap outside the card closes it too (never stuck inside)')
    at('school'); pg.wait_for_timeout(250)
    check(G()['action'] == 'school', 'the school door has something to say too')
    # playground: slide all the way down, and swing until the stick says stop
    sx, sy = at('slide'); pg.wait_for_timeout(250)
    check(G()['action'] == 'slide', 'next to the slide: Slide!')
    pg.click('#action'); pg.wait_for_timeout(1700); g = G()
    check(g['play'] == 'slide' and g['nico']['y'] < sy - 110, f"climbs the slide ({g['nico']['y']:.0f})")
    pg.wait_for_timeout(1500); g = G()
    check(g['mode'] == 'walk' and g['nico']['x'] > sx + 180, f"slides down and lands at the bottom ({g['nico']['x']:.0f})")
    at('swing'); pg.wait_for_timeout(250)
    pg.click('#action'); pg.wait_for_timeout(300)
    ys = []
    for _ in range(12): pg.wait_for_timeout(200); ys.append(G()['nico']['y'])
    check(G()['play'] == 'swing' and max(ys) - min(ys) > 25, f"swinging moves back and forth ({min(ys):.0f}..{max(ys):.0f})")
    check(pg.locator('#action').inner_text() == 'Hop off', 'Hop off is offered')
    drag(80, 0, 400)
    check(G()['mode'] == 'walk', 'pushing the stick hops off the swing')
    # the fire truck: on the alarm it leaves the station, laps the ring road and comes home
    at('fire', 0, 300)
    check(not G()['truck']['out'], 'the fire truck waits in the station at first')
    pg.evaluate('()=>window.__game.alarm()'); pg.wait_for_timeout(1800); g = G()
    check(g['truck']['out'] and g['truck']['speed'] > 100 and g['truck']['pos'][1] > G()['spots']['fire']['y'] - 20, f"on the alarm it drives out of the station ({g['truck']})")
    check('Fire at the' in pg.locator('#toast').inner_text() and G()['fire'], f"a building is on fire and a toast says where ({G()['fire']})")
    try:
        pg.wait_for_function('window.__game.truck.spraying > 1', timeout=45000); sprayed = True
    except Exception: sprayed = False
    check(sprayed and G()['truck']['speed'] == 0, 'the truck stops at the fire and sprays it')
    try:
        pg.wait_for_function('!window.__game.truck.out', timeout=60000); back = True
    except Exception: back = False
    check(back, f"it puts out the fire, finishes its lap and goes home within a minute ({G()['truck']})")
    # James and Primo walk their routines; walk up to say hi; Primo's swing is taken
    t0 = {t['who']: t for t in G()['townsfolk']}
    check({'james', 'primo'} <= set(t0) and len(t0) >= 8 and all(t['art'] for t in t0.values()), f"James, Primo and the townspeople are in town with their own art ({list(t0)})")
    moved = 0   # (he may be stopped in at Burger Barn for a few seconds)
    for _ in range(16):
        pg.wait_for_timeout(500); t1 = {t['who']: t for t in G()['townsfolk']}
        moved = max(moved, math.hypot(t1['james']['x'] - t0['james']['x'], t1['james']['y'] - t0['james']['y']))
        if moved > 50: break
    check(moved > 50, f'James is walking his route ({moved:.0f} px)')
    jx, jy = t1['james']['x'], t1['james']['y']
    pg.evaluate(f'()=>window.__game.place({jx + 40}, {jy + 10})'); pg.wait_for_timeout(150)
    check(G()['action'] == 'james' and 'James' in pg.locator('#action').inner_text(), 'next to James: Say hi')
    pg.click('#action'); pg.wait_for_timeout(150)
    check(pg.locator('#toast').inner_text().startswith('James:'), f"James says something ({pg.locator('#toast').inner_text()})")
    try:
        pg.wait_for_function("window.__game.townsfolk.find(t => t.who === 'primo').swinging", timeout=60000); sw = True
    except Exception: sw = False
    check(sw, 'Primo gets on a swing')
    if sw:
        at('swing'); pg.wait_for_timeout(200)
        pg.evaluate('()=>window.__game.act()'); pg.wait_for_timeout(1200)
        g = G(); p = next(t for t in g['townsfolk'] if t['who'] == 'primo')
        check(g['play'] == 'swing' and abs(g['nico']['x'] - p['x']) > 50, f"Nico takes the other swing, next to Primo ({g['nico']['x']:.0f} vs {p['x']:.0f})")
        drag(80, 0, 300)
    # soccer: walk into the ball to kick it; put it past a goal line between the posts to score
    b0 = G()['ball']
    pg.evaluate(f"()=>window.__game.place({b0['x'] - 120}, {b0['y']})"); pg.wait_for_timeout(150)
    pg.keyboard.down('d'); pg.wait_for_timeout(700); pg.keyboard.up('d'); pg.wait_for_timeout(200)
    b1 = G()['ball']
    check(b1['x'] > b0['x'] + 60 and b1['vx'] > 0, f"walking into the ball kicks it ({b0['x']:.0f} -> {b1['x']:.0f})")
    gr = G()['spots']   # (goals aren't spots; use the field's right goal from the ball's row)
    pg.evaluate("()=>window.__game.placeBall(window.__game.ball.x + 600, window.__game.ball.y)")
    pg.evaluate("()=>{const b=window.__game.ball; window.__game.place(b.x - 40, b.y)}"); pg.wait_for_timeout(100)
    pg.keyboard.down('d'); pg.wait_for_timeout(1500); pg.keyboard.up('d')
    try:
        pg.wait_for_function("window.__game.score.left + window.__game.score.right > 0", timeout=6000); scored = True
    except Exception: scored = False
    check(scored and 'GOAL' in pg.locator('#toast').inner_text(), f"dribbling it into the goal scores ({G()['score']})")
    # benches: sit down, the stick stands you back up
    bench = next(k for k in G()['spots'] if k.startswith('bench'))
    at(bench); pg.wait_for_timeout(200)
    check(G()['action'] == bench and pg.locator('#action').inner_text() == 'Sit', 'next to a bench: Sit')
    pg.click('#action'); pg.wait_for_timeout(500)
    check(G()['play'] == 'bench' and pg.locator('#action').inner_text() == 'Stand up', 'sitting on the bench, Stand up offered')
    drag(0, 80, 300)
    check(G()['mode'] == 'walk', 'the stick stands him up')
    # odd jobs: Mr. Brooks has a "!" job; take it, do the steps, get paid
    def near(who):
        t = next(x for x in G()['townsfolk'] if x['who'] == who)
        pg.evaluate(f"()=>window.__game.place({t['x'] + 40}, {t['y'] + 10})"); pg.wait_for_timeout(150)
    m0 = G()['money']
    near('mrbrooks')
    check('❗' in pg.locator('#action').inner_text(), f"Mr. Brooks has a job (❗) ({pg.locator('#action').inner_text()})")
    pg.click('#action'); pg.wait_for_timeout(150)
    pg.click('#place-menu button[data-item="accept"]'); pg.wait_for_timeout(150)
    check(G()['job'] and G()['job']['id'] == 'package' and pg.locator('#job').is_visible(), 'taking the job shows it in the top bar')
    who_at = lambda who: next((t['x'], t['y']) for t in G()['townsfolk'] if t['who'] == who)
    b0 = who_at('mrbrooks'); pg.wait_for_timeout(1500)
    check(math.dist(b0, who_at('mrbrooks')) < 3, f"whoever gave Nico a job waits while he's close ({b0} -> {who_at('mrbrooks')})")
    for _ in range(2):
        jb = G()['job']; pg.evaluate(f"()=>window.__game.place({jb['at'][0]}, {jb['at'][1]})"); pg.wait_for_timeout(150)
        check(G()['action'] == 'job', f"at the job's next place, its step is offered ({pg.locator('#action').inner_text()})")
        pg.click('#action'); pg.wait_for_timeout(150)
    near('mrbrooks'); b0 = who_at('mrbrooks'); pg.wait_for_timeout(1200)
    check(math.dist(b0, who_at('mrbrooks')) < 3, 'and waits to be told the job is done')
    check(pg.locator('#action').inner_text().startswith('Finish job'), 'back to Mr. Brooks: Finish job')
    pg.click('#action'); pg.wait_for_timeout(150)
    check(G()['money'] == m0 + 6 and G()['job'] is None and not pg.locator('#job').is_visible(), f"paid $6 and the job is done ({m0} -> {G()['money']})")
    near('mrbrooks')
    check('❗' not in pg.locator('#action').inner_text(), 'no new job from him straight away')
    # Ava's soccer ball: she walks over to the field and waits there; kick the ball to her
    m0 = G()['money']; near('ava')
    pg.click('#action'); pg.wait_for_timeout(150)
    pg.click('#place-menu button[data-item="accept"]'); pg.wait_for_timeout(150)
    away()
    pg.wait_for_function("()=>{const a=window.__game.townsfolk.find(t=>t.who==='ava'); return a.y > 3100 && a.x > 1549.5}", timeout=30000)
    a0 = who_at('ava'); pg.wait_for_timeout(1000)
    check(math.dist(a0, who_at('ava')) < 3, f"Ava waits at the field ({a0})")
    pg.evaluate(f"()=>window.__game.placeBall({a0[0] + 120}, {a0[1] + 20})"); pg.wait_for_timeout(300)
    check(G()['money'] == m0 + 4 and G()['job'] is None, f"ball kicked to Ava: paid $4 ({m0} -> {G()['money']})")
    pg.wait_for_timeout(3000)
    check(who_at('ava')[1] < a0[1] - 50 or who_at('ava')[0] < a0[0] - 50, f"then she heads back to her walk ({who_at('ava')})")
    # a car driving into the ball pushes it off to the side, instead of hiding it underneath
    for _try in range(3):   # (a car can be held up at a corner: give it a few goes)
        c = max(G()['cars'], key=lambda c: c['speed']); h = c['heading']; fx, fy = math.cos(h), math.sin(h)
        bx, by = c['pos'][0] + fx * 260, c['pos'][1] + fy * 260
        pg.evaluate(f"()=>window.__game.placeBall({bx}, {by})")
        pg.wait_for_timeout(2500)
        bb = G()['ball']; side = abs(-(bb['x'] - bx) * fy + (bb['y'] - by) * fx)
        if side > 80: break
    check(side > 80, f"traffic nudges the ball off its lane ({side:.0f} px sideways)")
    # hidden coins: walk over one for $1; it's gone until it respawns
    c0, m0 = G()['coins'], G()['money']
    pg.evaluate('()=>window.__game.place(1520, 700)'); pg.wait_for_timeout(250)
    check(G()['money'] == m0 + 1 and G()['coins'] == c0 - 1, f"walking over a coin picks it up (+$1) ({m0} -> {G()['money']})")
    pg.evaluate('()=>window.__game.place(1700, 600)'); pg.evaluate('()=>window.__game.place(1520, 700)'); pg.wait_for_timeout(250)
    check(G()['money'] == m0 + 1, 'the same coin can\'t be picked up twice')
    check(pg.locator('#mute').is_visible(), 'there is a sound on/off button')
    # pigeons: traffic and townsfolk scatter flocks all over town; only ones near Nico flap out loud
    pg.mouse.click(W * 0.5, H * 0.95)   # (a tap starts the audio)
    away(); s0 = G(); pg.wait_for_timeout(8000); s1 = G()
    check(s1['scatters'] > s0['scatters'] and s1['sounds'].get('flap', 0) == s0['sounds'].get('flap', 0),
          f"far-off flocks scatter silently ({s1['scatters'] - s0['scatters']} take-offs, {s1['sounds'].get('flap', 0) - s0['sounds'].get('flap', 0)} flaps heard)")
    f0 = G()['sounds'].get('flap', 0)
    pg.evaluate('()=>window.__game.place(1700, 1700)'); pg.wait_for_timeout(100)
    pg.evaluate('()=>window.__game.place(1700, 1820)'); pg.wait_for_timeout(300)   # walk right up to the flock at (1700, 1830)
    check(G()['sounds'].get('flap', 0) > f0, 'a flock Nico scares flaps out loud')
    # the big map: tap the minimap to open it (it doesn't move Nico), tap again to close
    mm = G()['minimapAt']; x0 = G()['nico']['x']
    pg.mouse.click(mm['x'], mm['y']); pg.wait_for_timeout(300)
    check(G()['bigMap'] and abs(G()['nico']['x'] - x0) < 1, 'tapping the minimap opens the big map without moving Nico')
    pg.mouse.click(W * 0.6, H * 0.5); pg.wait_for_timeout(200)
    check(not G()['bigMap'], 'a tap closes it')
    # ---- v2: the business loop, start to finish
    pg.evaluate("()=>{window.__game.setBiz({items:{}, finds:[], workbench:false, designs:[], stock:{}, sold:{}, flips:0, skills:[], seed:1}); window.__game.setMoney(20)}")
    pg.wait_for_timeout(200)
    check(pg.locator('#goal').is_visible() and 'storage' in pg.locator('#goal').inner_text(), f"the goal chip points to the storage units ({pg.locator('#goal').inner_text()})")
    def door(spot):
        at(spot); pg.wait_for_timeout(150); pg.click('#action'); pg.wait_for_timeout(250)
    door('storage'); pg.click('[data-item=auction]'); pg.wait_for_timeout(300)
    check(G()['work']['screen'] == 'auction' and pg.locator('#work .lot').count() == 1, 'the first auction has just the starter unit (no losing first buy)')
    pg.click('[data-buy=A]'); pg.wait_for_timeout(150)
    check(G()['money'] == 20 and G()['work']['screen'] == 'auction', 'one tap on Buy only asks (money is safe from a mis-tap)')
    pg.click('[data-buy=A]'); pg.wait_for_timeout(300)
    gb = G()
    check(gb['work']['screen'] == 'unit' and gb['money'] == 10 and gb['biz']['flips'] == 1 and gb['biz']['items'].get('wheel') == 4, f"a second tap buys it: -$10, and everything inside is already Nico's ({gb['money']}, {gb['biz']})")
    pg.wait_for_timeout(700); pg.click('#work .actions button'); pg.wait_for_timeout(1500)
    check(pg.locator('#work .find.open').count() == 6, 'Open them all reveals every box')
    pg.click('#work .actions button.primary'); pg.wait_for_timeout(300)
    gb = G()
    check(gb['money'] == 21 and gb['biz']['finds'] == [] and gb['biz']['items'].get('wheel') == 4 and gb['work']['screen'] is None, f"sold the finds, kept the wheels: a profit on the first unit ({gb['money']}, {gb['biz']})")
    pg.evaluate("()=>window.__game.setMoney(40)")
    door('parts'); pg.click('[data-item=workbench]'); pg.wait_for_timeout(250)
    check(G()['biz']['workbench'] and G()['money'] == 15 and G()['inside'] == 'parts', 'bought a workbench ($25); the shop stays open for more')
    pg.click('[data-item="kit:car"]'); pg.wait_for_timeout(250)
    gb = G()
    check(gb['money'] == 4 and gb['biz']['items'] == {'wheel': 4, 'axle': 2, 'body': 1}, f"the car kit fills in just the missing parts ({gb['money']}, {gb['biz']['items']})")
    pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
    check('workbench' in pg.locator('#goal').inner_text(), f"the goal now: build it at the workbench ({pg.locator('#goal').inner_text()})")
    def center(sel):
        bb = pg.locator(sel).first.bounding_box(); return bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2
    def place_part(part, slot):
        x0, y0 = center(f'#work g.part[data-part={part}]:not(.placed)'); x1, y1 = center(f'#work g.slot[data-slot={slot}]')
        pg.mouse.move(x0, y0); pg.mouse.down(); pg.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, steps=5)
        pg.mouse.move(x1, y1 + 40, steps=5); pg.mouse.up(); pg.wait_for_timeout(200)
    door('garage'); pg.click('[data-item="build:car"]'); pg.wait_for_timeout(300)
    place_part('axle', 'axle0')
    check(G()['work']['filled'] == ['axle0'], 'dragging an axle onto its spot snaps it in')
    pg.click('#work .close'); pg.wait_for_timeout(200)
    check(G()['work']['screen'] is None and G()['biz']['items'] == {'wheel': 4, 'axle': 2, 'body': 1}, 'leaving halfway through a build uses up nothing')
    door('garage'); pg.click('[data-item="build:car"]'); pg.wait_for_timeout(300)
    place_part('wheel', 'wheel0')
    check(G()['work']['filled'] == [] and 'axle' in pg.locator('#work .sub').inner_text(), 'a wheel before its axle slides back, and says why')
    for part, slot in [('axle', 'axle0'), ('axle', 'axle1'), ('wheel', 'wheel0'), ('wheel', 'wheel1'), ('wheel', 'wheel2'), ('wheel', 'wheel3'), ('body', 'body')]:
        place_part(part, slot)
    check(len(G()['work']['filled']) == 7 and pg.locator('#work .actions button.primary').is_enabled(), f"every part on: the ramp test unlocks ({G()['work']['filled']})")
    pg.click('#work .actions button.primary'); pg.wait_for_timeout(300)
    pg.click('[data-height="1"]'); pg.click('[data-go]'); pg.wait_for_timeout(2300)
    check(G()['work']['lastRun'] == {'height': 1, 'passed': False} and not G()['biz']['stock'].get('car') and pg.locator('[data-go]').is_enabled(), 'the low ramp falls short: nothing lost, try again')
    pg.click('[data-height="2"]'); pg.click('[data-go]'); pg.wait_for_timeout(2300)
    check(G()['work']['lastRun'] == {'height': 2, 'passed': True}, 'a higher ramp: it rolls past the flag')
    pg.click('#work .actions button.primary'); pg.wait_for_timeout(300)
    gb = G()['biz']
    check(gb['designs'] == ['car'] and gb['stock'] == {'car': 1} and gb['items'] == {}, f"the design is done, one toy car made, parts used ({gb})")
    door('toys'); m0 = G()['money']; pg.click('[data-item="sell:car"]'); pg.wait_for_timeout(300)
    gb = G()
    check(gb['money'] == m0 + 40 and gb['biz']['sold'] == {'car': 1} and gb['biz']['stock'] == {'car': 0}, f"the Toy Shop buys the first car for $40 ({m0} -> {gb['money']})")
    pg.evaluate("()=>window.__game.setBiz({items:{wheel:4, axle:2, body:1}})")
    door('garage'); pg.click('[data-item="quick:car"]'); pg.wait_for_timeout(300)
    for _ in range(3): pg.click('#work [data-step]'); pg.wait_for_timeout(250)
    gb = G()['biz']
    check(gb['stock'] == {'car': 1} and gb['items'] == {}, f"repeat builds are three taps ({gb})")
    pg.click('#work [data-step]'); pg.wait_for_timeout(200)
    check(G()['work']['screen'] is None, 'Done closes it')
    # the next idea: a toy robot, tested by programming it to walk to a star
    check('robot' in pg.locator('#goal').inner_text(), f"selling the car brings a new idea: the robot ({pg.locator('#goal').inner_text()})")
    pg.evaluate("()=>window.__game.setBiz({items:{tin:1, gear:2, battery:1, bulb:1}})")
    door('garage'); pg.click('[data-item="build:robot"]'); pg.wait_for_timeout(300)
    place_part('bulb', 'bulb')
    check(G()['work']['filled'] == [] and 'battery' in pg.locator('#work .sub').inner_text(), f"the bulb before the battery slides back, and says why ({pg.locator('#work .sub').inner_text()})")
    for part, slot in [('tin', 'tin'), ('gear', 'gear0'), ('gear', 'gear1'), ('battery', 'battery'), ('bulb', 'bulb')]:
        place_part(part, slot)
    check(len(G()['work']['filled']) == 5, f"the robot goes together ({G()['work']['filled']})")
    pg.click('#work .actions button.primary'); pg.wait_for_timeout(300)
    check(G()['work']['screen'] == 'program', 'its test: the program screen')
    for m in 'RR': pg.click(f'[data-move={m}]')
    pg.click('[data-go]'); pg.wait_for_timeout(1500)
    check(G()['work']['lastRun']['passed'] is False and 'Bonk' in pg.locator('#work .sub').inner_text() and not G()['biz']['stock'].get('robot'), 'a program that walks into a box: bonk, nothing lost')
    for _ in range(2): pg.click('[data-move=back]')
    for m in 'UURRRDRRUU': pg.click(f'[data-move={m}]')
    pg.click('[data-go]'); pg.wait_for_timeout(4600)
    check(G()['work']['lastRun']['passed'] is True and G()['work']['lastRun']['moves'] == 'UURRRDRRUU', f"a good program reaches the star ({G()['work']['lastRun']})")
    pg.click('#work .actions button.primary'); pg.wait_for_timeout(300)
    gb = G()['biz']
    check('robot' in gb['designs'] and gb['stock'].get('robot') == 1 and not any(gb['items'].get(k) for k in ('tin', 'gear', 'battery', 'bulb')), f"robot designed, one made, parts used ({gb})")
    door('toys'); m0 = G()['money']; pg.click('[data-item="sell:robot"]'); pg.wait_for_timeout(300)
    check(G()['money'] == m0 + 55 and G()['biz']['sold'].get('robot') == 1, f"the Toy Shop buys the first robot for $55 ({m0} -> {G()['money']})")
    check(not pg.locator('#goal').is_visible(), 'every idea made and sold: the goal chip steps aside')
    # the Appraiser skill: earned on the third unit
    pg.evaluate("()=>{window.__game.setBiz({flips:2}); window.__game.setMoney(200)}")
    door('storage'); pg.click('[data-item=auction]'); pg.wait_for_timeout(300)
    check(pg.locator('#work .lot').count() == 3, 'after the first, three units to choose from')
    pg.click('[data-buy=B]'); pg.click('[data-buy=B]'); pg.wait_for_timeout(900)
    pg.click('#work .actions button'); pg.wait_for_timeout(2600); pg.click('#work .actions button.primary'); pg.wait_for_timeout(300)
    check('appraiser' in G()['biz']['skills'] and 'Appraiser' in pg.locator('#place-title').inner_text(), 'the third unit earns the Appraiser skill (with a card saying so)')
    pg.keyboard.press('Escape')
    # item requests: someone asks for a thing; the storage units are sure to have one; keep it, hand it over
    pg.evaluate("()=>{window.__game.setBiz({finds: []}); window.__game.offerWant('maya', 'radio')}"); pg.wait_for_timeout(200)
    near('maya')
    check('❗' in pg.locator('#action').inner_text(), f"Maya has a request (❗) ({pg.locator('#action').inner_text()})")
    pg.click('#action'); pg.wait_for_timeout(150)
    check('radio' in pg.locator('#place-text').inner_text(), f"she asks for a radio ({pg.locator('#place-text').inner_text()})")
    pg.click('#place-menu button[data-item="accept"]'); pg.wait_for_timeout(200)
    check(G()['job']['id'] == 'want:maya:radio' and 'Radio' in pg.locator('#job').inner_text(), f"the job chip says what to find ({pg.locator('#job').inner_text()})")
    sd = G()['spots']['storage']
    check(math.dist(G()['job']['at'], (sd['x'], sd['y'])) < 5, 'the minimap star points at the storage units')
    m0 = G()['money']; near('maya'); pg.click('#action'); pg.wait_for_timeout(150)
    check(G()['money'] == m0 and G()['job'] is not None, 'no radio yet: she asks how it is going, no pay')
    door('storage'); pg.click('[data-item=auction]'); pg.wait_for_timeout(300)
    lot = pg.locator('#work .lot[data-wanted="1"]')
    check(lot.count() >= 1 and '📻' in lot.first.inner_text(), 'a unit with a radio shows it through the door, tagged')
    pg.locator('#work .lot[data-wanted="1"] button').first.click(); pg.locator('#work .lot[data-wanted="1"] button').first.click(); pg.wait_for_timeout(900)
    pg.click('#work .actions button'); pg.wait_for_timeout(2800)
    tile = pg.locator('#work .find[data-id=radio]')
    found = tile.count() > 0
    check(found and 'wanted' in tile.first.inner_text() and 'keep' in tile.first.get_attribute('class'), f"the wanted radio is set to Keep, marked wanted ({tile.first.inner_text() if found else '-'})")
    pg.click('#work .actions button.primary'); pg.wait_for_timeout(300)
    check(found and any(f['id'] == 'radio' for f in G()['biz']['finds']), 'a radio turned up and is on the shelf')
    check('bring' in pg.locator('#job').inner_text(), f"the chip now says to bring it ({pg.locator('#job').inner_text()})")
    # it's all saved, including the job in progress
    pg.evaluate("()=>window.dispatchEvent(new Event('pagehide'))")
    pg.reload(); pg.wait_for_function('window.__game && window.__game.biz', timeout=15000); pg.wait_for_timeout(500)
    gb = G()['biz']
    check(gb['sold'] == {'car': 1, 'robot': 1} and gb['designs'] == ['car', 'robot'] and gb['stock'] == {'car': 1} and 'appraiser' in gb['skills'], f"the business survives a reload ({gb})")
    check(G()['job'] and G()['job']['id'] == 'want:maya:radio', f"and so does the job in progress ({G()['job']})")
    m0 = G()['money']; near('maya')
    check(pg.locator('#action').inner_text().startswith('Finish job'), 'back to Maya with the radio: Finish job')
    pg.click('#action'); pg.wait_for_timeout(200)
    gb = G()
    check(gb['money'] > m0 + 9 and gb['job'] is None and not any(f['id'] == 'radio' for f in gb['biz']['finds']), f"handed over: the radio's gone, paid more than it sells for ({m0} -> {gb['money']})")
    # lite mode (what a slow device switches to by itself): still runs, outlines kept
    pg.evaluate('()=>window.__game.goLow()'); pg.wait_for_timeout(800)
    check(G()['low'] and G()['fps'] > 0 and '(lite)' in pg.locator('#fps').inner_text(), 'lite mode runs and says so on the fps counter')
    check(not errs, f'page errors: {errs}')
    pg.screenshot(path='/tmp/game_e2e.png')
print(f'{ok} checks passed, {bad} failed')
sys.exit(1 if bad else 0)
