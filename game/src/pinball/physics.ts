// Pinball physics: balls rolling down a tilted table, bouncing off walls (capsules), pop bumpers and
// slingshots (which kick), batted by flippers (tapered capsules that swing: the ball takes the speed of
// the flipper where it hits). Small fixed substeps so a fast ball never passes through anything.
// Pure: no drawing, no sound; it reports what was hit and rules.ts decides what that's worth.
import { T, SEGS, BUMPERS, FLIPPERS, SAUCER, TARGETS, SPINNER, LANES, LANE_POSTS, type V, type Seg, type Flipper } from './table';

export interface Ball { x: number; y: number; vx: number; vy: number; held: number; inLane: boolean; id: number; cool?: number }   // cool: s before the saucer can catch it again
export interface FlipperState { f: Flipper; angle: number; w: number; pressed: boolean }
export type Hit =
  | { kind: 'bumper'; id: string } | { kind: 'sling'; id: string } | { kind: 'wall'; speed: number } | { kind: 'flipper'; side: 'L' | 'R' }
  | { kind: 'lane'; i: number } | { kind: 'target'; i: number } | { kind: 'spin'; n: number } | { kind: 'saucer' } | { kind: 'eject' }
  | { kind: 'drain'; ball: Ball } | { kind: 'launch'; power: number };

const E = { wall: 0.42, post: 0.55, flipper: 0.22, bumper: 0.6 };
const KICK = { bumper: 820, sling: 900 };
const FLIP = { up: 42, down: 22 };   // rad/s
const FRICTION = 0.006;              // speed lost along a surface per contact

export class Table {
  balls: Ball[] = [];
  flippers: FlipperState[] = FLIPPERS.map(f => ({ f, angle: f.rest, w: 0, pressed: false }));
  targets = TARGETS.map(() => true);            // up (true) or down
  spinner = { angle: 0, w: 0 };
  private nextId = 1;
  private lanesUnder = new Map<number, number>();   // ball id -> the lane it's in (so each pass counts once)

  /** A new ball resting on the plunger. */
  load(): Ball { const b: Ball = { x: T.plunger.x, y: T.plunger.y - T.ball, vx: 0, vy: 0, held: 0, inLane: true, id: this.nextId++ }; this.balls.push(b); return b; }
  /** Fire the plunger (power 0..1): any ball sitting on it shoots up the lane. */
  launch(power: number, hits: Hit[] = []): boolean {
    let any = false;
    for (const b of this.balls) if (b.inLane && b.x > T.lane.x0 && b.y > T.plunger.y - 60 && Math.abs(b.vy) < 80) {
      b.vy = -(T.plunger.min + (T.plunger.max - T.plunger.min) * Math.max(0, Math.min(1, power))) * (1 + (Math.random() - 0.5) * 0.03); b.vx = 0; any = true;   // (a real plunger's never exactly the same)
    }
    if (any) hits.push({ kind: 'launch', power });
    return any;
  }
  /** Raise the drop targets again. */
  resetTargets() { this.targets = this.targets.map(() => true); }

  /** Move everything on by dt seconds; what was hit is pushed onto `hits`. */
  step(dt: number, hits: Hit[] = []): Hit[] {
    const fast = Math.max(0, ...this.balls.map(b => Math.hypot(b.vx, b.vy)), 2200);
    const n = Math.min(40, Math.max(4, Math.ceil(fast * dt / 3.5))), h = dt / n;
    for (let k = 0; k < n; k++) this.substep(h, hits);
    // the spinner winds down
    this.spinner.angle += this.spinner.w * dt; this.spinner.w *= Math.exp(-dt * 1.6);
    return hits;
  }

  private substep(h: number, hits: Hit[]) {
    for (const s of this.flippers) {
      const want = s.pressed ? s.f.up : s.f.rest, dir = Math.sign(want - s.angle), sp = s.pressed ? FLIP.up : FLIP.down;
      const prev = s.angle;
      s.angle = dir > 0 ? Math.min(want, s.angle + sp * h) : Math.max(want, s.angle - sp * h);
      s.w = (s.angle - prev) / h;
    }
    for (const b of [...this.balls]) {
      if (b.held > 0) { b.held -= h; if (b.held <= 0) { b.vx = SAUCER.kick[0]; b.vy = SAUCER.kick[1]; b.cool = 0.6; hits.push({ kind: 'eject' }); } continue; }
      if (b.cool) b.cool = Math.max(0, b.cool - h);
      // resting on the plunger, waiting to be launched
      if (b.inLane && b.y >= T.plunger.y - T.ball - 0.5 && b.vy >= 0) { b.y = T.plunger.y - T.ball; b.vy = 0; b.vx = 0; continue; }
      b.vy += T.gravity * h;
      const sp = Math.hypot(b.vx, b.vy); if (sp > T.maxSpeed) { b.vx *= T.maxSpeed / sp; b.vy *= T.maxSpeed / sp; }
      const py = b.y;
      b.x += b.vx * h; b.y += b.vy * h;
      if (b.inLane && b.y < T.lane.top - T.ball) b.inLane = false;
      for (const s of SEGS) this.hitSeg(b, s, hits);
      for (const bu of BUMPERS) this.hitCircle(b, bu.c, bu.r, E.bumper, KICK.bumper) && hits.push({ kind: 'bumper', id: bu.id });
      TARGETS.forEach((t, i) => {
        if (!this.targets[i]) return;
        if (b.x < t.x && Math.abs(b.y - t.y) < t.half + T.ball) b.x = t.x + 0.01;   // (they face the table: never push a ball back toward the wall)
        if (this.hitCapsule(b, [t.x, t.y - t.half], [t.x, t.y + t.half], 5, E.wall) > 150) { this.targets[i] = false; hits.push({ kind: 'target', i }); }
      });
      for (const f of this.flippers) this.hitFlipper(b, f, hits);
      // sensors: the lanes, the spinner, the saucer, the drain
      const lane = b.y > LANES.y0 && b.y < LANES.y1 ? LANE_POSTS.findIndex((x, i) => i < 4 && b.x > x && b.x < LANE_POSTS[i + 1]) : -1;
      if (lane >= 0 && py < LANES.sense && b.y >= LANES.sense && this.lanesUnder.get(b.id) !== lane) { this.lanesUnder.set(b.id, lane); hits.push({ kind: 'lane', i: lane }); }
      if (b.y > LANES.y1 + 40) this.lanesUnder.delete(b.id);
      if (b.x > SPINNER.x0 && b.x < SPINNER.x1 && (py - SPINNER.y) * (b.y - SPINNER.y) <= 0 && py !== b.y) {
        const turns = Math.min(30, Math.abs(b.vy) / 110); this.spinner.w = Math.sign(-b.vy || 1) * turns * 6; hits.push({ kind: 'spin', n: Math.max(1, Math.round(turns)) });
      }
      if (!b.cool && Math.hypot(b.x - SAUCER.c[0], b.y - SAUCER.c[1]) < SAUCER.r && Math.hypot(b.vx, b.vy) < 1300) {
        b.x = SAUCER.c[0]; b.y = SAUCER.c[1]; b.vx = b.vy = 0; b.held = SAUCER.hold; hits.push({ kind: 'saucer' });
      }
      if (b.y > T.drain) { this.balls.splice(this.balls.indexOf(b), 1); this.lanesUnder.delete(b.id); hits.push({ kind: 'drain', ball: b }); }
    }
    // balls knock into each other (multiball)
    for (let i = 0; i < this.balls.length; i++) for (let j = i + 1; j < this.balls.length; j++) {
      const a = this.balls[i], c = this.balls[j], dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy);
      if (d >= 2 * T.ball || d === 0 || a.held > 0 || c.held > 0) continue;
      const nx = dx / d, ny = dy / d, over = (2 * T.ball - d) / 2;
      a.x -= nx * over; a.y -= ny * over; c.x += nx * over; c.y += ny * over;
      const rel = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
      if (rel < 0) { a.vx += rel * nx * 0.95; a.vy += rel * ny * 0.95; c.vx -= rel * nx * 0.95; c.vy -= rel * ny * 0.95; }
    }
  }

  /** Bounce off a capsule a..b (radius r): returns how hard it hit (the speed into it), 0 if it didn't touch. */
  private hitCapsule(b: Ball, a: V, c: V, r: number, e: number, kick = 0, sv: V = [0, 0]): number {
    const abx = c[0] - a[0], aby = c[1] - a[1], L2 = abx * abx + aby * aby;
    const t = L2 ? Math.max(0, Math.min(1, ((b.x - a[0]) * abx + (b.y - a[1]) * aby) / L2)) : 0;
    const px = a[0] + abx * t, py = a[1] + aby * t, dx = b.x - px, dy = b.y - py, d = Math.hypot(dx, dy), R = T.ball + r;
    if (d >= R || d === 0) return 0;
    const nx = dx / d, ny = dy / d;
    b.x = px + nx * R; b.y = py + ny * R;
    const rvx = b.vx - sv[0], rvy = b.vy - sv[1], vn = rvx * nx + rvy * ny;
    if (vn >= 0) return 0;
    b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
    const tx = -ny, ty = nx, vt = b.vx * tx + b.vy * ty;   // a little friction along the surface
    b.vx -= vt * tx * FRICTION; b.vy -= vt * ty * FRICTION;
    if (kick && -vn > 60) { b.vx += nx * kick; b.vy += ny * kick; }
    return -vn;
  }
  private hitSeg(b: Ball, s: Seg, hits: Hit[]) {
    if (s.kind === 'gate') {   // one way: only stops a ball coming down from above it
      const above = (s.b[0] - s.a[0]) * (b.y - s.a[1]) - (s.b[1] - s.a[1]) * (b.x - s.a[0]) < 0;
      if (!above || b.vy < 0 || b.inLane) return;
    }
    const hit = this.hitCapsule(b, s.a, s.b, s.r, s.e ?? (s.kind === 'post' ? E.post : E.wall), s.kind === 'sling' ? KICK.sling : 0);
    if (!hit) return;
    if (s.kind === 'sling' && hit > 60) hits.push({ kind: 'sling', id: s.id! });
    else if (hit > 500) hits.push({ kind: 'wall', speed: hit });
  }
  private hitCircle(b: Ball, c: V, r: number, e: number, kick: number): boolean {
    return this.hitCapsule(b, c, c, r, e, kick) > 40;
  }
  /** A flipper is a tapered capsule from the pivot to the tip; where it hits, the ball gets the flipper's speed. */
  private hitFlipper(b: Ball, s: FlipperState, hits: Hit[]) {
    const f = s.f, [px, py] = f.pivot, tx = px + Math.cos(s.angle) * f.len, ty = py + Math.sin(s.angle) * f.len;
    const abx = tx - px, aby = ty - py, L2 = abx * abx + aby * aby;
    const t = Math.max(0, Math.min(1, ((b.x - px) * abx + (b.y - py) * aby) / L2));
    const cx = px + abx * t, cy = py + aby * t, r = f.r0 + (f.r1 - f.r0) * t, d = Math.hypot(b.x - cx, b.y - cy), R = T.ball + r;
    if (d >= R || d === 0) return;
    const nx = (b.x - cx) / d, ny = (b.y - cy) / d;
    b.x = cx + nx * R; b.y = cy + ny * R;
    // a ball balanced on top of the pivot (a real one would never stay there): roll it off toward the tip
    if (t < 0.12 && ny < -0.9 && Math.hypot(b.vx, b.vy) < 30) { const k = 40 / Math.sqrt(L2); b.vx += abx * k; b.vy += aby * k; }
    // the speed of the flipper's surface at the contact point (ω × r)
    const rx = b.x - px, ry = b.y - py, svx = -s.w * ry, svy = s.w * rx;
    const rvx = b.vx - svx, rvy = b.vy - svy, vn = rvx * nx + rvy * ny;
    if (vn >= 0) return;
    b.vx -= (1 + E.flipper) * vn * nx; b.vy -= (1 + E.flipper) * vn * ny;
    if (Math.abs(s.w) > 1 && -vn > 200) hits.push({ kind: 'flipper', side: f.side });
  }
}

/** Where a flipper's tip is (for drawing). */
export const tipOf = (s: FlipperState): V => [s.f.pivot[0] + Math.cos(s.angle) * s.f.len, s.f.pivot[1] + Math.sin(s.angle) * s.f.len];
