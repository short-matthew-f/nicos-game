import { describe, it, expect } from 'vitest';
import { BELTS, combo, check, comboLength, callTime, nextBelt, isBlack } from '../src/karate';

describe('karate', () => {
  it('eight belts, white to black; the first class earns the white belt', () => {
    expect(BELTS.map(b => b.id)).toEqual(['white', 'yellow', 'orange', 'green', 'blue', 'purple', 'brown', 'black']);
    expect(nextBelt(-1)).toBe(0); expect(nextBelt(6)).toBe(7); expect(nextBelt(7)).toBe(7);
    expect(isBlack(7)).toBe(true); expect(isBlack(6)).toBe(false);
  });
  it('each belt asks for a longer combination, called a little faster', () => {
    for (let b = 1; b < BELTS.length; b++) { expect(comboLength(b)).toBeGreaterThan(comboLength(b - 1)); expect(callTime(b)).toBeLessThanOrEqual(callTime(b - 1)); }
    expect(comboLength(0)).toBe(3);
    expect(callTime(7)).toBeGreaterThanOrEqual(0.42);
  });
  it('combinations are the right length, never the same move three times running, no kiai before orange', () => {
    for (let b = 0; b < BELTS.length; b++) for (let n = 0; n < 50; n++) {
      const c = combo(b);
      expect(c).toHaveLength(comboLength(b));
      for (let i = 2; i < c.length; i++) expect(c[i] === c[i - 1] && c[i] === c[i - 2]).toBe(false);
      if (b < 2) expect(c).not.toContain('kiai');
    }
  });
  it('checking the moves: keep going, all done, or a miss', () => {
    const want = combo(3);
    expect(check(want, [])).toBe('ok');
    expect(check(want, want.slice(0, 2))).toBe('ok');
    expect(check(want, want)).toBe('done');
    expect(check(want, [want[0] === 'punch' ? 'kick' : 'punch'])).toBe('miss');
  });
});
