// Poppop's Fiat 500 (2026-10-10: "Poppop should drive a fiat 500"; "white with maroon seats"): it
// lives on the driveway in front of his red barn, and every few minutes he and Nonna pop out for a
// drive: into town, round the ring road with the traffic, a stop at Parts & Tools (and at Nico's
// bakery, once he has one, where Nonna drops off pizzelle) and home again. Small, round and slow;
// you can see the tops of their heads through the open canvas roof.
import { Container, Graphics } from 'pixi.js';
import { Loop, roundCorners } from './path';
import { poppopRoute, POPPOP_STOPS } from './map';
import { NAVY, BAND as B } from './draw';
import { SQUEEZE } from './cars';
import { CAR_SCALE } from '../drive';

const S = CAR_SCALE, L = 80, W = 52;   // base art (a little stubby egg next to the other cars' 112 x 56)
/** Poppop drives a bit under the speed of traffic, and goes out every couple of minutes. */
export const FIAT = { max: 210, acc: 220, brake: 720, len: L * S, wid: W * S, color: '#F7F6F2', seats: '#7A1F2B', firstRun: 45, every: [100, 200] as [number, number],
  dwell: { parts: 7, bakery: 5 } as Record<Stop, number> };
export type Stop = keyof typeof POPPOP_STOPS;

function fiatArt(color: string): { body: Container; poppop: Container; nonna: Container } {
  const band = new Graphics().roundRect(-L * S / 2 - B, -W * S / 2 - B, L * S + 2 * B, W * S + 2 * B, 24 * S + B).fill('#FFFFFF');
  const g = new Graphics();
  // wheels peeking out at the corners, then the round body
  for (const [x, y] of [[-24, -W / 2 - 2], [20, -W / 2 - 2], [-24, W / 2 - 6], [20, W / 2 - 6]]) g.roundRect(x - 8, y, 16, 8, 4).fill('#2C3E52');
  g.roundRect(-L / 2, -W / 2, L, W, 24).fill(color).stroke({ width: 1.2, color: '#C9CDD2' });
  g.roundRect(-L / 2 - 2, -W / 2 + 10, 4, W - 20, 2).fill('#D9DEE3')                // chrome bumpers
    .roundRect(L / 2 - 2, -W / 2 + 10, 4, W - 20, 2).fill('#D9DEE3');
  g.ellipse(L / 2 - 9, -W / 2 + 9, 6, 5).fill('#FFF4C2').stroke({ width: 1.5, color: '#D9DEE3' })   // round headlights
    .ellipse(L / 2 - 9, W / 2 - 9, 6, 5).fill('#FFF4C2').stroke({ width: 1.5, color: '#D9DEE3' });
  g.moveTo(L / 2 - 4, -6).lineTo(L / 2 - 4, 6).stroke({ width: 2, color: '#D9DEE3' });   // the little chrome moustache on the nose
  g.roundRect(-L / 2 + 3, -10, 7, 20, 2).fill({ color: NAVY, alpha: 0.18 });             // engine louvres at the back
  g.roundRect(4, -W / 2 + 6, 13, W - 12, 6).fill('#2B3F55');                              // windscreen
  g.roundRect(-24, -W / 2 + 7, 30, W - 14, 9).fill('#E6E9EC');                            // the roof
  g.roundRect(-20, -W / 2 + 12, 24, W - 24, 6).fill('#3A2A2E');                           // the canvas roof, rolled back open...
  g.roundRect(-9, -12, 9, 10, 3).fill(FIAT.seats).roundRect(-9, 2, 9, 10, 3).fill(FIAT.seats)   // ...onto his maroon seats
    .roundRect(-19, -12, 7, 24, 3).fill(FIAT.seats);
  g.roundRect(-24, -W / 2 + 12, 6, W - 24, 3).fill('#8A9099');                            // (the folded canvas)
  // Poppop, from above: a bald crown with his fluffy white hair round the back and sides
  const poppop = new Graphics()
    .ellipse(-6, -2, 9, 8).fill('#EDEDED').stroke({ width: 1, color: '#C9CDD2' })
    .ellipse(-4, -2, 6.5, 6).fill('#F0C4A8')
    .ellipse(-3, -3.5, 2.5, 1.8).fill({ color: '#FFFFFF', alpha: 0.45 });
  poppop.position.set(0, -8);   // the driver's seat (on the left)
  // Nonna beside him: a smaller head of short, wavy grey curls
  const nonna = new Graphics().ellipse(-5, 0, 7.5, 7).fill('#B9BCC2');
  for (const [cx, cy] of [[-10, -4], [-11, 2], [-7, 5], [-2, 5], [-4, -5], [0, -2]]) nonna.circle(cx, cy, 2.6).fill('#A7ABB2');
  nonna.position.set(0, 7);     // the passenger seat
  const art = new Container(); art.addChild(g, nonna, poppop); art.scale.set(S);
  const body = new Container(); body.addChild(band, art);
  return { body, poppop, nonna };
}

export class Fiat {
  readonly view = new Container();
  readonly loop = new Loop(roundCorners(poppopRoute(), 150));
  s = 0; speed = 0;
  out = false;
  wait = FIAT.firstRun;            // s until he goes for a drive
  blockedBy: string | null = null; // what he's stopped for
  private stuck = 0; private squeeze = 0;
  private body: Container; private shadow: Graphics; private poppop: Container; private nonna: Container;
  /** Where along the drive each stop is, which he's been to this time out, and how long he's been at the current one. */
  readonly stops: Record<Stop, number>;
  private done = new Set<Stop>();
  at: Stop | null = null; dwell = 0;
  /** Set by the game: whether to pull in at a stop (the bakery: only once Nico has one). */
  wants: (stop: Stop) => boolean = stop => stop === 'parts';
  /** Set by the game: they've finished at a stop (Nonna's dropped off the pizzelle). */
  onStop: (stop: Stop) => void = () => {};

  constructor() {
    ({ body: this.body, poppop: this.poppop, nonna: this.nonna } = fiatArt(FIAT.color));
    this.stops = Object.fromEntries((Object.keys(POPPOP_STOPS) as Stop[]).map(k => [k, this.nearestS(...POPPOP_STOPS[k])])) as Record<Stop, number>;
    this.shadow = new Graphics().roundRect(-FIAT.len / 2, -FIAT.wid / 2, FIAT.len, FIAT.wid, 24 * S).fill({ color: NAVY, alpha: 0.18 });
    this.shadow.position.set(6, 10);
    this.view.addChild(this.shadow, this.body);
    this.place();
  }

  get pos() { return this.loop.at(this.s); }
  get heading() { return this.loop.heading(this.s); }
  /** Points along the car, for traffic to brake for. */
  points(): [number, number][] {
    const [x, y] = this.pos, h = this.heading;
    return [-0.3, 0, 0.3].map(f => f * FIAT.len).map(a => [x + Math.cos(h) * a, y + Math.sin(h) * a]);
  }
  /** Off he goes (also used by tests). */
  go() { if (!this.out) { this.out = true; this.s = 0; this.speed = 0; this.done.clear(); this.at = null; } }
  /** Straight home (tests). */
  home() { this.out = false; this.s = 0; this.speed = 0; this.at = null; this.wait = FIAT.every[0]; this.place(); }
  nearestS(x: number, y: number): number {
    let best = 0, bd = Infinity;
    for (let s = 0; s < this.loop.length; s += 5) { const [px, py] = this.loop.at(s), d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = s; } }
    return best;
  }

  /** `yieldTo`: things in front to stop for (tagged, like the cars'). Returns true while out. */
  update(dt: number, yieldTo: [number, number, string?][]): boolean {
    if (!this.out) {
      this.wait -= dt;
      if (this.wait <= 0) this.go();
      this.place(); return false;
    }
    const [x, y] = this.pos, h = this.heading, fx = Math.cos(h), fy = Math.sin(h);
    let blocked = false;
    this.blockedBy = null;
    if (this.squeeze > 0) this.squeeze -= dt;
    for (const [bx, by, tag] of yieldTo) {
      if (this.squeeze > 0 && tag === 'mine') continue;
      const rx = bx - x, ry = by - y;
      const along = rx * fx + ry * fy, side = Math.abs(-rx * fy + ry * fx);
      if (along > FIAT.len * 0.1 && along < FIAT.len * 1.5 && side < FIAT.wid * 0.9) { blocked = true; this.blockedBy = tag ?? null; break; }
    }
    // (Nico's car parked in the way for ages: squeeze past it slowly, as the cars do)
    this.stuck = this.blockedBy === 'mine' && this.speed < 5 ? this.stuck + dt : 0;
    if (this.stuck > SQUEEZE.after) { this.squeeze = SQUEEZE.for; this.stuck = 0; }
    const top = this.squeeze > 0 ? SQUEEZE.speed : FIAT.max;
    // pulled in at a stop: wait there, then carry on
    if (this.at) {
      this.dwell += dt; this.speed = 0;
      if (this.dwell >= FIAT.dwell[this.at]) { this.onStop(this.at); this.done.add(this.at); this.at = null; }
      this.place(); return true;
    }
    // ease into the next stop, or into the parking spot at the end
    let end = this.loop.length, next: Stop | null = null;
    for (const k of Object.keys(this.stops) as Stop[]) if (!this.done.has(k) && this.stops[k] >= this.s - 1 && this.stops[k] < end && this.wants(k)) { end = this.stops[k]; next = k; }
    const left = end - this.s, park = Math.max(next ? 0 : 40, Math.sqrt(2 * FIAT.brake * 0.35 * Math.max(0, left)));
    if (next && left <= 6) { this.at = next; this.dwell = 0; this.speed = 0; this.place(); return true; }
    this.speed = blocked ? Math.max(0, this.speed - FIAT.brake * dt) : Math.min(top, Math.max(next ? 30 : 0, park), this.speed + FIAT.acc * dt);
    this.s += this.speed * dt;
    if (next && this.s > end) this.s = end;
    if (this.s >= this.loop.length) {
      this.out = false; this.s = 0; this.speed = 0;
      this.wait = FIAT.every[0] + Math.random() * (FIAT.every[1] - FIAT.every[0]);
    }
    this.place();
    return this.out;
  }

  private place() {
    const [x, y] = this.pos;
    this.view.position.set(x, y);
    this.body.rotation = this.shadow.rotation = this.out ? this.heading : Math.PI / 2;   // parked straight, nose to the road
    this.view.zIndex = y + FIAT.wid * 0.4;
    // parked: they're at home; at Parts & Tools they've both gone in, at the bakery Nonna has
    this.poppop.visible = this.out && this.at !== 'parts';
    this.nonna.visible = this.out && !this.at;
  }
}
