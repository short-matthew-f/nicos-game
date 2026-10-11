import { describe, it, expect } from 'vitest';
import { Table, type Hit } from '../src/pinball/physics';
import { Game, RULES, SCORE } from '../src/pinball/rules';
import { T, FLIPPERS, SAUCER } from '../src/pinball/table';

const inside = (x: number, y: number) => x > 24 - 2 && x < 576 + 2 && y > 0 && Math.hypot(x - 300, Math.min(0, y - 290)) < 276 + 2;
const run = (t: Table, secs: number, each?: (k: number) => void, dt = 1 / 60) => {
  const hits: Hit[] = [];
  for (let k = 0; k < secs / dt; k++) { each?.(k); t.step(dt, hits); for (const b of t.balls) expect(inside(b.x, b.y), `ball at ${b.x.toFixed(0)},${b.y.toFixed(0)} k=${k}`).toBe(true); }
  return hits;
};

describe('pinball physics', () => {
  it('a ball waits on the plunger until it is launched', () => {
    const t = new Table(); t.load(); run(t, 2);
    expect(t.balls[0].y).toBeCloseTo(T.plunger.y - T.ball, 0);
  });
  it('a full launch goes up the lane, round the arch and out into the playfield', () => {
    const t = new Table(); const b = t.load();
    expect(t.launch(1)).toBe(true);
    let left = Infinity; run(t, 1.5, () => { left = Math.min(left, b.x); });
    expect(b.inLane).toBe(false);
    expect(left).toBeLessThan(400);
  });
  it('even the softest launch gets out of the lane', () => {
    const t = new Table(); const b = t.load(); t.launch(0); run(t, 1.5);
    expect(b.inLane).toBe(false);
  });
  it('a ball resting on a raised flipper stays put (a cradle)', () => {
    const t = new Table(); const f = t.flippers[0]; f.pressed = true; run(t, 0.2);
    const b = t.load(); b.inLane = false; Object.assign(b, { x: 215, y: 860, vx: 0, vy: 0 });
    run(t, 2);
    expect(t.balls).toHaveLength(1);
    expect(b.y).toBeLessThan(930);
  });
  for (const at of [215, 235, 250]) it(`a flip fires a ball rolling down the flipper up the table (hit at x=${at})`, () => {
    const t = new Table(); const b = t.load(); b.inLane = false; Object.assign(b, { x: at, y: 880, vx: 0, vy: 0 });
    for (let k = 0; k < 60 && b.y < 905 + (at - 190) * 0.4; k++) run(t, 1 / 60);   // (flip once it's down on the flipper)
    t.flippers[0].pressed = true;
    let top = Infinity; run(t, 0.7, () => { top = Math.min(top, b.y); });
    expect(top).toBeLessThan(500);
  });
  it('a ball left alone drains between the flippers, and never escapes the table', () => {
    const t = new Table(); t.load(); t.launch(0.7);
    const hits = run(t, 60);
    expect(hits.some(h => h.kind === 'drain')).toBe(true);
    expect(hits.some(h => h.kind === 'bumper' || h.kind === 'sling' || h.kind === 'wall')).toBe(true);
  });
  it('random flipping for minutes: the ball always stays on the table (nothing tunnels)', () => {
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let game = 0; game < 4; game++) {
      const t = new Table();
      run(t, 90, k => {
        if (!t.balls.length) { t.load(); }
        if (t.balls.some(b => b.inLane)) t.launch(rnd());
        if (k % 7 === 0) for (const f of t.flippers) f.pressed = rnd() < 0.3;
      });
    }
  });
});

describe('pinball rules', () => {
  const launched = () => { const g = new Game(); g.start(); g.launch(1); for (let i = 0; i < 60; i++) g.update(1 / 60); return g; };
  it('three balls, then game over (with a new high score)', () => {
    const g = new Game(0); g.start();
    for (let n = 0; n < RULES.balls + 3 && !g.over; n++) { g.save = 0; (g as unknown as { saveStarted: boolean }).saveStarted = true; g.table.balls = []; g.score += 10; (g as unknown as { drained(): void }).drained(); }
    expect(g.over).toBe(true);
    expect(g.high).toBe(g.score);
  });
  it('lighting N I C O raises the bonus multiplier; the flipper buttons move the lit lanes along', () => {
    const g = launched();
    g.lanes = [true, false, false, false]; g.flip('R', true); g.flip('R', false);
    expect(g.lanes).toEqual([false, true, false, false]);
    for (const i of [0, 2, 3]) (g as unknown as { score1(h: Hit): void }).score1({ kind: 'lane', i });
    expect(g.mult).toBe(2);
    expect(g.lanes.every(l => !l)).toBe(true);
    expect(g.score).toBeGreaterThanOrEqual(SCORE.nico);
  });
  it('knocking down all three targets lights the lock; the saucer then starts multiball', () => {
    const g = launched(); const s1 = (h: Hit) => (g as unknown as { score1(h: Hit): void }).score1(h);
    g.table.targets = [false, false, false]; s1({ kind: 'target', i: 2 });
    expect(g.lockLit).toBe(true);
    const n = g.table.balls.length; s1({ kind: 'saucer' });
    expect(g.multiball).toBe(true);
    expect(g.table.balls.length).toBe(n + 1);
  });
  it('a ball lost straight away is saved', () => {
    const g = launched(); expect(g.save).toBeGreaterThan(0);
    g.table.balls[0].y = T.drain + 5; g.update(1 / 60);
    expect(g.ball).toBe(1);
    expect(g.table.balls.length).toBe(1);
  });
  it('the saucer holds the ball, then kicks it out', () => {
    const t = new Table(); const b = t.load(); b.inLane = false; Object.assign(b, { x: SAUCER.c[0], y: SAUCER.c[1] - 30, vx: 0, vy: 100 });
    const hits = run(t, 2.5);
    expect(hits.map(h => h.kind)).toContain('saucer');
    expect(hits.map(h => h.kind)).toContain('eject');
  });
  it('flippers are mirror images', () => {
    expect(FLIPPERS[0].pivot[0] + FLIPPERS[1].pivot[0]).toBe(556);
  });
});

describe('pinball, played by a robot', () => {
  for (const seed0 of [11, 23, 42]) it(`never gets stuck anywhere, with one ball or two (seed ${seed0})`, () => {
    let seed = seed0; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const t = new Table(); const dt = 1 / 60, kinds = new Set<string>(); const stuck: string[] = [];
    const still = new Map<number, number>();
    for (let k = 0; k < 60 * 180; k++) {
      if (t.balls.length < (k > 60 * 90 ? 2 : 1)) t.load();   // (the second half: multiball)
      if (t.balls.some(b => b.inLane && b.vy === 0)) t.launch(0.4 + rnd() * 0.6);
      for (const f of t.flippers) { const near = t.balls.some(b => b.y > 860 && Math.abs(b.x - (f.f.side === 'L' ? 225 : 331)) < 60); f.pressed = near ? rnd() < 0.5 || (f.pressed && rnd() < 0.9) : false; }
      const hits: Hit[] = []; t.step(dt, hits); for (const h of hits) kinds.add(h.kind);
      for (const b of t.balls) {
        expect(inside(b.x, b.y), `ball at ${b.x.toFixed(0)},${b.y.toFixed(0)}`).toBe(true);
        const s = !b.inLane && b.held <= 0 && Math.hypot(b.vx, b.vy) < 20 && b.y < 860 ? (still.get(b.id) ?? 0) + dt : 0;
        still.set(b.id, s); if (s > 2) { stuck.push(`${b.x.toFixed(0)},${b.y.toFixed(0)}`); b.vy = -400; still.set(b.id, 0); }
      }
    }
    expect(stuck).toEqual([]);
    for (const k of ['bumper', 'sling', 'flipper', 'lane']) expect(kinds.has(k), k).toBe(true);
  });
});
