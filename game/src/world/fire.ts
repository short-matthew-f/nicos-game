// A fire call: smoke and flames in a building's front window until the fire truck has sprayed it
// out, with an arc of water from the truck while it does.
import { Container, Graphics } from 'pixi.js';
import type { Building } from './map';

interface Puff { g: Graphics; t: number; life: number; x: number; y: number; vx: number; vy: number; r: number; kind: 'smoke' | 'water' }

export class FireScene {
  readonly view = new Container();
  private puffs: Puff[] = [];
  private flames = new Graphics();
  private b: Building | null = null;
  private strength = 0;   // 1 burning hard .. 0 out
  private t = 0;
  constructor() { this.view.addChild(this.flames); this.view.zIndex = 1e6; }

  get burning() { return !!this.b && this.strength > 0; }
  get building() { return this.b; }
  start(b: Building) { this.b = b; this.strength = 1; }

  /** `hose`: the truck's nozzle while it sprays (null otherwise). */
  update(dt: number, hose: [number, number] | null) {
    this.t += dt;
    const b = this.b;
    if (b) {
      // the fire's in a front window to one side of the door, where you can see it from the street
      const roof: [number, number] = [b.x + b.w * 0.24, b.y + b.d - b.h * 0.55];
      if (hose) this.strength = Math.max(0, this.strength - dt / 8);   // out a little before the truck stops spraying (10 s)
      // smoke: grey puffs drifting up and sideways, fewer as it goes out
      if (this.strength > 0 && Math.random() < dt * 14 * this.strength) this.spawn('smoke', roof[0] + (Math.random() - 0.5) * 50, roof[1] - 20, 15 + Math.random() * 25, -60 - Math.random() * 40, 18 + Math.random() * 14, 2.4);
      // water: drops along an arc from the nozzle to the roof
      if (hose && this.strength > 0) for (let i = 0; i < 3; i++) {
        const tx = roof[0] + (Math.random() - 0.5) * 50, ty = roof[1] - 12, T = 0.7;
        this.spawn('water', hose[0], hose[1], (tx - hose[0]) / T, (ty - hose[1]) / T - 0.5 * 900 * T, 4 + Math.random() * 3, T);
      }
      // flames on the roof
      this.flames.clear();
      if (this.strength > 0.05) for (let i = 0; i < 4; i++) {
        const fx = roof[0] + (i - 1.5) * 18, h = (40 + 16 * Math.sin(this.t * 9 + i * 1.7)) * this.strength;
        this.flames.poly([fx - 16, roof[1], fx, roof[1] - h - 16, fx + 16, roof[1]]).fill('#FFFFFF')
          .poly([fx - 12, roof[1], fx, roof[1] - h, fx + 12, roof[1]]).fill('#F28C38')
          .poly([fx - 6, roof[1], fx, roof[1] - h * 0.55, fx + 6, roof[1]]).fill('#FFD45C');
      }
      if (this.strength <= 0 && this.puffs.length === 0) this.b = null;
    }
    for (const p of this.puffs) {
      p.t += dt;
      if (p.kind === 'water') p.vy += 900 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const u = p.t / p.life;
      p.g.position.set(p.x, p.y);
      if (p.kind === 'smoke') { p.g.scale.set(1 + u * 1.6); p.g.alpha = 0.55 * (1 - u); }
    }
    this.puffs = this.puffs.filter(p => { if (p.t < p.life) return true; p.g.destroy(); return false; });
  }

  private spawn(kind: Puff['kind'], x: number, y: number, vx: number, vy: number, r: number, life: number) {
    const g = new Graphics().circle(0, 0, r).fill(kind === 'smoke' ? '#6B7280' : '#7CC6E6');
    this.view.addChild(g);
    this.puffs.push({ g, t: 0, life, x, y, vx, vy, r, kind });
  }
}
