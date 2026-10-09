"""Cross-browser smoke test: seek each scene in Chromium, Firefox and WebKit and diff the
frames against Chromium. Usage: python verify/browsers.py [outdir]  (writes per-browser sheets)."""
import io, os, sys
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.environ.get('OUT', os.path.join(HERE, '..', 'out'))
DEST = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
TIMES = {'walk': [0.5, 4.0, 7.0, 13.3], 'walk3d': [2.0, 4.6, 6.5, 8.4, 10.6], 'factory': [4.4, 12.5], 'taxi': [0.2]}

def frames(bt, name):
    b = bt.launch(); pg = b.new_page(viewport={'width': 800, 'height': 460})
    pg.set_content(f'<body style="margin:0;background:#E9EEF3">{open(os.path.join(OUT, name + ".svg")).read()}</body>')
    out = []
    for t in TIMES[name]:
        n = pg.evaluate("t=>{const a=document.getAnimations();a.forEach(x=>{x.pause();x.currentTime=t*1000});return a.length}", t)
        pg.wait_for_timeout(80); out.append(Image.open(io.BytesIO(pg.screenshot())).convert('RGB'))
    b.close(); return out, n

with sync_playwright() as p:
    for name in TIMES:
        ref, n0 = frames(p.chromium, name)
        for bn in os.environ.get('BROWSERS', 'firefox,webkit').split(','):
            try: fr, n = frames(getattr(p, bn), name)
            except Exception as e:
                print(f'{name:8s} {bn:8s} could not launch: {str(e).splitlines()[0][:100]}'); continue
            diffs = []
            for a, b in zip(ref, fr):
                d = ImageChops.difference(a, b).convert('L').point(lambda v: 255 if v > 40 else 0)
                diffs.append(d.histogram()[255] / (800 * 460) * 100)
            sheet = Image.new('RGB', (480 * len(fr), 276 * 2), 'white')
            for i, (a, b) in enumerate(zip(ref, fr)):
                sheet.paste(a.resize((480, 276)), (480 * i, 0)); sheet.paste(b.resize((480, 276)), (480 * i, 276))
            sheet.save(os.path.join(DEST, f'xb_{name}_{bn}.png'))
            print(f'{name:8s} {bn:8s} animations {n}/{n0}  pixels differing vs chromium: ' + ', '.join(f't={t}:{d:.2f}%' for t, d in zip(TIMES[name], diffs)))
