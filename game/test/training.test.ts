import { describe, it, expect } from 'vitest';
import { training, trainKey, TRAINING, BELTS } from '../src/karate';

describe('training before each belt test', () => {
  it('your first (white) belt: no training needed', () => { expect(training({}, -1).ready).toBe(true); });
  it('then a few sessions before each test, more as you go up', () => {
    expect(training({}, 0).ready).toBe(false); expect(training({}, 0).need).toBe(TRAINING.need[1]);
    expect(TRAINING.need[6]).toBeGreaterThan(TRAINING.need[1]); expect(TRAINING.need.length).toBe(BELTS.length);
    const s = { [trainKey(1, 'spar')]: 1, [trainKey(1, 'rhythm')]: 1 };
    expect(training(s, 0)).toMatchObject({ done: 2, ready: true });
  });
  it("from three sessions up, they can't all be the same thing", () => {
    const one = { [trainKey(2, 'spar')]: 9 };
    expect(training(one, 1)).toMatchObject({ need: 3, done: 2, ready: false, oneKindOnly: true });
    expect(training({ ...one, [trainKey(2, 'pads')]: 1 }, 1).ready).toBe(true);
  });
  it('training counts toward the belt you were working on (a new belt starts fresh)', () => {
    const s = { [trainKey(1, 'spar')]: 2 }; expect(training(s, 0).ready).toBe(true); expect(training(s, 1).done).toBe(0);
  });
  it('a black belt has nothing left to test for', () => { expect(training({}, BELTS.length - 1).ready).toBe(true); });
});
