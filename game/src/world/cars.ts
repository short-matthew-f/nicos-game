// Ambient traffic: cars follow lane loops, keep their distance, and stop for Nico.
import { Container, Graphics } from 'pixi.js';
import { Loop, roundCorners } from './path';
import { carLoops } from './map';
import { NAVY } from './draw';

const MAX = 190, ACC = 260, BRAKE = 520, GAP = 190;
const COLORS = ['#F9A826', '#D77B72', '#5FAFA5', '#5B8FD6', '#E8B64A', '#9B7BC8'];

function carArt(color: string, taxi: boolean): Graphics {
  // top-down, pointing +x, length 112, width 56
  const g = new Graphics();
  const L = 112, W = 56, B = 7;
  g.roundRect(-L / 2 - B, -W / 2 - B, L + 2 * B, W + 2 * B, 18 + B).fill('#FFFFFF');
  for (const [x, y] of [[-30, -W / 2 - 3], [26, -W / 2 - 3], [-30, W / 2 - 7], [26, W / 2 - 7]]) g.roundRect(x - 10, y, 20, 10, 4).fill('#2C3E52');
  g.roundRect(-L / 2, -W / 2, L, W, 18).fill(color);
  g.roundRect(-14, -W / 2 + 6, 44, W - 12, 10).fill('#2B3F55');      // cabin glass
  g.roundRect(-8, -W / 2 + 9, 30, W - 18, 8).fill(color);             // roof
  g.roundRect(L / 2 - 8, -W / 2 + 6, 5, 12, 2).fill('#FFF4C2').roundRect(L / 2 - 8, W / 2 - 18, 5, 12, 2).fill('#FFF4C2');
  if (taxi) g.roundRect(-2, -9, 16, 18, 4).fill('#FFFFFF').rect(2, -5, 8, 10).fill('#2B3F55');
  return g;
}

export class Car {
  readonly view = new Container();
  private body: Graphics; private shadow: Graphics;
  speed = MAX;
  constructor(readonly loop: Loop, public s: number, color: string, taxi = false) {
    this.body = carArt(color, taxi);
    this.shadow = new Graphics().roundRect(-56, -28, 112, 56, 18).fill({ color: NAVY, alpha: 0.18 });
    this.shadow.position.set(6, 10);
    this.view.addChild(this.shadow, this.body);
  }
  get pos() { return this.loop.at(this.s); }
  update(dt: number, ahead: Car | null, nico: [number, number]) {
    const [x, y] = this.pos, h = this.loop.heading(this.s);
    const fx = Math.cos(h), fy = Math.sin(h);
    // Nico in the zone in front of the car?
    const rx = nico[0] - x, ry = nico[1] - y;
    const along = rx * fx + ry * fy, side = Math.abs(-rx * fy + ry * fx);
    let blocked = along > 30 && along < 150 && side < 48;
    if (ahead) {
      const gap = ((ahead.s - this.s) % this.loop.length + this.loop.length) % this.loop.length;
      if (gap < GAP) blocked = true;
    }
    this.speed = blocked ? Math.max(0, this.speed - BRAKE * dt) : Math.min(MAX, this.speed + ACC * dt);
    this.s = (this.s + this.speed * dt) % this.loop.length;
    const [nx, ny] = this.pos;
    this.view.position.set(nx, ny);
    this.body.rotation = this.shadow.rotation = this.loop.heading(this.s);
    this.view.zIndex = ny + 22;
  }
}

export function makeTraffic(perLoop = 3): Car[] {
  const cars: Car[] = [];
  carLoops().forEach((pts, li) => {
    const loop = new Loop(roundCorners(pts, li === 0 ? 70 : 110));
    for (let i = 0; i < perLoop; i++)
      cars.push(new Car(loop, (loop.length / perLoop) * i + li * 300, COLORS[(li * perLoop + i) % COLORS.length], i === 0));
  });
  return cars;
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
