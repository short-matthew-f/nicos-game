// Player movement rules, kept free of rendering so they can be unit tested.
import type { View } from './rig/pose';
import type { Rect } from './world/map';

export const WALK_SPEED = 270;   // world px/s at full stick
export const RADIUS = 16;        // feet collision circle

/** The 8 facings, by direction of travel (screen angle, y down): view + which way it faces.
 * 3/4 views and the side view are drawn facing right and flipped for the left. */
const FACINGS: { deg: number; view: View; face: number }[] = [
  { deg: 0, view: 'side', face: 1 }, { deg: 45, view: 'qfront', face: 1 }, { deg: 90, view: 'front', face: 1 },
  { deg: 135, view: 'qfront', face: -1 }, { deg: 180, view: 'side', face: -1 }, { deg: -135, view: 'qback', face: -1 },
  { deg: -90, view: 'back', face: 1 }, { deg: -45, view: 'qback', face: 1 },
];
export const FACING_STICKY = 8;   // degrees past a sector edge before switching (no flicker on the boundary)

const angDiff = (a: number, b: number) => Math.abs(((a - b) % 360 + 540) % 360 - 180);

/** Facing from velocity: the nearest of 8 directions, staying with the current one until
 * the travel direction is clearly into the next sector. (Front/back keep their face value;
 * it's unused for them.) */
export function chooseView(vx: number, vy: number, cur: { view: View; face: number }): { view: View; face: number } {
  if (Math.abs(vx) < 1e-3 && Math.abs(vy) < 1e-3) return cur;
  const deg = Math.atan2(vy, vx) * 180 / Math.PI;
  const curF = FACINGS.find(f => f.view === cur.view && (f.view === 'front' || f.view === 'back' || f.face === cur.face));
  if (curF && angDiff(deg, curF.deg) <= 22.5 + FACING_STICKY) return cur;
  let best = FACINGS[0];
  for (const f of FACINGS) if (angDiff(deg, f.deg) < angDiff(deg, best.deg)) best = f;
  return { view: best.view, face: best.view === 'front' || best.view === 'back' ? cur.face : best.face };
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
