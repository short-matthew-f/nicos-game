// Driving, Sneaky Sasquatch style: push the stick the way you want to go and the car
// turns toward it (no left/right steering to learn), speeding up with how far you push.
// Kept free of rendering so it can be unit tested.
import type { Rect } from './world/map';

export const CAR = {
  max: 430,        // px/s at full stick
  acc: 320,        // px/s²
  brake: 900,      // px/s² when slowing toward a lower target
  coast: 260,      // px/s² with the stick released
  turn: 3.0,       // rad/s of turning at speed
  len: 112, wid: 56,
};
const CIRCLES = [-34, 0, 34], CR = 27;   // the body as three circles along its length

export interface CarState { x: number; y: number; h: number; speed: number }

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
  if (m === 0) { c.speed = Math.max(0, c.speed - CAR.coast * dt); return; }
  const d = angleTo(c.h, Math.atan2(sy, sx));
  // a stopped car still turns (slowly), so it can always find its way out
  const rate = CAR.turn * (0.35 + 0.65 * Math.min(1, c.speed / 200));
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
 * it if it can, otherwise the car stops. Returns true if it bumped into something. */
export function moveCar(c: CarState, prevH: number, dt: number, solids: Rect[], bounds: { w: number; h: number }, others: [number, number, number][] = []): boolean {
  const fits = (x: number, y: number, h: number) => carFits(x, y, h, solids, bounds, others);
  if (!fits(c.x, c.y, c.h)) c.h = prevH;
  const dx = Math.cos(c.h) * c.speed * dt, dy = Math.sin(c.h) * c.speed * dt;
  if (fits(c.x + dx, c.y + dy, c.h)) { c.x += dx; c.y += dy; return false; }
  // slide along whichever axis is still open (the bigger one first)
  const tries: [number, number][] = Math.abs(dx) > Math.abs(dy) ? [[dx, 0], [0, dy]] : [[0, dy], [dx, 0]];
  for (const [mx, my] of tries) if ((mx || my) && fits(c.x + mx, c.y + my, c.h)) {
    c.x += mx; c.y += my; c.speed *= 0.97; return true;
  }
  c.speed = 0; return true;
}
