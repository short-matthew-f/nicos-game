// Racing Tempo along the beach (the user, 2026-10-12: "Build on all three of those games"). Talk to Tempo on the
// sand and pick a course: a sprint to the pier, or the long run up the coast to the lighthouse. On your marks, 3, 2,
// 1, GO: first to the flag wins. Tempo is fast (red is the fastest colour) but he eases off a little when he's well
// ahead and digs in when he's behind, so it's always close. Pure: main.ts runs it.
export interface Course { id: string; name: string; path: [number, number][]; flag: [number, number] }
export const RACE = { count: 3, speed: 258, ahead: 0.86, behind: 1.06, kick: 1.04, reach: 60, side: 46 };
export const COURSES: Course[] = [
  { id: 'pier', name: 'Sprint to the pier', path: [[2640, 4700], [3150, 4640], [3620, 4610], [4000, 4590], [4200, 4560]], flag: [4240, 4550] },
  { id: 'lighthouse', name: 'Run to the lighthouse', path: [[4560, 4420], [4880, 4250], [5300, 4110], [5700, 3880], [6100, 3640], [6550, 3330], [6900, 3020]], flag: [6960, 2960] },
];
export type Phase = 'count' | 'go' | 'done';
const len = (p: [number, number][]) => p.slice(1).reduce((a, q, i) => a + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);
/** Where Nico starts: beside Tempo on the line. */
export const nicoStart = (c: Course): [number, number] => [c.path[0][0], c.path[0][1] + RACE.side];

export class Race {
  phase: Phase = 'count'; t = 0; count = RACE.count; winner: 'nico' | 'tempo' | null = null; time = 0;
  tempo: { x: number; y: number; vx: number; vy: number }; private i = 1; private total: number;
  constructor(readonly course: Course) { const [x, y] = course.path[0]; this.tempo = { x, y, vx: 0, vy: 0 }; this.total = len(course.path); }
  /** How far Tempo has left to go (along the path). */
  get tempoLeft() { const p = this.course.path; if (this.i >= p.length) return Math.hypot(this.course.flag[0] - this.tempo.x, this.course.flag[1] - this.tempo.y); let d = Math.hypot(p[this.i][0] - this.tempo.x, p[this.i][1] - this.tempo.y); for (let k = this.i; k + 1 < p.length; k++) d += Math.hypot(p[k + 1][0] - p[k][0], p[k + 1][1] - p[k][1]); return d + Math.hypot(this.course.flag[0] - p[p.length - 1][0], this.course.flag[1] - p[p.length - 1][1]); }
  /** Nico's distance left (straight to the flag, near enough on an open beach). */
  nicoLeft(nx: number, ny: number) { return Math.hypot(this.course.flag[0] - nx, this.course.flag[1] - ny); }
  update(dt: number, nx: number, ny: number): string[] {
    const ev: string[] = []; this.t += dt; this.tempo.vx = this.tempo.vy = 0;
    if (this.phase === 'count') {
      const before = Math.ceil(this.count); this.count -= dt;
      if (this.count <= 0) { this.phase = 'go'; ev.push('go'); } else if (Math.ceil(this.count) !== before) ev.push('beep');
      return ev;
    }
    if (this.phase !== 'go') return ev;
    this.time += dt;
    // Tempo runs the course: a touch slower when he's well ahead, faster when he's behind, a kick at the end
    const tl = this.tempoLeft, nl = this.nicoLeft(nx, ny);
    const k = tl < nl - 160 ? RACE.ahead : tl > nl + 120 ? RACE.behind : 1;
    let step = RACE.speed * k * (tl < 260 ? RACE.kick : 1) * dt;
    const p = this.course.path, target = () => (this.i < p.length ? p[this.i] : this.course.flag);
    while (step > 0 && this.phase === 'go') {
      const [tx, ty] = target(), dx = tx - this.tempo.x, dy = ty - this.tempo.y, d = Math.hypot(dx, dy);
      if (d <= step) { this.tempo.x = tx; this.tempo.y = ty; step -= d; if (this.i >= p.length) break; this.i++; }
      else { this.tempo.x += dx / d * step; this.tempo.y += dy / d * step; this.tempo.vx = dx / d * RACE.speed; this.tempo.vy = dy / d * RACE.speed; step = 0; }
    }
    const nicoIn = nl < RACE.reach, tempoIn = Math.hypot(this.course.flag[0] - this.tempo.x, this.course.flag[1] - this.tempo.y) < RACE.reach;
    if (nicoIn || tempoIn) { this.phase = 'done'; this.winner = nicoIn ? 'nico' : 'tempo'; ev.push('finish'); }
    return ev;
  }
  get length() { return this.total; }
}
