// Playground activities: short scripted moves where the game drives Nico's pose. Each is a
// pure function of time, so it can be tested without drawing anything.
import { SLIDE, SWINGS, SWING_BAR, SWING_SEAT, SOLIDS, WORLD } from './world/map';
import { freeAt } from './player';
import { WSLIDE, POOL } from './world/zones';
import type { View } from './rig/pose';

export interface Body {
  x: number; y: number;            // feet
  view: View; face: number;
  amp: number; crouch: number; hold: number; sit: number;
  z: number;                       // draw order (in front of the equipment while on it)
  sy: number;                      // extra vertical scale (swinging toward the camera)
  dy?: number;                     // drawn this much lower than (x, y) without moving there (in the water)
}

const lerp = (a: number, b: number, u: number) => a + (b - a) * Math.max(0, Math.min(1, u));
const ease = (u: number) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };

// ---- the slide: walk to the ladder, climb, sit down at the top, whoosh down, hop off
export const SLIDE_T = { walk: 0.45, climb: 1.05, sit: 0.35, slide: 0.7, land: 0.4 };
export const SLIDE_LEN = Object.values(SLIDE_T).reduce((a, b) => a + b);
const LADDER: [number, number] = [SLIDE.x + SLIDE.w / 2, SLIDE.y + 8];
const TOP: [number, number] = [SLIDE.x + SLIDE.w / 2 + 6, SLIDE.y - SLIDE.top];
// the chute's top surface runs from the tower edge down to its end
const CHUTE0: [number, number] = [SLIDE.x + SLIDE.w, SLIDE.y - SLIDE.top - 4];
const CHUTE1: [number, number] = [SLIDE.x + SLIDE.len, SLIDE.y - 22];
const onChute = (u: number): [number, number] => [lerp(CHUTE0[0], CHUTE1[0], u), lerp(CHUTE0[1], CHUTE1[1], u) + 8];
const SEAT0 = onChute(0.04), SEAT1 = onChute(0.9);   // where his seat is at the top and bottom of the ride
const LAND: [number, number] = [SLIDE.x + SLIDE.len + 40, SLIDE.y + 24];

export function slideAt(t: number, from: [number, number]): Body {
  const T = SLIDE_T, z = SLIDE.y + 1;
  const pose = { face: 1, crouch: 0, hold: 0, sy: 1 };
  let k = t;
  if (k < T.walk) {
    const u = k / T.walk, y = lerp(from[1], LADDER[1], u);
    return { ...pose, x: lerp(from[0], LADDER[0], u), y, view: 'back', amp: 1, sit: 0, z: Math.max(z, y) };
  }
  k -= T.walk;
  if (k < T.climb) {
    const u = k / T.climb;
    return { ...pose, x: lerp(LADDER[0], TOP[0], u), y: lerp(LADDER[1], TOP[1], u), view: 'back', amp: 1, sit: 0, z };
  }
  k -= T.climb;
  if (k < T.sit) {   // turn to face down the chute and sit at its top
    const u = ease(k / T.sit);
    return { ...pose, x: lerp(TOP[0], SEAT0[0], u), y: lerp(TOP[1], SEAT0[1], u), view: 'side', amp: 0, sit: u, hold: 0.5 * u, z };
  }
  k -= T.sit;
  if (k < T.slide) {
    const u = (k / T.slide) ** 1.6;   // speeds up on the way down
    return { ...pose, x: lerp(SEAT0[0], SEAT1[0], u), y: lerp(SEAT0[1], SEAT1[1], u), view: 'side', amp: 0, sit: 1, hold: 0.5, z };
  }
  k -= T.slide;
  const u = ease(k / T.land);   // stand up off the end
  return { ...pose, x: lerp(SEAT1[0], LAND[0], u), y: lerp(SEAT1[1], LAND[1], u), view: 'side', amp: 0, sit: 1 - u, hold: 0.5 * (1 - u), z: Math.max(z, lerp(SEAT1[1], LAND[1], u)) };
}
export const SLIDE_START: [number, number] = LADDER, SLIDE_END: [number, number] = LAND;

// ---- the swings: sit on the nearest seat and swing toward and away from the camera
export const SWING_PERIOD = 2.2;
export const seatX = (i: number) => SWINGS.x + SWINGS.seats[i];

/** The seat's swing (chain stretch, 1 = hanging still) and Nico on it, t s after sitting. */
export function swingAt(t: number, seat: number): { body: Body; chain: number } {
  const grow = Math.min(1, t / 3);                         // pumps up to full height
  const chain = 1 + 0.32 * grow * Math.sin(2 * Math.PI * t / SWING_PERIOD);
  // feet hang a little below the plank; Nico draws between the frame and his seat
  const y = SWING_BAR + (SWING_SEAT + 22 - SWING_BAR) * chain;
  return { chain, body: { x: seatX(seat), y, view: 'front', face: 1, amp: 0, crouch: 1, hold: 0, sit: 0, z: SWINGS.y + 1, sy: 0.96 + 0.08 * (chain - 1) / 0.32 } };
}

// ---- the water slide: climb the tower, sit at the top, whoosh round the twisting chute, splash
export const WSLIDE_T = { climb: 1.1, sit: 0.3, slide: 1.4 };
const W0 = [WSLIDE.x + 40, WSLIDE.y - 300], W1 = [WSLIDE.x + 260, WSLIDE.y - 300], W2 = [WSLIDE.x + 40, WSLIDE.y - 150], W3 = [WSLIDE.x + 230, WSLIDE.y + 50];   // (the chute comes right down to the water)
const bez = (u: number) => [0, 1].map(i => (1 - u) ** 3 * W0[i] + 3 * (1 - u) ** 2 * u * W1[i] + 3 * (1 - u) * u * u * W2[i] + u ** 3 * W3[i]) as [number, number];
/** Where he lands: the chute's end, dropped to the water's surface. */
export const SPLASH: [number, number] = [W3[0], POOL.y + 130];   // (well in: not close enough to an edge to climb straight out)
/** Nico on the water slide at time t (null: he's splashed down). (He's drawn where the chute is drawn.) */
export function waterSlideAt(t: number): Body | null {
  const T = WSLIDE_T, z = WSLIDE.y + 2, pose = { face: 1, hold: 0, sy: 1 };
  if (t < T.climb) { const u = t / T.climb; return { ...pose, x: WSLIDE.x, y: lerp(WSLIDE.y + 10, W0[1] + 4, u), view: 'back', amp: 1, crouch: 0, sit: 0, z }; }
  if (t < T.climb + T.sit) { return { ...pose, x: lerp(WSLIDE.x, W0[0], (t - T.climb) / T.sit), y: W0[1] + 4, view: 'front', amp: 0, crouch: 1, sit: 1, z }; }
  const u = (t - T.climb - T.sit) / T.slide;
  if (u >= 1) return null;
  const [x, y] = bez(ease(u) * 0.6 + u * 0.4);   // speeds up as it goes
  return { ...pose, x, y: y + 4, view: 'front', amp: 0, crouch: 1, sit: 1, z };
}

// ---- swimming
export const SWIM = { speed: 150, ringSpeed: 100, edge: 46, inset: 26 };
/** Keep a swimmer inside the pool. */
export const inPool = (x: number, y: number): [number, number] =>
  [Math.min(POOL.x + POOL.w - SWIM.inset, Math.max(POOL.x + SWIM.inset, x)), Math.min(POOL.y + POOL.d - 10, Math.max(POOL.y + SWIM.inset + 30, y))];
/** Close enough to an edge to climb out? */
export const atEdge = (x: number, y: number) =>
  x - POOL.x < SWIM.edge || POOL.x + POOL.w - x < SWIM.edge || y - POOL.y < SWIM.edge + 30 || POOL.y + POOL.d - y < SWIM.edge;
/** Where he stands after climbing out at (x, y): straight out over the nearest edge, onto the deck. */
export function climbOut(x: number, y: number): [number, number] {
  const d = [x - POOL.x, POOL.x + POOL.w - x, y - POOL.y, POOL.y + POOL.d - y], i = d.indexOf(Math.min(...d));
  const at = (along: number, out: number): [number, number] =>
    i === 0 ? [POOL.x - out, y + along] : i === 1 ? [POOL.x + POOL.w + out, y + along] : i === 2 ? [x + along, POOL.y - out + 10] : [x + along, POOL.y + POOL.d + out + 10];
  // straight out if that's clear; otherwise a step along the edge (a lounger might be in the way)
  for (const along of [0, 40, -40, 80, -80, 120, -120]) for (const out of [50, 90]) { const p = at(along, out); if (freeAt(p[0], p[1], SOLIDS, WORLD)) return p; }
  return at(0, 50);
}
