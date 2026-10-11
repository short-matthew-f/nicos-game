// Frog Hop, on a cabinet in Alpha's Retro Games: hop the frog up across a busy road, then over the river on the
// floating logs, into one of the five lily pads at the top. Fill all five for the next (faster) level. Hop with the
// arrows, one hop a press. Three lives. Pure rules; games.ts draws it.
import type { Key } from './blasters';
export const FR = { cols: 14, rows: 10, cell: 30, lives: 3, slots: [1, 4, 7, 10, 13] };
export const W = FR.cols * FR.cell, H = FR.rows * FR.cell;
export interface Lane { row: number; kind: 'road' | 'river'; speed: number; len: number; gap: number; items: number[] }
// rows: 0 lily pads, 1-4 river, 5 the bank, 6-8 road, 9 the start
const LANES: Omit<Lane, 'items'>[] = [
  { row: 1, kind: 'river', speed: 38, len: 3, gap: 5 },
  { row: 2, kind: 'river', speed: -52, len: 2, gap: 4 },
  { row: 3, kind: 'river', speed: 30, len: 4, gap: 4 },
  { row: 4, kind: 'river', speed: -44, len: 3, gap: 4 },
  { row: 6, kind: 'road', speed: -66, len: 1, gap: 4 },
  { row: 7, kind: 'road', speed: 46, len: 2, gap: 5 },
  { row: 8, kind: 'road', speed: -84, len: 1, gap: 5 },
];
const SPAN = W + 6 * FR.cell;   // things go round: off one side, back on the other

export class Frog {
  lanes: Lane[]; x = 0; row = FR.rows - 1; best = FR.rows - 1; filled: boolean[] = FR.slots.map(() => false);
  score = 0; lives = FR.lives; level = 1; over = false; dead = 0; private hopT = 0; squish: { x: number; row: number; t: number } | null = null;
  constructor(private rnd: () => number = Math.random) {
    this.lanes = LANES.map(l => { const items: number[] = [], step = (l.len + l.gap) * FR.cell, off = this.rnd() * step; for (let x = off - 3 * FR.cell; x < SPAN - 3 * FR.cell; x += step) items.push(x); return { ...l, items }; });
    this.reset();
  }
  private reset() { this.x = Math.floor(FR.cols / 2) * FR.cell + FR.cell / 2; this.row = FR.rows - 1; this.best = this.row; }
  lane(row: number) { return this.lanes.find(l => l.row === row); }
  get mult() { return 1 + 0.22 * (this.level - 1); }
  press(k: Key) {
    if (this.over || this.dead > 0 || this.hopT > 0 || k === 'fire') return;
    const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[k];
    this.x = Math.max(FR.cell / 2, Math.min(W - FR.cell / 2, this.x + dx * FR.cell)); this.row = Math.max(0, Math.min(FR.rows - 1, this.row + dy));
    if (!this.lane(this.row) || this.lane(this.row)!.kind === 'road') this.x = Math.round((this.x - FR.cell / 2) / FR.cell) * FR.cell + FR.cell / 2;   // (snap to the grid off the logs)
    this.hopT = 0.09; this.hopped = true;
  }
  private hopped = false;
  update(dt: number): string[] {
    if (this.over) return [];
    const ev: string[] = [];
    if (this.hopped) { this.hopped = false; ev.push('hop'); }
    this.hopT -= dt; if (this.squish) { this.squish.t += dt; if (this.squish.t > 0.6) this.squish = null; }
    for (const l of this.lanes) for (let i = 0; i < l.items.length; i++) {
      let x = l.items[i] + l.speed * this.mult * dt;
      if (x > SPAN - 3 * FR.cell) x -= SPAN; if (x < -3 * FR.cell) x += SPAN;
      l.items[i] = x;
    }
    if (this.dead > 0) { this.dead -= dt; if (this.dead <= 0) this.reset(); return ev; }
    if (this.row < this.best) { this.score += 10 * (this.best - this.row); this.best = this.row; }
    const l = this.lane(this.row);
    if (l?.kind === 'road' && l.items.some(x => this.x + 10 > x && this.x - 10 < x + l.len * FR.cell)) return this.die('squish', ev);
    if (l?.kind === 'river') {
      const on = l.items.find(x => this.x > x + 4 && this.x < x + l.len * FR.cell - 4);
      if (on === undefined) return this.die('splash', ev);
      this.x += l.speed * this.mult * dt;
      if (this.x < 4 || this.x > W - 4) return this.die('splash', ev);
    }
    if (this.row === 0) {
      const i = FR.slots.findIndex(c => Math.abs(this.x - (c * FR.cell + FR.cell / 2)) < FR.cell * 0.6);
      if (i < 0 || this.filled[i]) return this.die('squish', ev);
      this.filled[i] = true; this.score += 50; ev.push('home');
      if (this.filled.every(Boolean)) { this.level++; this.score += 200; this.filled = this.filled.map(() => false); ev.push('level'); }
      this.reset();
    }
    return ev;
  }
  private die(how: string, ev: string[]) {
    this.squish = { x: this.x, row: this.row, t: 0 }; this.lives--; ev.push(how);
    if (this.lives <= 0) { this.over = true; ev.push('die'); } else { this.dead = 0.7; ev.push('lose'); }
    return ev;
  }
}
