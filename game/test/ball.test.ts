import { describe, it, expect } from 'vitest';
import { kick, roll, kickoff, BALL } from '../src/world/ball';
import { GOALS, GOAL_MOUTH, SOLIDS, WORLD } from '../src/world/map';

const run = (b: ReturnType<typeof kickoff>, secs: number, solids = SOLIDS) => {
  let g = 0; for (let t = 0; t < secs && !g; t += 1 / 60) g = roll(b, 1 / 60, solids, WORLD); return g;
};

describe('soccer ball', () => {
  it('a kick sends it away from the kicker, harder for a faster kicker', () => {
    const a = kickoff(), b = kickoff();
    expect(kick(a, a.x - 20, a.y, 16, 100)).toBe(true);
    expect(kick(b, b.x - 20, b.y, 16, 400)).toBe(true);
    expect(a.vx).toBeGreaterThan(0); expect(Math.abs(a.vy)).toBeLessThan(1e-9);
    expect(b.vx).toBeGreaterThan(a.vx);
  });
  it("doesn't kick from out of reach", () => {
    const a = kickoff(); expect(kick(a, a.x - 200, a.y, 16, 300)).toBe(false);
  });
  it('rolls to a stop', () => {
    const a = kickoff(); kick(a, a.x - 20, a.y, 16, 0);
    run(a, 8); expect(a.vx).toBe(0);
  });
  it('bounces off a wall', () => {
    const wall = [{ x: 1000, y: 0, w: 40, d: 5000 }];
    const a = { x: 900, y: 500, vx: 400, vy: 0, z: 0, vz: 0 };
    run(a, 1, wall);
    expect(a.vx).toBeLessThan(0); expect(a.x).toBeLessThan(1000 - BALL.r);
  });
  it('scores between the posts, not wide of them', () => {
    const g = GOALS[1];
    const inGoal = { x: g.x - 60, y: g.y, vx: 600, vy: 0, z: 0, vz: 0 };
    expect(run(inGoal, 2)).toBe(1);
    const wide = { x: g.x - 60, y: g.y + GOAL_MOUTH, vx: 600, vy: 0, z: 0, vz: 0 };
    expect(run(wide, 2)).toBe(0);
  });
});
