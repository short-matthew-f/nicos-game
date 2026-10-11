// Space Blasters, on a cabinet in Alpha's Retro Games (the user, 2026-10-11: "The retro arcade should have a few
// retro inspired games"). The invaders classic: a row of aliens marching side to side and stepping down, faster as
// there are fewer; slide your blaster left and right, fire up at them, dodge what they drop. A saucer flies over
// now and then for 100. Three lives; clear a wave and the next comes in quicker. Pure rules; games.ts draws it.
export const BL = { w: 420, h: 300, shipY: 276, shipW: 26, speed: 190, shot: 380, shots: 2, cool: 0.32, cols: 8, rows: 4, gx: 36, gy: 26, aw: 22, ah: 14, step: 7, drop: 12, lives: 3, bomb: 120, ufoEvery: [12, 20] as [number, number] };
export type Key = 'up' | 'down' | 'left' | 'right' | 'fire';
export interface Alien { c: number; r: number; alive: boolean }

export class Blasters {
  x = BL.w / 2; shots: { x: number; y: number }[] = []; bombs: { x: number; y: number }[] = [];
  aliens: Alien[] = []; ox = 0; oy = 0; dir = 1; private stepT = 0; private cool = 0;
  ufo: { x: number; dir: number } | null = null; private ufoT: number;
  lives = BL.lives; score = 0; wave = 1; over = false; inv = 0; boom: { x: number; y: number; t: number }[] = [];
  constructor(private rnd: () => number = Math.random) { this.ufoT = this.gap(); this.newWave(); }
  private gap() { const [a, b] = BL.ufoEvery; return a + this.rnd() * (b - a); }
  newWave() {
    this.aliens = []; for (let r = 0; r < BL.rows; r++) for (let c = 0; c < BL.cols; c++) this.aliens.push({ c, r, alive: true });
    this.ox = (BL.w - (BL.cols - 1) * BL.gx) / 2; this.oy = 40 + Math.min(4, this.wave - 1) * 8; this.dir = 1; this.bombs = [];
  }
  /** Where an alien is (its centre). */
  at(a: Alien) { return { x: this.ox + a.c * BL.gx, y: this.oy + a.r * BL.gy }; }
  get alive() { return this.aliens.filter(a => a.alive); }
  get interval() { return Math.max(0.09, 0.62 * this.alive.length / this.aliens.length) / (1 + 0.18 * (this.wave - 1)); }
  press(k: Key) { if (k === 'fire') this.fire(); }
  private fire() { if (this.over || this.cool > 0 || this.shots.length >= BL.shots) return false; this.shots.push({ x: this.x, y: BL.shipY - 12 }); this.cool = BL.cool; return true; }
  update(dt: number, held: Set<Key>): string[] {
    if (this.over) return [];
    const ev: string[] = [];
    this.cool -= dt; this.inv = Math.max(0, this.inv - dt);
    for (const b of this.boom) b.t += dt; this.boom = this.boom.filter(b => b.t < 0.35);
    this.x = Math.max(BL.shipW, Math.min(BL.w - BL.shipW, this.x + ((held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0)) * BL.speed * dt));
    if (held.has('fire') && this.fire()) ev.push('shoot');
    // the march
    this.stepT += dt;
    if (this.stepT >= this.interval) {
      this.stepT = 0;
      const xs = this.alive.map(a => this.at(a).x), edge = this.dir > 0 ? Math.max(...xs) + BL.aw / 2 + BL.step > BL.w - 6 : Math.min(...xs) - BL.aw / 2 - BL.step < 6;
      if (edge) { this.dir = -this.dir; this.oy += BL.drop; } else this.ox += this.dir * BL.step;
      ev.push('march');
    }
    // they drop bombs (from the lowest in a random column)
    if (this.rnd() < dt * (0.7 + 0.25 * this.wave)) {
      const cols = [...new Set(this.alive.map(a => a.c))], c = cols[Math.floor(this.rnd() * cols.length)];
      const low = this.alive.filter(a => a.c === c).sort((a, b) => b.r - a.r)[0];
      if (low) { const p = this.at(low); this.bombs.push({ x: p.x, y: p.y + 8 }); }
    }
    // the saucer
    this.ufoT -= dt;
    if (!this.ufo && this.ufoT <= 0) { const d = this.rnd() < 0.5 ? 1 : -1; this.ufo = { x: d > 0 ? -20 : BL.w + 20, dir: d }; this.ufoT = this.gap(); ev.push('ufo'); }
    if (this.ufo) { this.ufo.x += this.ufo.dir * 80 * dt; if (this.ufo.x < -30 || this.ufo.x > BL.w + 30) this.ufo = null; }
    // shots up
    for (const s of this.shots) s.y -= BL.shot * dt;
    this.shots = this.shots.filter(s => {
      if (s.y < 0) return false;
      if (this.ufo && Math.abs(s.x - this.ufo.x) < 16 && Math.abs(s.y - 20) < 8) { this.score += 100; this.boom.push({ x: this.ufo.x, y: 20, t: 0 }); this.ufo = null; ev.push('ufohit'); return false; }
      const hit = this.alive.find(a => { const p = this.at(a); return Math.abs(s.x - p.x) < BL.aw / 2 && Math.abs(s.y - p.y) < BL.ah / 2; });
      if (!hit) return true;
      hit.alive = false; this.score += (BL.rows - hit.r) * 10; const p = this.at(hit); this.boom.push({ x: p.x, y: p.y, t: 0 }); ev.push('boom');
      return false;
    });
    // bombs down
    for (const b of this.bombs) b.y += BL.bomb * (1 + 0.1 * (this.wave - 1)) * dt;
    this.bombs = this.bombs.filter(b => {
      if (b.y > BL.h) return false;
      if (this.inv <= 0 && Math.abs(b.x - this.x) < BL.shipW / 2 && Math.abs(b.y - BL.shipY) < 9) { this.hit(ev); return false; }
      return true;
    });
    if (this.over) return ev;
    if (!this.alive.length) { this.wave++; this.newWave(); this.shots = []; ev.push('level'); }
    else if (Math.max(...this.alive.map(a => this.at(a).y)) + BL.ah / 2 >= BL.shipY - 10) { this.lives = 0; this.over = true; ev.push('die'); }
    return ev;
  }
  private hit(ev: string[]) {
    this.lives--; this.inv = 1.6; this.bombs = []; this.boom.push({ x: this.x, y: BL.shipY, t: 0 });
    if (this.lives <= 0) { this.over = true; ev.push('die'); } else ev.push('lose');
  }
}
