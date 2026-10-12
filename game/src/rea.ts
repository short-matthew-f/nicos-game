// Rea, Nico's youngest cousin, at the beach (the user, 2026-10-11: "at the beach, she's knocking over buildings and
// building castles"). A toddler with a bucket: she waddles to a spot on the sand and builds a sandcastle, admires it,
// and then (of course) stomps it flat and giggles. Nico can build her one, which she toddles straight over to knock
// down. Pure: main.ts draws her and the castles.
//
// And she tags along (the user, 2026-10-12: "Rea should!"): take her hand, or now and then she just decides to
// follow you. She toddles after Nico along the way he walked (his footsteps: never through a wall), runs to keep up,
// waits outside while he's in a building or in the car or the pool, and if he's gone a long time she goes back to
// the beach the way she came. Cars, trucks, Poppop's Fiat: "Mashina!" (Russian for car).
import { shoreY } from './world/zones';

export const REA = {
  sites: [2030, 2210, 2390].map(x => [x, Math.round(shoreY(x) - 150)] as [number, number]),
  speed: 46, build: 5, admire: [2.5, 5] as [number, number], windup: 0.7, giggle: 1.8, rest: [1, 3] as [number, number], fall: 0.6,
  follow: { gap: 80, run: 235, back: 120, wait: 25, auto: 0.08, autoNear: 160, every: 20, cap: 4000 },
  lines: { build: ['Castle!', 'Mine!', 'Sand!'], admire: ['Pretty!', 'Look!', 'Big castle!'], boom: ['BOOM!', 'Crash!', 'Uh oh!'], giggle: ['Hehehe!', 'Again!', 'Again again!'] },
};
export type CastleState = 'none' | 'building' | 'up' | 'down';
export interface Castle { x: number; y: number; built: number; state: CastleState; t: number }
export type Doing = 'walk' | 'build' | 'admire' | 'stomp' | 'giggle' | 'rest';
export type Mode = 'beach' | 'follow' | 'wait' | 'return';
export interface Rea { x: number; y: number; vx: number; vy: number; doing: Doing; at: number; t: number; mode: Mode; path: [number, number][]; trail: [number, number][]; waitT: number }
export interface ReaEvent { kind: 'say' | 'built' | 'boom'; text?: string; at?: number }

export function makeRea(): { rea: Rea; castles: Castle[] } {
  const castles = REA.sites.map(([x, y], i) => ({ x, y, built: i === 1 ? 1 : 0, state: (i === 1 ? 'up' : 'none') as CastleState, t: 9 }));
  const [x, y] = REA.sites[0];
  return { rea: { x: x - 60, y: y + 40, vx: 0, vy: 0, doing: 'rest', at: -1, t: 1, mode: 'beach', path: [], trail: [], waitT: 0 }, castles };
}
/** Where she stands to build (or stomp): just to the castle's left, a little in front. */
export const standAt = (c: Castle): [number, number] => [c.x - 58, c.y + 18];
const pick = <T,>(a: T[], r: () => number) => a[Math.floor(r() * a.length)];

export function stepRea(r: Rea, castles: Castle[], dt: number, rnd: () => number = Math.random): ReaEvent[] {
  const ev: ReaEvent[] = [];
  for (const c of castles) c.t += dt;
  r.t -= dt; r.vx = r.vy = 0;
  const c = castles[r.at];
  switch (r.doing) {
    case 'rest': case 'admire': case 'giggle':
      if (r.t > 0) break;
      { // what next: knock down a castle that's standing, or build one where there isn't
        const up = castles.map((q, i) => [q, i] as const).filter(([q]) => q.state === 'up');
        const free = castles.map((q, i) => [q, i] as const).filter(([q]) => q.state === 'none' || q.state === 'down');
        const list = up.length && (rnd() < 0.7 || !free.length) ? up : free;
        r.at = list.length ? list[Math.floor(rnd() * list.length)][1] : 0; r.doing = 'walk';
      }
      break;
    case 'walk': {
      const [tx, ty] = standAt(c), dx = tx - r.x, dy = ty - r.y, d = Math.hypot(dx, dy);
      if (d > 3) { const k = Math.min(1, REA.speed * dt / d); r.x += dx * k; r.y += dy * k; r.vx = dx / d * REA.speed; r.vy = dy / d * REA.speed; break; }
      if (c.state === 'up') { r.doing = 'stomp'; r.t = REA.windup; }
      else { r.doing = 'build'; c.state = 'building'; c.built = 0; ev.push({ kind: 'say', text: pick(REA.lines.build, rnd) }); }
      break;
    }
    case 'build':
      if (c.state === 'up') { r.doing = 'admire'; r.t = 1; break; }   // (Nico finished it for her)
      c.built = Math.min(1, c.built + dt / REA.build);
      if (c.built >= 1) { c.state = 'up'; c.t = 0; r.doing = 'admire'; r.t = REA.admire[0] + rnd() * (REA.admire[1] - REA.admire[0]); ev.push({ kind: 'built', at: r.at }, { kind: 'say', text: pick(REA.lines.admire, rnd) }); }
      break;
    case 'stomp':
      if (r.t > 0) break;
      c.state = 'down'; c.t = 0; c.built = 0;
      ev.push({ kind: 'boom', at: r.at }, { kind: 'say', text: pick(REA.lines.boom, rnd) });
      r.doing = 'giggle'; r.t = REA.giggle;
      break;
  }
  if (r.doing === 'giggle' && r.t > 0 && r.t < REA.giggle - 0.8 && r.t + dt >= REA.giggle - 0.8) ev.push({ kind: 'say', text: pick(REA.lines.giggle, rnd) });
  return ev;
}
/** Nico builds a castle for her at a spot that's empty (or flattened). */
export function buildFor(castles: Castle[], i: number): boolean {
  const c = castles[i]; if (!c || c.state === 'up') return false;
  c.state = 'up'; c.built = 1; c.t = 0; return true;
}

// ---- tagging along
/** Take her hand (or she decides to come): from here she follows Nico's footsteps. */
export function startFollow(r: Rea) {
  if (r.mode === 'follow') return;
  if (r.mode === 'beach') r.trail = [[r.x, r.y]];
  r.mode = 'follow'; r.path = []; r.waitT = 0; r.doing = 'walk';
}
/** Let her go back and play. */
export function letGo(r: Rea) { if (r.mode !== 'beach') { r.mode = 'return'; r.path = []; } }
/** Nico's footsteps, as he walks (main.ts calls this every frame while she's following). */
export function footstep(r: Rea, x: number, y: number) {
  const last = r.path[r.path.length - 1];
  if (!last || Math.hypot(x - last[0], y - last[1]) >= REA.follow.every) r.path.push([x, y]);
}
/** Would she decide on her own to come along? (Now and then, when Nico's close and she's between castles.) */
export function wantsToCome(r: Rea, nx: number, ny: number, dt: number, rnd: () => number = Math.random) {
  return r.mode === 'beach' && (r.doing === 'rest' || r.doing === 'admire') && Math.hypot(nx - r.x, ny - r.y) < REA.follow.autoNear && rnd() < REA.follow.auto * dt;
}
const walkTo = (r: Rea, tx: number, ty: number, speed: number, dt: number) => {
  const dx = tx - r.x, dy = ty - r.y, d = Math.hypot(dx, dy);
  if (d < 0.5) { r.vx = r.vy = 0; return true; }
  const k = Math.min(1, speed * dt / d); r.x += dx * k; r.y += dy * k; r.vx = dx / d * speed; r.vy = dy / d * speed;
  return k >= 1;
};
const rememberStep = (r: Rea) => {
  const last = r.trail[r.trail.length - 1];
  if (!last || Math.hypot(r.x - last[0], r.y - last[1]) >= REA.follow.every) { r.trail.push([r.x, r.y]); if (r.trail.length > REA.follow.cap) r.trail.shift(); }
};
/** Following, waiting or heading back. canFollow: Nico's out walking (not in a building, the car, the pool, a game). */
export function stepFollow(r: Rea, dt: number, canFollow: boolean): 'home' | null {
  r.vx = r.vy = 0;
  if (r.mode === 'follow' && !canFollow) { r.mode = 'wait'; r.waitT = 0; }
  if (r.mode === 'wait') {
    if (canFollow) { r.mode = 'follow'; r.path = []; }
    else { r.waitT += dt; if (r.waitT > REA.follow.wait) r.mode = 'return'; return null; }
  }
  if (r.mode === 'follow') {
    // along his footsteps, staying a little way behind him
    let left = 0; for (let i = r.path.length - 1; i > 0; i--) left += Math.hypot(r.path[i][0] - r.path[i - 1][0], r.path[i][1] - r.path[i - 1][1]);
    if (r.path.length && left + Math.hypot(r.path[0][0] - r.x, r.path[0][1] - r.y) > REA.follow.gap) {
      const speed = Math.min(REA.follow.run, 60 + left * 1.4);   // (runs to catch up, toddles when close)
      if (walkTo(r, r.path[0][0], r.path[0][1], speed, dt)) r.path.shift();
      rememberStep(r);
    }
    r.doing = r.vx || r.vy ? 'walk' : 'rest';
    return null;
  }
  if (r.mode === 'return') {
    // back to the beach the way she came
    const to = r.trail[r.trail.length - 1];
    if (!to) { r.mode = 'beach'; r.doing = 'rest'; r.t = 1; return 'home'; }
    if (walkTo(r, to[0], to[1], REA.follow.back, dt)) r.trail.pop();
    r.doing = 'walk';
  }
  return null;
}
/** Is there a car near her? (Any vehicle: the cars on the roads, Nico's, the fire truck, Poppop's Fiat.) */
export const seesCar = (r: Rea, cars: [number, number][], range = 300) => cars.some(([x, y]) => Math.hypot(x - r.x, y - r.y) < range);
