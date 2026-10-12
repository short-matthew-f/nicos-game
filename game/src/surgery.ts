// Operating with Dr. Poppop (the user, 2026-10-12: Poppop was a surgeon; "In the hospital they're Dr."). Gentle, no
// blood: two games.
//  - Steady hands: like the board game. Guide the tweezers along the opening without touching the sides (BZZT!), pick
//    up the thing that's stuck, and bring it back out. Four cases, each narrower and twistier: a splinter in Mr.
//    Brooks's thumb, a marble Teddy swallowed, a key the toy robot swallowed, a bee's stinger in Ava's arm.
//  - X-ray detective: someone's swallowed something. Sweep the X-ray scanner over them and tap it when you find it.
// Pure; surgeryView.ts draws them.
export interface Case { id: string; title: string; body: 'hand' | 'teddy' | 'robot' | 'arm'; thing: 'splinter' | 'marble' | 'key' | 'stinger'; width: number; turns: number }
export const CASES: Case[] = [
  { id: 'splinter', title: "A splinter in Mr. Brooks's thumb", body: 'hand', thing: 'splinter', width: 56, turns: 2 },
  { id: 'marble', title: 'Teddy swallowed a marble', body: 'teddy', thing: 'marble', width: 48, turns: 3 },
  { id: 'key', title: 'The toy robot swallowed a key', body: 'robot', thing: 'key', width: 40, turns: 4 },
  { id: 'stinger', title: "A bee's stinger in Ava's arm", body: 'arm', thing: 'stinger', width: 34, turns: 5 },
];
export const STEADY = { buzzes: 3, grab: 22, home: 30, regrab: 46 };
const seeded = (s: string) => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 2147483647; return () => ((h = (h * 16807) % 2147483647) / 2147483647); };
/** The opening, from the way in (left) to the thing that's stuck (right): a zig-zag, more turns for harder cases. */
export function channel(c: Case): [number, number][] {
  const r = seeded(c.id), pts: [number, number][] = [[70, 330]], n = c.turns + 1;
  for (let i = 1; i < n; i++) pts.push([70 + (450 * i) / n, i % 2 ? 110 + r() * 60 : 280 + r() * 60]);
  pts.push([540, 200]);
  return pts;
}
export function distToPath(p: [number, number][], x: number, y: number) {
  let best = Infinity;
  for (let i = 0; i + 1 < p.length; i++) {
    const [ax, ay] = p[i], [bx, by] = p[i + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
    best = Math.min(best, Math.hypot(x - ax - dx * t, y - ay - dy * t));
  }
  return best;
}
export class Steady {
  path: [number, number][]; phase: 'start' | 'in' | 'out' | 'done' | 'failed' = 'start'; buzzes = 0; carrying = false; holding = false;
  tip: [number, number];
  constructor(readonly c: Case) { this.path = channel(c); this.tip = [...this.path[0]] as [number, number]; }
  get end() { return this.path[this.path.length - 1]; }
  /** Finger down: pick the tweezers up where they are (at the start, or where they stopped). */
  down(x: number, y: number): string[] {
    if (this.phase === 'done' || this.phase === 'failed') return [];
    if (Math.hypot(x - this.tip[0], y - this.tip[1]) <= STEADY.regrab) { this.holding = true; if (this.phase === 'start') this.phase = 'in'; return ['pickup']; }
    return [];
  }
  up() { this.holding = false; }
  /** Finger moved: the tweezers follow, checked all the way along. */
  move(x: number, y: number): string[] {
    if (!this.holding || (this.phase !== 'in' && this.phase !== 'out')) return [];
    const ev: string[] = [], [x0, y0] = this.tip, n = Math.max(1, Math.ceil(Math.hypot(x - x0, y - y0) / 3));
    for (let i = 1; i <= n; i++) {
      const px = x0 + (x - x0) * i / n, py = y0 + (y - y0) * i / n;
      if (distToPath(this.path, px, py) > this.c.width / 2) {   // BZZT: touched the side
        this.buzzes++; this.holding = false; ev.push('buzz');
        if (this.carrying) { this.carrying = false; this.phase = 'in'; ev.push('drop'); }
        if (this.buzzes >= STEADY.buzzes) { this.phase = 'failed'; ev.push('fail'); }
        return ev;
      }
      this.tip = [px, py];
      if (this.phase === 'in' && Math.hypot(px - this.end[0], py - this.end[1]) < STEADY.grab) { this.carrying = true; this.phase = 'out'; ev.push('grab'); }
      if (this.phase === 'out' && Math.hypot(px - this.path[0][0], py - this.path[0][1]) < STEADY.home) { this.phase = 'done'; this.holding = false; ev.push('done'); return ev; }
    }
    return ev;
  }
  get stars() { return Math.max(1, 3 - this.buzzes); }
}

// ---- X-ray detective
export const THINGS = [
  { id: 'coin', name: 'a coin' }, { id: 'brick', name: 'a LEGO brick' }, { id: 'marble', name: 'a marble' }, { id: 'dino', name: 'a tiny dinosaur' },
  { id: 'key', name: 'a key' }, { id: 'car', name: 'a toy car' }, { id: 'button', name: 'a button' }, { id: 'clip', name: 'a paper clip' },
];
export const XRAY = { rounds: 5, time: 20, near: 30, tummy: { x: 320, y: 250, rx: 95, ry: 105 }, who: ['Leo', 'Sam', 'Maya', 'Ava', 'Mr. Brooks', 'Teddy'] };
export class XRay {
  round = 0; time = XRAY.time; score = 0; found = 0; phase: 'scan' | 'found' | 'missed' | 'done' = 'scan';
  thing = THINGS[0]; who = XRAY.who[0]; at: [number, number] = [0, 0]; private pause = 0;
  constructor(private rnd: () => number = Math.random) { this.newRound(); }
  private newRound() {
    const { x, y, rx, ry } = XRAY.tummy, a = this.rnd() * Math.PI * 2, d = Math.sqrt(this.rnd()) * 0.85;
    this.thing = THINGS[Math.floor(this.rnd() * THINGS.length)]; this.who = XRAY.who[Math.floor(this.rnd() * XRAY.who.length)];
    this.at = [x + Math.cos(a) * rx * d, y + Math.sin(a) * ry * d]; this.time = XRAY.time; this.phase = 'scan';
  }
  /** Tap: is that it? */
  tap(x: number, y: number): string[] {
    if (this.phase !== 'scan') return [];
    if (Math.hypot(x - this.at[0], y - this.at[1]) <= XRAY.near) { this.found++; this.score += Math.max(1, Math.ceil(this.time)); this.phase = 'found'; this.pause = 1.6; return ['found']; }
    return ['nope'];
  }
  update(dt: number): string[] {
    if (this.phase === 'done') return [];
    if (this.phase === 'scan') { this.time -= dt; if (this.time <= 0) { this.time = 0; this.phase = 'missed'; this.pause = 1.8; return ['timeout']; } return []; }
    if ((this.pause -= dt) > 0) return [];
    this.round++;
    if (this.round >= XRAY.rounds) { this.phase = 'done'; return ['done']; }
    this.newRound(); return ['next'];
  }
}
