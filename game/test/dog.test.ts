import { describe, it, expect } from 'vitest';
import { DOG, freshDog, stepDog, fetch, mouthOf } from '../src/dog';

const free = (x: number, y: number, dx: number, dy: number): [number, number] => [x + dx, y + dy];

describe('Biscuit the dog', () => {
  it('keeps up with Nico and heels just beside him', () => {
    const d = freshDog(0, 0), me = { x: 0, y: 0 };
    for (let t = 0; t < 10; t += 1 / 30) { me.x += 270 / 30; stepDog(d, 1 / 30, me, true, { x: -999, y: -999 }, free); }
    expect(Math.hypot(me.x - d.x, me.y - d.y)).toBeLessThan(DOG.heel + 60);
  });
  it('sits when Nico stops, then lies down', () => {
    const d = freshDog(-70, 8), me = { x: 0, y: 0 };
    for (let t = 0; t < 2; t += 0.05) stepDog(d, 0.05, me, false, { x: 999, y: 999 }, free);
    expect(d.mode).toBe('sit');
    for (let t = 0; t < DOG.lie; t += 0.05) stepDog(d, 0.05, me, false, { x: 999, y: 999 }, free);
    expect(d.mode).toBe('lie');
  });
  it('fetches a ball kicked near it and drops it at Nico\'s feet', () => {
    const d = freshDog(-70, 8), me = { x: 0, y: 0 }, ball = { x: 300, y: 40 };
    expect(fetch(d, ball)).toBe(true);
    const evs: string[] = [];
    for (let t = 0; t < 10 && d.mode !== 'follow' || t === 0; t += 1 / 30) {
      const ev = stepDog(d, 1 / 30, me, false, ball, free); if (ev) evs.push(ev);
      if (d.mode === 'bring') [ball.x, ball.y] = mouthOf(d);
    }
    expect(evs).toEqual(['got', 'drop']);
    expect(Math.hypot(ball.x - me.x, ball.y - me.y)).toBeLessThan(120);
  });
  it("ignores a ball kicked far away, and pops back beside Nico if it's left far behind", () => {
    const d = freshDog(0, 0);
    expect(fetch(d, { x: DOG.fetchRange + 50, y: 0 })).toBe(false);
    expect(stepDog(d, 0.1, { x: DOG.lost + 100, y: 0 }, true, { x: 0, y: 0 }, free)).toBe('lost');
    expect(Math.hypot(d.x - DOG.lost - 100, d.y)).toBeLessThan(100);
  });
});
