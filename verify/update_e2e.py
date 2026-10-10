"""Update pop-up: a newer version.json shows the pop-up, Restart reloads into it once.
usage: python verify/update_e2e.py [url]   (default http://localhost:4173/, `npm run build && npm run preview`)"""
import sys
from playwright.sync_api import sync_playwright
url = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4173/'
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
    pg.goto(url + ('&' if '?' in url else '?') + 'debug'); pg.wait_for_function('window.__game && window.__game.nico', timeout=15000)
    build = pg.evaluate('()=>window.__game.build')
    pop = pg.locator('#update')
    check(pg.evaluate('()=>window.__game.checkUpdate()') == 'current', 'same build: no update')
    check(not pop.is_visible(), 'no pop-up when up to date')
    check(pg.locator('#toast').inner_text() != '', 'a manual check says it is up to date')

    # publish a "new" build
    pg.route('**/version.json*', lambda r: r.fulfill(status=200, content_type='application/json', body='{"id":"newer"}'))
    check(pg.evaluate('()=>window.__game.checkUpdate()') == 'ready', 'new build detected and downloaded')
    check(pop.is_visible(), 'pop-up shown')
    pg.click('#update-later')
    check(not pop.is_visible(), 'Later closes it')
    pg.evaluate('()=>window.__game.checkUpdate()')
    check(pop.is_visible(), 'it comes back on the next check')
    pg.evaluate('()=>{window.__marker = 1}')
    with pg.expect_navigation():
        pg.click('#update-restart')
    pg.wait_for_function('window.__game && window.__game.nico', timeout=15000)
    check(pg.evaluate('()=>window.__marker') is None, 'Restart reloaded the page')
    check('v=' not in pg.url, f'the ?v= is tidied from the address ({pg.url})')
    check('debug' in pg.url and pg.locator('#more').is_visible(), f'other settings in the address (?debug) survive the restart ({pg.url})')
    # the page served is still the old build (version.json is faked): don't nag in a loop
    pg.wait_for_timeout(3800)
    check(not pop.is_visible(), 'no re-prompt for the build it just restarted into')
    check(not errs, f'page errors: {errs}')
    b.close()
print(f'{ok} checks passed, {bad} failed'); sys.exit(1 if bad else 0)
