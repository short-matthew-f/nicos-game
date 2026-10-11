// Poppop's Fiat 500 (Nico, 2026-10-10: "Poppop should drive a fiat 500"): it lives on the
// driveway in front of his red barn, and every few minutes he pops out for a drive, down the
// road into town, a lap of the ring road with the traffic, and home again. Small, round and
// slow; you can see the top of his head through the open canvas roof.
import { Container, Graphics } from 'pixi.js';
import { Loop, roundCorners } from './path';
import { poppopRoute } from './map';
import { NAVY, BAND as B } from './draw';
import { SQUEEZE } from './cars';
import { CAR_SCALE } from '../drive';

const S = CAR_SCALE, L = 80, W = 52;   // base art (a little stubby egg next to the other cars' 112 x 56)
/** Poppop drives a bit under the speed of traffic, and goes out every couple of minutes. */
export const FIAT = { max: 210, acc: 220, brake: 720, len: L * S, wid: W * S, color: '#9ED6CF', firstRun: 45, every: [100, 200] as [number, number] };

function fiatArt(color: string): { body: Container; poppop: Container } {
  const band = new Graphics().roundRect(-L * S / 2 - B, -W * S / 2 - B, L * S + 2 * B, W * S + 2 * B, 24 * S + B).fill('#FFFFFF');
  const g = new Graphics();
  // wheels peeking out at the corners, then the round body
  for (const [x, y] of [[-24, -W / 2 - 2], [20, -W / 2 - 2], [-24, W / 2 - 6], [20, W / 2 - 6]]) g.roundRect(x - 8, y, 16, 8, 4).fill('#2C3E52');
  g.roundRect(-L / 2, -W / 2, L, W, 24).fill(color);
  g.roundRect(-L / 2 - 2, -W / 2 + 10, 4, W - 20, 2).fill('#D9DEE3')                // chrome bumpers
    .roundRect(L / 2 - 2, -W / 2 + 10, 4, W - 20, 2).fill('#D9DEE3');
  g.ellipse(L / 2 - 9, -W / 2 + 9, 6, 5).fill('#FFF4C2').stroke({ width: 1.5, color: '#D9DEE3' })   // round headlights
    .ellipse(L / 2 - 9, W / 2 - 9, 6, 5).fill('#FFF4C2').stroke({ width: 1.5, color: '#D9DEE3' });
  g.moveTo(L / 2 - 4, -6).lineTo(L / 2 - 4, 6).stroke({ width: 2, color: '#D9DEE3' });   // the little chrome moustache on the nose
  g.roundRect(-L / 2 + 3, -10, 7, 20, 2).fill({ color: NAVY, alpha: 0.18 });             // engine louvres at the back
  g.roundRect(4, -W / 2 + 6, 13, W - 12, 6).fill('#2B3F55');                              // windscreen
  g.roundRect(-24, -W / 2 + 7, 30, W - 14, 9).fill('#F4F1EA');                            // the roof (cream)
  g.roundRect(-20, -W / 2 + 12, 24, W - 24, 6).fill('#3A4A5C');                           // the canvas roof, rolled back open
  g.roundRect(-24, -W / 2 + 12, 6, W - 24, 3).fill('#8A9099');                            // (the folded canvas)
  // Poppop, from above: a bald crown with his fluffy white hair round the back and sides
  const poppop = new Graphics()
    .ellipse(-6, -2, 9, 8).fill('#EDEDED').stroke({ width: 1, color: '#C9CDD2' })
    .ellipse(-4, -2, 6.5, 6).fill('#F0C4A8')
    .ellipse(-3, -3.5, 2.5, 1.8).fill({ color: '#FFFFFF', alpha: 0.45 });
  poppop.position.set(0, -8);   // the driver's seat (on the left)
  const art = new Container(); art.addChild(g, poppop); art.scale.set(S);
  const body = new Container(); body.addChild(band, art);
  return { body, poppop };
}

export class Fiat {
  readonly view = new Container();
  readonly loop = new Loop(roundCorners(poppopRoute(), 150));
  s = 0; speed = 0;
  out = false;
  wait = FIAT.firstRun;            // s until he goes for a drive
  blockedBy: string | null = null; // what he's stopped for
  private stuck = 0; private squeeze = 0;
  private body: Container; private shadow: Graphics; private poppop: Container;

  constructor() {
    ({ body: this.body, poppop: this.poppop } = fiatArt(FIAT.color));
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
  go() { if (!this.out) { this.out = true; this.s = 0; this.speed = 0; } }

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
    // ease into the parking spot at the end
    const left = this.loop.length - this.s, park = Math.max(40, Math.sqrt(2 * FIAT.brake * 0.35 * left));
    this.speed = blocked ? Math.max(0, this.speed - FIAT.brake * dt) : Math.min(top, park, this.speed + FIAT.acc * dt);
    this.s += this.speed * dt;
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
    this.poppop.visible = this.out;   // parked: he's in the woodshop
  }
}
