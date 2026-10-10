import { describe, it, expect } from 'vitest';
import { PLACES, buy, BOOST } from '../src/places';
import { BUILDINGS, SOLIDS, WORLD, doorOf } from '../src/world/map';
import { freeAt } from '../src/player';
import { slideAt, SLIDE_LEN, SLIDE_START, SLIDE_END, swingAt, SWING_PERIOD } from '../src/play';
import { SLIDE, SWINGS } from '../src/world/map';

describe('places', () => {
  it('every place is a real building with a door Nico can stand at', () => {
    for (const p of PLACES) {
      const b = BUILDINGS.find(b => b.id === p.building);
      expect(b, p.building).toBeDefined();
      const [x, y] = doorOf(b!);
      expect(freeAt(x, y, SOLIDS, WORLD), p.building).toBe(true);
    }
  });
  it('buying lunch costs money and gives a capped boost', () => {
    const fries = PLACES.find(p => p.building === 'burger')!.menu!.find(m => m.id === 'fries')!;
    expect(buy(20, 0, fries)).toEqual({ money: 17, boost: fries.boost });
    expect(buy(20, BOOST.max - 5, fries)!.boost).toBe(BOOST.max);
    expect(buy(fries.price, 0, fries)!.money).toBe(0);
    expect(buy(fries.price - 1, 0, fries)).toBeNull();
  });
});

describe('playground', () => {
  it('the slide climbs up the tower, comes down the chute and lands clear of it', () => {
    const from: [number, number] = [SLIDE_START[0] - 30, SLIDE_START[1] + 30];
    expect(slideAt(0, from).x).toBeCloseTo(from[0]);
    const ys = Array.from({ length: 100 }, (_, i) => slideAt(i / 99 * SLIDE_LEN, from).y);
    expect(Math.min(...ys)).toBeLessThan(SLIDE.y - SLIDE.top + 1);          // reached the platform
    const end = slideAt(SLIDE_LEN, from);
    expect([end.x, end.y]).toEqual(SLIDE_END);
    expect(end.x).toBeGreaterThan(SLIDE.x + SLIDE.len);                      // past the chute
    expect(freeAt(end.x, end.y, SOLIDS, WORLD)).toBe(true);
    // facing down the chute and sitting while sliding
    const mid = slideAt(SLIDE_LEN - 0.6, from);
    expect(mid.view).toBe('side'); expect(mid.sit).toBeGreaterThan(0.9);
    // drawn in front of the slide the whole time
    for (let t = 0; t < SLIDE_LEN; t += 0.05) expect(slideAt(t, from).z).toBeGreaterThan(SLIDE.y);
  });
  it('the swing builds up, then swings back and forth', () => {
    const amp = (t0: number) => { const c = Array.from({ length: 50 }, (_, i) => swingAt(t0 + i / 49 * SWING_PERIOD, 0).chain); return Math.max(...c) - Math.min(...c); };
    expect(amp(0)).toBeLessThan(amp(4));
    expect(amp(4)).toBeGreaterThan(0.5);
    expect(swingAt(5, 1).body.x).toBe(SWINGS.x + SWINGS.seats[1]);
  });
});
