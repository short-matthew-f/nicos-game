import { describe, it, expect } from 'vitest';
import { Blasters, BL, type Key } from '../src/arcade/blasters';
import { Bricks, BR } from '../src/arcade/bricks';
import { Frog, FR } from '../src/arcade/frog';
import { CABINETS } from '../src/arcade/games';

const none = new Set<Key>();
const run = (g: { update(dt: number, h: Set<Key>): string[] }, secs: number, held = none, each?: (k: number) => void) => {
  const ev: string[] = []; for (let k = 0; k < secs * 60; k++) { each?.(k); ev.push(...g.update(1 / 60, held)); } return ev;
};

describe('Space Blasters', () => {
  it('the blaster slides and stays on the screen', () => {
    const g = new Blasters(() => 0.99); run(g, 3, new Set<Key>(['left']));
    expect(g.x).toBeCloseTo(BL.shipW, 0);
  });
  it('a shot straight up hits an alien and scores', () => {
    const g = new Blasters(() => 0.99); const a = g.alive.find(q => q.r === BL.rows - 1)!; g.x = g.at(a).x;
    g.press('fire'); const ev = run(g, 0.6);
    expect(ev).toContain('boom'); expect(g.score).toBe(10); expect(g.alive.length).toBe(BL.cols * BL.rows - 1);
  });
  it('the aliens march, turn at the edge and step down', () => {
    const g = new Blasters(() => 0.99), y0 = g.oy; run(g, 20);
    expect(g.oy).toBeGreaterThan(y0);
  });
  it('clearing the wave brings the next, quicker', () => {
    const g = new Blasters(() => 0.99); const i0 = g.interval;
    for (const a of g.aliens.slice(1)) a.alive = false; const last = g.aliens[0];
    const ev = run(g, 4, new Set<Key>(['fire']), () => { if (last.alive) g.x = g.at(last).x + g.dir * (BL.step / g.interval) * ((BL.shipY - g.at(last).y) / BL.shot); }); expect(ev).toContain('level'); expect(g.wave).toBe(2); expect(g.interval).toBeLessThan(i0);
  });
  it('bombs cost a life; three and it\'s over', () => {
    const g = new Blasters(() => 0.99);
    for (let i = 0; i < 3; i++) { g.inv = 0; g.bombs.push({ x: g.x, y: BL.shipY - 4 }); run(g, 0.1); }
    expect(g.lives).toBe(0); expect(g.over).toBe(true);
  });
  it('holding fire keeps firing (gently)', () => {
    const g = new Blasters(() => 0.99); const ev = run(g, 2, new Set<Key>(['fire']));
    expect(ev.filter(e => e === 'shoot').length).toBeGreaterThan(3);
  });
});

describe('Brick Breaker', () => {
  it('the ball waits on the paddle until launched, then knocks out bricks', () => {
    const g = new Bricks(() => 0.5); run(g, 1); expect(g.ball.stuck).toBe(true);
    g.press('fire'); const ev = run(g, 4, none, () => { g.pad = g.ball.x; });   // (a perfect player)
    expect(ev).toContain('brick'); expect(g.score).toBeGreaterThan(0); expect(g.lives).toBe(BR.lives);
  });
  it('a perfect player clears the wall and moves on', () => {
    const g = new Bricks(() => 0.37); g.press('fire');
    const ev = run(g, 300, none, k => { g.pad = g.ball.x + Math.sin(k * 0.013) * 26; if (g.ball.stuck) g.press('fire'); });
    expect(ev).toContain('level');
  });
  it('missing the ball costs one; three and it\'s over', () => {
    const g = new Bricks(() => 0.5);
    for (let i = 0; i < 3; i++) { g.press('fire'); run(g, 6, none, () => { g.pad = g.ball.x < 210 ? BR.w - 40 : 40; }); }
    expect(g.over).toBe(true);
  });
  it('the ball never leaves the screen at the sides or top', () => {
    const g = new Bricks(() => 0.2); g.press('fire');
    run(g, 60, none, () => { g.pad = g.ball.x; if (g.ball.stuck) g.press('fire'); expect(g.ball.x).toBeGreaterThanOrEqual(0); expect(g.ball.x).toBeLessThanOrEqual(BR.w); expect(g.ball.y).toBeGreaterThanOrEqual(0); });
  });
  it('dragging moves the paddle toward the finger', () => {
    const g = new Bricks(); g.aim(60); run(g, 1); expect(g.pad).toBeCloseTo(60, 0);
  });
});

describe('Frog Hop', () => {
  it('one hop a press, and points for getting further', () => {
    const g = new Frog(() => 0.5); const r0 = g.row; g.press('up'); g.press('up'); expect(g.row).toBe(r0 - 1);
    g.update(0.2); expect(g.score).toBe(10);
  });
  it('a car squishes him', () => {
    const g = new Frog(() => 0.5); const l = g.lane(8)!; g.row = 8; l.items[0] = g.x - 10;
    expect(g.update(0.001)).toContain('squish'); expect(g.lives).toBe(FR.lives - 1);
  });
  it('in the river without a log: splash. On a log: he rides it', () => {
    const g = new Frog(() => 0.5); const l = g.lane(3)!; g.row = 3; l.items = [g.x - 40]; const x0 = g.x;
    expect(g.update(0.1)).not.toContain('splash'); expect(g.x).toBeGreaterThan(x0);
    const h = new Frog(() => 0.5); h.row = 3; h.lane(3)!.items = [-500]; expect(h.update(0.01)).toContain('splash');
  });
  it('a lily pad: home, +50; all five: next level', () => {
    const g = new Frog(() => 0.5);
    for (let i = 0; i < FR.slots.length; i++) { g.row = 0; g.x = FR.slots[i] * FR.cell + FR.cell / 2; const ev = g.update(0.001); expect(ev).toContain('home'); }
    expect(g.level).toBe(2);
  });
  it('three lives', () => {
    const g = new Frog(() => 0.5);
    for (let i = 0; i < 3; i++) { g.row = 0; g.x = 2 * FR.cell + FR.cell / 2; g.update(0.001); g.update(1); }
    expect(g.over).toBe(true);
  });
});

describe('the cabinets', () => {
  it('every cabinet makes a game that runs and draws without throwing', () => {
    const calls: string[] = [];
    const ctx = new Proxy({}, { get: (_t, k) => (typeof k === 'string' && ['fillRect', 'beginPath', 'arc', 'fill', 'lineTo'].includes(k) ? () => calls.push(k) : undefined), set: () => true }) as unknown as CanvasRenderingContext2D;
    for (const c of CABINETS) { const m = c.make(); for (let i = 0; i < 120; i++) { m.update(1 / 60, none); } m.draw(ctx, 1); expect(m.over).toBe(false); }
    expect(calls.length).toBeGreaterThan(100);
  });
});
