// Animals beyond the town: cows and chickens at the farm, deer and rabbits in the forest,
// gulls and crabs on the beach. Each one wanders near its home, and the shy ones run off
// when Nico gets close (later: the forest ones are what he photographs). Data at the top.
import { Container, Graphics } from 'pixi.js';
import { NAVY, BAND } from './draw';
import { moveCircle, freeAt } from '../player';
import { SOLIDS, WORLD } from './map';
import { PASTURE, FARMYARD } from './zones';

export type AnimalKind = 'cow' | 'chicken' | 'deer' | 'rabbit' | 'gull' | 'crab' | 'fox';
interface Kind { speed: number; run: number; shy: number; roam: number; label: string }
export const KINDS: Record<AnimalKind, Kind> = {
  cow: { speed: 30, run: 0, shy: 0, roam: 220, label: '🐄 Cow' },
  chicken: { speed: 60, run: 220, shy: 120, roam: 140, label: '🐔 Chicken' },
  deer: { speed: 70, run: 330, shy: 260, roam: 380, label: '🦌 Deer' },
  rabbit: { speed: 90, run: 360, shy: 180, roam: 260, label: '🐇 Rabbit' },
  gull: { speed: 50, run: 300, shy: 160, roam: 300, label: '🐦 Seagull' },
  crab: { speed: 45, run: 140, shy: 110, roam: 160, label: '🦀 Crab' },
  fox: { speed: 75, run: 420, shy: 330, roam: 320, label: '🦊 Fox' },   // rare and very shy: photograph it from far off
};

/** Animals that are fenced in stay inside their pen. */
export const PENS: Partial<Record<AnimalKind, { x: number; y: number; w: number; d: number }>> = { cow: PASTURE, chicken: FARMYARD };
const inPen = (k: AnimalKind, x: number, y: number) => { const p = PENS[k]; return !p || (x > p.x + 20 && x < p.x + p.w - 20 && y > p.y + 20 && y < p.y + p.d - 10); };

/** Who lives where: kind and home (they roam around it). */
export const HERDS: [AnimalKind, number, number][] = [
  ['cow', 300, 4420], ['cow', 520, 4520], ['cow', 650, 4380],
  ['chicken', 300, 4190], ['chicken', 420, 4195], ['chicken', 700, 4200], ['chicken', 980, 4195],
  ['deer', 5600, 1500], ['deer', 6000, 1800], ['deer', 7300, 1300], ['deer', 5500, 400],
  ['rabbit', 5900, 1200], ['rabbit', 6900, 1700], ['rabbit', 5300, 1900], ['rabbit', 7600, 1100],
  ['gull', 1300, 5080], ['gull', 2600, 4880], ['gull', 4600, 4520], ['gull', 5900, 3900], ['gull', 6800, 3200],
  ['fox', 6300, 600], ['fox', 7700, 2000],
  ['crab', 1100, 5150], ['crab', 3000, 4930], ['crab', 4900, 4480], ['crab', 6400, 3640],
];

function art(kind: AnimalKind): Graphics {
  const g = new Graphics(), W = '#FFFFFF', B = BAND;
  switch (kind) {
    case 'cow':
      g.ellipse(4, 2, 42, 8).fill({ color: NAVY, alpha: 0.18 });
      g.roundRect(-38 - B, -50 - B, 70 + 2 * B, 36 + 2 * B, 14).fill(W).circle(36, -46, 16 + B).fill(W);
      for (const lx of [-30, -14, 10, 24]) g.roundRect(lx - B, -20, 9 + 2 * B, 22 + B, 3).fill(W);
      for (const lx of [-30, -14, 10, 24]) g.roundRect(lx, -20, 9, 20, 3).fill('#3A3A3A');
      g.roundRect(-38, -50, 70, 36, 13).fill('#F7F7F2').ellipse(-16, -38, 12, 8).fill('#2E2E2E').ellipse(14, -28, 9, 7).fill('#2E2E2E');
      g.circle(36, -46, 16).fill('#F7F7F2').roundRect(32, -40, 20, 12, 6).fill('#F2A7B4').circle(40, -52, 2.5).fill('#2B3F55');
      g.poly([26, -60, 22, -70, 32, -62]).fill('#E8D7A8').poly([42, -60, 48, -70, 46, -60]).fill('#E8D7A8');
      break;
    case 'chicken':
      g.ellipse(2, 2, 14, 4).fill({ color: NAVY, alpha: 0.18 });
      g.circle(0, -16, 14 + B).fill(W).circle(10, -28, 8 + B).fill(W);
      g.circle(0, -16, 14).fill('#FFFFFF').circle(10, -28, 8).fill('#FFFFFF').circle(-3, -16, 9).fill('#F1F1EA');
      g.poly([16, -28, 24, -25, 16, -23]).fill('#F2B632').circle(12, -30, 1.8).fill('#2B3F55').poly([8, -36, 11, -42, 14, -36]).fill('#E5484D');
      g.rect(-3, -4, 2, 6).fill('#F2B632').rect(3, -4, 2, 6).fill('#F2B632');
      break;
    case 'deer':
      g.ellipse(4, 2, 34, 7).fill({ color: NAVY, alpha: 0.18 });
      for (const lx of [-24, -12, 12, 22]) g.roundRect(lx - B, -36, 7 + 2 * B, 38 + B, 3).fill(W);
      g.roundRect(-32 - B, -62 - B, 60 + 2 * B, 30 + 2 * B, 14).fill(W).roundRect(22 - B, -88 - B, 14 + 2 * B, 34 + 2 * B, 6).fill(W).circle(34, -90, 12 + B).fill(W);
      for (const lx of [-24, -12, 12, 22]) g.roundRect(lx, -36, 7, 36, 3).fill('#8A5A3B');
      g.roundRect(-32, -62, 60, 30, 13).fill('#B87A4B').roundRect(22, -88, 14, 34, 6).fill('#B87A4B').circle(34, -90, 12).fill('#B87A4B');
      for (const [x, y] of [[-14, -54], [0, -50], [10, -56]]) g.circle(x, y, 3).fill('#F2D6A2');
      g.circle(44, -88, 3).fill('#2B3F55').circle(38, -93, 2).fill('#2B3F55').ellipse(-30, -58, 5, 7).fill('#FFFFFF');
      g.moveTo(30, -100).lineTo(24, -118).lineTo(16, -124).moveTo(24, -118).lineTo(28, -126).moveTo(38, -100).lineTo(42, -118).lineTo(50, -122).moveTo(42, -118).lineTo(40, -128)
       .stroke({ width: 3, color: '#7A5236', cap: 'round' });
      break;
    case 'rabbit':
      g.ellipse(2, 2, 16, 4).fill({ color: NAVY, alpha: 0.18 });
      g.ellipse(0, -12, 15 + B, 12 + B).fill(W).circle(12, -22, 9 + B).fill(W).roundRect(8 - B, -44 - B, 6 + 2 * B, 20 + B, 3).fill(W).roundRect(15 - B, -42 - B, 6 + 2 * B, 18 + B, 3).fill(W);
      g.ellipse(0, -12, 15, 12).fill('#C9B8A6').circle(12, -22, 9).fill('#C9B8A6').roundRect(8, -44, 6, 20, 3).fill('#C9B8A6').roundRect(15, -42, 6, 18, 3).fill('#C9B8A6');
      g.circle(-14, -12, 5).fill('#FFFFFF').circle(16, -23, 1.8).fill('#2B3F55').circle(20, -19, 1.5).fill('#F2A7B4');
      break;
    case 'gull':
      g.ellipse(2, 2, 14, 4).fill({ color: NAVY, alpha: 0.18 });
      g.ellipse(0, -12, 16 + B, 9 + B).fill(W).circle(12, -22, 7 + B).fill(W);
      g.ellipse(0, -12, 16, 9).fill('#FFFFFF').ellipse(-4, -14, 11, 5).fill('#B8C3CF').circle(12, -22, 7).fill('#FFFFFF');
      g.poly([18, -22, 28, -20, 18, -18]).fill('#F2B632').circle(14, -24, 1.6).fill('#2B3F55').rect(-2, -4, 2, 5).fill('#F2B632').rect(3, -4, 2, 5).fill('#F2B632');
      break;
    case 'fox':
      g.ellipse(2, 2, 28, 6).fill({ color: NAVY, alpha: 0.18 });
      g.ellipse(-30, -30, 18 + B, 10 + B).fill(W).roundRect(-24 - B, -46 - B, 46 + 2 * B, 24 + 2 * B, 11).fill(W).circle(26, -44, 13 + B).fill(W);
      for (const lx of [-18, -6, 8, 16]) g.roundRect(lx - B, -24, 6 + 2 * B, 24 + B, 3).fill(W);
      for (const lx of [-18, -6, 8, 16]) g.roundRect(lx, -24, 6, 22, 3).fill('#7A3B23');
      g.ellipse(-30, -30, 18, 10).fill('#E07A3A').ellipse(-42, -30, 7, 6).fill('#FFFFFF');
      g.roundRect(-24, -46, 46, 24, 10).fill('#E07A3A').circle(26, -44, 13).fill('#E07A3A').poly([28, -40, 44, -38, 30, -32]).fill('#FFFFFF');
      g.poly([18, -52, 20, -66, 28, -54]).fill('#E07A3A').poly([28, -54, 34, -66, 36, -52]).fill('#E07A3A').circle(30, -46, 2).fill('#2B3F55').circle(44, -38, 2).fill('#2B3F55');
      break;
    case 'crab':
      g.ellipse(0, 2, 18, 4).fill({ color: NAVY, alpha: 0.18 });
      g.ellipse(0, -10, 16 + B, 10 + B).fill(W).circle(-20, -16, 6 + B).fill(W).circle(20, -16, 6 + B).fill(W);
      for (const s of [-1, 1]) for (const k of [0, 1, 2]) g.moveTo(s * 10, -6).lineTo(s * (18 + k * 3), 0 - k).stroke({ width: 2.5, color: '#D9534F' });
      g.ellipse(0, -10, 16, 10).fill('#E5674F').circle(-20, -16, 6).fill('#E5674F').circle(20, -16, 6).fill('#E5674F');
      g.circle(-5, -20, 3).fill('#FFFFFF').circle(5, -20, 3).fill('#FFFFFF').circle(-5, -20, 1.5).fill('#2B3F55').circle(5, -20, 1.5).fill('#2B3F55');
      break;
  }
  return g;
}

/** The nearest spot to (x, y) an animal can stand on (homes are rough; trees move when the forest is tuned). */
export { inPen };
export function settle(x: number, y: number): [number, number] {
  for (let r = 0; r < 400; r += 20) for (let a = 0; a < 16; a++) {
    const px = x + Math.cos(a * Math.PI / 8) * r, py = y + Math.sin(a * Math.PI / 8) * r;
    if (freeAt(px, py, SOLIDS, WORLD)) return [px, py];
    if (r === 0) break;
  }
  return [x, y];
}

export interface Animal { kind: AnimalKind; home: [number, number]; x: number; y: number; tx: number; ty: number; wait: number; t: number; scared: number; view: Container; body: Graphics }

export class Animals {
  readonly list: Animal[] = [];
  constructor() {
    let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (const [kind, x0, y0] of HERDS) {
      const [hx, hy] = settle(x0, y0);
      const view = new Container(), body = art(kind); view.addChild(body);
      this.list.push({ kind, home: [hx, hy], x: hx, y: hy, tx: hx, ty: hy, wait: rnd() * 3, t: rnd() * 10, scared: 0, view, body });
    }
  }
  /** `scarers`: where Nico (or his car) is. */
  update(dt: number, scarers: [number, number][]) {
    for (const a of this.list) {
      const k = KINDS[a.kind];
      a.t += dt;
      let near: [number, number] | null = null, nd = Infinity;
      for (const s of scarers) { const d = Math.hypot(s[0] - a.x, s[1] - a.y); if (d < nd) { nd = d; near = s; } }
      if (k.shy && near && nd < k.shy) {
        // run directly away (but not too far from home)
        const ax = (a.x - near[0]) / (nd || 1), ay = (a.y - near[1]) / (nd || 1);
        a.tx = a.x + ax * 160; a.ty = a.y + ay * 160; a.scared = 1.2; a.wait = 0;
        if (!inPen(a.kind, a.tx, a.ty)) { a.tx = a.x; a.ty = a.y; }
      }
      if (a.scared > 0) a.scared -= dt;
      const speed = a.scared > 0 ? k.run : k.speed;
      const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
      if (d < 4) {
        a.wait -= dt;
        if (a.wait <= 0) {   // pick somewhere new near home
          const ang = Math.random() * Math.PI * 2, r = Math.random() * k.roam;
          a.tx = a.home[0] + Math.cos(ang) * r; a.ty = a.home[1] + Math.sin(ang) * r * 0.6;
          if (!inPen(a.kind, a.tx, a.ty)) { a.tx = a.home[0]; a.ty = a.home[1]; }   // (not over the fence)
          a.wait = 1.5 + Math.random() * 4;
        }
      } else {
        const st = Math.min(d, speed * dt);
        const [nx, ny] = moveCircle(a.x, a.y, dx / d * st, dy / d * st, SOLIDS, WORLD, 12);
        if (nx === a.x && ny === a.y) { a.tx = a.x; a.ty = a.y; }   // stuck: think again
        // (and never stray far from home, even when chased)
        if (Math.hypot(nx - a.home[0], ny - a.home[1]) < k.roam * 1.6 && inPen(a.kind, nx, ny)) { a.x = nx; a.y = ny; } else { a.tx = a.home[0]; a.ty = a.home[1]; }
        if (Math.abs(dx) > 1) a.body.scale.x = dx > 0 ? 1 : -1;
      }
      const moving = d >= 4;
      a.view.position.set(a.x, a.y - (moving && a.kind !== 'cow' ? Math.abs(Math.sin(a.t * (a.scared > 0 ? 18 : 10))) * 4 : 0));
      a.view.zIndex = a.y;
    }
  }
}
