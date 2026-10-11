import { describe, it, expect } from 'vitest';
import { Snake, GRID, SNAKE } from '../src/arcade/snake';

describe('snake (the arcade cabinet in Alpha\'s Retro Games)', () => {
  it('moves one cell per tick and eats to grow', () => {
    const s = new Snake(() => 0); s.food = [7, s.body[0][1]];
    expect(s.step()).toEqual(['eat']);
    expect(s.body.length).toBe(4); expect(s.score).toBe(1);
    s.step(); expect(s.body.length).toBe(4);
  });
  it("never turns straight back on itself, and remembers a quick double turn", () => {
    const s = new Snake(() => 0.5); s.food = [0, 0];
    s.turn('left'); s.step(); expect(s.dir).toBe('right');
    s.turn('up'); s.turn('left'); s.step(); expect(s.dir).toBe('up'); s.step(); expect(s.dir).toBe('left');
  });
  it('hitting the wall ends it', () => {
    const s = new Snake(() => 0.5); s.food = [0, 0];
    let ev: string[] = [];
    for (let i = 0; i < GRID.w && !s.over; i++) ev = s.step();
    expect(s.over).toBe(true); expect(ev).toEqual(['die']);
  });
  it('running into itself ends it', () => {
    const s = new Snake(() => 0.5); s.food = [0, 0];
    s.body = [[5, 5], [4, 5], [3, 5], [2, 5], [1, 5]];
    s.turn('up'); s.step(); s.turn('left'); s.step(); s.turn('down'); s.step();
    expect(s.over).toBe(true);
  });
  it('the tail cell is free to move into (it moves away first)', () => {
    const s = new Snake(() => 0.5); s.food = [0, 0];
    s.body = [[5, 5], [5, 6], [4, 6], [4, 5]]; s.dir = 'left';
    s.step(); expect(s.over).toBe(false);
  });
  it('speeds up as it eats, to a limit', () => {
    const s = new Snake(); const a = s.interval; s.eaten = 10; expect(s.interval).toBeLessThan(a); s.eaten = 1000; expect(s.interval).toBe(SNAKE.fastest);
  });
  it('a gold dot turns up after a few, is worth five, and goes away if you dawdle', () => {
    const s = new Snake(() => 0);
    for (let i = 0; i < SNAKE.gold.every[0]; i++) { s.food = [s.body[0][0] + 1, s.body[0][1]]; if (s.body[0][0] + 1 >= GRID.w) break; s.step(); }
    expect(s.gold).not.toBeNull();
    s.gold = [s.body[0][0] + 1, s.body[0][1]]; s.food = [0, 0];
    const before = s.score; expect(s.step()).toContain('gold'); expect(s.score).toBe(before + SNAKE.gold.points);
    s.gold = [0, 1]; s.goldT = 0.1; expect(s.update(0.05)).not.toContain('goldgone'); s.update(0.06); expect(s.gold).toBeNull();
  });
  it('food never lands on the snake', () => {
    for (let i = 0; i < 50; i++) { const s = new Snake(); expect(s.body.some(c => c[0] === s.food[0] && c[1] === s.food[1])).toBe(false); }
  });
});
