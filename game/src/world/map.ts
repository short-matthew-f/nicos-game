// The v0 neighborhood, as data. World units are px at zoom 1; y grows downward and
// things lower on screen draw in front. A building's footprint (x, y, w, d) is what you
// bump into; its front wall rises h above the footprint's front edge and the roof sits
// on top, so the drawing extends h above the footprint.

//
// Scale: the roads are laid out in "plan units" times K. Buildings, lots and everything
// else are placed directly in world px, block by block, so that a building's tall front
// wall (it draws h above its footprint) never covers the road above it, and every door
// opens onto walkable ground. Things are sized against Nico (~132 px tall): a house is
// about 1.7x his height, the school and hospital nearly 3x (Nico, 2026-10-09: "not the
// same height as buildings").
export const K = 1.35;                // plan unit -> world (1.6 felt too big to find your way round: 2026-10-09)
const k = (v: number) => Math.round(v * K);

import { ZONE_WORLD, ZONE_LOTS, ZONE_BUILDINGS, ZONE_PROPS, LAKE, POOL, PIER, oceanSolids, forestTrees, shoreY, SAND_W } from './zones';

export const TOWN = { w: k(3600), h: k(2600) };                   // the town: 4860 x 3510 (top left of the world)
export const WORLD = ZONE_WORLD;                                   // with the forest, beach, pool and farm round it: 8100 x 5600
export const ROAD_W = k(160), SIDEWALK = k(36), LANE = k(40);      // 216, 49, 54
export const ROADS_X = [k(900), k(2300)];   // vertical road centre lines (1215, 3105)
export const ROADS_Y = [k(700), k(1700)];   // horizontal road centre lines (945, 2295)
// Blocks between the roads (x: 0-1058 | 1372-2948 | 3262-4860, y: 0-788 | 1102-2138 | 2452-3510)
/** Where each road runs (they used to cross the whole town edge to edge; now they lead out
 * to the new places and stop there). */
export interface RoadSeg { axis: 'h' | 'v'; at: number; from: number; to: number }
export const ROAD_SEGS: RoadSeg[] = [
  { axis: 'h', at: ROADS_Y[0], from: 0, to: 6720 },   // east into the forest, to the trailhead
  { axis: 'h', at: ROADS_Y[1], from: 0, to: 5900 },   // east to the campground
  { axis: 'v', at: ROADS_X[0], from: 0, to: 4360 },   // south to the farm and the pool
  { axis: 'v', at: ROADS_X[1], from: 0, to: 4400 },   // south to the beach
];
/** A road's rectangle, widened by `extra` each side (SIDEWALK for the sidewalks). */
export const roadRect = (r: RoadSeg, extra = 0) => r.axis === 'h'
  ? { x: r.from, y: r.at - ROAD_W / 2 - extra, w: r.to - r.from, d: ROAD_W + 2 * extra }
  : { x: r.at - ROAD_W / 2 - extra, y: r.from, w: ROAD_W + 2 * extra, d: r.to - r.from };

export interface Building {
  id: string; label?: string;
  x: number; y: number; w: number; d: number; h: number;
  wall: string; roof: string; trim?: string;
  kind: 'house' | 'shop' | 'civic' | 'barn';
  bays?: number[];   // big vehicle doors: centre x of each
}

const house = (id: string, x: number, y: number, wall: string, roof: string): Building =>
  ({ id, x, y, w: 283, d: 175, h: 221, wall, roof, kind: 'house' });

export const BUILDINGS: Building[] = [
  // north-west: a row of houses
  house('h1', 50, 240, '#F2D6A2', '#D77B72'),
  house('h2', 390, 240, '#BFE0DA', '#3E8F8A'),
  house('h3', 730, 240, '#F7E3C4', '#5B78AA'),
  // north: school; north-east: hospital
  { id: 'school', label: 'SCHOOL', x: 1480, y: 380, w: 760, d: 260, h: 360, wall: '#E8C18A', roof: '#B5654F', trim: '#FFFFFF', kind: 'civic' },
  { id: 'hospital', label: 'HOSPITAL', x: 3380, y: 430, w: 700, d: 300, h: 408, wall: '#F4F6F8', roof: '#8FB3D9', trim: '#D9534F', kind: 'civic' },
  // west: Nico's house and garage, with a back garden below
  { id: 'home', label: "NICO'S", x: 120, y: 1380, w: 330, d: 216, h: 240, wall: '#C9DDF2', roof: '#2B3F55', kind: 'house' },
  { id: 'garage', label: 'GARAGE', x: 520, y: 1400, w: 300, d: 190, h: 216, wall: '#D8D2C4', roof: '#6B7280', kind: 'shop' },
  // middle: Burger Barn (the playground and park are lots beside and below it)
  { id: 'burger', label: 'BURGER BARN', x: 1430, y: 1420, w: 430, d: 230, h: 288, wall: '#F9A826', roof: '#D9534F', trim: '#FFE29A', kind: 'shop' },
  // east: fire station and the ice cream shop
  { id: 'fire', label: 'FIRE STATION', x: 3400, y: 1480, w: 560, d: 270, h: 336, wall: '#D9534F', roof: '#8C2F2B', trim: '#FFFFFF', kind: 'civic', bays: [3530, 3830] },
  { id: 'icecream', label: 'ICE CREAM', x: 4140, y: 1420, w: 480, d: 220, h: 264, wall: '#FFD6E0', roof: '#7FD1C1', trim: '#FFFFFF', kind: 'shop' },
  // south: shops (the soccer field is behind them); south-east: storage; south-west: houses
  { id: 'parts', label: 'PARTS & TOOLS', x: 1430, y: 2760, w: 480, d: 230, h: 288, wall: '#9FB7C9', roof: '#34495E', trim: '#F9A826', kind: 'shop' },
  { id: 'toys', label: 'TOY SHOP', x: 2060, y: 2760, w: 430, d: 230, h: 288, wall: '#F7C8D0', roof: '#5FAFA5', trim: '#FFFFFF', kind: 'shop' },
  { id: 'storage', label: 'STORAGE', x: 3400, y: 2720, w: 810, d: 203, h: 240, wall: '#E3A857', roof: '#7A8794', trim: '#FFE29A', kind: 'shop' },
  house('h5', 60, 2700, '#BFE0DA', '#D77B72'),
  house('h6', 400, 2700, '#F7E3C4', '#3E8F8A'),
  house('h7', 230, 3170, '#F2D6A2', '#5B78AA'),
  // Nico's grandparents: Poppop and Nonna's house at the edge of the woods, Poppop's woodshop next door
  // (a red barn of a garage), and Yia-Yia's painting studio on the south block
  { id: 'nonna', label: 'POPPOP & NONNA', x: 5150, y: 1370, w: 360, d: 200, h: 240, wall: '#E8D7B8', roof: '#4E6B3A', trim: '#FFFFFF', kind: 'house' },
  { id: 'woodshop', label: 'WOODSHOP', x: 5580, y: 1400, w: 300, d: 170, h: 220, wall: '#B8382F', roof: '#5E2A24', trim: '#FFFFFF', kind: 'barn' },
  { id: 'yiayia', label: "YIA-YIA'S STUDIO", x: 2530, y: 2780, w: 340, d: 200, h: 250, wall: '#F4F1EA', roof: '#2F6FD0', trim: '#F9C846', kind: 'shop' },
  // beyond the town (zones.ts)
  ...ZONE_BUILDINGS.map(b => ({ ...b, kind: (b.id === 'barn' ? 'barn' : 'shop') as Building['kind'] })),
];

/** Nico's work shed, in the back garden below his house: an outline until he buys it (unlocks.ts),
 * then a building he can go into. Not in BUILDINGS (it isn't there at first), but kept clear of
 * lamps and props either way. */
export const SHED: Building = { id: 'shed', label: 'WORK SHED', x: 60, y: 1950, w: 280, d: 160, h: 200, wall: '#B5654F', roof: '#6B4E3A', trim: '#F2D6A2', kind: 'barn' };
/** Nico's Bakery (an unlockable): on the south-west block, between the houses and Parts & Tools. */
export const BAKERY: Building = { id: 'bakery', label: "NICO'S BAKERY", x: 740, y: 2850, w: 300, d: 180, h: 230, wall: '#F7D9C4', roof: '#C8463D', trim: '#FFFFFF', kind: 'shop' };
/** Bibs and Bobs, Nico's beach shop (an unlockable too): at the top of the sand, its door onto the beach. */
export const SHOP: Building = { id: 'bibs', label: 'BIBS AND BOBS', x: 3430, y: 4370, w: 300, d: 150, h: 210, wall: '#FFE3B3', roof: '#2F9FB8', trim: '#FFFFFF', kind: 'shop' };

/** Areas on the ground (not solid; things on them may be). */
export const LOTS = [
  { id: 'playground', x: 1950, y: 1250, w: 950, d: 320, fill: '#EBD9A8' },  // sand
  { id: 'park', x: 1930, y: 1640, w: 990, d: 470, fill: '#A9D18E' },
  { id: 'patio', x: 1420, y: 1700, w: 450, d: 90, fill: '#E9DCC7' },        // Burger Barn's tables
  { id: 'field', x: 1440, y: 3080, w: 1460, d: 390, fill: '#8CC76F' },     // soccer field
  { id: 'carpark', x: 4150, y: 480, w: 640, d: 260, fill: '#C9CED6' },      // by the hospital
  { id: 'yard', x: 3320, y: 2960, w: 1000, d: 470, fill: '#C9CED6' },       // storage yard
  ...ZONE_LOTS,
];
export { LAKE, POOL, PIER, shoreY, SAND_W };

/** The pond in the park (water: solid), and its ducks' swimming loop. */
export const POND = { x: 2040, y: 1720, w: 420, d: 250 };

/** Playground equipment on the sand (positions are the front-left foot of each). Sized
 * against Nico (~132 px tall): the tower is a bit taller than him. */
export const SLIDE = { x: 2010, y: 1500, w: 70, h: 175, top: 150, len: 240 };   // tower w x h, platform `top` above ground, chute reaches x + len
export const SWINGS = { x: 2440, y: 1510, w: 300, h: 175, seats: [75, 225] };   // seat centre x offsets
export const SWING_BAR = SWINGS.y - SWINGS.h + 12, SWING_SEAT = SWINGS.y - 52;   // where the chains hang from, and the seat plank

/** The soccer field: goals at each end (mouth facing the middle), and the ball's spot. */
export const FIELD = { x: 1440, y: 3080, w: 1460, d: 390 };
export const GOALS = [
  { x: FIELD.x + 30, y: FIELD.y + FIELD.d / 2, side: -1 },
  { x: FIELD.x + FIELD.w - 30, y: FIELD.y + FIELD.d / 2, side: 1 },
];
export const GOAL_MOUTH = 150;   // goal width (screen y)

export const TREES: [number, number][] = [
  [180, 620], [560, 650], [900, 600],                                       // north-west front yards
  [1420, 730], [2330, 330], [2470, 650], [2760, 250], [2880, 640],         // round the school
  [3300, 720], [4250, 180], [4560, 330], [4790, 130], [4810, 760],         // hospital
  [950, 1250], [60, 1180], [800, 2050], [980, 1960], [560, 2080],          // west
  [1400, 1230], [1905, 1330], [1480, 2060], [1800, 1960], [2900, 2080],    // middle
  [4720, 1240], [4760, 1900], [4120, 2050], [3300, 2060],                  // east
  [2700, 2600], [2900, 2900],                                              // south
  [4480, 2600], [4720, 3020], [4500, 3440], [3300, 2560],                  // south-east
  [900, 2600], [700, 3330], [960, 3150], [80, 3440],                       // south-west
];

/** Where the school bus pulls in (x along the park's south road; it drives west there). */
export const BUS_STOPS: [number, number][] = [[1800, ROADS_Y[1] - LANE], [2600, ROADS_Y[1] - LANE]];

/** Street furniture and bits of life, as data. Solid ones are added to SOLIDS. */
export type PropKind = 'busstop' | 'lamp' | 'bench' | 'hydrant' | 'bush' | 'flowers' | 'mailbox' | 'table' | 'fountain' | 'cart' | 'parked' | 'cone'
  | 'umbrella' | 'towel' | 'sandcastle' | 'lifeguard' | 'palm' | 'lighthouse' | 'waterslide' | 'lounge' | 'hay' | 'fence' | 'fencev' | 'tent' | 'campfire' | 'log' | 'rock' | 'easel';
export interface Prop { kind: PropKind; x: number; y: number; color?: string; h?: number; stripe?: string; len?: number }
export const PROPS: Prop[] = [
  // park: fountain, benches round the pond, flower beds, the ice cream cart
  { kind: 'fountain', x: 2700, y: 1850 },
  { kind: 'bench', x: 2120, y: 2050 }, { kind: 'bench', x: 2380, y: 2050 }, { kind: 'bench', x: 2560, y: 1700 },
  { kind: 'flowers', x: 2620, y: 2040, color: '#F06A8A' }, { kind: 'flowers', x: 2800, y: 2040, color: '#F9C846' },
  { kind: 'flowers', x: 1990, y: 1700, color: '#B48AE6' },
  // Burger Barn's patio tables
  { kind: 'table', x: 1500, y: 1750, color: '#D9534F' }, { kind: 'table', x: 1640, y: 1750, color: '#F9A826' }, { kind: 'table', x: 1780, y: 1750, color: '#D9534F' },
  // front gardens: a mailbox and flowers at each house
  ...[50, 390, 730].flatMap(x => [{ kind: 'mailbox' as const, x: x + 40, y: 470 }, { kind: 'flowers' as const, x: x + 210, y: 445, color: ['#F06A8A', '#F9C846', '#B48AE6'][(x / 340) | 0] }]),
  { kind: 'mailbox', x: 160, y: 1650 }, { kind: 'flowers', x: 400, y: 1640, color: '#F06A8A' },
  { kind: 'flowers', x: 470, y: 1880, color: '#F9C846' }, { kind: 'flowers', x: 560, y: 1930, color: '#B48AE6' }, { kind: 'bush', x: 440, y: 2060 },   // (moved over for the work shed)
  { kind: 'mailbox', x: 100, y: 2930 }, { kind: 'mailbox', x: 440, y: 2930 }, { kind: 'mailbox', x: 270, y: 3400 },
  { kind: 'bush', x: 1030, y: 470 }, { kind: 'bush', x: 360, y: 2900 }, { kind: 'bush', x: 700, y: 2960 },
  // the hospital car park: an ambulance and two cars
  { kind: 'parked', x: 4260, y: 560, h: Math.PI / 2, color: '#FFFFFF', stripe: '#D9534F' },
  { kind: 'parked', x: 4430, y: 560, h: Math.PI / 2, color: '#5B8FD6' }, { kind: 'parked', x: 4600, y: 660, h: -Math.PI / 2, color: '#E8B64A' },
  // the storage yard: a van and cones
  { kind: 'parked', x: 3600, y: 3120, h: 0, color: '#9FB7C9' }, { kind: 'parked', x: 4050, y: 3250, h: Math.PI, color: '#D77B72' },
  { kind: 'cone', x: 3500, y: 3330 }, { kind: 'cone', x: 3560, y: 3330 }, { kind: 'cone', x: 3620, y: 3330 },
  // ice cream shop: a cart out front
  { kind: 'cart', x: 4500, y: 1720 },
  // bus stops along the south edge of the park (the school bus runs the inner loop)
  ...BUS_STOPS.map(([x]) => ({ kind: 'busstop' as const, x, y: ROADS_Y[1] - ROAD_W / 2 - SIDEWALK - 8 })),
  ...(ZONE_PROPS as Prop[]),
];

/** Street lamps and hydrants along the sidewalks: every so often on the grass side, skipping
 * anywhere they'd land on a building, lot, driveway or tree (filtered below). */
function streetProps(): Prop[] {
  const out: Prop[] = [];
  const off = ROAD_W / 2 + SIDEWALK + 14;
  // (north side of the east-west roads only: a lamp south of a road would draw up across it)
  for (const r of ROAD_SEGS) {
    if (r.axis === 'h') for (let x = 180; x < r.to; x += 420) out.push({ kind: 'lamp', x, y: r.at - off });
    else for (let y = 220; y < r.to; y += 460) for (const sg of [-1, 1]) out.push({ kind: 'lamp', x: r.at + sg * off, y });
  }
  for (const rx of ROADS_X) for (const ry of ROADS_Y) out.push({ kind: 'hydrant', x: rx + off + 10, y: ry + off + 40 });
  return out;
}

/** Car loops: clockwise on the inner lanes and counter-clockwise on the outer lanes of
 * the ring road around the centre blocks (right-hand traffic). */
export function carLoops(): [number, number][][] {
  const [x0, x1] = ROADS_X, [y0, y1] = ROADS_Y;
  const inner: [number, number][] = [[x0 + LANE, y0 + LANE], [x1 - LANE, y0 + LANE], [x1 - LANE, y1 - LANE], [x0 + LANE, y1 - LANE]];
  const outer: [number, number][] = [[x0 - LANE, y0 - LANE], [x0 - LANE, y1 + LANE], [x1 + LANE, y1 + LANE], [x1 + LANE, y0 - LANE]];
  return [inner, outer];
}

/** Paved aprons from a building to the road (drawn on the ground, not solid). */
export const bld = (id: string) => BUILDINGS.find(b => b.id === id)!;
const GARAGE = bld('garage'), FIRE = bld('fire'), WOODSHOP = bld('woodshop');
export const DRIVEWAYS = [
  // from the garage door east to the road
  { id: 'home', x: GARAGE.x, y: GARAGE.y + GARAGE.d + 4, w: ROADS_X[0] - ROAD_W / 2 - SIDEWALK - GARAGE.x, d: 176 },
  // the fire station's apron, west to the road
  { id: 'fire', x: ROADS_X[1] + ROAD_W / 2 + SIDEWALK, y: FIRE.y + FIRE.d + 4, w: FIRE.x + FIRE.w - (ROADS_X[1] + ROAD_W / 2 + SIDEWALK), d: 176 },
  // from Poppop's barn doors south to the road, where his Fiat 500 lives
  { id: 'poppop', x: WOODSHOP.x + 20, y: WOODSHOP.y + WOODSHOP.d + 4, w: WOODSHOP.w - 40, d: ROADS_Y[1] - ROAD_W / 2 - SIDEWALK - (WOODSHOP.y + WOODSHOP.d + 4) },
];

/** Where Nico's car waits at the start: on the home driveway, nose to the road. */
export const PARKED_CAR = { x: GARAGE.x + GARAGE.w / 2, y: DRIVEWAYS[0].y + DRIVEWAYS[0].d / 2, h: 0 };

/** Poppop's drive in his Fiat 500 (Nonna rides along): down his driveway, west along the road
 * into town, round the outer ring road with the traffic (counter-clockwise), but down the west
 * road past it: pulling in by Nico's bakery (Nonna drops off pizzelle), turning round, and
 * pulling in by Parts & Tools. Then back east and up the drive, turning round in front of the
 * barn so he's parked nose-out again. Starts and ends at the parked spot (the loop's s = 0). */
const DOWN = ROADS_Y[1] + 900;   // how far down the west road he goes before turning round
export const POPPOP_STOPS: Record<'bakery' | 'parts', [number, number]> = {
  bakery: [ROADS_X[0] - LANE, BAKERY.y + BAKERY.d - 60],   // (heading south, the kerb on the bakery's side)
  parts: [ROADS_X[0] + LANE, BAKERY.y + BAKERY.d - 120],   // (heading back north, on the Parts & Tools side)
};
export function poppopRoute(): [number, number][] {
  const [x0, x1] = ROADS_X, [y0, y1] = ROADS_Y;
  const mid = WOODSHOP.x + WOODSHOP.w / 2, out = mid - 60, back = mid + 60, top = WOODSHOP.y + WOODSHOP.d + 50;
  return [[out, top + 120], [out, y1 - LANE], [x1 + LANE, y1 - LANE], [x1 + LANE, y0 - LANE], [x0 - LANE, y0 - LANE],
          [x0 - LANE, DOWN], [x0 + LANE, DOWN], [x0 + LANE, y1 + LANE], [back, y1 + LANE], [back, top], [out, top]];
}

/** The spot in front of a building's door, where its action button appears. */
export function doorOf(b: Building): [number, number] {
  return [b.x + b.w / 2, b.y + b.d + 26];
}

/** The fire truck's run: out of the left bay, a lap of the outer ring road (with
 * traffic, counter-clockwise), and back in through the right bay. It starts and ends
 * inside the station, hidden behind its front wall. */
export function fireRoute(): [number, number][] {
  const [x0, x1] = ROADS_X, [y0, y1] = ROADS_Y;
  const [bayOut, bayIn] = FIRE.bays!, inside = FIRE.y + FIRE.d * 0.15;
  const apron = DRIVEWAYS[1], outY = apron.y + apron.d * 0.35, inY = apron.y + apron.d * 0.72;
  return [[bayOut, inside], [bayOut, outY], [x1 + LANE, outY], [x1 + LANE, y0 - LANE], [x0 - LANE, y0 - LANE],
          [x0 - LANE, y1 + LANE], [x1 + LANE, y1 + LANE], [x1 + LANE, inY], [bayIn, inY], [bayIn, inside]];
}

export interface Rect { x: number; y: number; w: number; d: number }

/** A prop's footprint if you can bump into it (flowers and cones you walk through). */
export function propSolid(p: Prop): Rect | null {
  switch (p.kind) {
    case 'lamp': return { x: p.x - 8, y: p.y - 10, w: 16, d: 12 };
    case 'hydrant': return { x: p.x - 10, y: p.y - 10, w: 20, d: 12 };
    case 'mailbox': return { x: p.x - 8, y: p.y - 10, w: 16, d: 12 };
    case 'bench': return { x: p.x - 46, y: p.y - 16, w: 92, d: 18 };
    case 'bush': return { x: p.x - 26, y: p.y - 16, w: 52, d: 18 };
    case 'table': return { x: p.x - 30, y: p.y - 14, w: 60, d: 16 };
    case 'fountain': return { x: p.x - 70, y: p.y - 34, w: 140, d: 46 };
    case 'cart': return { x: p.x - 50, y: p.y - 20, w: 100, d: 22 };
    case 'easel': return { x: p.x - 26, y: p.y - 12, w: 52, d: 14 };
    case 'busstop': return { x: p.x - 60, y: p.y - 18, w: 120, d: 20 };
    case 'umbrella': return { x: p.x - 6, y: p.y - 8, w: 12, d: 10 };
    case 'lifeguard': return { x: p.x - 40, y: p.y - 20, w: 80, d: 22 };
    case 'palm': return { x: p.x - 16, y: p.y - 14, w: 32, d: 16 };
    case 'lighthouse': return { x: p.x - 60, y: p.y - 40, w: 120, d: 44 };
    case 'waterslide': return { x: p.x - 50, y: p.y - 40, w: 100, d: 44 };
    case 'lounge': return { x: p.x - 22, y: p.y - 40, w: 44, d: 44 };
    case 'hay': return { x: p.x - 34, y: p.y - 22, w: 68, d: 24 };
    case 'fence': return { x: p.x, y: p.y - 8, w: p.len ?? 100, d: 10 };
    case 'fencev': return { x: p.x - 6, y: p.y, w: 12, d: p.len ?? 100 };
    case 'tent': return { x: p.x - 70, y: p.y - 50, w: 140, d: 52 };
    case 'campfire': return { x: p.x - 26, y: p.y - 16, w: 52, d: 20 };
    case 'log': return { x: p.x - 46, y: p.y - 14, w: 92, d: 16 };
    case 'rock': return { x: p.x - 40, y: p.y - 22, w: 80, d: 26 };
    case 'parked': return Math.abs(Math.sin(p.h ?? 0)) > 0.7 ? { x: p.x - 42, y: p.y - 84, w: 84, d: 168 } : { x: p.x - 84, y: p.y - 42, w: 168, d: 84 };
    default: return null;
  }
}

const hit = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.d && b.y < a.y + a.d;
/** Buildings as drawn (front wall and roof included), for keeping props out of them. */
const drawnRect = (b: Building): Rect => ({ x: b.x - 10, y: b.y - b.h - 10, w: b.w + 20, d: b.d + b.h + 50 });
const busy: Rect[] = [...[...BUILDINGS, SHED, SHOP, BAKERY].map(drawnRect), ...[SHED, SHOP, BAKERY].map(b => { const [dx, dy] = doorOf(b); return { x: dx - 50, y: dy - 10, w: 100, d: 600 }; }), ...LOTS, ...DRIVEWAYS, ...TREES.map(([x, y]) => ({ x: x - 50, y: y - 40, w: 100, d: 60 })),
  ...ROAD_SEGS.map(r => roadRect(r, SIDEWALK)),
  // keep a clear lane from each door down toward the street
  ...BUILDINGS.map(b => { const [dx, dy] = doorOf(b); return { x: dx - 50, y: dy - 10, w: 100, d: 600 }; }),
  ...PROPS.map(p => { const r = propSolid(p) ?? { x: p.x - 10, y: p.y - 10, w: 20, d: 20 }; return { x: r.x - 40, y: r.y - 20, w: r.w + 80, d: r.d + 40 }; })];
for (const p of streetProps()) {
  const r = propSolid(p) ?? { x: p.x - 10, y: p.y - 10, w: 20, d: 20 };
  if (PROPS.some(q => q.kind === p.kind && Math.hypot(q.x - p.x, q.y - p.y) < 160)) continue;   // no doubled-up lamps at corners
  if (!busy.some(b => hit(b, r)) && r.x > 10 && r.x + r.w < WORLD.w - 10 && r.y > 10 && r.y + r.d < WORLD.h - 10) PROPS.push(p);
}

/** The forest's pines, kept off the roads (and their sidewalks), the lots, the lake and buildings. */
export const PINES: [number, number][] = forestTrees((x, y) => {
  const r = { x: x - 60, y: y - 60, w: 120, d: 90 };
  // a pine draws ~250 px up from its foot: keep it far enough below a road (or a lot, or a door) not to cover it
  const tall = { x: x - 70, y: y - 270, w: 140, d: 300 };
  return ROAD_SEGS.some(s => hit(roadRect(s, SIDEWALK + 30), tall)) || LOTS.some(l => hit(l, tall)) || BUILDINGS.some(b => hit(drawnRect(b), r))
    || BUILDINGS.some(b => { const [dx, dy] = doorOf(b); return hit({ x: dx - 90, y: dy - 20, w: 180, d: 360 }, tall); })
    || hit({ x: LAKE.x - 70, y: LAKE.y - 70, w: LAKE.w + 140, d: LAKE.d + 140 }, r) || PROPS.some(p => Math.hypot(p.x - x, p.y - y) < 120);
});

/** What you bump into, walking or driving: buildings, tree trunks, props, the pond, the
 * feet of the playground equipment, and the goal posts. */
export const SOLIDS: Rect[] = [
  ...BUILDINGS.map(b => ({ x: b.x, y: b.y, w: b.w, d: b.d })),
  ...TREES.map(([x, y]) => ({ x: x - 20, y: y - 18, w: 40, d: 20 })),
  ...PROPS.map(propSolid).filter((r): r is Rect => !!r),
  { x: POND.x + 20, y: POND.y + 20, w: POND.w - 40, d: POND.d - 40 },
  { x: SLIDE.x, y: SLIDE.y - 26, w: SLIDE.w, d: 26 },
  { x: SLIDE.x + SLIDE.len - 34, y: SLIDE.y - 22, w: 34, d: 22 },
  { x: SWINGS.x, y: SWINGS.y - 20, w: 22, d: 20 },
  { x: SWINGS.x + SWINGS.w - 22, y: SWINGS.y - 20, w: 22, d: 20 },
  ...GOALS.flatMap(g => [{ x: g.x - 12, y: g.y - GOAL_MOUTH / 2 - 12, w: 24, d: 14 }, { x: g.x - 12, y: g.y + GOAL_MOUTH / 2 - 2, w: 24, d: 14 }]),
  // beyond the town: pine trunks, the ocean, the lake and the pool (no swimming yet)
  ...PINES.map(([x, y]) => ({ x: x - 16, y: y - 16, w: 32, d: 18 })),
  ...oceanSolids(),
  { x: LAKE.x + 30, y: LAKE.y + 30, w: LAKE.w - 60, d: LAKE.d - 60 },
  { x: POOL.x, y: POOL.y, w: POOL.w, d: POOL.d },
];
