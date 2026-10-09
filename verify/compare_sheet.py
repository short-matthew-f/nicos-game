"""reference/blender_vs_2d.png: same moments, 2D SVG (left) vs Blender (right)."""
import io, os
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ROWS = [('walk, side', 'walk', 10.5, 'walk_side/f0004.png'),
        ('walk toward camera', 'walk3d', 6.5, 'walk_front/f0004.png'),
        ('walk away', 'walk3d', 10.6, 'walk_back/f0004.png'),
        ('put-down, side', 'walk', 4.0, 'putdown_side/f0017.png')]
SC = 0.6; W, H = int(800 * SC), int(460 * SC)
sheet = Image.new('RGB', (W * 2, (H + 24) * len(ROWS) + 24), 'white'); d = ImageDraw.Draw(sheet)
d.text((W // 2 - 30, 6), '2D SVG', fill='#2B3F55'); d.text((W + W // 2 - 30, 6), 'Blender', fill='#2B3F55')
with sync_playwright() as p:
    pg = p.chromium.launch().new_page(viewport={'width': 800, 'height': 460})
    for i, (label, scene, t, bl) in enumerate(ROWS):
        pg.set_content(f'<body style="margin:0">{open(os.path.join(R, "out", scene + ".svg")).read()}</body>')
        pg.evaluate("t=>document.getAnimations().forEach(a=>{a.pause();a.currentTime=t*1000})", t); pg.wait_for_timeout(60)
        a = Image.open(io.BytesIO(pg.screenshot())).convert('RGB')
        b = Image.new('RGBA', (800, 460), '#E9EEF3'); fr = Image.open(os.path.join(R, 'out', 'blender', bl)).convert('RGBA')
        b.alpha_composite(fr); y = 24 + i * (H + 24)
        d.text((8, y + 4), f'{label}  ({scene}.svg t={t}s | {bl})', fill='#2B3F55')
        sheet.paste(a.resize((W, H)), (0, y + 20)); sheet.paste(b.convert('RGB').resize((W, H)), (W, y + 20))
sheet.save(os.path.join(R, 'reference', 'blender_vs_2d.png')); print(sheet.size)
