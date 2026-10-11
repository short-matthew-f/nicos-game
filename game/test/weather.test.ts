import { describe, it, expect } from 'vitest';
import { seasonOf, nextSky, SEASON, SEASONS, WEATHER, puddleAt } from '../src/world/weather';
import { migrate, fresh } from '../src/state';
import { ROAD_SEGS, ROAD_W, SIDEWALK } from '../src/world/map';

describe('weather and seasons', () => {
  it('a new game starts in summer, and the seasons turn every few days, round and round', () => {
    expect(seasonOf(SEASON.start)).toBe('summer');
    const seen = Array.from({ length: SEASON.days * 8 }, (_, d) => seasonOf(d));
    expect(new Set(seen)).toEqual(new Set(SEASONS));
    expect(seasonOf(SEASON.start + SEASON.days)).toBe('fall');
    expect(seasonOf(SEASON.start + 2 * SEASON.days)).toBe('winter');
  });
  it('it only snows in winter; summer is mostly dry', () => {
    for (const s of SEASONS) for (let i = 0; i < 200; i++) { const k = nextSky(s); if (s !== 'winter') expect(k).not.toBe('snow'); else expect(k).not.toBe('rain'); }
    let wet = 0; for (let i = 0; i < 2000; i++) if (nextSky('summer') !== 'clear') wet++;
    expect(wet / 2000).toBeCloseTo(WEATHER.wet.summer, 1);
  });
  it('puddles are by the roads (on the sidewalks), not out in the fields', () => {
    const r = ROAD_SEGS[0];
    let found = false; for (let x = r.from + 100; x < r.to && !found; x += 4) for (const side of [-1, 1]) if (puddleAt(x, r.at + side * (ROAD_W / 2 + SIDEWALK / 2))) found = true;
    expect(found).toBe(true);
    expect(puddleAt(6500, 1200)).toBe(false);
  });
  it('the day is saved (only once some have gone by)', () => {
    expect(migrate({ ...fresh(), day: 7 }).day).toBe(7);
    expect('day' in migrate(fresh())).toBe(false);
    expect('day' in migrate({ ...fresh(), day: -2 })).toBe(false);
  });
});
