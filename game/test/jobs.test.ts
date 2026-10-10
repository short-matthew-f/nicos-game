import { describe, it, expect } from 'vitest';
import { JOBS, start, current, advance, target } from '../src/jobs';
import { TOWNSFOLK } from '../src/townsfolk';
import { SOLIDS, WORLD } from '../src/world/map';
import { freeAt } from '../src/player';

describe('odd jobs', () => {
  it('every job is offered by someone in town and pays something', () => {
    for (const j of JOBS) {
      expect(TOWNSFOLK.some(t => t.who === j.giver), j.id).toBe(true);
      expect(j.reward).toBeGreaterThan(0);
    }
  });
  it('every place a job sends you is somewhere Nico can stand', () => {
    for (const j of JOBS) for (const s of j.steps) if (s.kind === 'go') {
      const spots = Array.isArray(s.at[0]) ? s.at as [number, number][] : [s.at as [number, number]];
      for (const [x, y] of spots) expect(freeAt(x, y, SOLIDS, WORLD), `${j.id} ${s.label} at ${x},${y}`).toBe(true);
    }
  });
  it('steps go in order and the last one finishes the job', () => {
    const j = JOBS.find(j => j.id === 'water')!, a = start(j);
    expect(current(a).kind).toBe('go');
    expect(target(a, [0, 0])).toEqual([130, 1915]);
    expect(advance(a)).toBe(false); expect(advance(a)).toBe(false); expect(advance(a)).toBe(false);
    expect(current(a).kind).toBe('return');
    expect(target(a, [5, 6])).toEqual([5, 6]);   // back to whoever asked
    expect(advance(a)).toBe(true);
  });
  it('a step with several possible places picks one when the job starts', () => {
    const j = JOBS.find(j => j.id === 'cat')!;
    const a = start(j, () => 0.99), b = start(j, () => 0);
    expect(a.at[0]).not.toEqual(b.at[0]);
  });
});
