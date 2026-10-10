// The v0 neighborhood, as data. World units are px at zoom 1; y grows downward and
// things lower on screen draw in front. A building's footprint (x, y, w, d) is what you
// bump into; its front wall rises h above the footprint's front edge and the roof sits
// on top, so the drawing extends h above the footprint.

export const WORLD = { w: 3600, h: 2600 };
export const ROAD_W = 160, SIDEWALK = 36, LANE = 40;
export const ROADS_X = [900, 2300];   // vertical road centre lines
export const ROADS_Y = [700, 1700];   // horizontal road centre lines

export interface Building {
  id: string; label?: string;
  x: number; y: number; w: number; d: number; h: number;
  wall: string; roof: string; trim?: string;
  kind: 'house' | 'shop' | 'civic';
  bays?: number[];   // big vehicle doors: centre x of each
}

const house = (id: string, x: number, y: number, wall: string, roof: string): Building =>
  ({ id, x, y, w: 210, d: 130, h: 92, wall, roof, kind: 'house' });

export const BUILDINGS: Building[] = [
  // north-west: houses
  house('h1', 80, 140, '#F2D6A2', '#D77B72'),
  house('h2', 420, 140, '#BFE0DA', '#3E8F8A'),
  house('h3', 80, 420, '#F7E3C4', '#5B78AA'),
  // north-centre: school
  { id: 'school', label: 'SCHOOL', x: 1120, y: 120, w: 560, d: 220, h: 150, wall: '#E8C18A', roof: '#B5654F', trim: '#FFFFFF', kind: 'civic' },
  // north-east: hospital
  { id: 'hospital', label: 'HOSPITAL', x: 2520, y: 110, w: 520, d: 240, h: 170, wall: '#F4F6F8', roof: '#8FB3D9', trim: '#D9534F', kind: 'civic' },
  // west-middle: Nico's place
  { id: 'home', label: "NICO'S", x: 120, y: 900, w: 260, d: 160, h: 100, wall: '#C9DDF2', roof: '#2B3F55', kind: 'house' },
  { id: 'garage', label: 'GARAGE', x: 420, y: 930, w: 220, d: 130, h: 90, wall: '#D8D2C4', roof: '#6B7280', kind: 'shop' },
  house('h4', 120, 1300, '#F2D6A2', '#5FAFA5'),
  // centre: burger place
  { id: 'burger', label: 'BURGER BARN', x: 1500, y: 880, w: 320, d: 170, h: 120, wall: '#F9A826', roof: '#D9534F', trim: '#FFE29A', kind: 'shop' },
  // east-middle: fire station
  { id: 'fire', label: 'FIRE STATION', x: 2520, y: 880, w: 420, d: 200, h: 140, wall: '#D9534F', roof: '#8C2F2B', trim: '#FFFFFF', kind: 'civic', bays: [2620, 2840] },
  // south-west: houses
  house('h5', 80, 1900, '#BFE0DA', '#D77B72'),
  house('h6', 420, 1900, '#F7E3C4', '#3E8F8A'),
  house('h7', 260, 2250, '#F2D6A2', '#5B78AA'),
  // south-centre: shops
  { id: 'parts', label: 'PARTS & TOOLS', x: 1080, y: 1900, w: 360, d: 170, h: 120, wall: '#9FB7C9', roof: '#34495E', trim: '#F9A826', kind: 'shop' },
  { id: 'toys', label: 'TOY SHOP', x: 1560, y: 1900, w: 320, d: 170, h: 120, wall: '#F7C8D0', roof: '#5FAFA5', trim: '#FFFFFF', kind: 'shop' },
  // south-east: storage units
  { id: 'storage', label: 'STORAGE', x: 2520, y: 1960, w: 600, d: 150, h: 100, wall: '#E3A857', roof: '#7A8794', trim: '#34495E', kind: 'shop' },
];

/** Grass areas with something in them (drawn on the ground, not solid). */
export const LOTS = [
  { id: 'playground', x: 1090, y: 420, w: 720, d: 200, fill: '#EBD9A8' },  // sand
  { id: 'park', x: 1040, y: 1200, w: 520, d: 360, fill: '#A9D18E' },
  { id: 'yard', x: 2460, y: 1860, w: 760, d: 520, fill: '#C9CED6' },        // storage-yard tarmac
];

/** Playground equipment on the sand lot (positions are the front-left foot of each). */
// Sized against Nico (~132 px tall): the tower is a bit taller than him.
export const SLIDE = { x: 1140, y: 560, w: 70, h: 175, top: 150, len: 240 };   // tower w x h, platform `top` above ground, chute reaches x + len
export const SWINGS = { x: 1530, y: 570, w: 210, h: 175, seats: [62, 148] };   // seat centre x offsets
export const SWING_BAR = SWINGS.y - SWINGS.h + 12, SWING_SEAT = SWINGS.y - 52;   // where the chains hang from, and the seat plank

export const TREES: [number, number][] = [
  [700, 300], [760, 520], [60, 700 - 160], [1000, 360], [1880, 330], [1960, 200], [2140, 460],
  [2440, 520], [3200, 300], [3420, 520], [1100, 1150], [1600, 1300], [1450, 1480], [1960, 1150],
  [2080, 1460], [700, 1290], [540, 1500], [3200, 1200], [3400, 1450], [3050, 1480],
  [700, 2100], [620, 2450], [1000, 2350], [1500, 2400], [2000, 2300], [3350, 2450],
];

/** Car loops: clockwise on the inner lanes and counter-clockwise on the outer lanes of
 * the ring road around the centre blocks (right-hand traffic). */
export function carLoops(): [number, number][][] {
  const [x0, x1] = ROADS_X, [y0, y1] = ROADS_Y;
  const inner: [number, number][] = [[x0 + LANE, y0 + LANE], [x1 - LANE, y0 + LANE], [x1 - LANE, y1 - LANE], [x0 + LANE, y1 - LANE]];
  const outer: [number, number][] = [[x0 - LANE, y0 - LANE], [x0 - LANE, y1 + LANE], [x1 + LANE, y1 + LANE], [x1 + LANE, y0 - LANE]];
  return [inner, outer];
}

/** Paved aprons from a building to the road (drawn on the ground, not solid). */
export const DRIVEWAYS = [
  { id: 'home', x: 420, y: 1064, w: ROADS_X[0] - ROAD_W / 2 - SIDEWALK - 420, d: 130 },
  { id: 'fire', x: ROADS_X[1] + ROAD_W / 2 + SIDEWALK, y: 1084, w: 2940 - (ROADS_X[1] + ROAD_W / 2 + SIDEWALK), d: 130 },
];

/** Where Nico's car waits at the start: on the home driveway, nose to the road. */
export const PARKED_CAR = { x: 560, y: 1130, h: 0 };

/** The spot in front of a building's door, where its action button appears. */
export function doorOf(b: Building): [number, number] {
  return [b.x + b.w / 2, b.y + b.d + 26];
}

/** The fire truck's run: out of the left bay, a lap of the outer ring road (with
 * traffic, counter-clockwise), and back in through the right bay. It starts and ends
 * inside the station, hidden behind its front wall. */
export function fireRoute(): [number, number][] {
  const [x0, x1] = ROADS_X, [y0, y1] = ROADS_Y;
  return [[2620, 900], [2620, 1145], [x1 + LANE, 1145], [x1 + LANE, y0 - LANE], [x0 - LANE, y0 - LANE],
          [x0 - LANE, y1 + LANE], [x1 + LANE, y1 + LANE], [x1 + LANE, 1190], [2840, 1190], [2840, 900]];
}

export interface Rect { x: number; y: number; w: number; d: number }
/** What you bump into, walking or driving: buildings, tree trunks, and the feet of the
 * playground equipment (the slide tower and chute end, the swing posts). */
export const SOLIDS: Rect[] = [
  ...BUILDINGS.map(b => ({ x: b.x, y: b.y, w: b.w, d: b.d })),
  ...TREES.map(([x, y]) => ({ x: x - 15, y: y - 16, w: 30, d: 18 })),
  { x: SLIDE.x, y: SLIDE.y - 26, w: SLIDE.w, d: 26 },
  { x: SLIDE.x + SLIDE.len - 34, y: SLIDE.y - 22, w: 34, d: 22 },
  { x: SWINGS.x, y: SWINGS.y - 20, w: 22, d: 20 },
  { x: SWINGS.x + SWINGS.w - 22, y: SWINGS.y - 20, w: 22, d: 20 },
];
