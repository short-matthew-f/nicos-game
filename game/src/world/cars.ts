// Ambient traffic: cars follow lane loops, keep their distance, and stop for Nico.
import { Container, Graphics } from 'pixi.js';
import { Loop, roundCorners } from './path';
import { carLoops, BUS_STOPS } from './map';
import { NAVY, BAND as B } from './draw';
import { CAR, CAR_SCALE, circles } from '../drive';

const MAX = 250, ACC = 320, BRAKE = 680, GAP = CAR.len * 1.7;
// the zone in front of a car where something makes it brake
export const SQUEEZE = { after: 6, for: 5, speed: 70 };
export const AHEAD = { near: CAR.len * 0.1, far: CAR.len * 1.35, side: CAR.wid * 0.93 };
const COLORS = ['#F9A826', '#D77B72', '#5FAFA5', '#5B8FD6', '#E8B64A', '#9B7BC8'];

function carArt(color: string, taxi: boolean, stripe?: string): Container {
  // top-down, pointing +x; base art 112 x 56 drawn at CAR_SCALE, with the white band kept
  // at the same width as everything else's
  const L = 112, W = 56, S = CAR_SCALE;
  const band = new Graphics().roundRect(-L * S / 2 - B, -W * S / 2 - B, L * S + 2 * B, W * S + 2 * B, 18 * S + B).fill('#FFFFFF');
  const g = new Graphics(); g.scale.set(S);
  for (const [x, y] of [[-30, -W / 2 - 3], [26, -W / 2 - 3], [-30, W / 2 - 7], [26, W / 2 - 7]]) g.roundRect(x - 10, y, 20, 10, 4).fill('#2C3E52');
  g.roundRect(-L / 2, -W / 2, L, W, 18).fill(color);
  g.roundRect(-14, -W / 2 + 6, 44, W - 12, 10).fill('#2B3F55');      // cabin glass
  g.roundRect(-8, -W / 2 + 9, 30, W - 18, 8).fill(color);             // roof
  g.roundRect(L / 2 - 8, -W / 2 + 6, 5, 12, 2).fill('#FFF4C2').roundRect(L / 2 - 8, W / 2 - 18, 5, 12, 2).fill('#FFF4C2');
  if (stripe) g.rect(-L / 2 + 4, -5, L - 8, 10).fill(stripe);   // racing stripe over the roof
  if (taxi) g.roundRect(-2, -9, 16, 18, 4).fill('#FFFFFF').rect(2, -5, 8, 10).fill('#2B3F55');
  const c = new Container(); c.addChild(band, g);
  return c;
}

/** The school bus: long and yellow, rows of windows down both sides. Base art 150 x 62. */
function busArt(): Container {
  const L = 150, W = 62, S = CAR_SCALE;
  const band = new Graphics().roundRect(-L * S / 2 - B, -W * S / 2 - B, L * S + 2 * B, W * S + 2 * B, 12 * S + B).fill('#FFFFFF');
  const g = new Graphics(); g.scale.set(S);
  for (const x of [-48, 36, 54]) for (const y of [-W / 2 - 3, W / 2 - 7]) g.roundRect(x - 10, y, 20, 10, 4).fill('#2C3E52');
  g.roundRect(-L / 2, -W / 2, L, W, 12).fill('#F7C21B');
  g.rect(-L / 2 + 4, -W / 2 + 4, L - 26, 6).fill('#2B3F55').rect(-L / 2 + 4, W / 2 - 10, L - 26, 6).fill('#2B3F55');   // black side stripes
  for (let x = -L / 2 + 12; x < L / 2 - 30; x += 18) g.roundRect(x, -W / 2 + 12, 12, 10, 2).fill('#CFE6F7').roundRect(x, W / 2 - 22, 12, 10, 2).fill('#CFE6F7');
  g.roundRect(L / 2 - 24, -W / 2 + 8, 14, W - 16, 4).fill('#2B3F55');                                                 // windscreen
  g.roundRect(L / 2 - 8, -W / 2 + 6, 5, 12, 2).fill('#FFF4C2').roundRect(L / 2 - 8, W / 2 - 18, 5, 12, 2).fill('#FFF4C2');
  g.rect(-L / 2 + 16, -10, L - 60, 20).fill('#F2B705');                                                              // roof ridge
  const c = new Container(); c.addChild(band, g);
  return c;
}
export const BUS = { len: 150 * CAR_SCALE, wid: 62 * CAR_SCALE, dwell: 3.5 };

/** A car with its shadow; turn(h) points it (the shadow stays offset down-right). */
export function carSprite(color: string, taxi = false, stripe?: string): { view: Container; turn: (h: number) => void } {
  const view = new Container();
  const body = carArt(color, taxi, stripe);
  const shadow = new Graphics().roundRect(-CAR.len / 2, -CAR.wid / 2, CAR.len, CAR.wid, 18 * CAR_SCALE).fill({ color: NAVY, alpha: 0.18 });
  shadow.position.set(6, 10);
  view.addChild(shadow, body);
  return { view, turn: h => { body.rotation = shadow.rotation = h; } };
}

export class Car {
  readonly view: Container;
  private turn: (h: number) => void;
  /** The bus: places along its loop where it pulls in for a few seconds. */
  stops: number[] = [];
  private dwell = 0; private lastStop = -1;
  isBus = false;
  speed = MAX;
  blockedBy: string | null = null;   // tag of what it's stopped for, if anything
  private stuck = 0;                 // s spent waiting on Nico's car
  waitedOnNico = 0;                  // s spent stopped for Nico or his car (for honking)
  honked = 0;                        // s since its last honk
  private squeeze = 0;               // s left squeezing past it (it's been parked in the way too long)
  constructor(readonly loop: Loop, public s: number, color: string, taxi = false) {
    ({ view: this.view, turn: this.turn } = carSprite(color, taxi));
  }

  static bus(loop: Loop, s: number, stops: number[]): Car {
    const c = new Car(loop, s, '#F7C21B');
    c.isBus = true; c.stops = stops;
    const body = busArt(), shadow = new Graphics().roundRect(-BUS.len / 2, -BUS.wid / 2, BUS.len, BUS.wid, 12 * CAR_SCALE).fill({ color: NAVY, alpha: 0.18 });
    shadow.position.set(6, 10);
    c.view.removeChildren(); c.view.addChild(shadow, body);
    c.turn = h => { body.rotation = shadow.rotation = h; };
    return c;
  }
  get pos() { return this.loop.at(this.s); }
  /** Drive on, braking for the car ahead and for anything (Nico, his car, the fire
   * truck) standing in the zone in front. */
  update(dt: number, ahead: Car | null, blockers: [number, number, string?][]) {
    const [x, y] = this.pos, h = this.loop.heading(this.s);
    const fx = Math.cos(h), fy = Math.sin(h);
    let blocked = false;
    this.blockedBy = null;
    if (this.squeeze > 0) this.squeeze -= dt;
    for (const b of blockers) {
      if (this.squeeze > 0 && b[2] === 'mine') continue;
      const rx = b[0] - x, ry = b[1] - y;
      const along = rx * fx + ry * fy, side = Math.abs(-rx * fy + ry * fx);
      if (along > AHEAD.near && along < AHEAD.far && side < AHEAD.side) { blocked = true; this.blockedBy = b[2] ?? null; break; }
    }
    if (ahead) {
      const gap = ((ahead.s - this.s) % this.loop.length + this.loop.length) % this.loop.length;
      if (gap < GAP) blocked = true;
    }
    // waiting on Nico's car for ages (he parked or crashed in the lane): squeeze past slowly
    this.stuck = this.blockedBy === 'mine' && this.speed < 5 ? this.stuck + dt : 0;
    this.waitedOnNico = (this.blockedBy === 'mine' || this.blockedBy === 'nico') && this.speed < 5 ? this.waitedOnNico + dt : 0;
    this.honked += dt;
    if (this.stuck > SQUEEZE.after) { this.squeeze = SQUEEZE.for; this.stuck = 0; }
    const top = this.squeeze > 0 ? SQUEEZE.speed : MAX;
    // the bus pulls in at its stops: brake to the mark, wait, then go on
    if (this.dwell > 0) { this.dwell -= dt; blocked = true; this.speed = 0; }
    else for (let i = 0; i < this.stops.length; i++) {
      if (i === this.lastStop) continue;
      const left = ((this.stops[i] - this.s) % this.loop.length + this.loop.length) % this.loop.length;
      // (the stop window must be wider than the braking margin, or it parks just short, forever)
      if (left <= 12) { this.dwell = BUS.dwell; this.lastStop = i; this.speed = 0; blocked = true; break; }
      if (left < this.speed * this.speed / (2 * BRAKE) + 6) blocked = true;
    }
    this.speed = blocked ? Math.max(0, this.speed - BRAKE * dt) : Math.min(top, this.speed + ACC * dt);
    this.s = (this.s + this.speed * dt) % this.loop.length;
    const [nx, ny] = this.pos;
    this.view.position.set(nx, ny);
    this.turn(this.loop.heading(this.s));
    this.view.zIndex = ny + CAR.wid * 0.4;
  }
}

export function makeTraffic(perLoop = 4): Car[] {
  const cars: Car[] = [];
  carLoops().forEach((pts, li) => {
    const loop = new Loop(roundCorners(pts, li === 0 ? 110 : 170));
    for (let i = 0; i < perLoop; i++)
      cars.push(i === 1 && li === 0
        // one of the inner loop's cars is the school bus, stopping at the park's bus stops
        ? Car.bus(loop, (loop.length / perLoop) * i, BUS_STOPS.map(([x, y]) => nearestS(loop, x, y)))
        : new Car(loop, (loop.length / perLoop) * i + li * 480, COLORS[(li * perLoop + i) % COLORS.length], i === 0));
  });
  return cars;
}

function nearestS(loop: Loop, x: number, y: number): number {
  let best = 0, bd = Infinity;
  for (let s = 0; s < loop.length; s += 5) { const [px, py] = loop.at(s), d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = s; } }
  return best;
}

/** Collision circles of the ambient cars, for Nico's car to bump into. */
export function carCirclesOf(cars: Car[]): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (const c of cars) { const [x, y] = c.pos; out.push(...circles(x, y, c.loop.heading(c.s))); }
  return out;
}

/** Each car's next car on the same loop. */
export function leaders(cars: Car[]): (Car | null)[] {
  return cars.map(c => {
    let best: Car | null = null, bg = Infinity;
    for (const o of cars) if (o !== c && o.loop === c.loop) {
      const g = ((o.s - c.s) % c.loop.length + c.loop.length) % c.loop.length;
      if (g < bg) { bg = g; best = o; }
    }
    return best;
  });
}
