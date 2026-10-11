// Peeling potatoes for Yarosh (the user, 2026-10-11: "The potato shop should have a potato peeling mini game").
// A lumpy potato on the board: drag across it to peel the skin off in strips, and tap the eyes to dig them out.
// When it's all but clean (and every eye's gone), into the pot it goes and the next one rolls in. A minute a shift;
// Yarosh pays for each one. The skin is tracked on a grid of little cells, so how much is peeled is exact. Pure.
export const PEEL = { time: 60, cell: 8, blade: 15, done: 0.9, eyes: [2, 4] as [number, number], eyeR: 18, pay: 1, next: 0.55 };
export interface Eye { x: number; y: number; dug: boolean }
export interface Spud { rx: number; ry: number; wob: number[]; eyes: Eye[]; cols: number; rows: number; x0: number; y0: number; inside: Uint8Array; peeled: Uint8Array; total: number; count: number; tint: number }

/** How far out the edge is at angle a (1: the ellipse; the wobble makes it lumpy). */
export const edge = (s: Spud, a: number) => 1 + s.wob[0] * Math.sin(3 * a + s.wob[1]) + s.wob[2] * Math.sin(5 * a + s.wob[3]);
export function inSpud(s: Spud, x: number, y: number) {
  const u = x / s.rx, v = y / s.ry; return Math.hypot(u, v) <= edge(s, Math.atan2(v, u));
}
/** The outline, for drawing. */
export function outline(s: Spud, n = 72): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, e = edge(s, a); out.push([Math.cos(a) * s.rx * e, Math.sin(a) * s.ry * e]); }
  return out;
}
export function makeSpud(rnd: () => number = Math.random): Spud {
  const rx = 140 + rnd() * 30, ry = 88 + rnd() * 22;
  const s: Spud = { rx, ry, wob: [0.03 + rnd() * 0.04, rnd() * 6.28, 0.02 + rnd() * 0.03, rnd() * 6.28], eyes: [], cols: 0, rows: 0, x0: 0, y0: 0, inside: new Uint8Array(0), peeled: new Uint8Array(0), total: 0, count: 0, tint: rnd() };
  const C = PEEL.cell, X = Math.ceil(rx * 1.12 / C), Y = Math.ceil(ry * 1.12 / C);
  s.cols = 2 * X; s.rows = 2 * Y; s.x0 = -X * C; s.y0 = -Y * C;
  s.inside = new Uint8Array(s.cols * s.rows); s.peeled = new Uint8Array(s.cols * s.rows);
  for (let j = 0; j < s.rows; j++) for (let i = 0; i < s.cols; i++) if (inSpud(s, s.x0 + (i + 0.5) * C, s.y0 + (j + 0.5) * C)) { s.inside[j * s.cols + i] = 1; s.total++; }
  const [a, b] = PEEL.eyes, n = a + Math.floor(rnd() * (b - a + 1));
  for (let k = 0; k < n * 20 && s.eyes.length < n; k++) {
    const x = (rnd() * 2 - 1) * rx * 0.72, y = (rnd() * 2 - 1) * ry * 0.65;
    if (inSpud(s, x, y) && s.eyes.every(e => Math.hypot(e.x - x, e.y - y) > 50)) s.eyes.push({ x, y, dug: false });
  }
  return s;
}
/** The peeler dragged from a to b: the skin under it comes off. How many cells came off. */
export function peelStroke(s: Spud, ax: number, ay: number, bx: number, by: number, r = PEEL.blade): number {
  const C = PEEL.cell, dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
  const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - r - s.x0) / C)), i1 = Math.min(s.cols - 1, Math.floor((Math.max(ax, bx) + r - s.x0) / C));
  const j0 = Math.max(0, Math.floor((Math.min(ay, by) - r - s.y0) / C)), j1 = Math.min(s.rows - 1, Math.floor((Math.max(ay, by) + r - s.y0) / C));
  let n = 0;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const k = j * s.cols + i; if (!s.inside[k] || s.peeled[k]) continue;
    const x = s.x0 + (i + 0.5) * C, y = s.y0 + (j + 0.5) * C, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
    if (Math.hypot(x - ax - dx * t, y - ay - dy * t) <= r) { s.peeled[k] = 1; n++; }
  }
  s.count += n; return n;
}
/** A tap: dig out the eye there (if there is one). */
export function dig(s: Spud, x: number, y: number): Eye | null {
  const e = s.eyes.find(q => !q.dug && Math.hypot(q.x - x, q.y - y) <= PEEL.eyeR); if (e) e.dug = true; return e ?? null;
}
export const progress = (s: Spud) => s.total ? s.count / s.total : 0;
export const isClean = (s: Spud) => progress(s) >= PEEL.done && s.eyes.every(e => e.dug);

/** One shift at the peeling board. */
export class Shift {
  spud: Spud; time = PEEL.time; done = 0; over = false; wait = 0;
  constructor(private rnd: () => number = Math.random) { this.spud = makeSpud(rnd); }
  stroke(ax: number, ay: number, bx: number, by: number): number { return this.over || this.wait > 0 ? 0 : peelStroke(this.spud, ax, ay, bx, by); }
  tap(x: number, y: number): Eye | null { return this.over || this.wait > 0 ? null : dig(this.spud, x, y); }
  update(dt: number): string[] {
    if (this.over) return [];
    const ev: string[] = [];
    this.time -= dt;
    if (this.wait > 0) { this.wait -= dt; if (this.wait <= 0) { this.spud = makeSpud(this.rnd); ev.push('next'); } }
    else if (isClean(this.spud)) { this.done++; this.wait = PEEL.next; ev.push('peeled'); }
    if (this.time <= 0) { this.time = 0; this.over = true; ev.push('time'); }
    return ev;
  }
}
