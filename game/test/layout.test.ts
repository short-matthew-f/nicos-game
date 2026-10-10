import { describe, it, expect } from 'vitest';
import { BUILDINGS, TREES, PROPS, LOTS, POND, SLIDE, SWINGS, GOALS, FIELD, ROADS_X, ROADS_Y, ROAD_W, SIDEWALK, WORLD, SOLIDS, doorOf, propSolid, type Rect } from '../src/world/map';
import { freeAt } from '../src/player';
import { COIN_SPOTS, FLOCKS } from '../src/world/life';

const band = ROAD_W / 2 + SIDEWALK;   // road plus sidewalk, either side of a centre line
const hit = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.d && b.y < a.y + a.d;
const drawn = (b: typeof BUILDINGS[number]): Rect => ({ x: b.x, y: b.y - b.h, w: b.w, d: b.d + b.h });
const roads: Rect[] = [
  ...ROADS_X.map(x => ({ x: x - band, y: 0, w: band * 2, d: WORLD.h })),
  ...ROADS_Y.map(y => ({ x: 0, y: y - band, w: WORLD.w, d: band * 2 })),
];

describe('town layout', () => {
  it('no building (as drawn, wall and roof included) covers a road or sidewalk, or leaves the world', () => {
    for (const b of BUILDINGS) {
      const r = drawn(b);
      expect(roads.some(rd => hit(rd, r)), b.id).toBe(false);
      expect(r.x >= 0 && r.y >= 0 && r.x + r.w <= WORLD.w && r.y + r.d <= WORLD.h, b.id).toBe(true);
    }
  });
  it('buildings do not overlap each other as drawn', () => {
    for (const a of BUILDINGS) for (const b of BUILDINGS) if (a !== b) expect(hit(drawn(a), drawn(b)), `${a.id} / ${b.id}`).toBe(false);
  });
  it('every door opens onto ground Nico can stand on', () => {
    for (const b of BUILDINGS) { const [x, y] = doorOf(b); expect(freeAt(x, y, SOLIDS, WORLD), b.id).toBe(true); }
  });
  it('trees and props stay off roads, out of buildings and off the soccer field', () => {
    const things: [string, Rect][] = [
      ...TREES.map(([x, y]) => [`tree ${x},${y}`, { x: x - 20, y: y - 18, w: 40, d: 20 }] as [string, Rect]),
      ...PROPS.map(p => [`${p.kind} ${p.x},${p.y}`, propSolid(p) ?? { x: p.x - 10, y: p.y - 10, w: 20, d: 20 }] as [string, Rect]),
    ];
    for (const [name, r] of things) {
      expect(roads.some(rd => hit(rd, r)), `${name} on a road`).toBe(false);
      expect(BUILDINGS.some(b => hit(b, r)), `${name} in a building`).toBe(false);
      expect(hit(FIELD, r), `${name} on the field`).toBe(false);
    }
  });
  it('the playground equipment stands on the sand, the pond in the park, goals at the field ends', () => {
    const sand = LOTS.find(l => l.id === 'playground')!, park = LOTS.find(l => l.id === 'park')!;
    for (const r of [{ x: SLIDE.x, y: SLIDE.y - 10, w: SLIDE.len, d: 10 }, { x: SWINGS.x, y: SWINGS.y - 10, w: SWINGS.w, d: 10 }])
      expect(r.x >= sand.x && r.x + r.w <= sand.x + sand.w && r.y >= sand.y && r.y + r.d <= sand.y + sand.d).toBe(true);
    expect(POND.x >= park.x && POND.x + POND.w <= park.x + park.w && POND.y >= park.y && POND.y + POND.d <= park.y + park.d).toBe(true);
    for (const g of GOALS) expect(g.x > FIELD.x && g.x < FIELD.x + FIELD.w).toBe(true);
  });
  it('every coin and pigeon flock is somewhere Nico can reach', () => {
    for (const [x, y] of COIN_SPOTS) expect(freeAt(x, y, SOLIDS, WORLD), `coin ${x},${y}`).toBe(true);
    const onRoad = (x: number, y: number) => ROADS_X.some(r => Math.abs(x - r) < ROAD_W / 2 + 20) || ROADS_Y.some(r => Math.abs(y - r) < ROAD_W / 2 + 20);
    for (const [x, y] of FLOCKS) expect(freeAt(x, y, SOLIDS, WORLD) && !onRoad(x, y), `pigeons ${x},${y}`).toBe(true);   // sidewalks are fine
  });
});
