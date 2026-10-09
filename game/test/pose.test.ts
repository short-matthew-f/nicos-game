import { describe, it, expect } from 'vitest';
import { partOps, opsMatrix, apply, type PoseState, type Op } from '../src/rig/pose';
import poses from './fixtures/poses.json';

type Fixture = { state: PoseState & Record<string, unknown>; parts: Record<string, Op[]> };

describe('pose parity with src/rig.py', () => {
  for (const [i, f] of (poses as unknown as Fixture[]).entries()) {
    const s = f.state;
    it(`#${i} ${s.view} phase=${s.phase} amp=${s.amp} crouch=${s.crouch}`, () => {
      const got = partOps(s);
      expect(Object.keys(got).sort()).toEqual(Object.keys(f.parts).sort());
      for (const [part, ops] of Object.entries(f.parts)) {
        const g = got[part];
        expect(g.map(o => o[0]), part).toEqual(ops.map(o => o[0]));
        g.forEach((o, k) => o.slice(1).forEach((v, j) =>
          expect(v as number, `${part} op ${k}`).toBeCloseTo(ops[k][j + 1] as number, 9)));
      }
    });
  }
});

describe('opsMatrix composes like a CSS transform list', () => {
  it('translate then rotate rotates about the translated origin', () => {
    const [x, y] = apply(opsMatrix([['t', 10, 0], ['r', 90]]), 5, 0);
    expect(x).toBeCloseTo(10); expect(y).toBeCloseTo(5);
  });
  it('rotate then translate moves along the rotated axis', () => {
    const [x, y] = apply(opsMatrix([['r', 90], ['t', 10, 0]]), 0, 0);
    expect(x).toBeCloseTo(0); expect(y).toBeCloseTo(10);
  });
  it('scale applies in the local frame', () => {
    const [x, y] = apply(opsMatrix([['t', 1, 2], ['s', 2, 3]]), 1, 1);
    expect(x).toBeCloseTo(3); expect(y).toBeCloseTo(5);
  });
});
