// Player movement rules, kept free of rendering so they can be unit tested.
import { CYCLE, type PoseState, type View } from './rig/pose';
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

const AMP_RATE = 5;              // gait amplitude ramp (1/s)
const IDLE_CADENCE = 0.5;        // phase/s while the legs settle after stopping
export const GAIT_SCALE = 0.75;  // world px per rig unit (= rig/person RIG_SCALE)

/** Walk cycle from actual speed (world px/s): faster means a longer stride (up to a run,
 * amp 1.25) and quicker steps, with the cadence set so the planted foot keeps pace with
 * the ground instead of sliding. A stance foot sweeps 2 x leg x sin(swing) per half cycle. */
export function stepGait(st: PoseState, speedPx: number, vy: number, dt: number, scale = GAIT_SCALE): void {
  const target = Math.min(1.25, speedPx / 220);
  st.amp += Math.max(-AMP_RATE * dt, Math.min(AMP_RATE * dt, target - st.amp));
  const stridePerPhase = 2 * 58 * scale * Math.sin(28 * Math.max(st.amp, 0.3) * Math.PI / 180) / (CYCLE / 2);
  // 0.8: the leg swing is a sine, so the planted foot can't match the ground all the way
  // through a step; measured (test/gait.test.ts), 0.8 of the "exact" cadence slides least
  const rate = speedPx > 1 ? 0.8 * speedPx / stridePerPhase : st.amp > 0.01 ? IDLE_CADENCE : 0;
  st.phase += rate * dt;
  // front/back: planted foot cancels the body's screen-y motion (rig units per phase)
  st.stride_y = rate > 0 ? (vy / rate) / scale : 0;
  if (st.amp < 0.01 && speedPx <= 1) { st.amp = 0; st.phase = 0; }
}
