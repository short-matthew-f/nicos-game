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

import { startFollow, letGo, footstep, stepFollow, seesCar, wantsToCome } from '../src/rea';
describe('Rea tags along', () => {
  it('follows Nico along his footsteps, a little way behind, and catches up', () => {
    const s = makeRea(), r = s.rea; startFollow(r);
    // Nico walks along a path that turns a corner
    const pts: [number, number][] = []; for (let x = r.x; x < r.x + 600; x += 10) pts.push([x, r.y]); for (let y = r.y; y > r.y - 400; y -= 10) pts.push([r.x + 600, y]);
    let k = 0;
    for (let t = 0; t < 30; t += 1 / 30) { if (k < pts.length) { footstep(r, ...pts[k]); k++; } stepFollow(r, 1 / 30, true); }
    const [nx, ny] = pts[pts.length - 1];
    expect(Math.hypot(nx - r.x, ny - r.y)).toBeLessThan(REA.follow.gap + 25);
    // never cut the corner: she went through it
    expect(r.trail.some(([x, y]) => Math.abs(x - (pts[0][0] + 600)) < 25 && Math.abs(y - pts[0][1]) < 25)).toBe(true);
  });
  it('waits while he is indoors, then goes home the way she came', () => {
    const s = makeRea(), r = s.rea, x0 = r.x, y0 = r.y; startFollow(r);
    for (let i = 0; i < 40; i++) footstep(r, x0 + i * 20, y0);
    for (let t = 0; t < 10; t += 1 / 30) stepFollow(r, 1 / 30, true);
    expect(r.x).toBeGreaterThan(x0 + 400);
    stepFollow(r, 1 / 30, false); expect(r.mode).toBe('wait');
    for (let t = 0; t < REA.follow.wait + 1; t += 1 / 30) stepFollow(r, 1 / 30, false);
    expect(r.mode).toBe('return');
    let home = null; for (let t = 0; t < 30 && !home; t += 1 / 30) home = stepFollow(r, 1 / 30, false);
    expect(home).toBe('home'); expect(r.mode).toBe('beach'); expect(Math.hypot(r.x - x0, r.y - y0)).toBeLessThan(25);
  });
  it('let her go: back to the castles', () => {
    const s = makeRea(), r = s.rea; startFollow(r); letGo(r); expect(r.mode).toBe('return');
  });
  it('mashina! (a car nearby)', () => {
    const r = makeRea().rea; expect(seesCar(r, [[r.x + 100, r.y]])).toBe(true); expect(seesCar(r, [[r.x + 900, r.y]])).toBe(false);
  });
  it('now and then she just comes along, when Nico is close', () => {
    const r = makeRea().rea; r.doing = 'rest';
    expect(wantsToCome(r, r.x + 50, r.y, 1, () => 0)).toBe(true); expect(wantsToCome(r, r.x + 900, r.y, 1, () => 0)).toBe(false);
  });
});
