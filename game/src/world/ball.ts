// The soccer ball: walk (or drive) into it to kick it; it rolls, slows, bounces off walls
// and posts, and scores when it crosses a goal line between the posts.
import { Container, Graphics } from 'pixi.js';
import { FIELD, GOALS, GOAL_MOUTH, type Rect } from './map';
import { NAVY, BAND } from './draw';

export const BALL = { r: 15, friction: 1.1, kickMin: 320, kickMul: 1.6, bounce: 0.6, gravity: 1400 };

export interface BallState { x: number; y: number; vx: number; vy: number; z: number; vz: number }

export const kickoff = (): BallState => ({ x: FIELD.x + FIELD.w / 2, y: FIELD.y + FIELD.d / 2, vx: 0, vy: 0, z: 0, vz: 0 });

/** Kick from a kicker at (kx, ky) moving at speed `ks`, if touching: returns true if kicked. */
export function kick(b: BallState, kx: number, ky: number, kr: number, ks: number): boolean {
  const dx = b.x - kx, dy = b.y - ky, d = Math.hypot(dx, dy);
  if (d > kr + BALL.r || d === 0) return false;
  const sp = Math.max(BALL.kickMin, ks * BALL.kickMul);
  // only kick if not already moving away faster than this kick would send it
  if ((b.vx * dx + b.vy * dy) / d >= sp * 0.9) return false;
  b.vx = dx / d * sp; b.vy = dy / d * sp;
  if (ks > 200 && b.z === 0) b.vz = Math.min(520, ks * 0.9);   // a hard kick lifts it
  // push it out of the kicker so it doesn't get kicked again next frame
  b.x = kx + dx / d * (kr + BALL.r + 1); b.y = ky + dy / d * (kr + BALL.r + 1);
  return true;
}

/** A vehicle heading `h` touching the ball pushes it out sideways (off the road), never
 * along in front of it. Returns true if it touched. */
export function nudge(b: BallState, cx: number, cy: number, cr: number, h: number): boolean {
  const dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy);
  if (d > cr + BALL.r) return false;
  const px = -Math.sin(h), py = Math.cos(h), side = dx * px + dy * py >= 0 ? 1 : -1;   // which side of the car it's on
  b.vx = px * side * BALL.kickMin; b.vy = py * side * BALL.kickMin;
  b.x = cx + px * side * (cr + BALL.r + 1); b.y = cy + py * side * (cr + BALL.r + 1);
  return true;
}

/** Roll for dt: friction, bounces off solids and the world edge. Returns the goal it went
 * into (-1 left, 1 right) or 0. */
export function roll(b: BallState, dt: number, solids: Rect[], bounds: { w: number; h: number }): number {
  const k = Math.exp(-BALL.friction * dt);
  b.vx *= k; b.vy *= k;
  if (Math.hypot(b.vx, b.vy) < 6) { b.vx = b.vy = 0; }
  // hop
  if (b.z > 0 || b.vz > 0) { b.vz -= BALL.gravity * dt; b.z += b.vz * dt; if (b.z <= 0) { b.z = 0; b.vz = b.vz < -120 ? -b.vz * 0.45 : 0; } }
  const r = BALL.r, hits = (x: number, y: number) =>
    x < r || y < r || x > bounds.w - r || y > bounds.h - r ||
    solids.some(s => x > s.x - r && x < s.x + s.w + r && y > s.y - r && y < s.y + s.d + r);
  const nx = b.x + b.vx * dt;
  if (hits(nx, b.y)) b.vx = -b.vx * BALL.bounce; else b.x = nx;
  const ny = b.y + b.vy * dt;
  if (hits(b.x, ny)) b.vy = -b.vy * BALL.bounce; else b.y = ny;
  for (const g of GOALS) {
    const over = g.side < 0 ? b.x < g.x : b.x > g.x;
    if (over && Math.abs(b.y - g.y) < GOAL_MOUTH / 2 - r) return g.side;
  }
  return 0;
}

export class BallView {
  readonly root = new Container();
  private shadow = new Graphics(); private ball = new Container(); private spin = new Graphics();
  constructor() {
    this.shadow.ellipse(0, 0, BALL.r + 2, 6).fill({ color: NAVY, alpha: 0.25 });
    const g = new Graphics().circle(0, 0, BALL.r + BAND).fill('#FFFFFF').circle(0, 0, BALL.r).fill('#FAFBFC');
    this.spin.poly([0, -6, 6, -2, 4, 5, -4, 5, -6, -2]).fill('#2B3F55');
    for (const a of [0, 72, 144, 216, 288]) {
      const rx = Math.cos(a * Math.PI / 180) * 11, ry = Math.sin(a * Math.PI / 180) * 11;
      this.spin.circle(rx, ry, 3.2).fill('#2B3F55');
    }
    this.ball.addChild(g, this.spin);
    this.root.addChild(this.shadow, this.ball);
  }
  draw(b: BallState, dt: number) {
    this.root.position.set(b.x, b.y);
    this.shadow.position.set(4, 2);
    this.ball.position.set(0, -BALL.r - b.z);
    this.spin.rotation += (b.vx / BALL.r) * dt;   // rolls as it goes
    this.root.zIndex = b.y;
  }
}
