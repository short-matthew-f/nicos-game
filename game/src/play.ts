// Playground activities: short scripted moves where the game drives Nico's pose. Each is a
// pure function of time, so it can be tested without drawing anything.
import { SLIDE, SWINGS, SWING_BAR, SWING_SEAT } from './world/map';
import type { View } from './rig/pose';

export interface Body {
  x: number; y: number;            // feet
  view: View; face: number;
  amp: number; crouch: number; hold: number; sit: number;
  z: number;                       // draw order (in front of the equipment while on it)
  sy: number;                      // extra vertical scale (swinging toward the camera)
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
