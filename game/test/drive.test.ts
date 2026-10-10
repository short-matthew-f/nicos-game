import { describe, it, expect } from 'vitest';
import { steer, moveCar, carFits, angleTo, CAR, type CarState } from '../src/drive';
import { SOLIDS, WORLD, PARKED_CAR, DRIVEWAYS, ROADS_X, ROADS_Y, TREES } from '../src/world/map';

const run = (c: CarState, sx: number, sy: number, secs: number, solids = SOLIDS) => {
  for (let t = 0; t < secs; t += 1 / 60) { const h = c.h; steer(c, sx, sy, 1 / 60); moveCar(c, h, 1 / 60, solids, WORLD); }
  return c;
};
const open = () => ({ x: ROADS_X[0], y: ROADS_Y[0] + 400, h: 0, speed: 0 });   // on a road, nothing near

describe('driving', () => {
  it('angleTo takes the short way round', () => {
    expect(angleTo(0, 0.5)).toBeCloseTo(0.5);
    expect(angleTo(3, -3)).toBeCloseTo(2 * Math.PI - 6);
    expect(angleTo(-3, 3)).toBeCloseTo(6 - 2 * Math.PI);
  });
  it('pushing the stick turns the car toward it, the short way', () => {
    const c = run({ ...open(), h: 0 }, 0, 1, 2);          // stick down = +π/2
    expect(c.h).toBeCloseTo(Math.PI / 2, 1);
    const d = run({ ...open(), h: 0 }, 0, -1, 2);
    expect(d.h).toBeCloseTo(-Math.PI / 2, 1);
  });
  it('a stopped car can turn round (and does not race off backwards)', () => {
    const c = run({ ...open(), h: 0 }, -1, 0, 3);
    expect(Math.abs(angleTo(c.h, Math.PI))).toBeLessThan(0.15);
  });
  it('speed follows how far the stick is pushed, capped at the top speed', () => {
    expect(run({ ...open(), h: -Math.PI / 2 }, 0, -1, 3).speed).toBeCloseTo(CAR.max, 0);
    expect(run({ ...open(), h: -Math.PI / 2 }, 0, -0.5, 3).speed).toBeCloseTo(CAR.max / 2, 0);
  });
  it('releasing the stick coasts to a stop', () => {
    const c = run({ ...open(), h: -Math.PI / 2 }, 0, -1, 2);
    run(c, 0, 0, 0.5); expect(c.speed).toBeGreaterThan(0);
    run(c, 0, 0, 3); expect(c.speed).toBe(0);
  });
  it('a wall stops the car head-on and it slides along a wall at an angle', () => {
    const wall = [{ x: 600, y: 0, w: 50, d: 2000 }];
    const c = run({ x: 400, y: 1000, h: 0, speed: 0 }, 1, 0, 3, wall);
    expect(c.x).toBeLessThan(600 - 27); expect(c.x).toBeGreaterThan(500); expect(c.speed).toBe(0);
    const d = run({ x: 400, y: 1000, h: 0, speed: 0 }, 1, 0.35, 3, wall);
    expect(d.y).toBeGreaterThan(1100);
    expect(carFits(d.x, d.y, d.h, wall, WORLD)).toBe(true);
  });
  it('never ends up inside a building, whatever the stick does', () => {
    const c: CarState = { ...PARKED_CAR, speed: 0 };
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 120; k++) { run(c, rnd() * 2 - 1, rnd() * 2 - 1, 0.5); expect(carFits(c.x, c.y, c.h, SOLIDS, WORLD)).toBe(true); }
  });
  it("can't drive through a tree", () => {
    const [tx, ty] = TREES[0];
    expect(carFits(tx, ty - 5, 0, SOLIDS, WORLD)).toBe(false);
    const c = run({ x: tx - 200, y: ty - 5, h: 0, speed: 0 }, 1, 0, 2);
    expect(c.x).toBeLessThan(tx - 30);
  });
  it('the parked car starts on the home driveway, clear of buildings', () => {
    const d = DRIVEWAYS.find(r => r.id === 'home')!;
    expect(PARKED_CAR.x > d.x && PARKED_CAR.x < d.x + d.w && PARKED_CAR.y > d.y && PARKED_CAR.y < d.y + d.d).toBe(true);
    expect(carFits(PARKED_CAR.x, PARKED_CAR.y, PARKED_CAR.h, SOLIDS, WORLD)).toBe(true);
  });
});
