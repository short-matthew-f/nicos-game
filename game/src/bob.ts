// Bobbing for Bakers at Yarosh's (the user, 2026-10-11: "There should also be a Bobbing for Bakers game in
// Yarosh's, like bobbing for apples"). A big washtub of water with baked potatoes floating in it, drifting round and
// bobbing up and under. Hands behind your back: move your head over one and DUNK. You only get it if it's bobbed up to
// the top when your face goes in. Some are wrapped in foil (shiny: worth 2), and now and then a golden one (worth 5).
// Thirty seconds. Pure; bobView.ts draws it.
export const BOB = { r: 190, n: 6, drift: 34, bobSpeed: [1.1, 2.1] as [number, number], time: 30, dunk: 0.6, bite: 0.28, reach: 38, up: 0.25, head: 520, respawn: 1.2, gold: 0.08, foil: 0.3 };
export interface Spud { x: number; y: number; vx: number; vy: number; ph: number; sp: number; kind: 'plain' | 'foil' | 'gold'; gone: number }
export const worth = (s: Spud) => (s.kind === 'gold' ? 5 : s.kind === 'foil' ? 2 : 1);
/** How far up it's bobbed: 1 right at the top, -1 sunk down. */
export const height = (s: Spud, t: number) => Math.sin(t * s.sp + s.ph);

export class Bobbing {
  spuds: Spud[] = []; head = { x: 0, y: 0 }; aim = { x: 0, y: 0 };
  t = 0; time = BOB.time; score = 0; caught = 0; over = false; dunkT = -1; misses = 0;
  constructor(private rnd: () => number = Math.random) { for (let i = 0; i < BOB.n; i++) this.spuds.push(this.spawn()); }
  private spawn(): Spud {
    const a = this.rnd() * Math.PI * 2, d = Math.sqrt(this.rnd()) * (BOB.r - 50), v = this.rnd() * Math.PI * 2, r = this.rnd();
    const [s0, s1] = BOB.bobSpeed;
    return { x: Math.cos(a) * d, y: Math.sin(a) * d, vx: Math.cos(v) * BOB.drift, vy: Math.sin(v) * BOB.drift, ph: this.rnd() * 6.28, sp: s0 + this.rnd() * (s1 - s0), kind: r < BOB.gold ? 'gold' : r < BOB.gold + BOB.foil ? 'foil' : 'plain', gone: 0 };
  }
  /** Where he's looking (his head follows, quickly). */
  aimAt(x: number, y: number) { const d = Math.hypot(x, y), m = BOB.r - 30; this.aim = d > m ? { x: x / d * m, y: y / d * m } : { x, y }; }
  dunk(): boolean { if (this.over || this.dunkT >= 0) return false; this.dunkT = 0; return true; }
  get dunking() { return this.dunkT >= 0; }
  update(dt: number): string[] {
    if (this.over) return [];
    const ev: string[] = [];
    this.t += dt; this.time -= dt;
    // the head follows the finger (not while it's under)
    if (!this.dunking) { const dx = this.aim.x - this.head.x, dy = this.aim.y - this.head.y, d = Math.hypot(dx, dy), m = BOB.head * dt; if (d > 0) { const k = Math.min(1, m / d); this.head.x += dx * k; this.head.y += dy * k; } }
    for (const s of this.spuds) {
      if (s.gone > 0) { s.gone -= dt; if (s.gone <= 0) Object.assign(s, this.spawn(), { gone: 0 }); continue; }
      s.x += s.vx * dt; s.y += s.vy * dt;
      const d = Math.hypot(s.x, s.y), m = BOB.r - 30;
      if (d > m) { const nx = s.x / d, ny = s.y / d, vn = s.vx * nx + s.vy * ny; if (vn > 0) { s.vx -= 2 * vn * nx; s.vy -= 2 * vn * ny; } s.x = nx * m; s.y = ny * m; }
    }
    if (this.dunking) {
      const before = this.dunkT; this.dunkT += dt;
      if (before < BOB.bite && this.dunkT >= BOB.bite) {   // face in the water: is there one right there, bobbed up?
        const hit = this.spuds.filter(s => s.gone <= 0 && Math.hypot(s.x - this.head.x, s.y - this.head.y) < BOB.reach && height(s, this.t) > BOB.up)
          .sort((a, b) => Math.hypot(a.x - this.head.x, a.y - this.head.y) - Math.hypot(b.x - this.head.x, b.y - this.head.y))[0];
        if (hit) { this.score += worth(hit); this.caught++; hit.gone = BOB.respawn; ev.push(hit.kind === 'gold' ? 'gold' : 'catch'); }
        else { this.misses++; ev.push('miss'); }
      }
      if (this.dunkT >= BOB.dunk) this.dunkT = -1;
    }
    if (this.time <= 0) { this.time = 0; this.over = true; ev.push('time'); }
    return ev;
  }
}
