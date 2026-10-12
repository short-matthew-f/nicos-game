"""Look at the game in every state: screenshot Nico (and everyone) in each activity, every room and everything
usable in it, every minigame screen, the weather and night, and the townsfolk. A visual check, not a test: it
writes a contact sheet per group to look through (does everything look normal for a sticker world?).

usage: python verify/game_states.py [url] [outdir] [group ...]
  url     default http://localhost:5173/ (run `npm run dev` in game/)
  outdir  default /tmp/game_states
  groups  walk play rooms screens sky folk (default: all). Each state is a full screenshot plus <name>_c.png, a
          crop round Nico; the sheets are sheet_<group>.png.
Same browser as game_e2e.py (WebKit, an emulated iPad). The page reloads between states, so nothing leaks from
one to the next; it starts with everything unlocked and $999."""
import glob, json, os, sys, traceback
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw

url = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5173/'
OUT = (sys.argv[2] if len(sys.argv) > 2 else '/tmp/game_states').rstrip('/') + '/'
GROUPS = sys.argv[3:] or ['walk', 'play', 'rooms', 'screens', 'sky', 'folk', 'orders']
os.makedirs(OUT, exist_ok=True)
UNLOCK_ALL = ['shed', 'workbench', 'shelves', 'bins', 'shop', 'bakery', 'doghouse', 'plant', 'posters', 'bookshelf', 'beanbag', 'tv', 'fishtank', 'cat', 'birdhouse', 'sign', 'metalstar', 'paint']
ROOMS = ['burger', 'icecream', 'potato', 'retro', 'school', 'hospital', 'home', 'garage', 'fire', 'parts', 'toys', 'barn', 'poolhouse', 'cabin',
         'storage', 'nonna', 'woodshop', 'yiayia', 'dojo', 'h1', 'h2', 'h3', 'h5', 'h6', 'h7', 'shed', 'bibs', 'bakery']

def sheet(group, names, tw=300, cols=5):
    ims = []
    for n in names:
        f = OUT + n + ('_c.png' if os.path.exists(OUT + n + '_c.png') else '.png')
        im = Image.open(f).convert('RGB'); im.thumbnail((tw, tw * 10)); ims.append((n, im))
    if not ims: return
    th = max(i.height for _, i in ims) + 14; rows = (len(ims) + cols - 1) // cols
    S = Image.new('RGB', (cols * (tw + 4), rows * th), 'white'); d = ImageDraw.Draw(S)
    for k, (n, im) in enumerate(ims):
        x, y = (k % cols) * (tw + 4), (k // cols) * th; S.paste(im, (x, y + 13)); d.text((x + 2, y), n, fill='black')
    S.save(f'{OUT}sheet_{group}.png'); print(f'{OUT}sheet_{group}.png')

with sync_playwright() as p:
    b = p.webkit.launch(); ctx = b.new_context(**p.devices['iPad Pro 11 landscape']); pg = ctx.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    W, H = pg.viewport_size['width'], pg.viewport_size['height']
    G = lambda: pg.evaluate('()=>JSON.parse(JSON.stringify(window.__game))')
    E = lambda js: pg.evaluate(f'()=>{{{js}}}')
    def load():
        pg.goto(url + ('&' if '?' in url else '?') + 'debug'); pg.wait_for_function('window.__game && window.__game.nico', timeout=30000)
        pg.wait_for_timeout(2000)   # (the background art loads after 1.5 s: let it finish, or the reload interrupts it)
    def boot():
        load(); E('window.__game.setWeather("clear")')
        if G()['mode'] == 'drive':   # (the save remembers driving: start each state on foot)
            E('const k = "nico-city-save", v = JSON.parse(localStorage[k]); v.driving = false; localStorage[k] = JSON.stringify(v)'); load()
    names = {g: [] for g in GROUPS}
    def shot(group, name, crop=True):
        g = G(); n = g['nico']; s = n['screen']
        pg.screenshot(path=f'{OUT}{name}.png')
        if crop and s['w'] > 0:
            cx, cy = s['x'] + s['w'] / 2, s['y'] + s['h'] / 2; x0, y0 = max(0, cx - 260), max(0, cy - 220)
            pg.screenshot(path=f'{OUT}{name}_c.png', clip={'x': x0, 'y': y0, 'width': min(520, W - x0), 'height': min(440, H - y0)})
        names[group].append(name)
        bad = [e for e in errs if 'Loader.load' not in e]; errs.clear()
        print(name, json.dumps({k: g.get(k) for k in ['mode', 'play', 'room', 'inside']} | {'view': n['view'], 'look': g['nicoLook']}), 'ERRORS ' + str(bad) if bad else '', flush=True)
    def go(spot, dx=0, dy=0): s = G()['spots'][spot]; E(f"window.__game.place({s['x'] + dx},{s['y'] + dy})"); pg.wait_for_timeout(250)
    def drag(dx, dy, ms=500): pg.mouse.move(W * 0.5, H * 0.6); pg.mouse.down(); pg.mouse.move(W * 0.5 + dx, H * 0.6 + dy, steps=4); pg.wait_for_timeout(ms)
    def up(): pg.mouse.up(); pg.wait_for_timeout(200)

    load(); E(f'window.__game.setMoney(999); window.__game.setBiz({{unlocked: {json.dumps(UNLOCK_ALL)}, workbench: true}})')
    try:
        if 'walk' in GROUPS:
            boot(); go('home', 700, 230)
            for n, (dx, dy) in {'walk_right': (80, 0), 'walk_left': (-80, 0), 'walk_back': (0, -80), 'walk_front': (0, 80), 'walk_qfront': (60, 60), 'walk_qback': (-60, -60)}.items():
                drag(dx, dy); shot('walk', n); up()
            pg.wait_for_timeout(600); shot('walk', 'idle')
        if 'play' in GROUPS:
            for sp, times in [('slide', [500, 1300, 2000, 2600]), ('swing', [400, 1500]), ('bench0', [700]), ('camera', [700]), ('waterslide', [600, 1500, 2500, 3500]),
                              ('swim', [800]), ('fishing', [800]), ('hide', [800]), ('race', [800]), ('dog', [800]), ('car', [800])]:
                boot(); go(sp); E(f"window.__game.use('{sp}')"); t0 = 0
                for t in times: pg.wait_for_timeout(t - t0); t0 = t; shot('play', f'play_{sp}_{t}')
            boot(); go('swim'); E("window.__game.use('swim')"); pg.wait_for_timeout(500); drag(80, 0, 700); shot('play', 'play_swim_moving'); up()
            # (go to her first: she follows his footsteps from wherever he is when she starts)
            boot(); r = E('return window.__game.rea()'); E(f"window.__game.place({r['x'] + 90},{r['y'] + 20})"); pg.wait_for_timeout(300); E('window.__game.reaCome()'); pg.wait_for_timeout(4000); shot('play', 'play_rea_follow')
            drag(-80, 0, 1500); up(); pg.wait_for_timeout(2500); shot('play', 'play_rea_follow_after')
        if 'rooms' in GROUPS:
            boot(); spots = G()['spots']
            for d in [d for d in ROOMS if d in spots]:
                def enter():
                    boot()
                    if d == 'hospital': E('window.__game.docsHere()'); pg.wait_for_timeout(300)
                    go(d); E(f"window.__game.use('{d}')"); pg.wait_for_timeout(900)
                enter(); g = G()
                if not g['room']: shot('rooms', f'door_{d}'); continue
                shot('rooms', f'room_{d}', crop=False)
                for sid, xy in g['roomSpots'].items():
                    if sid == 'leave': continue
                    enter(); E(f"window.__game.place({xy['x']},{xy['y']})"); pg.wait_for_timeout(300)
                    E('window.__game.act()'); pg.wait_for_timeout(1300)   # (act: whatever he's standing at, as the button would)
                    shot('rooms', f'room_{d}__{sid}')
        if 'screens' in GROUPS:
            for n, js in [('pinball', 'window.__game.pinballOpen()'), ('arcade', 'window.__game.arcadeOpen()'), ('peel', 'window.__game.peelOpen()'), ('fish', 'window.__game.fishOpen()'),
                          ('bob', 'window.__game.bobOpen()'), ('book', 'window.__game.bookOpen()'), ('eyes', 'window.__game.docsHere(); window.__game.eyesOpen()'),
                          ('steady', 'window.__game.steadyOpen(0)'), ('xray', 'window.__game.xrayOpen()')]:
                boot(); E(js); pg.wait_for_timeout(1500); shot('screens', f'screen_{n}', crop=False)
            boot(); m = G()['minimapAt']; pg.mouse.click(m['x'], m['y']); pg.wait_for_timeout(700); shot('screens', 'screen_bigmap', crop=False)
        if 'orders' in GROUPS:   # an order comes in, the list, a delivery at the counter
            boot(); E("window.__game.setBiz({designs: ['car', 'robot'], sold: {car: 1}, stock: {}, orders: {list: [], delivered: 0, nextId: 1}}); window.__game.offerOrder()"); pg.wait_for_timeout(700)
            shot('orders', 'order_new', crop=False)
            E('window.__game.showOrders()'); pg.wait_for_timeout(300); shot('orders', 'order_offer', crop=False)
            pg.click('#place-menu [data-item=take]'); pg.wait_for_timeout(300)
            E("window.__game.offerOrder()"); pg.wait_for_timeout(500); E("window.__game.showOrders()"); pg.wait_for_timeout(300)
            if pg.locator('#place-menu [data-item=take]').count(): pg.click('#place-menu [data-item=take]'); pg.wait_for_timeout(300)
            o = G()['orders']['list'][0]; E(f"window.__game.setStock('{o['what']}', {o['n']})"); pg.wait_for_timeout(300)
            E('window.__game.showOrders()'); pg.wait_for_timeout(300); shot('orders', 'order_list', crop=False); pg.click('#place-close'); pg.wait_for_timeout(200)
            if o['who'] in [t['who'] for t in G()['townsfolk']]:
                t = next(t for t in G()['townsfolk'] if t['who'] == o['who']); E(f"window.__game.place({t['x']},{t['y'] + 40})")
            else:
                go(o['who']); E(f"window.__game.use('{o['who']}')"); pg.wait_for_timeout(900); d = G()['roomSpots']['deliver']; E(f"window.__game.place({d['x']},{d['y']})")
            pg.wait_for_timeout(400); shot('orders', 'order_deliver', crop=False)
            E('window.__game.act()'); pg.wait_for_timeout(500); shot('orders', 'order_done', crop=False)
        if 'sky' in GROUPS:
            for n, js in [('night', 'window.__game.setClock(0.85)'), ('dusk', 'window.__game.setClock(0.6)'), ('rain', 'window.__game.setWeather("rain")'),
                          ('snow', 'window.__game.setSeason("winter"); window.__game.setWeather("snow")'), ('autumn', 'window.__game.setSeason("autumn")')]:
                boot(); go('home', 700, 230); E(js); pg.wait_for_timeout(2500); shot('sky', f'sky_{n}')
        if 'folk' in GROUPS:
            boot(); E('window.__game.homeAll()'); pg.wait_for_timeout(500)
            for t in G()['townsfolk']:
                if t['gone']: continue
                E(f"window.__game.place({t['x'] + 160},{t['y'] + 30})"); pg.wait_for_timeout(500); shot('folk', f"folk_{t['who']}")
            for who, js in [('primo', 'window.__game.friendOut("primo")'), ('yiayia', 'window.__game.yiayiaOut()')]:
                E(js); pg.wait_for_timeout(1500); t = next(q for q in G()['townsfolk'] if q['who'] == who); E(f"window.__game.place({t['x'] + 160},{t['y'] + 30})"); pg.wait_for_timeout(300); shot('folk', f'folk_{who}_out')
            boot(); go('home', 700, 230); pg.click('#more'); pg.wait_for_timeout(2500); shot('folk', 'folk_walkers', crop=False)
            boot(); E('window.__game.fiatGo("bakery")'); pg.wait_for_timeout(2500); f = G()['fiat']; E(f"window.__game.place({f['pos'][0] + 150},{f['pos'][1] + 60})"); pg.wait_for_timeout(500); shot('folk', 'folk_fiat')
    except Exception:
        traceback.print_exc(); pg.screenshot(path=f'{OUT}CRASH.png'); print(f'{OUT}CRASH.png')
    for g in GROUPS: sheet(g, names[g])
