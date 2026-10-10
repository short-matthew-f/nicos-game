// Little bits of life: pigeons that scatter when you come close, cloud shadows drifting
// over town, and coins tucked away in corners for whoever explores.
import { Container, Graphics } from 'pixi.js';
import { WORLD } from './map';
import { NAVY } from './draw';

// ---------------------------------------------------------------- pigeons
export const FLOCKS: [number, number][] = [[2250, 2090], [1700, 1830], [1900, 700], [3550, 806], [560, 1080], [2300, 3050], [4400, 1880], [700, 2480]];
const SCARE = 150, RETURN_AFTER = 18;

function pigeonArt(): Graphics {
  const g = new Graphics();
  g.ellipse(0, -9, 14, 9).fill('#FFFFFF').circle(10, -18, 8).fill('#FFFFFF');
  g.ellipse(0, -9, 10, 6).fill('#9AA3B0').ellipse(-3, -10, 6, 3.5).fill('#7D8794')
   .circle(10, -18, 5).fill('#8A93A0').poly([14, -19, 19, -17, 14, -16]).fill('#E3A857').circle(11, -19, 1.2).fill(NAVY)
   .rect(-1, -3, 1.5, 4).fill('#E5484D').rect(3, -3, 1.5, 4).fill('#E5484D');
  return g;
}

interface Bird { home: [number, number]; x: number; y: number; vx: number; vy: number; up: number; t: number; flying: boolean; gone: number; view: Container }

export class Pigeons {
  readonly views: Container[] = [];
  private birds: Bird[] = [];
  /** Fires when a flock takes off (for a flap sound). */
  onScatter: () => void = () => {};
  constructor() {
    for (const [fx, fy] of FLOCKS) for (let i = 0; i < 4; i++) {
      const view = new Container(); view.addChild(pigeonArt());
      const home: [number, number] = [fx + (i % 2) * 34 - 17 + i * 6, fy + Math.floor(i / 2) * 22 - 11];
      this.birds.push({ home, x: home[0], y: home[1], vx: 0, vy: 0, up: 0, t: Math.random() * 5, flying: false, gone: 0, view });
      this.views.push(view);
    }
  }
  update(dt: number, scarers: [number, number][]) {
    let scattered = false;
    for (const b of this.birds) {
      b.t += dt;
      if (!b.flying && b.gone <= 0) {
        if (scarers.some(([x, y]) => Math.hypot(x - b.x, y - b.y) < SCARE)) {
          const [sx, sy] = scarers.reduce((a, c) => (Math.hypot(c[0] - b.x, c[1] - b.y) < Math.hypot(a[0] - b.x, a[1] - b.y) ? c : a));
          const d = Math.hypot(b.x - sx, b.y - sy) || 1;
          b.flying = true; b.vx = (b.x - sx) / d * 260 + (Math.random() - 0.5) * 80; b.vy = (b.y - sy) / d * 120 - 60;
          scattered = true;
        }
        // pecking: hop and bob a little
        b.view.position.set(b.x, b.y - Math.max(0, Math.sin(b.t * 5)) * 2);
        b.view.scale.set(Math.sin(b.t * 0.7) > 0 ? 1 : -1, 1);
        b.view.alpha = 1;
      } else if (b.flying) {
        b.x += b.vx * dt; b.y += b.vy * dt; b.up += 160 * dt;
        b.view.position.set(b.x, b.y - b.up);
        b.view.scale.set(b.vx >= 0 ? 1 : -1, 0.6 + 0.4 * Math.abs(Math.sin(b.t * 18)));   // flapping
        b.view.alpha = Math.max(0, 1 - b.up / 260);
        if (b.up > 260) { b.flying = false; b.gone = RETURN_AFTER + Math.random() * 6; b.view.visible = false; }
      } else {
        b.gone -= dt;
        if (b.gone <= 0) { b.x = b.home[0]; b.y = b.home[1]; b.up = 0; b.view.visible = true; }
      }
      b.view.zIndex = b.y;
    }
    if (scattered) this.onScatter();
  }
}

// ---------------------------------------------------------------- clouds
export class Clouds {
  readonly view = new Container();
  private clouds: { g: Graphics; speed: number }[] = [];
  constructor() {
    let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 6; i++) {
      const g = new Graphics();
      for (let k = 0; k < 5; k++) g.ellipse((k - 2) * 120 + rnd() * 60, rnd() * 80 - 40, 160 + rnd() * 80, 90 + rnd() * 40).fill(NAVY);
      g.alpha = 0.07;
      g.position.set(rnd() * WORLD.w, rnd() * WORLD.h);
      this.view.addChild(g);
      this.clouds.push({ g, speed: 14 + rnd() * 14 });
    }
  }
  update(dt: number) {
    for (const c of this.clouds) {
      c.g.x += c.speed * dt; c.g.y += c.speed * 0.25 * dt;
      if (c.g.x > WORLD.w + 500) c.g.x = -500;
      if (c.g.y > WORLD.h + 300) c.g.y = -300;
    }
  }
}

// ---------------------------------------------------------------- coins
export const COIN_SPOTS: [number, number][] = [
  [30, 30 + 700], [1030, 60], [1520, 700], [2930, 60], [4840, 640], [4830, 1300], [960, 2110],
  [30, 1700], [2900, 1590], [3290, 2110], [4830, 2470], [1400, 3480], [3000, 3480], [4830, 3480], [30, 3480],
];
export const COIN = { r: 40, value: 1, respawn: 180 };

export class Coins {
  readonly views: Container[] = [];
  private gone: number[];
  private t = 0;
  constructor() {
    this.gone = COIN_SPOTS.map(() => 0);
    for (const [x, y] of COIN_SPOTS) {
      const g = new Graphics();
      g.ellipse(0, 3, 14, 5).fill({ color: NAVY, alpha: 0.2 });
      const coin = new Graphics().circle(0, 0, 17).fill('#FFFFFF').circle(0, 0, 13).fill('#F9C846').circle(0, 0, 9).fill('#FFDE7A')
        .roundRect(-2, -6, 4, 12, 2).fill('#E3A12F');
      coin.position.set(0, -22); coin.label = 'coin';
      const c = new Container(); c.addChild(g, coin); c.position.set(x, y); c.zIndex = y;
      this.views.push(c);
    }
  }
  get available() { return this.gone.filter(g => g <= 0).length; }
  /** Spin and bob; collect any within reach of a collector. Returns coins collected. */
  update(dt: number, collectors: [number, number][]): number {
    this.t += dt;
    let got = 0;
    COIN_SPOTS.forEach(([x, y], i) => {
      const v = this.views[i];
      if (this.gone[i] > 0) { this.gone[i] -= dt; v.visible = this.gone[i] <= 0; return; }
      const coin = v.children[1];
      coin.scale.x = Math.cos(this.t * 3 + i);
      coin.y = -22 - Math.sin(this.t * 2 + i) * 4;
      if (collectors.some(([cx, cy]) => Math.hypot(cx - x, cy - y) < COIN.r)) { this.gone[i] = COIN.respawn; v.visible = false; got++; }
    });
    return got;
  }
}
