// Ambient traffic: cars follow lane loops, keep their distance, and stop for Nico.
import { Container, Graphics } from 'pixi.js';
import { Loop, roundCorners } from './path';
import { carLoops } from './map';
import { NAVY } from './draw';
import { CAR, CAR_SCALE, circles } from '../drive';

const MAX = 250, ACC = 320, BRAKE = 680, GAP = CAR.len * 1.7;
// the zone in front of a car where something makes it brake
export const SQUEEZE = { after: 6, for: 5, speed: 70 };
export const AHEAD = { near: CAR.len * 0.1, far: CAR.len * 1.35, side: CAR.wid * 0.93 };
const COLORS = ['#F9A826', '#D77B72', '#5FAFA5', '#5B8FD6', '#E8B64A', '#9B7BC8'];

function carArt(color: string, taxi: boolean, stripe?: string): Container {
  // top-down, pointing +x; base art 112 x 56 drawn at CAR_SCALE, with the white band kept
  // at the same width as everything else's
  const L = 112, W = 56, B = 7, S = CAR_SCALE;
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
  speed = MAX;
  blockedBy: string | null = null;   // tag of what it's stopped for, if anything
  private stuck = 0;                 // s spent waiting on Nico's car
  private squeeze = 0;               // s left squeezing past it (it's been parked in the way too long)
  constructor(readonly loop: Loop, public s: number, color: string, taxi = false) {
    ({ view: this.view, turn: this.turn } = carSprite(color, taxi));
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
    if (this.stuck > SQUEEZE.after) { this.squeeze = SQUEEZE.for; this.stuck = 0; }
    const top = this.squeeze > 0 ? SQUEEZE.speed : MAX;
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
      cars.push(new Car(loop, (loop.length / perLoop) * i + li * 480, COLORS[(li * perLoop + i) % COLORS.length], i === 0));
  });
  return cars;
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
