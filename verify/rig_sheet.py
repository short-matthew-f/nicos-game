"""Screenshot the rig sheet (game/dev/rigsheet.html): every character in every pose the game uses.
usage: python verify/rig_sheet.py [url] [outdir]   (default http://localhost:5173/, run `npm run dev` in game/)
Writes rig0.png, rig1.png, ... (11 characters a page). Look at them: this is a visual check, not a test."""
import os, sys
from playwright.sync_api import sync_playwright
url = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5173/'
out = sys.argv[2] if len(sys.argv) > 2 else '/tmp/rig_sheet'
os.makedirs(out, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 2200, 'height': 1800}); pg.set_default_timeout(120000)   # (a big canvas: slow on a busy machine)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    for i in range(4):
        pg.goto(f'{url}dev/rigsheet.html?page={i}'); pg.wait_for_function('window.__ready', timeout=30000); pg.wait_for_timeout(300)
        pg.screenshot(path=f'{out}/rig{i}.png', full_page=True, animations='disabled'); print(f'{out}/rig{i}.png')
    if errs: print('page errors:', errs); sys.exit(1)
