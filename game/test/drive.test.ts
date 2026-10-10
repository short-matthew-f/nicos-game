import { describe, it, expect } from 'vitest';
import { steer, moveCar, carFits, angleTo, circles, CAR, type CarState } from '../src/drive';
import { makeTraffic, SQUEEZE } from '../src/world/cars';
import { SOLIDS, WORLD, PARKED_CAR, DRIVEWAYS, ROADS_X, ROADS_Y, TREES } from '../src/world/map';

const run = (c: CarState, sx: number, sy: number, secs: number, solids = SOLIDS) => {
  for (let t = 0; t < secs; t += 1 / 60) { const h = c.h; steer(c, sx, sy, 1 / 60); moveCar(c, h, 1 / 60, solids, WORLD); }
  return c;
};
const open = () => ({ x: ROADS_X[0], y: ROADS_Y[1] - 60, h: 0, speed: 0 });   // on a road, a long straight run up ahead

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
  it('a car that ends up overlapping another car can always steer out (the crash lock-up)', () => {
    const c: CarState = { ...open(), h: 0, speed: 0 };
    // a traffic car stopped across Nico's nose, overlapping it
    const other = circles(c.x + CAR.len * 0.55, c.y, Math.PI / 2);
    expect(carFits(c.x, c.y, c.h, [], WORLD, other)).toBe(false);
    for (let t = 0; t < 2; t += 1 / 60) { const h = c.h; steer(c, -1, 0, 1 / 60); moveCar(c, h, 1 / 60, [], WORLD, other); }
    expect(carFits(c.x, c.y, c.h, [], WORLD, other)).toBe(true);
  });
  it('nose against a wall: pulling back reverses out', () => {
    const wall = [{ x: 600, y: 0, w: 50, d: 2000 }];
    const c = run({ x: 400, y: 1000, h: 0, speed: 0 }, 1, 0, 2, wall);   // drive into the wall
    const x0 = c.x;
    run(c, -1, 0, 1, wall);
    expect(c.x).toBeLessThan(x0 - 80);
    expect(Math.abs(angleTo(c.h, 0))).toBeLessThan(0.3);                   // backed straight out
  });
});

describe('traffic and a parked Nico car', () => {
  const lane = () => { const cars = makeTraffic(1); const c = cars[0]; const [x, y] = c.pos, h = c.loop.heading(c.s);
    return { c, block: (tag?: string): [number, number, string?][] => [[x + Math.cos(h) * CAR.len, y + Math.sin(h) * CAR.len, tag]] }; };
  it('waits for Nico on foot as long as he stands there', () => {
    const { c, block } = lane(); const b = block();
    for (let t = 0; t < 20; t += 1 / 30) c.update(1 / 30, null, b);
    expect(c.speed).toBe(0);
  });
  it("squeezes past Nico's car after waiting a while, instead of waiting forever", () => {
    const { c, block } = lane(); const b = block('mine'); const s0 = c.s;
    for (let t = 0; t < SQUEEZE.after - 1; t += 1 / 30) c.update(1 / 30, null, b);
    expect(c.speed).toBe(0);
    for (let t = 0; t < 4; t += 1 / 30) c.update(1 / 30, null, b);
    expect(c.s - s0).toBeGreaterThan(CAR.len);
  });
});

describe('school bus', () => {
  it('pulls in at each stop, waits, and drives on', () => {
    const bus = makeTraffic().find(c => c.isBus)!;
    expect(bus.stops.length).toBe(2);
    const waits: number[] = []; let still = 0;
    for (let t = 0; t < 120; t += 1 / 30) {
      bus.update(1 / 30, null, []);
      if (bus.speed === 0) still += 1 / 30; else if (still > 0) { waits.push(still); still = 0; }
    }
    expect(waits.length).toBeGreaterThanOrEqual(2);
    for (const w of waits) expect(w).toBeGreaterThan(3);
  });
});
