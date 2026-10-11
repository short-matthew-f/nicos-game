import { describe, it, expect } from 'vitest';
import { makeSpud, peelStroke, dig, progress, isClean, inSpud, Shift, PEEL } from '../src/peel';

/** Scrub the whole potato, row by row. */
const scrub = (s: ReturnType<typeof makeSpud>, step = 20) => { for (let y = -s.ry * 1.2; y <= s.ry * 1.2; y += step) peelStroke(s, -s.rx * 1.2, y, s.rx * 1.2, y); };

describe('peeling potatoes for Yarosh', () => {
  it('a potato is lumpy but solid, with a few eyes on it', () => {
    for (let i = 0; i < 20; i++) {
      const s = makeSpud(); expect(s.total).toBeGreaterThan(400);
      expect(s.eyes.length).toBeGreaterThanOrEqual(PEEL.eyes[0]); expect(s.eyes.length).toBeLessThanOrEqual(PEEL.eyes[1]);
      for (const e of s.eyes) expect(inSpud(s, e.x, e.y)).toBe(true);
    }
  });
  it('a stroke peels a strip; going over it again peels nothing more', () => {
    const s = makeSpud(() => 0.5); const n = peelStroke(s, -100, 0, 100, 0);
    expect(n).toBeGreaterThan(40); expect(peelStroke(s, -100, 0, 100, 0)).toBe(0);
    expect(progress(s)).toBeGreaterThan(0.05); expect(progress(s)).toBeLessThan(0.3);
  });
  it('strokes off the potato peel nothing', () => {
    const s = makeSpud(() => 0.5); expect(peelStroke(s, 300, 300, 400, 300)).toBe(0);
  });
  it('clean means peeled all over AND every eye dug out', () => {
    const s = makeSpud(() => 0.3); scrub(s);
    expect(progress(s)).toBeGreaterThan(0.97); expect(isClean(s)).toBe(false);
    expect(dig(s, 400, 400)).toBeNull();
    for (const e of s.eyes) expect(dig(s, e.x + 5, e.y - 5)).not.toBeNull();
    expect(isClean(s)).toBe(true);
  });
  it('a shift: peel one, it goes in the pot, the next rolls in; a minute and done', () => {
    const sh = new Shift(); const first = sh.spud; scrub(first); for (const e of first.eyes) sh.tap(e.x, e.y);
    expect(sh.update(0.1)).toContain('peeled'); expect(sh.done).toBe(1);
    expect(sh.stroke(-50, 0, 50, 0)).toBe(0);   // (while it's on its way to the pot)
    const ev = sh.update(PEEL.next); expect(ev).toContain('next'); expect(sh.spud).not.toBe(first);
    const end = sh.update(PEEL.time); expect(end).toContain('time'); expect(sh.over).toBe(true);
  });
});
