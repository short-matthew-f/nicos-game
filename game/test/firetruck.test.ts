import { describe, it, expect } from 'vitest';
import { FireTruck, TRUCK } from '../src/world/firetruck';
import { makeTraffic, leaders } from '../src/world/cars';
import { BUILDINGS, DRIVEWAYS, ROADS_X, ROADS_Y, ROAD_W, SIDEWALK } from '../src/world/map';

const fire = BUILDINGS.find(b => b.id === 'fire')!;
const onRoad = ([x, y]: [number, number]) => ROADS_X.some(r => Math.abs(x - r) < ROAD_W / 2) || ROADS_Y.some(r => Math.abs(y - r) < ROAD_W / 2);
const onApron = ([x, y]: [number, number]) => DRIVEWAYS.some(d => d.id === 'fire' && x >= d.x - SIDEWALK - 10 && x <= d.x + d.w && y >= d.y - 4 && y <= d.y + d.d);
const inStation = ([x, y]: [number, number]) => x > fire.x && x < fire.x + fire.w && y > fire.y && y < fire.y + fire.d + 10;

/** Run traffic + truck together the way main.ts does (no Nico). */
function sim(secs: number, truck: FireTruck, dt = 1 / 30) {
  const cars = makeTraffic(3), lead = leaders(cars);
  let maxStill = 0, still = 0;
  for (let t = 0; t < secs; t += dt) {
    const tp: [number, number, string][] = truck.out ? truck.points().map(([x, y]) => [x, y, 'truck']) : [];
    for (let i = 0; i < cars.length; i++) cars[i].update(dt, lead[i], tp);
    const s0 = truck.s;
    truck.update(dt, cars.filter(c => c.blockedBy !== 'truck').map(c => c.pos as [number, number]));
    still = truck.out && truck.s === s0 ? still + dt : 0; maxStill = Math.max(maxStill, still);
  }
  return { cars, maxStill };
}

describe('fire truck', () => {
  it('drives only on roads and its apron, starting and ending inside the station', () => {
    const t = new FireTruck();
    const L = t.loop.length;
    expect(inStation(t.loop.at(0))).toBe(true);
    for (let s = 0; s < L; s += 10) {
      const p = t.loop.at(s);
      expect(onRoad(p) || onApron(p) || inStation(p), `s=${s} at ${p.map(Math.round)}`).toBe(true);
    }
  });
  it('waits in the station until the alarm, then does a lap and comes home', () => {
    const t = new FireTruck();
    t.update(TRUCK.firstRun - 1, []);
    expect(t.out).toBe(false);
    t.update(1.01, []);
    expect(t.out).toBe(true);
    let secs = 0;
    while (t.out && secs < 120) { t.update(0.05, []); secs += 0.05; }
    expect(t.out).toBe(false);
    expect(secs).toBeGreaterThan(t.loop.length / TRUCK.max);
    expect(t.wait).toBeGreaterThanOrEqual(TRUCK.every[0]);
  });
  it('stops for someone standing in its way', () => {
    const t = new FireTruck(); t.alarm();
    for (let i = 0; i < 60; i++) t.update(1 / 30, []);
    const [x, y] = t.pos, h = t.heading;
    const ahead = TRUCK.len * 0.9, nico: [number, number] = [x + Math.cos(h) * ahead, y + Math.sin(h) * ahead];
    for (let i = 0; i < 90; i++) t.update(1 / 30, [nico]);
    expect(t.speed).toBe(0);
  });
  it('never jams with traffic: several laps, never stuck for long', () => {
    const t = new FireTruck();
    t.wait = 1; TRUCK.every[0] = 2; TRUCK.every[1] = 6;     // rapid alarms
    const { maxStill } = sim(240, t);
    expect(maxStill).toBeLessThan(6);
  });
});

describe('fire calls', () => {
  it('drives to the fire, stops there, sprays it out, then goes home', () => {
    const t = new FireTruck(); const stop = 2500;
    t.alarm(stop);
    let secs = 0, stoppedAt = -1, sprayed = 0;
    while (t.out && secs < 200) {
      t.update(1 / 30, []); secs += 1 / 30;
      if (t.speed === 0 && t.stopAt !== null) { stoppedAt = t.s; sprayed = t.spraying; }
    }
    expect(Math.abs(stoppedAt - stop)).toBeLessThan(10);
    expect(sprayed).toBeGreaterThan(FireTruck.SPRAY - 0.2);
    expect(t.out).toBe(false);
  });
});
