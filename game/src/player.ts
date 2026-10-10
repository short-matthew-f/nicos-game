// Player movement rules, kept free of rendering so they can be unit tested.
import type { View } from './rig/pose';
import type { Rect } from './world/map';

export const WALK_SPEED = 270;   // world px/s at full stick
export const RADIUS = 16;        // feet collision circle

/** Facing from velocity, with hysteresis so diagonals don't flicker between views.
 * Mostly horizontal -> side (face = sign of vx); mostly down -> front; up -> back. */
export function chooseView(vx: number, vy: number, cur: { view: View; face: number }): { view: View; face: number } {
  const ax = Math.abs(vx), ay = Math.abs(vy);
  if (ax < 1e-3 && ay < 1e-3) return cur;
  if (ax > ay * 1.25) return { view: 'side', face: vx > 0 ? 1 : -1 };
  if (ay > ax * 1.25) return { view: vy > 0 ? 'front' : 'back', face: cur.face };
  // diagonal band: keep the current view, but update a side facing that went the wrong way
  if (cur.view === 'side' && Math.sign(vx) !== cur.face) return { view: 'side', face: vx > 0 ? 1 : -1 };
  return cur;
}

/** Move a circle by (dx, dy), sliding along rect edges and staying in bounds. */
export function moveCircle(x: number, y: number, dx: number, dy: number, solids: Rect[], bounds: { w: number; h: number }, r = RADIUS): [number, number] {
  let nx = Math.min(bounds.w - r, Math.max(r, x + dx));
  let ny = y;
  for (const s of solids) if (hits(nx, ny, r, s)) nx = dx > 0 ? s.x - r : dx < 0 ? s.x + s.w + r : nx;
  ny = Math.min(bounds.h - r, Math.max(r, y + dy));
  for (const s of solids) if (hits(nx, ny, r, s)) ny = dy > 0 ? s.y - r : dy < 0 ? s.y + s.d + r : ny;
  return [nx, ny];
}

/** Can Nico stand at (x, y)? */
export function freeAt(x: number, y: number, solids: Rect[], bounds: { w: number; h: number }, r = RADIUS): boolean {
  return x >= r && y >= r && x <= bounds.w - r && y <= bounds.h - r && !solids.some(s => hits(x, y, r, s));
}

function hits(x: number, y: number, r: number, s: Rect): boolean {
  return x > s.x - r && x < s.x + s.w + r && y > s.y - r && y < s.y + s.d + r;
}
