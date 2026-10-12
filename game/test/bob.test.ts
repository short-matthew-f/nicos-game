import { describe, it, expect } from 'vitest';
import { Bobbing, BOB, height, worth } from '../src/bob';

const run = (g: Bobbing, secs: number) => { const ev: string[] = []; for (let k = 0; k < secs * 60; k++) ev.push(...g.update(1 / 60)); return ev; };
describe('Bobbing for Bakers', () => {
  it('the potatoes drift round and stay in the tub', () => {
    const g = new Bobbing(); run(g, 20);
    for (const s of g.spuds) expect(Math.hypot(s.x, s.y)).toBeLessThanOrEqual(BOB.r - 30 + 0.01);
  });
  it('dunk right over one that has bobbed up: you get it', () => {
    const g = new Bobbing(() => 0.5); const s = g.spuds[0]; s.vx = s.vy = 0;
    g.head = { x: s.x, y: s.y }; g.aim = { ...g.head };
    // wait till it's about to bob up to the top just as the face goes in
    while (height(s, g.t + BOB.bite) < 0.9) g.update(1 / 60);
    expect(g.dunk()).toBe(true); expect(g.dunk()).toBe(false);
    const ev = run(g, BOB.dunk);
    expect(ev.some(e => e === 'catch' || e === 'gold')).toBe(true); expect(g.score).toBe(worth(s)); expect(s.gone).toBeGreaterThan(0);
  });
  it("dunk when it's sunk down: a mouthful of water", () => {
    const g = new Bobbing(() => 0.5); for (const q of g.spuds) { q.vx = q.vy = 0; } const s = g.spuds[0];
    g.head = { x: s.x, y: s.y }; g.aim = { ...g.head };
    while (height(s, g.t + BOB.bite) > -0.9) g.update(1 / 60);
    g.dunk(); const ev = run(g, BOB.dunk);
    expect(ev).toContain('miss'); expect(g.score).toBe(0);
  });
  it('the head follows the finger but stays over the tub', () => {
    const g = new Bobbing(); g.aimAt(1000, 0); run(g, 2); expect(g.head.x).toBeCloseTo(BOB.r - 30, 0);
  });
  it('a caught one comes back; thirty seconds and done', () => {
    const g = new Bobbing(); g.spuds[0].gone = 0.5; run(g, 1); expect(g.spuds[0].gone).toBe(0);
    const ev = run(g, BOB.time); expect(ev).toContain('time'); expect(g.over).toBe(true);
  });
});
