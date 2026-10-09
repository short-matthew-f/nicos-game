"""Scene helper: CSS-keyframe tracks sampled from Python pose functions, plus the sticker filter."""
import os

OUT = os.environ.get('OUT', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'out'))
os.makedirs(OUT, exist_ok=True)

# ---------- helpers ----------
def sm(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)

def ramp(t, a, b):
    return sm((t - a) / (b - a))

def num(v):
    s = f"{v:.2f}".rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s

def ops_css(ops):
    out = []
    for o in ops:
        if o[0] == 't': out.append(f"translate({num(o[1])}px,{num(o[2])}px)")
        elif o[0] == 'r': out.append(f"rotate({num(o[1])}deg)")
        elif o[0] == 's': out.append(f"scale({num(o[1])},{num(o[2])})")
    return ' '.join(out)

class Scene:
    def __init__(s, pfx, T, w=800, h=460, dt=0.05):
        s.pfx, s.T, s.w, s.h, s.dt = pfx, T, w, h, dt
        s.tracks, s.defs, s.css = [], [], []

    def A(s, name, fn, inner, filt=None, extras=()):
        cls = s.pfx + name
        s.tracks.append((cls, fn, extras))
        f = f' filter="url(#{s.pfx}{filt})"' if filt else ''
        return f'<g class="{cls}"{f}>{inner}</g>'

    def filt(s, fid, x, y, w, h, r=5, blur=3, dx=5, dy=9, op=0.22, sd=6):
        s.defs.append(f'''<filter id="{s.pfx}{fid}" filterUnits="userSpaceOnUse" x="{x}" y="{y}" width="{w}" height="{h}" color-interpolation-filters="sRGB">
<feMorphology in="SourceAlpha" operator="dilate" radius="{r}" result="d1"/>
<feGaussianBlur in="d1" stdDeviation="{blur}" result="d2"/>
<feComponentTransfer in="d2" result="d3"><feFuncA type="linear" slope="6" intercept="-1.6"/></feComponentTransfer>
<feFlood flood-color="#fff" result="wh"/>
<feComposite in="wh" in2="d3" operator="in" result="ol"/>
<feGaussianBlur in="d3" stdDeviation="{sd}" result="sb"/>
<feOffset in="sb" dx="{dx}" dy="{dy}" result="so"/>
<feColorMatrix in="so" type="matrix" values="0 0 0 0 0.17 0 0 0 0 0.25 0 0 0 0 0.33 0 0 0 {op} 0" result="sc"/>
<feMerge><feMergeNode in="sc"/><feMergeNode in="ol"/><feMergeNode in="SourceGraphic"/></feMerge></filter>''')

    def keyframes(s):
        T, dt = s.T, s.dt
        n = int(round(T / dt))
        out = []
        for cls, fn, extras in s.tracks:
            times = sorted(set([round(i * dt, 4) for i in range(n + 1)] + [round(e, 4) for e in extras]))
            vals = [ops_css(fn(t)) for t in times]
            keys = []
            for i, (t, v) in enumerate(zip(times, vals)):
                if 0 < i < len(vals) - 1 and vals[i - 1] == v == vals[i + 1]:
                    continue
                keys.append(f"{t / T * 100:.4f}%{{transform:{v}}}")
            out.append(f"@keyframes {cls}{{{''.join(keys)}}}")
            out.append(f".{cls}{{animation:{cls} {T}s linear infinite;transform-origin:0 0}}")
        return '\n'.join(out)

    def svg(s, body, extra_css=''):
        css = s.keyframes() + '\n' + extra_css
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {s.w} {s.h}" width="{s.w}" height="{s.h}">'
                f'<style>{css}</style><defs>{"".join(s.defs)}</defs>{body}</svg>')

BG = '#E9EEF3'
NAVY = '#2B3F55'
FONT = "'DejaVu Sans',Verdana,Arial,sans-serif"
