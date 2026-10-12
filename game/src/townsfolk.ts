// People Nico knows, walking their routines around town. Data first: who, where they go,
// how long they stop, and what they say when Nico says hi.
import { ROADS_X, ROADS_Y, ROAD_W, SIDEWALK, BUILDINGS, SWINGS, SLIDE, doorOf } from './world/map';
import type { Who } from './rig/person';

export interface Stop { x: number; y: number; wait?: number; swing?: number; climb?: string; inside?: string; face?: [number, number] }   // swing: seat index to swing on; climb: a building to climb up onto (and wave from the roof); inside: gone in there while waiting (out of sight); face: look that way while waiting
export interface Townie { who: Who; name: string; speed: number; route: Stop[]; lines: string[]; note?: string }   // note: left on their door while they're out

const SW = ROAD_W / 2 + SIDEWALK / 2;   // sidewalk centre, from a road's centre line
const [x0, x1] = ROADS_X, [y0, y1] = ROADS_Y;
const door = (id: string) => doorOf(BUILDINGS.find(b => b.id === id)!);
const burger = door('burger'), studio = door('yiayia');

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
    // Tempo, in his red tracksuit, runs up and down the beach: the sandcastle, Bibs and Bobs, the pier
    who: 'tempo', name: 'Tempo', speed: 175,
    route: [
      { x: 3300, y: 4610 }, { x: 2700, y: 4740 }, { x: 2300, y: 4840, wait: 5 },   // (admiring the sandcastle)
      { x: 2700, y: 4740 }, { x: 3580, y: 4620, wait: 4 },                          // outside Bibs and Bobs
      { x: 4200, y: 4520 }, { x: 4400, y: 4600, wait: 3 }, { x: 4200, y: 4600 }, { x: 3830, y: 4600 },     // by the pier, then back past the palm
    ],
    lines: ['Race you to the water!', 'Red is the fastest colour.', 'Have you been in Bibs and Bobs?', 'I found a starfish once!', 'Watch me run!'],
  },
  {
    // Primo plays at the playground and round the pond: swings, past the slide, the fountain
    who: 'primo', name: 'Primo', speed: 165,
    route: [
      { x: SWINGS.x + SWINGS.seats[1], y: SWINGS.y + 34, swing: 1, wait: 9 },
      { x: SLIDE.x + SLIDE.len + 50, y: SLIDE.y + 30, wait: 1.5 },
      { x: SLIDE.x + SLIDE.len + 50, y: 1610 },
      { x: 1820, y: 1700, wait: 11, climb: 'burger' },             // (Primo climbs things: up onto Burger Barn's roof)
      { x: SLIDE.x + SLIDE.len + 50, y: 1610 },
      { x: 2640, y: 1610 }, { x: 2640, y: 1770, wait: 3 },        // watch the fountain
      { x: 2880, y: 1770 }, { x: 2880, y: 1610 }, { x: SWINGS.x + SWINGS.w + 40, y: 1610 },
    ],
    lines: ['Nico! Come swing with me!', 'I can go SO high.', "Bet you can't catch me!", 'Can we get ice cream?', 'There are ducks in the pond!'],
  },
  {
    // Yia-Yia paints in her studio, and now and then walks down to the beach to paint the sea at her easel
    who: 'yiayia', name: 'Yia-Yia', speed: 115,
    route: [
      { x: studio[0], y: studio[1], wait: 80, inside: 'yiayia' },
      { x: studio[0], y: studio[1] + 30 }, { x: x1 - SW, y: studio[1] + 30 }, { x: x1 - SW, y: 4380 },
      { x: 2895, y: 4806, wait: 45, face: [2990, 4806] },                         // (painting the sea)
      { x: x1 - SW, y: 4380 }, { x: x1 - SW, y: studio[1] + 30 }, { x: studio[0], y: studio[1] + 30 },
    ],
    lines: ['Hello, my darling!', 'Look at the colours of the sea today!', 'Come paint with me at the studio.', 'Every painting needs a little yellow.', 'Agapi mou! Give Yia-Yia a hug.'],
  },
];

// ---- townspeople (made up): walk the sidewalks and stop in at places. Each route stays on
// its own block's sidewalks (no road crossings) and reaches doors from the side they face.
const N0 = y0 - SW, S0 = y0 + SW, N1 = y1 - SW, S1 = y1 + SW, W0 = x0 - SW, E0 = x0 + SW, W1 = x1 - SW, E1 = x1 + SW;
const school = door('school'), hospital = door('hospital'), icecream = door('icecream'), parts = door('parts'), toys = door('toys');
const hi = ['Hi Nico!', 'Nice day, isn\'t it?', 'Have you tried the ice cream shop?', 'Watch out for the fire truck!', 'Goal! ...oh, wrong game.'];
TOWNSFOLK.push(
  { who: 'maya', name: 'Maya', speed: 140, lines: ['Hi Nico! School starts again soon.', 'I fed the ducks bread yesterday.', ...hi.slice(1, 3)],
    route: [{ x: E0, y: 60 }, { x: E0, y: N0 }, { x: school[0], y: N0 }, { x: school[0], y: school[1], wait: 5 }, { x: school[0], y: N0 }, { x: W1, y: N0 }, { x: W1, y: 60, wait: 2 }, { x: W1, y: N0 }, { x: E0, y: N0 }] },
  { who: 'leo', name: 'Leo', speed: 150, lines: ['Yo Nico!', 'The sundae is way better than the cone.', ...hi.slice(3)],
    route: [{ x: E1, y: N1 }, { x: icecream[0], y: N1 }, { x: icecream[0], y: icecream[1], wait: 6 }, { x: icecream[0], y: N1 }, { x: 4780, y: N1 },
            { x: E1, y: N1 }, { x: E1, y: S0 }, { x: 4780, y: S0, wait: 1 }, { x: E1, y: S0 }] },
  { who: 'mrskim', name: 'Mrs. Kim', speed: 105, lines: ['Hello, dear!', 'Your garden looks lovely this year.', 'Mind the road, now.', 'In my day we had one bus and no traffic lights!'],
    route: [{ x: 60, y: S0 }, { x: W0, y: S0, wait: 2 }, { x: W0, y: N1 }, { x: 60, y: N1, wait: 3 }, { x: W0, y: N1 }, { x: W0, y: S0 }] },
  { who: 'sam', name: 'Sam', speed: 160, lines: ['Have you been in the toy shop? So cool.', 'I want to build a go-kart.', ...hi.slice(0, 2)],
    route: [{ x: E0, y: S1 }, { x: E0, y: parts[1] }, { x: parts[0], y: parts[1], wait: 4 }, { x: toys[0], y: toys[1], wait: 6 }, { x: W1, y: toys[1] }, { x: W1, y: S1 }] },
  { who: 'ava', name: 'Ava', speed: 135, lines: ['Hiya!', 'I lost my soccer ball. Have you seen it?', ...hi.slice(2, 4)],
    route: [{ x: 60, y: S1 }, { x: W0, y: S1 }, { x: W0, y: 3460, wait: 2 }, { x: W0, y: S1 }] },
  { who: 'mrbrooks', name: 'Mr. Brooks', speed: 115, lines: ['Morning, Nico.', 'Busy day at the hospital.', 'Tell your folks I said hello.', 'That fire truck is fast, eh?'],
    route: [{ x: E1, y: 60 }, { x: E1, y: N0 }, { x: hospital[0], y: N0 }, { x: hospital[0], y: hospital[1], wait: 6 }, { x: hospital[0], y: N0 }, { x: 4780, y: N0, wait: 1 }, { x: E1, y: N0 }] },
);

// Nico's friends with shops (the user, 2026-10-11: "Don't keep Yarosh and Alpha in the shops"): a while behind the
// counter, then out round their block: past the school, popping into each other's shop, a look up the street
const potato = door('potato'), retro = door('retro');
TOWNSFOLK.push(
  { who: 'yarosh', name: 'Yarosh', speed: 150, note: '📝 “Out for a walk! Back soon. (The peeling board and the tub are open: help yourself!) —Yarosh”',
    lines: ['Hey Nico! Want a potato?', 'Alpha beat my Snake score again. Again!', 'Have you tried bobbing for bakers? Your face gets SO wet.', 'I can almost see over the school from up here.', 'Peeling potatoes is weirdly relaxing.'],
    route: [{ x: potato[0], y: potato[1], wait: 75, inside: 'potato' }, { x: potato[0], y: N0 }, { x: E0, y: N0 }, { x: E0, y: 60, wait: 3 }, { x: E0, y: N0 },
            { x: retro[0], y: N0 }, { x: retro[0], y: retro[1], wait: 6 }, { x: retro[0], y: N0 }, { x: W1, y: N0, wait: 2 }, { x: potato[0], y: N0 }] },
  { who: 'alpha', name: 'Alpha', speed: 140, note: '📝 “Gone looking for old games! The machines still work: play away! —Alpha”',
    lines: ['Nico! Did you get to the lily pads in Frog Hop yet?', 'I\'m hunting for old cartridges.', 'Yarosh owes me a baked potato.', 'Want to play Space Blasters later?', 'The last alien is the sneakiest.'],
    route: [{ x: retro[0], y: retro[1], wait: 90, inside: 'retro' }, { x: retro[0], y: N0 }, { x: W1, y: N0 }, { x: W1, y: 60, wait: 3 }, { x: W1, y: N0 },
            { x: potato[0], y: N0 }, { x: potato[0], y: potato[1], wait: 7 }, { x: potato[0], y: N0 }, { x: school[0], y: N0, wait: 3 }, { x: retro[0], y: N0 }] },
);

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
