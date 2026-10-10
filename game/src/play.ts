// Playground activities: short scripted moves where the game drives Nico's pose. Each is a
// pure function of time, so it can be tested without drawing anything.
import { SLIDE, SWINGS, SWING_BAR, SWING_SEAT } from './world/map';
import type { View } from './rig/pose';

export interface Body {
  x: number; y: number;            // feet
  view: View; face: number;
  amp: number; crouch: number; hold: number;
  z: number;                       // draw order (in front of the equipment while on it)
  sy: number;                      // extra vertical scale (swinging toward the camera)
}

const lerp = (a: number, b: number, u: number) => a + (b - a) * Math.max(0, Math.min(1, u));
const ease = (u: number) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };

// ---- the slide: walk to the ladder, climb, sit, whoosh down, hop off
export const SLIDE_T = { walk: 0.45, climb: 1.05, sit: 0.3, slide: 0.65, land: 0.35 };
export const SLIDE_LEN = Object.values(SLIDE_T).reduce((a, b) => a + b);
const LADDER: [number, number] = [SLIDE.x + SLIDE.w / 2, SLIDE.y + 8];
const TOP: [number, number] = [SLIDE.x + SLIDE.w / 2 + 6, SLIDE.y - SLIDE.top];
const BOTTOM: [number, number] = [SLIDE.x + SLIDE.len - 14, SLIDE.y - 12];
const LAND: [number, number] = [SLIDE.x + SLIDE.len + 34, SLIDE.y + 24];

export function slideAt(t: number, from: [number, number]): Body {
  const T = SLIDE_T, z = SLIDE.y + 1;
  let k = t;
  if (k < T.walk) {
    const u = k / T.walk;
    return { x: lerp(from[0], LADDER[0], u), y: lerp(from[1], LADDER[1], u), view: 'back', face: 1, amp: 1, crouch: 0, hold: 0, z: Math.max(z, lerp(from[1], LADDER[1], u)), sy: 1 };
  }
  k -= T.walk;
  if (k < T.climb) {
    const u = k / T.climb;
    return { x: lerp(LADDER[0], TOP[0], u), y: lerp(LADDER[1], TOP[1], u), view: 'back', face: 1, amp: 1, crouch: 0, hold: 0, z, sy: 1 };
  }
  k -= T.climb;
  if (k < T.sit) return { x: TOP[0], y: TOP[1], view: 'side', face: 1, amp: 0, crouch: ease(k / T.sit) * 0.8, hold: ease(k / T.sit) * 0.6, z, sy: 1 };
  k -= T.sit;
  if (k < T.slide) {
    const u = (k / T.slide) ** 1.6;   // speeds up on the way down
    return { x: lerp(TOP[0], BOTTOM[0], u), y: lerp(TOP[1], BOTTOM[1], u), view: 'side', face: 1, amp: 0, crouch: 0.8, hold: 0.6, z, sy: 1 };
  }
  k -= T.slide;
  const u = ease(k / T.land);
  return { x: lerp(BOTTOM[0], LAND[0], u), y: lerp(BOTTOM[1], LAND[1], u), view: 'side', face: 1, amp: 0, crouch: 0.8 * (1 - u), hold: 0.6 * (1 - u), z: Math.max(z, lerp(BOTTOM[1], LAND[1], u)), sy: 1 };
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
  const y = SWING_BAR + (SWING_SEAT + 24 - SWING_BAR) * chain;
  return { chain, body: { x: seatX(seat), y, view: 'front', face: 1, amp: 0, crouch: 0.75, hold: 0, z: SWINGS.y + 1, sy: 0.96 + 0.08 * (chain - 1) / 0.32 } };
}
