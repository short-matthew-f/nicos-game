import { describe, it, expect } from 'vitest';
import { makeRea, stepRea, buildFor, REA } from '../src/rea';
import { shoreY, SAND_W } from '../src/world/zones';

const run = (s: ReturnType<typeof makeRea>, secs: number) => { const ev: string[] = []; for (let k = 0; k < secs * 30; k++) for (const e of stepRea(s.rea, s.castles, 1 / 30, Math.random)) ev.push(e.kind); return ev; };
describe('Rea at the beach', () => {
  it('her castles are on the sand', () => {
    for (const [x, y] of REA.sites) { expect(y).toBeLessThan(shoreY(x)); expect(y).toBeGreaterThan(shoreY(x) - SAND_W); }
  });
  it('she builds castles and knocks them down, over and over', () => {
    const s = makeRea(); const ev = run(s, 120);
    expect(ev.filter(e => e === 'built').length).toBeGreaterThan(2);
    expect(ev.filter(e => e === 'boom').length).toBeGreaterThan(2);
  });
  it('a castle Nico builds gets knocked down soon after', () => {
    const s = makeRea(); s.castles.forEach(c => { c.state = 'down'; c.built = 0; });
    expect(buildFor(s.castles, 2)).toBe(true); expect(buildFor(s.castles, 2)).toBe(false);
    let booms = 0; for (let k = 0; k < 40 * 30 && !booms; k++) for (const e of stepRea(s.rea, s.castles, 1 / 30, () => 0.1)) if (e.kind === 'boom' && e.at === 2) booms++;
    expect(booms).toBe(1);
  });
  it('she waddles slowly (a toddler)', () => {
    const s = makeRea(); s.rea.doing = 'walk'; s.rea.at = 2; const x0 = s.rea.x; stepRea(s.rea, s.castles, 1);
    expect(Math.abs(s.rea.x - x0)).toBeLessThanOrEqual(REA.speed + 0.01);
  });
});
