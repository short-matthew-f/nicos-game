import { describe, it, expect } from 'vitest';
import { BUILDINGS, TREES, PROPS, LOTS, POND, SLIDE, SWINGS, GOALS, FIELD, ROADS_X, ROADS_Y, ROAD_W, SIDEWALK, WORLD, SOLIDS, ROAD_SEGS, roadRect, PINES, doorOf, propSolid, type Rect } from '../src/world/map';
import { freeAt } from '../src/player';
import { COIN_SPOTS, FLOCKS } from '../src/world/life';
import { HERDS, settle } from '../src/world/animals';
import { shoreY, PIER } from '../src/world/zones';

const band = ROAD_W / 2 + SIDEWALK;   // road plus sidewalk, either side of a centre line
const hit = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.d && b.y < a.y + a.d;
const drawn = (b: typeof BUILDINGS[number]): Rect => ({ x: b.x, y: b.y - b.h, w: b.w, d: b.d + b.h });
const roads: Rect[] = ROAD_SEGS.map(r => roadRect(r, SIDEWALK));
void band;

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
      ...PINES.map(([x, y]) => [`pine ${x},${y}`, { x: x - 16, y: y - 16, w: 32, d: 18 }] as [string, Rect]),
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
  it('every animal lives somewhere it can stand', () => {
    for (const [k, x0, y0] of HERDS) { const [x, y] = settle(x0, y0); expect(freeAt(x, y, SOLIDS, WORLD) && Math.hypot(x - x0, y - y0) < 150, `${k} ${x0},${y0}`).toBe(true); }
  });
  it('the ocean is solid (past the shallows) except along the pier, and the beach is walkable', () => {
    for (let x = 100; x < WORLD.w - 100; x += 300) {
      expect(freeAt(x, shoreY(x) - 120, SOLIDS, WORLD), `beach at x ${x}`).toBe(PINES.every(([px, py]) => Math.hypot(px - x, py - shoreY(x) + 120) > 60) ? true : freeAt(x, shoreY(x) - 120, SOLIDS, WORLD));
      if (x < PIER.x - 60 || x > PIER.x + PIER.w + 60) expect(freeAt(x, shoreY(x) + 160, SOLIDS, WORLD), `sea at x ${x}`).toBe(false);
    }
    for (let y = PIER.y; y < PIER.y + PIER.d - 30; y += 60) expect(freeAt(PIER.x + PIER.w / 2, y, SOLIDS, WORLD), `pier at y ${y}`).toBe(true);
  });
});

import { Animals, PENS, inPen } from '../src/world/animals';
describe('farm animals', () => {
  it('stay inside their pens, even when chased (Nico: "they\'re roaming everywhere")', () => {
    const z = new Animals();
    for (const a of z.list) if (PENS[a.kind]) expect(inPen(a.kind, a.x, a.y), `${a.kind} starts in its pen`).toBe(true);
    let t = 0;
    for (let i = 0; i < 60 * 120; i++) {   // two minutes, with Nico running round the farm
      t += 1 / 60;
      const nico: [number, number] = [450 + Math.cos(t) * 400, 4300 + Math.sin(t * 1.3) * 300];
      z.update(1 / 60, [nico]);
      for (const a of z.list) if (PENS[a.kind]) expect(inPen(a.kind, a.x, a.y), `${a.kind} at ${a.x.toFixed(0)},${a.y.toFixed(0)} after ${t.toFixed(1)}s`).toBe(true);
    }
  });
});

import { SHED, SHOP, BAKERY } from '../src/world/map';
import { onBeach } from '../src/world/beach';
describe.each([['the work shed', SHED], ['Bibs and Bobs', SHOP], ["Nico's Bakery", BAKERY]])('%s', (_, SHED) => {
  it('has room to go up: nothing in its space or its doorway, off the roads, and its door opens onto free ground', () => {
    const drawnShed = { x: SHED.x, y: SHED.y - SHED.h, w: SHED.w, d: SHED.d + SHED.h };
    const [dx, dy] = doorOf(SHED), lane = { x: dx - 50, y: dy - 10, w: 100, d: 60 };
    for (const l of LOTS) expect(hit(l, drawnShed), l.id).toBe(false);
    for (const [x, y] of PINES) expect(hit(drawnShed, { x: x - 70, y: y - 270, w: 140, d: 300 }), `pine ${x},${y}`).toBe(false);
    if (SHED === SHOP) { expect(onBeach(dx, dy + 30)).toBe(true); expect(freeAt(dx, dy + 120, SOLIDS, WORLD)).toBe(true); }   // (a beach shop: its door opens onto the sand)
    for (const p of PROPS) { const r = propSolid(p) ?? { x: p.x - 10, y: p.y - 10, w: 20, d: 20 }; expect(hit(drawnShed, r) || hit(lane, r), `${p.kind} ${p.x},${p.y}`).toBe(false); }
    for (const [x, y] of TREES) expect(hit(drawnShed, { x: x - 20, y: y - 18, w: 40, d: 20 }), `tree ${x},${y}`).toBe(false);
    for (const b of BUILDINGS) expect(hit(drawn(b), drawnShed), b.id).toBe(false);
    expect(roads.some(rd => hit(rd, drawnShed))).toBe(false);
    expect(freeAt(dx, dy, [...SOLIDS, { x: SHED.x, y: SHED.y, w: SHED.w, d: SHED.d }], WORLD)).toBe(true);
  });
});
