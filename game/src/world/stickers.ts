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
const active: { c: Container; t: number; flash: Graphics; fy: number }[] = [];
export const SLAP = 0.6;   // s

/** Stick `c` onto the world: it pivots round its foot (fx, fy) so it lands in place, not from (0, 0).
 * `box` is its outline, for the flash. */
export function slapIn(c: Container, fx: number, fy: number, box: { x: number; y: number; w: number; h: number }) {
  c.pivot.set(fx, fy); c.position.set(fx, fy);
  const flash = new Graphics().roundRect(box.x, box.y, box.w, box.h, 20).stroke({ width: 14, color: '#FFFFFF' });
  flash.alpha = 0; c.addChild(flash);
  active.push({ c, t: 0, flash, fy });
  update(0);
}
export function update(dt: number) {
  for (const a of active) {
    a.t += dt;
    const u = Math.min(1, a.t / SLAP);
    // drop in big and tilted, squash on landing, settle with a wobble
    const drop = u < 0.45 ? 1 - u / 0.45 : 0;
    const settle = u < 0.45 ? 0 : (u - 0.45) / 0.55;
    const s = 1 + 0.35 * drop - 0.08 * Math.sin(settle * Math.PI) * (1 - settle);
    a.c.scale.set(s * (1 + 0.06 * Math.sin(settle * Math.PI * 3) * (1 - settle)), s);
    a.c.rotation = -0.12 * drop + 0.05 * Math.sin(settle * Math.PI * 4) * (1 - settle);
    a.c.alpha = Math.min(1, 0.3 + u * 2.5);
    a.flash.alpha = u < 0.45 ? 0 : Math.max(0, 1 - settle * 1.4);
  }
  for (let i = active.length - 1; i >= 0; i--) if (active[i].t >= SLAP) {
    const a = active[i]; a.c.scale.set(1); a.c.rotation = 0; a.c.alpha = 1; a.flash.destroy(); active.splice(i, 1);
  }
}
