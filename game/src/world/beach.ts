// The beach (Nico's idea): shells to collect, and treasure to find with a metal detector.
// Shells lie on the sand; walk over one to pick it up (a collection: six kinds). Treasure
// is buried: with a detector, it beeps faster the closer Nico gets, and when he's right on
// top of it he digs it up. Data first; the game asks where things are and calls collect/dig.
import { Container, Graphics } from 'pixi.js';
import { NAVY, BAND } from './draw';
import { shoreY, SAND_W } from './zones';
import { freeAt } from '../player';
import { SOLIDS, WORLD } from './map';

export const SHELL_KINDS = [
  { id: 'scallop', label: 'Scallop', color: '#F4A6A0', rare: 0.3 },
  { id: 'spiral', label: 'Spiral shell', color: '#E8C99A', rare: 0.25 },
  { id: 'clam', label: 'Clam', color: '#B9C7D6', rare: 0.2 },
  { id: 'cowrie', label: 'Cowrie', color: '#E9D3B8', rare: 0.12 },
  { id: 'starfish', label: 'Starfish', color: '#F28C38', rare: 0.08 },
  { id: 'sanddollar', label: 'Sand dollar', color: '#EFE6CF', rare: 0.05 },
] as const;
export type ShellKind = typeof SHELL_KINDS[number]['id'];
export const SHELLS = { count: 18, reach: 44, respawn: 150 };

/** What's buried: cash, or a find for the shelf (the ids are beach finds in business.ts). */
export const TREASURE: { what: 'cash' | string; weight: number; cash?: [number, number] }[] = [
  { what: 'cash', weight: 5, cash: [2, 8] },
  { what: 'bottle', weight: 3 }, { what: 'oldkey', weight: 2.5 }, { what: 'watch', weight: 2 },
  { what: 'piratecoin', weight: 1.4 }, { what: 'ring', weight: 0.8 },
];
export const DETECT = { buried: 4, range: 520, dig: 110, slowest: 1.3, fastest: 0.1 };   // (dig reach: Nico missed the button when it was 56)   // px, px, beep gap in s

let seed = 41;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
/** A random spot on dry sand that Nico can stand on. */
export function sandSpot(r: () => number = rnd): [number, number] {
  for (let tries = 0; tries < 200; tries++) {
    const x = 200 + r() * (WORLD.w - 500), y = shoreY(x) - 50 - r() * (SAND_W - 130);
    if (y > 60 && freeAt(x, y, SOLIDS, WORLD)) return [Math.round(x), Math.round(y)];
  }
  return [3300, 4700];
}
/** Is (x, y) on the beach (dry sand or the shallows)? */
export const onBeach = (x: number, y: number) => y > shoreY(x) - SAND_W - 30 && y < shoreY(x) + 80;

export function pickShell(r: () => number = rnd): ShellKind {
  let t = r() * SHELL_KINDS.reduce((s, k) => s + k.rare, 0);
  for (const k of SHELL_KINDS) { t -= k.rare; if (t <= 0) return k.id; }
  return 'scallop';
}
export function pickTreasure(r: () => number = rnd): { what: string; cash: number } {
  let t = r() * TREASURE.reduce((s, k) => s + k.weight, 0);
  for (const k of TREASURE) {
    t -= k.weight;
    if (t <= 0) return { what: k.what, cash: k.cash ? k.cash[0] + Math.floor(r() * (k.cash[1] - k.cash[0] + 1)) : 0 };
  }
  return { what: 'cash', cash: 2 };
}
/** Seconds between beeps for a treasure `d` px away (null: out of range, silent). */
export function beepGap(d: number): number | null {
  if (d > DETECT.range) return null;
  const k = Math.max(0, d - DETECT.dig) / (DETECT.range - DETECT.dig);
  return DETECT.fastest + (DETECT.slowest - DETECT.fastest) * k;
}

function shellArt(kind: ShellKind): Graphics {
  const col = SHELL_KINDS.find(k => k.id === kind)!.color, g = new Graphics(), W = '#FFFFFF';
  g.ellipse(2, 2, 13, 4).fill({ color: NAVY, alpha: 0.2 });
  switch (kind) {
    case 'scallop':
      g.poly([-14 - BAND, -2, 0, -22 - BAND, 14 + BAND, -2]).fill(W).circle(0, -8, 13 + BAND).fill(W);
      g.circle(0, -8, 13).fill(col); for (const a of [-50, -25, 0, 25, 50]) { const r = a * Math.PI / 180; g.moveTo(0, 2).lineTo(Math.sin(r) * 13, -8 - Math.cos(r) * 12).stroke({ width: 2, color: '#D97F78' }); }
      break;
    case 'spiral':
      g.ellipse(0, -8, 9 + BAND, 13 + BAND).fill(W).ellipse(0, -8, 9, 13).fill(col);
      g.moveTo(-6, -2).lineTo(6, -6).moveTo(-6, -8).lineTo(6, -12).moveTo(-4, -14).lineTo(4, -17).stroke({ width: 2, color: '#C79A62' }); break;
    case 'clam':
      g.ellipse(0, -8, 14 + BAND, 10 + BAND).fill(W).ellipse(0, -8, 14, 10).fill(col).ellipse(0, -10, 9, 5).fill('#D3DDE7'); break;
    case 'cowrie':
      g.ellipse(0, -8, 12 + BAND, 9 + BAND).fill(W).ellipse(0, -8, 12, 9).fill(col).rect(-8, -9, 16, 2).fill('#9C7A55');
      for (const x of [-6, -2, 2, 6]) g.circle(x, -13, 1.5).fill('#B58F64'); break;
    case 'starfish': {
      const pts: number[] = [], pin: number[] = [];
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 6 : 15; pts.push(Math.cos(a) * (r + BAND), -9 + Math.sin(a) * (r + BAND)); pin.push(Math.cos(a) * r, -9 + Math.sin(a) * r); }
      g.poly(pts).fill(W).poly(pin).fill(col).circle(0, -9, 3).fill('#F9C846'); break;
    }
    case 'sanddollar':
      g.circle(0, -8, 13 + BAND).fill(W).circle(0, -8, 13).fill(col);
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; g.ellipse(Math.cos(a) * 6, -8 + Math.sin(a) * 6, 2, 3.5).fill('#C9B98E'); } break;
  }
  return g;
}

/** The shells lying about. update() picks up any Nico walks over and returns their kinds. */
export class Shells {
  readonly views: Container[] = [];
  readonly spots: { x: number; y: number; kind: ShellKind; gone: number }[] = [];
  constructor() {
    for (let i = 0; i < SHELLS.count; i++) {
      const [x, y] = sandSpot(), kind = pickShell();
      this.spots.push({ x, y, kind, gone: 0 });
      const c = new Container(); c.addChild(shellArt(kind)); c.scale.set(1.5); c.position.set(x, y); c.zIndex = y;   // (big enough to spot)
      this.views.push(c);
    }
  }
  update(dt: number, collector: [number, number] | null): ShellKind[] {
    const got: ShellKind[] = [];
    this.spots.forEach((s, i) => {
      if (s.gone > 0) {
        s.gone -= dt;
        if (s.gone <= 0) {   // a new one washes up somewhere else
          [s.x, s.y] = sandSpot(); s.kind = pickShell();
          const v = this.views[i]; v.removeChildren(); v.addChild(shellArt(s.kind)); v.position.set(s.x, s.y); v.zIndex = s.y; v.visible = true;
        }
        return;
      }
      if (collector && Math.hypot(collector[0] - s.x, collector[1] - s.y) < SHELLS.reach) { got.push(s.kind); s.gone = SHELLS.respawn; this.views[i].visible = false; }
    });
    return got;
  }
}

/** Buried treasure: invisible until dug up. */
export class Treasure {
  readonly spots: [number, number][] = [];
  constructor() { for (let i = 0; i < DETECT.buried; i++) this.spots.push(sandSpot()); }
  /** The nearest buried thing to (x, y), and how far. */
  nearest(x: number, y: number): { i: number; d: number } {
    let i = -1, d = Infinity;
    this.spots.forEach(([sx, sy], k) => { const dd = Math.hypot(sx - x, sy - y); if (dd < d) { d = dd; i = k; } });
    return { i, d };
  }
  /** Dig spot i up: what was there, and a new one is buried somewhere else. */
  dig(i: number, r: () => number = Math.random): { what: string; cash: number } {
    this.spots[i] = sandSpot();
    return pickTreasure(r);
  }
}

/** A little hole with a sand pile, left where something was dug up (fades away). */
export function holeArt(): Container {
  const g = new Graphics().ellipse(0, 0, 26, 10).fill('#C9A86A').ellipse(0, -2, 18, 6).fill('#8C7146').ellipse(26, -6, 18, 9).fill('#E8CF8E');
  const c = new Container(); c.addChild(g); return c;
}
