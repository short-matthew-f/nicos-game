// Little puffs of dust (or sand) that give things weight: kicked up by footsteps on sand, and a ring
// of it when something heavy lands (a sticker slapped onto the world). They grow, drift up and fade.
import { Container, Graphics } from 'pixi.js';

interface Puff { g: Graphics; vx: number; vy: number; t: number; life: number; grow: number }
export class Dust {
  readonly view = new Container();
  private puffs: Puff[] = [];
  constructor() { this.view.sortableChildren = false; }
  /** n puffs at (x, y), thrown out sideways by `spread` px/s. */
  puff(x: number, y: number, color: string, n = 3, spread = 60, size = 10) {
    for (let i = 0; i < n; i++) {
      const g = new Graphics().circle(0, 0, size).fill(color); g.alpha = 0.55; g.position.set(x + (Math.random() - 0.5) * 12, y);
      const a = Math.random() * Math.PI * 2;
      this.view.addChild(g); this.puffs.push({ g, vx: Math.cos(a) * spread, vy: Math.sin(a) * spread * 0.4 - 12, t: 0, life: 0.45 + Math.random() * 0.25, grow: 1.6 + Math.random() });
    }
  }
  /** A ring of dust along the bottom of a box: something just landed there. */
  land(x: number, y: number, w: number, color = '#E9DCC7') {
    for (let i = 0; i <= 10; i++) this.puff(x + (w * i) / 10, y, color, 1, 110, 16);
  }
  update(dt: number) {
    for (const p of this.puffs) {
      p.t += dt; const k = p.t / p.life;
      p.g.x += p.vx * dt; p.g.y += p.vy * dt; p.vx *= 0.9; p.vy *= 0.9;
      p.g.scale.set(1 + (p.grow - 1) * k); p.g.alpha = 0.55 * (1 - k);
    }
    for (let i = this.puffs.length - 1; i >= 0; i--) if (this.puffs[i].t >= this.puffs[i].life) { this.puffs[i].g.destroy(); this.puffs.splice(i, 1); }
  }
}
