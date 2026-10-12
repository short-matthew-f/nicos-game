// Rea, Nico's youngest cousin, at the beach (the user, 2026-10-11: "at the beach, she's knocking over buildings and
// building castles"). A toddler with a bucket: she waddles to a spot on the sand and builds a sandcastle, admires it,
// and then (of course) stomps it flat and giggles. Nico can build her one, which she toddles straight over to knock
// down. Pure: main.ts draws her and the castles.
import { shoreY } from './world/zones';

export const REA = {
  sites: [2030, 2210, 2390].map(x => [x, Math.round(shoreY(x) - 150)] as [number, number]),
  speed: 46, build: 5, admire: [2.5, 5] as [number, number], windup: 0.7, giggle: 1.8, rest: [1, 3] as [number, number], fall: 0.6,
  lines: { build: ['Castle!', 'Mine!', 'Sand!'], admire: ['Pretty!', 'Look!', 'Big castle!'], boom: ['BOOM!', 'Crash!', 'Uh oh!'], giggle: ['Hehehe!', 'Again!', 'Again again!'] },
};
export type CastleState = 'none' | 'building' | 'up' | 'down';
export interface Castle { x: number; y: number; built: number; state: CastleState; t: number }
export type Doing = 'walk' | 'build' | 'admire' | 'stomp' | 'giggle' | 'rest';
export interface Rea { x: number; y: number; vx: number; vy: number; doing: Doing; at: number; t: number }
export interface ReaEvent { kind: 'say' | 'built' | 'boom'; text?: string; at?: number }

export function makeRea(): { rea: Rea; castles: Castle[] } {
  const castles = REA.sites.map(([x, y], i) => ({ x, y, built: i === 1 ? 1 : 0, state: (i === 1 ? 'up' : 'none') as CastleState, t: 9 }));
  const [x, y] = REA.sites[0];
  return { rea: { x: x - 60, y: y + 40, vx: 0, vy: 0, doing: 'rest', at: -1, t: 1 }, castles };
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
