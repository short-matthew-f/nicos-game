// Nico's City Pinball: the table, as data. A portrait playfield 600 x 1060 (units are table pixels,
// y down): an arched top, the plunger lane up the right side, four rollover lanes (N I C O) under
// the arch, three pop bumpers, the Burger Barn saucer, a bank of three drop targets, the spinner
// lane on the right, two slingshots and two flippers. physics.ts moves the ball round it; rules.ts
// keeps the score; view.ts draws it.

export type V = [number, number];
export interface Seg { a: V; b: V; r: number; kind: 'wall' | 'sling' | 'gate' | 'post'; id?: string; e?: number }
export interface Bumper { id: string; c: V; r: number; color: string }
export interface Flipper { side: 'L' | 'R'; pivot: V; len: number; r0: number; r1: number; rest: number; up: number }

export const T = {
  w: 600, h: 1060,
  ball: 11,                 // ball radius
  gravity: 1650,            // units/s² down the (tilted) table
  maxSpeed: 3600,
  lane: { x0: 532, x1: 576, top: 330 },   // the plunger lane
  plunger: { x: 554, y: 1030, min: 1720, max: 2350 },   // its tip; launch speeds (no pull .. full pull)
  drain: 1080,
};

const arch = (cx: number, cy: number, r: number, a0: number, a1: number, n: number): V[] =>
  Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as V; });
const poly = (pts: V[], kind: Seg['kind'] = 'wall', r = 3, id?: string): Seg[] => pts.slice(1).map((p, i) => ({ a: pts[i], b: p, r, kind, id }));
const mirror = (p: V): V => [556 - p[0], p[1]];   // left <-> right, about the playfield's middle (x = 278)

/** The arch over the top: from the left wall round to the right outer wall. */
export const ARCH: V[] = arch(300, 290, 276, Math.PI, 2 * Math.PI, 40);

// slingshots: the triangle's long face kicks
const SLING_L: V[] = [[68, 690], [68, 780], [150, 845]];   // (high enough off the inlane guide for a ball to roll under)
const SLING_R: V[] = SLING_L.map(mirror);
export const SLINGS = { L: SLING_L, R: SLING_R };

export const LANE_POSTS = [150, 215, 280, 345, 410];   // the posts between the N I C O lanes
export const LANES = { y0: 110, y1: 172, sense: 150, letters: ['N', 'I', 'C', 'O'] };

export const SEGS: Seg[] = [
  ...poly([[24, 1060], [24, 290]]),                    // the left wall (all the way down: the drain's enclosed)
  ...poly(ARCH),
  ...poly([[576, 290], [576, 1060]]),                  // the right outer wall
  ...poly([[532, T.lane.top], [532, 1060]]),           // the plunger lane's inner wall
  { a: [532, T.lane.top], b: [576, 292], r: 3, kind: 'gate' },   // one-way: up and out, never back down
  ...poly([[24, 800], [178, 922]]),                    // the inlane guides down onto the flippers
  ...poly([mirror([24, 800]), mirror([178, 922])]),
  // the slingshots: the two back faces are plain walls, the long face facing the flippers kicks
  ...poly([SLING_L[0], SLING_L[1], SLING_L[2]], 'wall', 4), { a: SLING_L[0], b: SLING_L[2], r: 4, kind: 'sling', id: 'L' },
  ...poly([SLING_R[0], SLING_R[1], SLING_R[2]], 'wall', 4), { a: SLING_R[2], b: SLING_R[0], r: 4, kind: 'sling', id: 'R' },
  // a little slope over the target bank so nothing can sit on top of it
  ...poly([[24, 398], [42, 414]], 'wall', 3),
  // the spinner lane up the right side (an orbit back to the bumpers)
  ...poly([[470, 440], [470, 640]], 'wall', 4),
  // the rollover lane posts under the arch
  ...LANE_POSTS.map(x => ({ a: [x, LANES.y0] as V, b: [x, LANES.y1] as V, r: 5, kind: 'post' as const, e: 0.55 })),
];

export const BUMPERS: Bumper[] = [
  { id: 'burger', c: [205, 300], r: 30, color: '#E5484D' },
  { id: 'icecream', c: [352, 300], r: 30, color: '#F06A8A' },
  { id: 'fire', c: [278, 405], r: 30, color: '#F9A826' },
];

/** The Burger Barn saucer: a hole that holds the ball a moment, then kicks it out toward the flippers. */
export const SAUCER = { c: [104, 330] as V, r: 15, hold: 1.4, kick: [320, 260] as V };
/** The drop target bank on the left (facing right): B, A, R... the fire station bank. */
export const TARGETS = [440, 495, 550].map((y, i) => ({ id: i, x: 37, y, half: 22 }));   // (flush to the wall: no gap behind them for a ball to stick in)
/** The spinner, across the right-hand lane. */
export const SPINNER = { x0: 470, x1: 532, y: 520 };

export const FLIPPERS: Flipper[] = [
  { side: 'L', pivot: [190, 935], len: 80, r0: 13, r1: 7, rest: 0.5, up: -0.52 },
  { side: 'R', pivot: [366, 935], len: 80, r0: 13, r1: 7, rest: Math.PI - 0.5, up: Math.PI + 0.52 },
];
