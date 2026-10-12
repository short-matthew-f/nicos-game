// The pool's water (the user: "there's something wrong about the water in the pool"). It used to be a flat blue box
// with white stripes across it and a white blob floating on top. Now it has depth: the far wall's tiles show under
// the water's edge, a tiled floor with dark lane lines down it (as real pools have), a deep end that's a little
// darker, and light rippling over it all (the moving part: PoolRipples).
import { Container, Graphics } from 'pixi.js';
import { POOL } from './zones';

/** The water, drawn once into the ground. */
export function poolWater(g: Graphics) {
  const { x, y, w, d } = POOL;
  g.roundRect(x - 18, y - 18, w + 36, d + 36, 22).fill('#FFFFFF');                 // the coping
  g.roundRect(x - 6, y - 6, w + 12, d + 12, 16).fill('#BFE3EE');                    // a row of edge tiles
  g.roundRect(x, y, w, d, 12).fill('#47BCE6');
  g.rect(x + w * 0.62, y, w * 0.38 - 12, d).fill({ color: '#1E7FB8', alpha: 0.16 });   // the deep end
  g.rect(x + w * 0.62 - 40, y, 40, d).fill({ color: '#1E7FB8', alpha: 0.08 });
  for (let i = 1; i * 40 < w; i++) g.rect(x + i * 40, y + 30, 1.5, d - 34).fill({ color: '#FFFFFF', alpha: 0.12 });   // floor tiles
  for (let j = 1; j * 40 < d - 30; j++) g.rect(x + 4, y + 30 + j * 40, w - 8, 1.5).fill({ color: '#FFFFFF', alpha: 0.12 });
  for (let i = 1; i < 5; i++) {                                                      // lane lines on the floor, with their T ends
    const ly = y + 30 + i * (d - 30) / 5;
    g.rect(x + 60, ly - 4, w - 120, 8).fill({ color: '#155E96', alpha: 0.45 });
    g.rect(x + 56, ly - 16, 8, 32).fill({ color: '#155E96', alpha: 0.45 }).rect(x + w - 64, ly - 16, 8, 32).fill({ color: '#155E96', alpha: 0.45 });
  }
  g.rect(x, y, w, 30).fill('#2B93C8');                                               // the far wall, seen through the water
  for (let i = 0; i * 26 < w; i++) g.rect(x + i * 26, y, 1.5, 30).fill({ color: '#FFFFFF', alpha: 0.18 });
  g.rect(x, y + 28, w, 4).fill({ color: '#FFFFFF', alpha: 0.35 });                   // where the wall meets the floor (seen through the water)
  // depth markings on the coping
  for (const [mx, t] of [[x + 70, 3], [x + w - 90, 9]] as [number, number][]) {
    g.roundRect(mx - 16, y + d + 4, 32, 10, 3).fill('#2B3F55');
    for (let k = 0; k < (t > 5 ? 2 : 1); k++) g.rect(mx - 10 + k * 12, y + d + 6, 6, 6).fill('#FFFFFF');
  }
}

/** Light rippling over the water: a few dozen wavy glints, drifting. */
export class PoolRipples {
  readonly view = new Container();
  private g = new Graphics(); private t = 0; private n = 0;
  private glints: { x: number; y: number; len: number; ph: number; sp: number }[] = [];
  constructor() {
    this.view.addChild(this.g);
    let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 46; i++) this.glints.push({ x: rnd() * (POOL.w - 80) + 40, y: 44 + rnd() * (POOL.d - 60), len: 26 + rnd() * 34, ph: rnd() * 6.28, sp: 6 + rnd() * 10 });
    this.draw();
  }
  update(dt: number, visible: boolean) {
    this.t += dt; if (!visible || ++this.n % 2) return;
    this.draw();
  }
  private draw() {
    const g = this.g.clear(), t = this.t;
    for (const q of this.glints) {
      const x0 = POOL.x + ((q.x + t * q.sp) % (POOL.w - 60)) + 20, y0 = POOL.y + q.y + Math.sin(t * 0.8 + q.ph) * 4;
      g.moveTo(x0, y0);
      for (let k = 1; k <= 6; k++) g.lineTo(x0 + q.len * k / 6, y0 + Math.sin(k * 1.1 + t * 2.2 + q.ph) * 3.2);
      g.stroke({ width: 2.6, color: '#FFFFFF', alpha: 0.32 + 0.18 * Math.sin(t * 1.7 + q.ph), cap: 'round' });
    }
    for (let i = 0; i < 8; i++) {   // sparkles, here and gone
      const s = (Math.floor(t * 2) * 7 + i * 13) % 97, sx = POOL.x + 40 + (s * 53) % (POOL.w - 80), sy = POOL.y + 50 + (s * 31) % (POOL.d - 70), a = Math.max(0, Math.sin((t * 2 % 1) * Math.PI));
      g.circle(sx, sy, 2.4).fill({ color: '#FFFFFF', alpha: 0.7 * a });
    }
  }
}
