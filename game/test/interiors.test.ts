import { describe, it, expect } from 'vitest';
import { INTERIORS, interiorSolids, useSpot } from '../src/world/interiors';
import { BUILDINGS } from '../src/world/map';
import { PLACES } from '../src/places';
import { freeAt } from '../src/player';

/** The buildings with their own special rooms (main.ts / rooms.ts). */
const SPECIAL = ['burger', 'storage', 'home', 'nonna', 'woodshop'];
describe('every building has an inside (Nico: "any space that exists should be able to be gone inside of")', () => {
  it('each building in town has a room, and a door to get there', () => {
    for (const b of BUILDINGS) {
      expect(!!INTERIORS[b.id] || SPECIAL.includes(b.id), b.id).toBe(true);
      expect(PLACES.some(p => p.building === b.id), `${b.id} has a door`).toBe(true);
    }
  });
  for (const r of Object.values(INTERIORS)) it(`${r.title}: you can reach everything there is to use, and the way out`, () => {
    const solids = interiorSolids(r), box = { w: r.w, h: r.h - 20 };
    if (r.person) solids.push({ x: r.person.x - 22, y: r.person.y - 16, w: 44, d: 18 });
    const spots: [string, [number, number]][] = r.things.filter(t => 'use' in t && t.use).map(t => [(t as { use: { label: string } }).use.label, useSpot(t)]);
    if (r.person) spots.push(['person', [r.person.x, r.person.y + 130]]);
    spots.push(['the door', [r.w / 2, r.h - 100]]);
    for (const [what, [x, y]] of spots) {
      expect(x > 30 && x < r.w - 30 && y > r.wall && y < r.h - 20, `${what} at ${x},${y} is in the room`).toBe(true);
      expect(freeAt(x, Math.min(y, r.h - 40), solids, box), `${what} at ${x},${y} is clear`).toBe(true);
    }
  });
});
