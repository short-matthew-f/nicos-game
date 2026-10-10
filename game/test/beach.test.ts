import { describe, it, expect } from 'vitest';
import { beepGap, sandSpot, onBeach, pickShell, pickTreasure, SHELL_KINDS, TREASURE, DETECT, Treasure } from '../src/world/beach';
import { ITEMS, item, makeUnit, freshBiz, dugUp, TOOLS } from '../src/business';
import { SOLIDS, WORLD } from '../src/world/map';
import { freeAt } from '../src/player';

const seq = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

describe('the beach', () => {
  it('the detector beeps faster the closer you get, and not at all out of range', () => {
    let last = 0;   // further away: a longer gap between beeps
    for (let d = DETECT.dig; d <= DETECT.range; d += 20) { const g = beepGap(d)!; expect(g).toBeGreaterThanOrEqual(last); expect(g).toBeGreaterThan(0); last = g; }
    expect(beepGap(DETECT.range)!).toBeGreaterThan(beepGap(DETECT.dig + 40)!);
    expect(beepGap(0)).toBe(DETECT.fastest);
    expect(beepGap(DETECT.range + 1)).toBeNull();
  });
  it('shells and treasure are on the beach, somewhere Nico can stand', () => {
    const r = seq(5);
    for (let i = 0; i < 200; i++) { const [x, y] = sandSpot(r); expect(onBeach(x, y), `${x},${y}`).toBe(true); expect(freeAt(x, y, SOLIDS, WORLD), `${x},${y}`).toBe(true); }
  });
  it('every kind of shell turns up, the rare ones less often', () => {
    const r = seq(9), n: Record<string, number> = {};
    for (let i = 0; i < 3000; i++) { const k = pickShell(r); n[k] = (n[k] ?? 0) + 1; }
    for (const k of SHELL_KINDS) expect(n[k.id], k.id).toBeGreaterThan(0);
    expect(n.sanddollar).toBeLessThan(n.scallop);
  });
  it('treasure is cash or a beach find (with a real value); beach finds never come out of storage units', () => {
    for (const t of TREASURE) if (t.what !== 'cash') expect(item(t.what).where, t.what).toBe('beach');
    const r = seq(3);
    for (let i = 0; i < 300; i++) { const t = pickTreasure(r); if (t.what === 'cash') expect(t.cash).toBeGreaterThan(0); else expect(item(t.what)).toBeDefined(); }
    const beach = new Set(ITEMS.filter(i => i.where === 'beach').map(i => i.id));
    for (let s = 1; s < 400; s++) for (const c of makeUnit(s, 'X').contents) expect(beach.has(c.id), `unit ${s}: ${c.id}`).toBe(false);
  });
  it('digging up a find puts it on the shelf with a value in its range; a new treasure is buried', () => {
    const b = freshBiz(), v = dugUp(b, 'ring', () => 0.999);
    expect(b.finds).toEqual([{ id: 'ring', value: v }]); expect(v).toBe(item('ring').value[1]);
    const t = new Treasure(), before = t.spots.map(p => p.join());
    t.dig(0, () => 0.1); expect(t.spots[0].join()).not.toBe(before[0]);
    expect(t.nearest(t.spots[1][0], t.spots[1][1]).d).toBe(0);
  });
  it('the metal detector is for sale', () => {
    expect(TOOLS.find(t => t.id === 'detector')!.price).toBeGreaterThan(0);
  });
});

import { inPool, atEdge, climbOut, SPLASH, waterSlideAt, WSLIDE_T } from '../src/play';
import { POOL } from '../src/world/zones';
describe('the pool', () => {
  it('climbing out anywhere round the edge lands on the deck, somewhere Nico can stand', () => {
    for (let x = POOL.x + 30; x < POOL.x + POOL.w - 30; x += 40) for (const y of [POOL.y + 60, POOL.y + POOL.d - 20]) {
      const [px, py] = inPool(x, y); expect(atEdge(px, py), `${px},${py}`).toBe(true);
      const [ox, oy] = climbOut(px, py); expect(freeAt(ox, oy, SOLIDS, WORLD), `out at ${ox},${oy}`).toBe(true);
    }
    for (let y = POOL.y + 60; y < POOL.y + POOL.d; y += 40) for (const x of [POOL.x + 20, POOL.x + POOL.w - 20]) {
      const [ox, oy] = climbOut(...inPool(x, y)); expect(freeAt(ox, oy, SOLIDS, WORLD), `out at ${ox},${oy}`).toBe(true);
    }
  });
  it('the water slide ends in the water, away from the edge', () => {
    expect(inPool(...SPLASH)).toEqual(SPLASH);
    expect(atEdge(...SPLASH)).toBe(false);
    expect(waterSlideAt(WSLIDE_T.climb + WSLIDE_T.sit + WSLIDE_T.slide + 0.01)).toBeNull();
    expect(waterSlideAt(0.5)!.view).toBe('back');   // climbing
  });
});
