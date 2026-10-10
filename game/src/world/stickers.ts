// How unlockables look (unlocks.ts): before, a dashed white outline where the thing will go, with a
// price tag; when bought, the real thing slaps down like a sticker being stuck on: it drops in big
// and tilted, squashes, wobbles, and a white flash runs round its edge.
import { Container, Graphics, Text } from 'pixi.js';
import { NAVY } from './draw';

/** A dashed rounded outline (x, y, w, h) with a price tag and a label in the middle. */
export function outlineArt(x: number, y: number, w: number, h: number, label: string, price: number): Container {
  const c = new Container(), g = new Graphics(), r = 18;
  g.roundRect(x, y, w, h, r).fill({ color: '#FFFFFF', alpha: 0.18 });
  // dashes round the edge
  const dash = 22, gap = 14, pts: [number, number, number, number][] = [[x + r, y, x + w - r, y], [x + w, y + r, x + w, y + h - r], [x + w - r, y + h, x + r, y + h], [x, y + h - r, x, y + r]];
  for (const [x0, y0, x1, y1] of pts) {
    const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
    for (let t = 0; t < L; t += dash + gap) { const e = Math.min(L, t + dash); g.moveTo(x0 + ux * t, y0 + uy * t).lineTo(x0 + ux * e, y0 + uy * e); }
  }
  g.stroke({ width: 7, color: '#FFFFFF', cap: 'round' });
  c.addChild(g);
  const t = new Text({ text: label, style: { fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '900', fontSize: 30, fill: '#FFFFFF', stroke: { color: NAVY, width: 6 } } });
  t.anchor.set(0.5); t.position.set(x + w / 2, y + h / 2 - 24); c.addChild(t);
  const tag = new Container(), tt = new Text({ text: `$${price}`, style: { fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '900', fontSize: 28, fill: NAVY } });
  tt.anchor.set(0.5);
  const tg = new Graphics().roundRect(-tt.width / 2 - 18, -24, tt.width + 36, 48, 24).fill('#FFFFFF').roundRect(-tt.width / 2 - 14, -20, tt.width + 28, 40, 20).fill('#F9C846');
  tag.addChild(tg, tt); tag.position.set(x + w / 2, y + h / 2 + 30); c.addChild(tag);
  return c;
}

/** Things being stuck on right now (the game loop calls stickers.update). */
type Pt = [number, number];
interface Sticking { c: Container; t: number; mask: Graphics; flap: Graphics; flash: Graphics; box: { x: number; y: number; w: number; h: number } }
const active: Sticking[] = [];
export const FOLD = 0.8, FLASH = 0.35;   // s: folding down from the corner, then the flash round the edge
export const SLAP = FOLD + FLASH;

/** The part of polygon `poly` where f(p) <= 0 (one Sutherland-Hodgman pass). */
function clip(poly: Pt[], f: (p: Pt) => number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], fa = f(a), fb = f(b);
    if (fa <= 0) out.push(a);
    if ((fa < 0 && fb > 0) || (fa > 0 && fb < 0)) { const k = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); }
  }
  return out;
}

/** Stick `c` onto the world like a real sticker: its top-left corner goes down first and the rest
 * folds down after it (the bit not stuck yet is lifted, folded back over, showing the sticker's white
 * back), then a white flash runs round its edge. `box` is its outline. (fx, fy: its foot, for sorting.) */
export function slapIn(c: Container, fx: number, fy: number, box: { x: number; y: number; w: number; h: number }) {
  void fx; void fy;
  const mask = new Graphics(), flap = new Graphics();
  c.addChild(mask); c.mask = mask;
  flap.zIndex = c.zIndex + 0.5; c.parent?.addChild(flap);   // (outside the mask: the lifted flap hangs over the stuck part)
  const flash = new Graphics().roundRect(box.x, box.y, box.w, box.h, 20).stroke({ width: 14, color: '#FFFFFF' });
  flash.alpha = 0; c.addChild(flash);
  active.push({ c, t: 0, mask, flap, flash, box });
  update(0);
}
export function update(dt: number) {
  for (const a of active) {
    a.t += dt;
    const { x, y, w, h } = a.box;
    if (a.t < FOLD) {
      // the fold line sweeps from the top-left corner to the bottom-right, across the diagonal
      const u = a.t / FOLD, e = 1 - (1 - u) * (1 - u);   // fast at first, settling as the last corner goes down
      const L = Math.hypot(w, h), dx = w / L, dy = h / L, reach = w * dx + h * dy, s = e * reach;
      const along = (p: Pt) => (p[0] - x) * dx + (p[1] - y) * dy - s;
      const rect: Pt[] = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
      const stuck = clip(rect, along), loose = clip(rect, p => -along(p));
      const flapPts = loose.map(p => { const k = 2 * along(p); return [p[0] - k * dx, p[1] - k * dy] as Pt; });   // folded back across the line
      a.mask.clear(); if (stuck.length > 2) a.mask.poly(stuck.flat()).fill('#FFFFFF');
      a.flap.clear();
      if (flapPts.length > 2) {
        a.flap.poly(flapPts.flatMap(p => [p[0] + 8, p[1] + 10])).fill({ color: NAVY, alpha: 0.16 });   // its shadow
        a.flap.poly(flapPts.flat()).fill('#FFFFFF').stroke({ width: 2, color: '#D3DAE1' });        // the sticker's white back
        // a soft crease along the fold (the points that sit on the fold line)
        const crease = loose.filter(p => Math.abs(along(p)) < 0.5);
        if (crease.length >= 2) a.flap.moveTo(crease[0][0], crease[0][1]).lineTo(crease[1][0], crease[1][1]).stroke({ width: 6, color: '#E9EEF3' });
      }
      a.flash.alpha = 0;
    } else {
      if (a.c.mask) { a.c.mask = null; a.mask.destroy(); a.flap.destroy(); }
      a.flash.alpha = Math.max(0, 1 - (a.t - FOLD) / FLASH);
    }
  }
  for (let i = active.length - 1; i >= 0; i--) if (active[i].t >= SLAP) {
    const a = active[i];
    if (a.c.mask) { a.c.mask = null; a.mask.destroy(); a.flap.destroy(); }
    a.flash.destroy(); active.splice(i, 1);
  }
}
