// Places beyond the town (Nico, 2026-10-10: "the map feels too constrained"): a forest with a
// lake to the north-east, a campground, a beach along a curving shore with the ocean beyond,
// a pool park and a farm to the south. The town itself (0..4860 x 0..3510) is unchanged, so
// every old position and save still works; the new land is all east and south of it.
// Data only, like map.ts (which adds these to its buildings, lots, trees, props and solids).

export const ZONE_WORLD = { w: 8100, h: 5600 };

/** The shoreline, west to east: land is above/left of it, the ocean below/right. */
export const SHORE: [number, number][] = [
  [0, 5200], [900, 5300], [1800, 5250], [2700, 5050], [3600, 4900], [4500, 4700], [5300, 4450],
  [6000, 4100], [6600, 3650], [7100, 3050], [7500, 2400], [7800, 1700], [8100, 1300],
];
export const SAND_W = 430;   // how deep the beach is, inland from the water's edge

/** The shore's y at x (straight lines between the points). */
export function shoreY(x: number): number {
  if (x <= SHORE[0][0]) return SHORE[0][1];
  for (let i = 1; i < SHORE.length; i++) {
    const [x0, y0] = SHORE[i - 1], [x1, y1] = SHORE[i];
    if (x <= x1) return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
  }
  return SHORE[SHORE.length - 1][1];
}

/** The beach as a polygon: the shoreline, then the same line pushed inland along its normal. */
export function sandPolygon(): number[] {
  const inland = SHORE.map(([x, y], i) => {
    const [ax, ay] = SHORE[Math.max(0, i - 1)], [bx, by] = SHORE[Math.min(SHORE.length - 1, i + 1)];
    const tx = bx - ax, ty = by - ay, l = Math.hypot(tx, ty);
    return [x + ty / l * SAND_W, y - tx / l * SAND_W];   // the normal that points up and to the left (inland)
  });
  // close it along the map edges so the strip has no gaps at either end
  return [...SHORE.flat(), ...[...inland].reverse().flat()];
}
export const waterPolygon = (): number[] => [...SHORE.flat(), ZONE_WORLD.w, ZONE_WORLD.h, 0, ZONE_WORLD.h];

/** The pier: a boardwalk out over the water (you can walk on it). */
export const PIER = { x: 4320, y: 4560, w: 160, d: 560 };

/** The ocean as solid strips (40 px wide), leaving a gap for the pier. Nico can paddle a
 * little way into the shallows before he stops. */
export function oceanSolids(): { x: number; y: number; w: number; d: number }[] {
  const out: { x: number; y: number; w: number; d: number }[] = [];
  const W = 40;   // (narrow strips follow the steep east coast closely)
  for (let x = 0; x < ZONE_WORLD.w; x += W) {
    let y = Math.min(shoreY(x), shoreY(x + W)) + 40;
    if (x + W > PIER.x && x < PIER.x + PIER.w) y = PIER.y + PIER.d;   // under the pier: water starts past its end
    if (y < ZONE_WORLD.h) out.push({ x, y, w: W, d: ZONE_WORLD.h - y });
  }
  // the pier's sides
  out.push({ x: PIER.x - 20, y: shoreY(PIER.x) + 40, w: 20, d: PIER.y + PIER.d - shoreY(PIER.x) - 40 });
  out.push({ x: PIER.x + PIER.w, y: shoreY(PIER.x + PIER.w) + 40, w: 20, d: PIER.y + PIER.d - shoreY(PIER.x + PIER.w) - 40 });
  return out;
}

/** The forest lake (water: solid). */
export const LAKE = { x: 6950, y: 330, w: 800, d: 420 };
/** The swimming pool (water: solid for now) inside the pool park. */
export const POOL = { x: 1820, y: 3880, w: 700, d: 360 };
/** The water slide tower's foot (the chute twists from its top down to the pool's top edge). */
export const WSLIDE = { x: 1760, y: 3860, h: 300 };
/** The water slide's chute (the user: "the pool slide looks wrong"): from the platform at the top of the tower it swings
 * out round to the right and back in, dropping all the way, and comes down to the water just inside the pool's edge.
 * u: 0 at the top, 1 at the splash. Returns where it is on the ground and how high it is there. */
export function slidePath(u: number): { x: number; y: number; h: number } {
  const P = [[WSLIDE.x + 34, WSLIDE.y - 14], [WSLIDE.x + 360, WSLIDE.y - 70], [WSLIDE.x + 400, WSLIDE.y + 60], [WSLIDE.x + 250, WSLIDE.y + 92]];
  const v = 1 - u, x = v ** 3 * P[0][0] + 3 * v * v * u * P[1][0] + 3 * v * u * u * P[2][0] + u ** 3 * P[3][0];
  const y = v ** 3 * P[0][1] + 3 * v * v * u * P[1][1] + 3 * v * u * u * P[2][1] + u ** 3 * P[3][1];
  return { x, y, h: WSLIDE.h * Math.pow(v, 1.35) };
}

export const ZONE_LOTS = [
  { id: 'pooldeck', x: 1660, y: 3740, w: 1240, d: 640, fill: '#DCEFF5' },
  { id: 'farmyard', x: 80, y: 3700, w: 1020, d: 1000, fill: '#D9C99A' },
  { id: 'crops', x: 620, y: 3780, w: 440, d: 400, fill: '#8DB65A' },
  { id: 'pasture', x: 110, y: 4240, w: 700, d: 420, fill: '#A6CF7E' },
  { id: 'trailhead', x: 6460, y: 830, w: 460, d: 240, fill: '#CDBB97' },
  { id: 'camp', x: 5880, y: 2120, w: 760, d: 420, fill: '#CDBB97' },
  { id: 'beachlot', x: 2860, y: 4380, w: 500, d: 150, fill: '#C9CED6' },
];

export interface ZoneBuilding { id: string; label: string; x: number; y: number; w: number; d: number; h: number; wall: string; roof: string; trim?: string }
export const ZONE_BUILDINGS: ZoneBuilding[] = [
  { id: 'barn', label: 'FARM', x: 170, y: 3960, w: 380, d: 200, h: 250, wall: '#C8463D', roof: '#7A3B33', trim: '#FFFFFF' },
  { id: 'poolhouse', label: 'POOL', x: 2600, y: 3860, w: 280, d: 150, h: 190, wall: '#7FD1E8', roof: '#2F7FA8', trim: '#FFFFFF' },
  { id: 'cabin', label: 'RANGER', x: 6500, y: 1340, w: 300, d: 170, h: 200, wall: '#A8754A', roof: '#4E6B3A', trim: '#F2D6A2' },
];

/** Where the farm animals live (they stay inside). */
export const PASTURE = { x: 140, y: 4270, w: 640, d: 360 };
export const FARMYARD = { x: 100, y: 3720, w: 980, d: 500 };

export type ZoneProp = { kind: string; x: number; y: number; color?: string; len?: number };
export const ZONE_PROPS: ZoneProp[] = [
  // the beach
  { kind: 'umbrella', x: 900, y: 5010, color: '#E5484D' }, { kind: 'towel', x: 1000, y: 5060, color: '#5B8FD6' },
  { kind: 'umbrella', x: 1700, y: 4980, color: '#F9A826' }, { kind: 'towel', x: 1600, y: 5030, color: '#F06A8A' },
  { kind: 'lifeguard', x: 3400, y: 4720 },
  { kind: 'umbrella', x: 3900, y: 4650, color: '#3BB273' }, { kind: 'towel', x: 4000, y: 4700, color: '#F9C846' },
  { kind: 'palm', x: 2100, y: 4790 }, { kind: 'palm', x: 3830, y: 4540 }, { kind: 'palm', x: 5000, y: 4310 }, { kind: 'palm', x: 5850, y: 3950 },
  { kind: 'umbrella', x: 5450, y: 4220, color: '#2F7FD8' }, { kind: 'sandcastle', x: 6300, y: 3730 },
  { kind: 'lighthouse', x: 7230, y: 2700 },
  { kind: 'easel', x: 2980, y: 4800 },   // Yia-Yia comes down to paint the sea here (townsfolk.ts)
  // the pool park
  { kind: 'waterslide', x: WSLIDE.x, y: WSLIDE.y },
  { kind: 'lounge', x: 2000, y: 4320 }, { kind: 'lounge', x: 2160, y: 4320 }, { kind: 'lounge', x: 2320, y: 4320 },
  { kind: 'umbrella', x: 2640, y: 4300, color: '#7FD1E8' },
  // the farm
  { kind: 'hay', x: 620, y: 4250 }, { kind: 'hay', x: 680, y: 4300 },
  { kind: 'fence', x: 110, y: 4240, len: 700 }, { kind: 'fence', x: 110, y: 4660, len: 700 },
  { kind: 'fencev', x: 110, y: 4240, len: 420 }, { kind: 'fencev', x: 810, y: 4240, len: 150 }, { kind: 'fencev', x: 810, y: 4510, len: 150 },   // (a gate on the right for Nico)
  // the campground and the forest
  { kind: 'tent', x: 6000, y: 2260, color: '#F9A826' }, { kind: 'tent', x: 6250, y: 2230, color: '#3BB273' }, { kind: 'tent', x: 6480, y: 2280, color: '#5B8FD6' },
  { kind: 'campfire', x: 6250, y: 2420 }, { kind: 'log', x: 6150, y: 2470 }, { kind: 'log', x: 6350, y: 2470 },
  { kind: 'log', x: 6950, y: 1180 }, { kind: 'rock', x: 6880, y: 900 }, { kind: 'rock', x: 7800, y: 900 },
];

/** Forest trees (pines): a jittered grid over the north-east, kept off the road, the lots,
 * the lake and the cabin, and thinning out toward the edges so the woods look natural. */
export function forestTrees(keepClear: (x: number, y: number) => boolean): [number, number][] {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const out: [number, number][] = [];
  for (let gy = 90; gy < 3200; gy += 220) for (let gx = 4990; gx < ZONE_WORLD.w - 40; gx += 240) {
    const x = gx + (rnd() - 0.5) * 120, y = gy + (rnd() - 0.5) * 110;
    const edge = Math.min(x - 4990, shoreY(x) - SAND_W - 380 - y);   // distance in from the town side and the meadow above the beach
    if (edge < 0 || rnd() > Math.min(1, 0.35 + edge / 500)) continue;
    if (keepClear(x, y)) continue;
    out.push([Math.round(x), Math.round(y)]);
  }
  return out;
}

/** Labels for the big map. */
export const ZONE_LABELS: [string, number, number][] = [
  ['FOREST', 6200, 500], ['LAKE', 7350, 560], ['CAMPGROUND', 6260, 2620], ['BEACH', 2500, 4840], ['BEACH', 5500, 4050],
  ['POOL', 2160, 4060], ['FARM', 600, 4500], ['PIER', 4400, 5180], ['LIGHTHOUSE', 7230, 2760],
];
