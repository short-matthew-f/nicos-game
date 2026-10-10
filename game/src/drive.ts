// Driving, Sneaky Sasquatch style: push the stick the way you want to go and the car
// turns toward it (no left/right steering to learn), speeding up with how far you push.
// Kept free of rendering so it can be unit tested.
import type { Rect } from './world/map';

export const CAR_SCALE = 1.5;    // cars are drawn at 1.5x their base art (112 x 56) so they're bigger than Nico
export const CAR = {
  max: 560,        // px/s at full stick
  acc: 400,        // px/s²
  brake: 1100,     // px/s² when slowing toward a lower target
  coast: 320,      // px/s² with the stick released
  turn: 3.0,       // rad/s of turning at speed
  len: 112 * CAR_SCALE, wid: 56 * CAR_SCALE,
};
// the body as three circles along its length
const CIRCLES = [-0.3, 0, 0.3].map(f => f * CAR.len), CR = CAR.wid * 0.48;

export interface CarState { x: number; y: number; h: number; speed: number; blocked?: boolean }   // blocked: bumped last frame
export const REVERSE = 170;   // px/s backing up

/** Signed smallest angle from a to b, in (-π, π]. */
export function angleTo(a: number, b: number): number {
  let d = (b - a) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}

/** Turn toward the stick and set speed from how far it's pushed. */
export function steer(c: CarState, sx: number, sy: number, dt: number): void {
  const m = Math.min(1, Math.hypot(sx, sy));
  const toward0 = (v: number, by: number) => Math.sign(v) * Math.max(0, Math.abs(v) - by);
  if (m === 0) { c.speed = toward0(c.speed, CAR.coast * dt); return; }
  const want = Math.atan2(sy, sx), d = angleTo(c.h, want);
  // Backing up: with the nose against something (or already reversing), pulling the stick
  // away from the nose backs the car out, swinging its tail toward the stick.
  if (Math.abs(d) > Math.PI / 2 && (c.blocked || c.speed < -1) && c.speed < 30) {
    const dr = angleTo(c.h + Math.PI, want), rate = CAR.turn * 0.5;
    c.h += Math.max(-rate * dt, Math.min(rate * dt, dr));
    c.speed += Math.max(-CAR.brake * dt, Math.min(CAR.acc * dt, -REVERSE * m - c.speed));
    return;
  }
  if (c.speed < 0) { c.speed = toward0(c.speed, CAR.brake * dt); return; }   // stop reversing before driving off
  // a stopped car still turns (slowly), so it can always find its way out
  const rate = CAR.turn * (0.35 + 0.65 * Math.min(1, c.speed / 260));
  c.h += Math.max(-rate * dt, Math.min(rate * dt, d));
  // slow down for a sharp turn, crawl when turning round
  const target = CAR.max * m * (Math.abs(d) > Math.PI / 2 ? 0.3 : 1 - 0.45 * Math.abs(d) / (Math.PI / 2));
  c.speed += Math.max(-CAR.brake * dt, Math.min(CAR.acc * dt, target - c.speed));
}

export function circles(x: number, y: number, h: number): [number, number, number][] {
  const fx = Math.cos(h), fy = Math.sin(h);
  return CIRCLES.map(a => [x + fx * a, y + fy * a, CR]);
}

function circleRect(x: number, y: number, r: number, s: Rect): boolean {
  const cx = Math.max(s.x, Math.min(x, s.x + s.w)), cy = Math.max(s.y, Math.min(y, s.y + s.d));
  return (x - cx) ** 2 + (y - cy) ** 2 < r * r;
}

/** How far the car digs into buildings, the world edge and other things (0 = free). */
export function overlap(x: number, y: number, h: number, solids: Rect[], bounds: { w: number; h: number }, others: [number, number, number][] = []): number {
  let o = 0;
  for (const [cx, cy, r] of circles(x, y, h)) {
    o += Math.max(0, r - cx) + Math.max(0, r - cy) + Math.max(0, cx + r - bounds.w) + Math.max(0, cy + r - bounds.h);
    for (const s of solids) {
      const nx = Math.max(s.x, Math.min(cx, s.x + s.w)), ny = Math.max(s.y, Math.min(cy, s.y + s.d));
      const d = Math.hypot(cx - nx, cy - ny);
      if (d < r) o += d === 0 ? r + Math.min(cx - s.x, s.x + s.w - cx, cy - s.y, s.y + s.d - cy) : r - d;
    }
    for (const [ox, oy, orr] of others) o += Math.max(0, r + orr - Math.hypot(cx - ox, cy - oy));
  }
  return o;
}

/** Is the car free of buildings, the world edge and other things (circles)? */
export function carFits(x: number, y: number, h: number, solids: Rect[], bounds: { w: number; h: number }, others: [number, number, number][] = []): boolean {
  for (const [cx, cy, r] of circles(x, y, h)) {
    if (cx < r || cy < r || cx > bounds.w - r || cy > bounds.h - r) return false;
    for (const s of solids) if (circleRect(cx, cy, r, s)) return false;
    for (const [ox, oy, orr] of others) if ((cx - ox) ** 2 + (cy - oy) ** 2 < (r + orr) ** 2) return false;
  }
  return true;
}

/** Move by the current speed. A turn into a wall is undone; a move into one slides along
 * it if it can, otherwise the car stops. Returns true if it bumped into something.
 * A move is allowed if it doesn't dig in any deeper than the car already is, so a car that
 * ends up overlapping something (another car drove into it) can always back or steer out. */
export function moveCar(c: CarState, prevH: number, dt: number, solids: Rect[], bounds: { w: number; h: number }, others: [number, number, number][] = []): boolean {
  const ov = (x: number, y: number, h: number) => overlap(x, y, h, solids, bounds, others);
  const now = ov(c.x, c.y, prevH);
  const ok = (x: number, y: number, h: number) => { const o = ov(x, y, h); return o === 0 || o < now - 1e-6 || (now > 0 && o <= now); };
  if (!ok(c.x, c.y, c.h)) c.h = prevH;
  const dx = Math.cos(c.h) * c.speed * dt, dy = Math.sin(c.h) * c.speed * dt;
  c.blocked = false;
  if (ok(c.x + dx, c.y + dy, c.h)) { c.x += dx; c.y += dy; return false; }
  // slide along whichever axis is still open (the bigger one first)
  const tries: [number, number][] = Math.abs(dx) > Math.abs(dy) ? [[dx, 0], [0, dy]] : [[0, dy], [dx, 0]];
  for (const [mx, my] of tries) if ((mx || my) && ok(c.x + mx, c.y + my, c.h)) {
    c.x += mx; c.y += my; c.speed *= 0.97; return true;
  }
  c.speed = 0; c.blocked = true; return true;
}
