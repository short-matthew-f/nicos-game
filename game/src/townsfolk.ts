// People Nico knows, walking their routines around town. Data first: who, where they go,
// how long they stop, and what they say when Nico says hi.
import { ROADS_X, ROADS_Y, ROAD_W, SIDEWALK, BUILDINGS, SWINGS, SLIDE, doorOf } from './world/map';
import type { Who } from './rig/person';

export interface Stop { x: number; y: number; wait?: number; swing?: number }   // swing: seat index to swing on
export interface Townie { who: Exclude<Who, 'nico'>; name: string; speed: number; route: Stop[]; lines: string[] }

const SW = ROAD_W / 2 + SIDEWALK / 2;   // sidewalk centre, from a road's centre line
const [x0, x1] = ROADS_X, [y0, y1] = ROADS_Y;
const door = (id: string) => doorOf(BUILDINGS.find(b => b.id === id)!);
const burger = door('burger');

export const TOWNSFOLK: Townie[] = [
  {
    // James walks the sidewalks round the middle block and stops in at Burger Barn
    who: 'james', name: 'James', speed: 150,
    route: [
      { x: x0 + SW, y: y1 - SW }, { x: x0 + SW, y: burger[1] }, { x: burger[0], y: burger[1], wait: 6 }, { x: x0 + SW, y: burger[1] },
      { x: x0 + SW, y: y0 + SW, wait: 1 }, { x: x1 - SW, y: y0 + SW }, { x: x1 - SW, y: y1 - SW },
    ],
    lines: ['Hey Nico! Burger Barn fries are the best.', 'Did you see the fire truck go by?', 'Race you round the block!', 'What are you building next?', 'Want to play soccer later?'],
  },
  {
    // Primo plays at the playground and round the pond: swings, past the slide, the fountain
    who: 'primo', name: 'Primo', speed: 165,
    route: [
      { x: SWINGS.x + SWINGS.seats[1], y: SWINGS.y + 34, swing: 1, wait: 9 },
      { x: SLIDE.x + SLIDE.len + 50, y: SLIDE.y + 30, wait: 1.5 },
      { x: SLIDE.x + SLIDE.len + 50, y: 1610 },
      { x: 2640, y: 1610 }, { x: 2640, y: 1770, wait: 3 },        // watch the fountain
      { x: 2880, y: 1770 }, { x: 2880, y: 1610 }, { x: SWINGS.x + SWINGS.w + 40, y: 1610 },
    ],
    lines: ['Nico! Come swing with me!', 'I can go SO high.', "Bet you can't catch me!", 'Can we get ice cream?', 'There are ducks in the pond!'],
  },
];

/** Where someone is along their route: walking toward stop i, or waiting at it. */
export interface Walk { i: number; x: number; y: number; wait: number; vx: number; vy: number }

/** Advance along the route; returns the stop just reached (to start a swing), if any. */
export function stepRoute(t: Townie, w: Walk, dt: number): Stop | null {
  if (w.wait > 0) { w.wait -= dt; w.vx = w.vy = 0; if (w.wait <= 0) w.i = (w.i + 1) % t.route.length; return null; }
  const s = t.route[w.i], dx = s.x - w.x, dy = s.y - w.y, d = Math.hypot(dx, dy), step = t.speed * dt;
  if (d <= step) {
    w.x = s.x; w.y = s.y; w.vx = w.vy = 0;
    if (s.wait) { w.wait = s.wait; return s; }
    w.i = (w.i + 1) % t.route.length; return s;
  }
  w.vx = dx / d * t.speed; w.vy = dy / d * t.speed;
  w.x += w.vx * dt; w.y += w.vy * dt;
  return null;
}
