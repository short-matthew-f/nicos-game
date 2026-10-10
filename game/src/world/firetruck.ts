// The fire truck: now and then the alarm goes, it races out of the station with its
// lights flashing and siren going, does a lap of the ring road and comes home.
import { Container, Graphics } from 'pixi.js';
import { Loop, roundCorners } from './path';
import { fireRoute } from './map';
import { NAVY } from './draw';

const S = 1.4;   // drawn at 1.4x its base art (160 x 64)
export const TRUCK = { max: 330, acc: 240, brake: 760, len: 160 * S, wid: 64 * S, firstRun: 25, every: [70, 130] as [number, number] };

function truckArt(): { body: Container; lights: [Graphics, Graphics] } {
  const L = 160, W = 64, B = 7;
  const band = new Graphics().roundRect(-L * S / 2 - B, -W * S / 2 - B, L * S + 2 * B, W * S + 2 * B, 14 * S + B).fill('#FFFFFF');
  const g = new Graphics();
  for (const x of [-52, -14, 44]) for (const y of [-W / 2 - 3, W / 2 - 7]) g.roundRect(x - 11, y, 22, 10, 4).fill('#2C3E52');
  g.roundRect(-L / 2, -W / 2, L, W, 14).fill('#D9342B');
  g.roundRect(L / 2 - 44, -W / 2 + 6, 22, W - 12, 6).fill('#2B3F55');      // windscreen
  g.roundRect(L / 2 - 20, -W / 2 + 4, 14, W - 8, 6).fill('#C22A22');       // bonnet
  // ladder along the top
  g.rect(-L / 2 + 8, -12, L - 64, 4).fill('#E6EAEE').rect(-L / 2 + 8, 8, L - 64, 4).fill('#E6EAEE');
  for (let x = -L / 2 + 14; x < L / 2 - 58; x += 14) g.rect(x, -10, 3, 20).fill('#E6EAEE');
  g.rect(-L / 2 + 2, -W / 2 + 2, L - 4, 5).fill('#FFFFFF');                 // stripe
  const red = new Graphics().roundRect(L / 2 - 58, -W / 2 + 6, 10, W / 2 - 8, 3).fill('#FF4D4D');
  const blue = new Graphics().roundRect(L / 2 - 58, 2, 10, W / 2 - 8, 3).fill('#4DA3FF');
  const art = new Container(); art.addChild(g, red, blue); art.scale.set(S);
  const body = new Container(); body.addChild(band, art);
  return { body, lights: [red, blue] };
}

export type Blocker = [number, number, string?];   // a point to brake for, tagged by who it is

export class FireTruck {
  readonly view = new Container();
  readonly loop = new Loop(roundCorners(fireRoute(), 80));
  s = 0; speed = 0;
  out = false;
  wait = TRUCK.firstRun;      // s until the next alarm
  private t = 0;
  private body: Container; private shadow: Graphics; private lights: [Graphics, Graphics];

  constructor() {
    ({ body: this.body, lights: this.lights } = truckArt());
    this.shadow = new Graphics().roundRect(-TRUCK.len / 2, -TRUCK.wid / 2, TRUCK.len, TRUCK.wid, 14 * S).fill({ color: NAVY, alpha: 0.18 });
    this.shadow.position.set(6, 10);
    this.view.addChild(this.shadow, this.body);
    this.place();
  }

  get pos() { return this.loop.at(this.s); }
  get heading() { return this.loop.heading(this.s); }
  /** Points along the truck, for traffic to brake for. */
  points(): [number, number][] {
    const [x, y] = this.pos, h = this.heading;
    return [-0.38, -0.13, 0.13, 0.38].map(f => f * TRUCK.len).map(a => [x + Math.cos(h) * a, y + Math.sin(h) * a]);
  }

  /** Ring the alarm now (also used by tests). */
  alarm() { if (!this.out) { this.out = true; this.s = 0; this.speed = 0; } }

  /** `yieldTo`: things in front to stop for. Cars already stopped for the truck are left
   * out by the caller, so the two never wait for each other. Returns true while out. */
  update(dt: number, yieldTo: [number, number][]): boolean {
    this.t += dt;
    if (!this.out) {
      this.wait -= dt;
      if (this.wait <= 0) this.alarm();
      this.place(); return false;
    }
    const [x, y] = this.pos, h = this.heading, fx = Math.cos(h), fy = Math.sin(h);
    let blocked = false;
    for (const [bx, by] of yieldTo) {
      const rx = bx - x, ry = by - y;
      const along = rx * fx + ry * fy, side = Math.abs(-rx * fy + ry * fx);
      if (along > TRUCK.len * 0.1 && along < TRUCK.len * 1.2 && side < TRUCK.wid * 0.85) { blocked = true; break; }
    }
    this.speed = blocked ? Math.max(0, this.speed - TRUCK.brake * dt) : Math.min(TRUCK.max, this.speed + TRUCK.acc * dt);
    this.s += this.speed * dt;
    if (this.s >= this.loop.length) {
      this.out = false; this.s = 0; this.speed = 0;
      this.wait = TRUCK.every[0] + Math.random() * (TRUCK.every[1] - TRUCK.every[0]);
    }
    this.place();
    return this.out;
  }

  private place() {
    const [x, y] = this.pos;
    this.view.position.set(x, y);
    this.body.rotation = this.shadow.rotation = this.heading;
    this.view.zIndex = y + TRUCK.wid * 0.4;
    // inside the station, the front wall hides it; lights flash while it's out
    const on = this.out && Math.floor(this.t * 4) % 2 === 0;
    this.lights[0].alpha = this.out ? (on ? 1 : 0.25) : 0.25;
    this.lights[1].alpha = this.out ? (on ? 0.25 : 1) : 0.25;
  }
}
