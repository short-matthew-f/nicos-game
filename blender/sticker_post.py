"""Sticker edge + soft shadow for the Blender frames: a 1:1 port of the SVG filter in src (Scene.filt).

SVG chain (in the character's local units; the 2D scene draws Nico at scale 1.3):
  feMorphology dilate r=5 on SourceAlpha  -> feGaussianBlur sd=3 -> feFuncA slope 6 intercept -1.6  = mask
  white flood IN mask                                                                        = outline
  mask -> feGaussianBlur sd=6 -> feOffset (5,9) -> navy #2B3F55 at alpha 0.22                = shadow
  feMerge: shadow, outline, SourceGraphic

Here every length is multiplied by 1.3 (px per unit) and the mask is built at 2x supersampling so the
non-integer radii (6.5 px dilate) are exact, then downsampled. Pillow only (runs in .venv, no numpy).

Usage: python blender/sticker_post.py OUT_DIR [--r 5]      (processes OUT_DIR/*/raw/*.png -> OUT_DIR/*/*.png)
"""
import glob, os, sys, time
from concurrent.futures import ProcessPoolExecutor
from PIL import Image, ImageChops, ImageFilter

PX = 1.3
SS = 2
NAVY = (0x2B, 0x3F, 0x55)

def shift(img, dx, dy):
    out = Image.new(img.mode, img.size, 0)
    out.paste(img, (dx, dy))
    return out

def dilate(img, R):
    """feMorphology dilate = max over a (2R+1)x(2R+1) box; separable."""
    x = img
    for k in range(1, R + 1):
        x = ImageChops.lighter(x, ImageChops.lighter(shift(img, k, 0), shift(img, -k, 0)))
    y = x
    for k in range(1, R + 1):
        y = ImageChops.lighter(y, ImageChops.lighter(shift(x, 0, k), shift(x, 0, -k)))
    return y

LUT = [max(0, min(255, round(6 * v - 1.6 * 255))) for v in range(256)]

def sticker(raw, r=5.0, blur=3.0, sd=6.0, dx=5.0, dy=9.0, op=0.22):
    W, H = raw.size
    k = PX * SS
    a = raw.getchannel('A').resize((W * SS, H * SS), Image.BICUBIC)
    d1 = dilate(a, round(r * k))
    d2 = d1.filter(ImageFilter.GaussianBlur(blur * k))
    d3 = d2.point(LUT)                                       # threshold -> sticker mask
    sb = shift(d3.filter(ImageFilter.GaussianBlur(sd * k)), round(dx * k), round(dy * k))
    mask = d3.resize((W, H), Image.BOX)
    shad = sb.resize((W, H), Image.BOX).point(lambda v: round(v * op))
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    out.alpha_composite(Image.merge('RGBA', (*[Image.new('L', (W, H), c) for c in NAVY], shad)))
    out.alpha_composite(Image.merge('RGBA', (*[Image.new('L', (W, H), 255)] * 3, mask)))
    out.alpha_composite(raw)
    return out

def job(args):
    src, dst, r = args
    raw = Image.open(src).convert('RGBA')
    sticker(raw, r=r).save(dst, optimize=True)
    return dst

def main():
    root = sys.argv[1]
    r = float(sys.argv[sys.argv.index('--r') + 1]) if '--r' in sys.argv else 5.0
    work = []
    for src in sorted(glob.glob(os.path.join(root, '*', 'raw', '*.png'))):
        d = os.path.dirname(os.path.dirname(src))
        work.append((src, os.path.join(d, os.path.basename(src)), r))
    t = time.time()
    with ProcessPoolExecutor() as ex:
        n = sum(1 for _ in ex.map(job, work, chunksize=4))
    print(f'[sticker] {n} frames in {time.time() - t:.1f}s (r={r})')

if __name__ == '__main__':
    main()
