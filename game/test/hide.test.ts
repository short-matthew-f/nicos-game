import { describe, it, expect } from 'vitest';
import { SPOTS, HideSeek, HIDE, warmth } from '../src/hide';
import { SOLIDS, WORLD } from '../src/world/map';
import { freeAt } from '../src/player';

describe('hide-and-seek with Primo', () => {
  it('every hiding spot is somewhere you can stand (and reach from the start)', () => {
    for (const s of SPOTS) { expect(freeAt(s.x, s.y, SOLIDS, WORLD), s.id).toBe(true); }
    expect(freeAt(...HIDE.start, SOLIDS, WORLD)).toBe(true);
  });
  it('you seek: count to ten, then walk up to his spot to find him; he giggles while you look', () => {
    const g = new HideSeek('seek', () => 0.5, 3); const ev: string[] = [];
    for (let t = 0; t < HIDE.count + 0.05; t += 0.05) ev.push(...g.update(0.05, 0, 0));
    expect(ev).toContain('go'); expect(ev.filter(e => e === 'tick').length).toBe(HIDE.count - 1);
    for (let t = 0; t < 15; t += 0.05) ev.push(...g.update(0.05, 0, 0));
    expect(ev).toContain('giggle'); expect(g.phase).toBe('play');
    g.update(0.05, SPOTS[3].x + 40, SPOTS[3].y + 60); expect(g.result).toBe('found'); expect(g.won).toBe(true);
  });
  it("you seek: if you don't find him, he gives up hiding", () => {
    const g = new HideSeek('seek', () => 0.5, 0); for (let t = 0; t < HIDE.count + HIDE.seek + 1; t += 0.1) g.update(0.1, 0, 0);
    expect(g.result).toBe('gaveup');
  });
  it('you hide: out in the open, he sees you', () => {
    const g = new HideSeek('hide', () => 0.5); let t = 0;
    for (; t < HIDE.count + 0.1; t += 0.05) g.update(0.05, 0, 0);
    for (; t < 60 && !g.result; t += 0.05) g.update(0.05, g.primo.x + 100, g.primo.y);
    expect(g.result).toBe('caught');
  });
  it('you hide in a spot: he checks them one by one and finds you when he gets to yours', () => {
    const g = new HideSeek('hide', () => 0.3); const mine = g.order[2];
    for (let t = 0; t < 80 && !g.result; t += 0.05) g.update(0.05, mine.x, mine.y);
    expect(g.result).toBe('caught'); expect(g.checked.length).toBe(2);
  });
  it('...and if his time runs out first, you win', () => {
    const g = new HideSeek('hide', () => 0.3); const mine = g.order[g.order.length - 1];
    const saved = HIDE.hide; (HIDE as { hide: number }).hide = 12;
    for (let t = 0; t < 80 && !g.result; t += 0.05) g.update(0.05, mine.x, mine.y);
    (HIDE as { hide: number }).hide = saved;
    expect(g.result).toBe('safe'); expect(g.won).toBe(true);
  });
  it('hot, warm, cold', () => { expect(warmth(100)).toBe('hot'); expect(warmth(400)).toBe('warm'); expect(warmth(2000)).toBe('cold'); });
});
