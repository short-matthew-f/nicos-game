import { describe, it, expect } from 'vitest';
import { stepGait, GAIT_SCALE, WALK_SPEED } from '../src/player';
import { neutral, partOps, opsMatrix, apply } from '../src/rig/pose';

/** Walk right at `speed`; the planted foot is the one moving backward against the body.
 * Return its average ground speed in world px/s (0 = no sliding), after the stride settles. */
function slip(speed: number) {
  const st = neutral('side'); let x = 0, sum = 0, n = 0;
  let prev: number[] | null = null;
  for (let t = 0; t < 6; t += 1 / 120) {
    stepGait(st, speed, 0, 1 / 120); x += speed / 120;
    const ops = partOps(st);
    const wx = ['fs', 'bs'].map(f => x + apply(opsMatrix(ops[f]), 0, 0)[0] * GAIT_SCALE);
    if (prev && t > 1) { sum += Math.min(...wx.map((v, i) => Math.abs(v - prev![i]) * 120)); n++; }
    prev = wx;
  }
  return sum / n;
}

describe('walk cycle', () => {
  it("the planted foot doesn't slide at walking, full or boosted speed", () => {
    // a sine leg swing always slips some (~0.35 of the walking speed at best); the old fixed
    // cadence got worse as speed went up (boosted lunch walking, tall grown-ups)
    for (const v of [120, WALK_SPEED, WALK_SPEED * 1.35]) expect(slip(v) / v, `${v} px/s`).toBeLessThan(0.4);
  });
  it('a faster walk is a longer stride and quicker steps', () => {
    const a = neutral('side'), b = neutral('side');
    for (let t = 0; t < 2; t += 1 / 60) { stepGait(a, 120, 0, 1 / 60); stepGait(b, 360, 0, 1 / 60); }
    expect(b.amp).toBeGreaterThan(a.amp);
    expect(b.phase).toBeGreaterThan(a.phase);
  });
  it('stops cleanly', () => {
    const s = neutral('side');
    for (let t = 0; t < 1; t += 1 / 60) stepGait(s, 270, 0, 1 / 60);
    for (let t = 0; t < 1; t += 1 / 60) stepGait(s, 0, 0, 1 / 60);
    expect(s.amp).toBe(0); expect(s.phase).toBe(0);
  });
});
