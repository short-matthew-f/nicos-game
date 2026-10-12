import { describe, it, expect } from 'vitest';
import { Fiat, FIAT } from '../src/world/fiat';
import { makeTraffic, leaders } from '../src/world/cars';
import { DRIVEWAYS, ROAD_SEGS, roadRect } from '../src/world/map';

const inside = (r: { x: number; y: number; w: number; d: number }, [x, y]: [number, number], pad = 0) =>
  x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.d + pad;
const drive = DRIVEWAYS.find(d => d.id === 'poppop')!;
const onRoad = (p: [number, number]) => ROAD_SEGS.some(r => inside(roadRect(r), p, 2));

describe("Poppop's Fiat 500", () => {
  it('drives only on roads and his driveway (and the sidewalk between), and parks on the driveway', () => {
    const f = new Fiat();
    expect(inside(drive, f.loop.at(0))).toBe(true);
    for (let s = 0; s < f.loop.length; s += 10) {
      const p = f.loop.at(s);
      expect(onRoad(p) || inside(drive, p, 60), `s=${s} at ${p.map(Math.round)}`).toBe(true);
    }
  });
  it('hospital days: along the front of the hospital, a U-turn, and a long stop at the door (they go in)', () => {
    const f = new Fiat(); f.wants = () => true; const seen: string[] = []; let atDoor: [number, number] | null = null;
    f.go('hospital');
    for (let s = 0; s < f.loop.length; s += 10) { const p = f.loop.at(s); expect(onRoad(p) || inside(drive, p, 60), `s=${s} at ${p.map(Math.round)}`).toBe(true); }
    for (let t = 0; t < 400 && f.out; t += 0.05) { f.update(0.05, []); if (f.at && !seen.includes(f.at)) { seen.push(f.at); if (f.at === 'hospital') atDoor = [...f.pos] as [number, number]; } }
    expect(seen).toContain('hospital'); expect(f.out).toBe(false);
    expect(Math.abs(atDoor![0] - 3730)).toBeLessThan(40); expect(atDoor![1]).toBeLessThan(945);   // (the hospital's side of the road)
  });
  it('waits at home, then goes for a drive into town and comes home again', () => {
    const f = new Fiat(); f.go = ((go) => (trip?: 'town' | 'hospital') => go(trip ?? 'town'))(f.go.bind(f));
    f.update(FIAT.firstRun - 1, []);
    expect(f.out).toBe(false);
    f.update(1.01, []);
    expect(f.out).toBe(true);
    let secs = 0, west = Infinity;
    while (f.out && secs < 200) { f.update(0.05, []); secs += 0.05; west = Math.min(west, f.pos[0]); }
    expect(f.out).toBe(false);
    expect(west).toBeLessThan(1300);   // all the way round the ring road
    expect(f.wait).toBeGreaterThanOrEqual(FIAT.every[0]);
  });
  it('pulls in at Parts & Tools, and at the bakery only when asked to (Nonna drops off pizzelle)', () => {
    for (const bakery of [false, true]) {
      const f = new Fiat(), stopped = new Set<string>(), done: string[] = [];
      f.wants = k => k === 'parts' || bakery;
      f.onStop = k => done.push(k);
      f.go('town');
      for (let t = 0; t < 200 && f.out; t += 0.05) { f.update(0.05, []); if (f.at) { stopped.add(f.at); expect(f.speed).toBe(0); } }
      expect(f.out).toBe(false);
      expect([...stopped].sort()).toEqual(bakery ? ['bakery', 'parts'] : ['parts']);
      expect(done).toEqual(bakery ? ['bakery', 'parts'] : ['parts']);
    }
  });
  it('gets round with the traffic without anyone getting stuck for good', () => {
    const f = new Fiat(), cars = makeTraffic(3), lead = leaders(cars), dt = 1 / 30;
    f.go();
    let still = 0, maxStill = 0;
    for (let t = 0; t < 200 && f.out; t += dt) {
      const fp: [number, number, string][] = f.points().map(([x, y]) => [x, y, 'fiat']);
      for (let i = 0; i < cars.length; i++) cars[i].update(dt, lead[i], fp);
      const s0 = f.s;
      f.update(dt, cars.filter(c => c.blockedBy !== 'fiat').map(c => c.pos as [number, number]));
      still = f.s === s0 ? still + dt : 0; maxStill = Math.max(maxStill, still);
    }
    expect(f.out).toBe(false);
    expect(maxStill).toBeLessThan(15);
  });
});
