import { describe, it, expect } from 'vitest';
import { Loop, roundCorners } from '../src/world/path';
import { carLoops, SOLIDS, WORLD, ROADS_X, ROADS_Y, ROAD_W } from '../src/world/map';
import { chooseView, moveCircle, RADIUS } from '../src/player';
import { stickVector, STICK_R } from '../src/input/stick';

describe('car loops', () => {
  const half = ROAD_W / 2;
  const onRoad = ([x, y]: [number, number]) =>
    ROADS_X.some(rx => Math.abs(x - rx) <= half) || ROADS_Y.some(ry => Math.abs(y - ry) <= half);
  for (const [i, pts] of carLoops().entries()) {
    const loop = new Loop(roundCorners(pts, i === 0 ? 70 : 110));
    it(`loop ${i} stays on the road surface everywhere`, () => {
      for (let s = 0; s < loop.length; s += 5) expect(onRoad(loop.at(s)), `s=${s} at ${loop.at(s)}`).toBe(true);
    });
    it(`loop ${i} keeps to its lane on the straights (within 2px of the lane line)`, () => {
      // everything but the last ~13% of each side near a corner is straight and in lane
      for (let k = 0; k < pts.length; k++) {
        const a = pts[k], b = pts[(k + 1) % pts.length];
        for (const f of [0.15, 0.3, 0.5, 0.7, 0.85]) {
          const m: [number, number] = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
          let best = Infinity;
          for (let s = 0; s < loop.length; s += 2) { const p = loop.at(s); best = Math.min(best, Math.hypot(p[0] - m[0], p[1] - m[1])); }
          expect(best, `side ${k} at ${f}`).toBeLessThan(2);
        }
      }
    });
    it(`loop ${i} never turns more than 12 degrees per 10px (no kinks)`, () => {
      for (let s = 0; s < loop.length; s += 10) {
        let d = loop.heading(s + 10) - loop.heading(s);
        d = Math.atan2(Math.sin(d), Math.cos(d));
        expect(Math.abs(d) * 180 / Math.PI).toBeLessThan(12);
      }
    });
  }
});

describe('player', () => {
  it('faces the way it moves', () => {
    const c = { view: 'side' as const, face: 1 };
    expect(chooseView(-1, 0, c)).toEqual({ view: 'side', face: -1 });
    expect(chooseView(0, 1, c).view).toBe('front');
    expect(chooseView(0, -1, c).view).toBe('back');
    expect(chooseView(0, 0, { view: 'back', face: -1 })).toEqual({ view: 'back', face: -1 });
  });
  it('keeps the current view on a near-diagonal (no flicker)', () => {
    expect(chooseView(1, 0.95, { view: 'front', face: 1 }).view).toBe('front');
    expect(chooseView(1, 0.95, { view: 'side', face: 1 }).view).toBe('side');
  });
  it('cannot walk into a building, and slides along it', () => {
    const b = SOLIDS[0];
    let x = b.x + 50, y = b.y - 40;
    for (let i = 0; i < 50; i++) [x, y] = moveCircle(x, y, 3, 4, SOLIDS, WORLD);
    expect(y).toBeLessThanOrEqual(b.y - RADIUS + 1e-9);
    expect(x).toBeGreaterThan(b.x + 50 + 100);
  });
  it('stays inside the world', () => {
    const [x, y] = moveCircle(20, 20, -500, -500, [], WORLD);
    expect(x).toBe(RADIUS); expect(y).toBe(RADIUS);
  });
});

describe('thumbstick', () => {
  it('ignores tiny wobbles, saturates at the rim, keeps direction', () => {
    expect(stickVector(3, 3)).toEqual([0, 0]);
    const [x, y] = stickVector(STICK_R * 3, 0); expect(x).toBeCloseTo(1); expect(y).toBeCloseTo(0);
    const [a, b] = stickVector(-STICK_R / 2, -STICK_R / 2);
    expect(a).toBeCloseTo(b); expect(Math.hypot(a, b)).toBeGreaterThan(0.5); expect(Math.hypot(a, b)).toBeLessThan(1);
  });
});
