import { describe, it, expect } from 'vitest';
import { PAGES, filled, complete, claim, totals } from '../src/book';
import { freshBiz, see } from '../src/business';
import { SHELL_KINDS } from '../src/world/beach';
import { icon } from '../src/world/icons';

describe('sticker book', () => {
  it('a new game has an empty book; every page has stickers and a reward', () => {
    const b = freshBiz();
    expect(totals(b).got).toBe(0);
    expect(totals(b).all).toBeGreaterThan(50);
    for (const p of PAGES) { expect(p.entries.length).toBeGreaterThan(3); expect(p.reward).toBeGreaterThan(0); expect(new Set(p.entries.map(e => e.id)).size).toBe(p.entries.length); }
  });
  it('things sold or used up still count (the seen record)', () => {
    const b = freshBiz(); see(b, 'find', 'radio'); see(b, 'bake', 'cookie');
    expect(filled(b, PAGES.find(p => p.id === 'treasures')!)).toBe(1);
    expect(filled(b, PAGES.find(p => p.id === 'made')!)).toBe(1);
  });
  it('a full page pays its reward once', () => {
    const b = freshBiz(), beach = PAGES.find(p => p.id === 'beach')!;
    expect(claim(b, 'beach')).toBe(0);
    b.found = SHELL_KINDS.map(k => k.id); for (const e of beach.entries) if (!e.has(b)) see(b, 'find', e.id);
    expect(complete(b, beach)).toBe(true);
    expect(claim(b, 'beach')).toBe(beach.reward);
    expect(claim(b, 'beach')).toBe(0);
  });
  it('photos count their stars; belts fill in up to the one earned', () => {
    const b = freshBiz(); b.photos.fox = 2; b.belt = 2;
    expect(PAGES.find(p => p.id === 'animals')!.entries.find(e => e.id === 'fox')!.has(b)).toBe(2);
    expect(filled(b, PAGES.find(p => p.id === 'dojo')!)).toBe(3);
  });
  it('every sticker has drawn art (no unknown icon boxes)', () => {
    const unknown = icon('no-such-icon', 32).bounds;
    for (const p of PAGES) for (const e of p.entries) if (e.art[0] === 'icon') {
      const b = icon(e.art[1], 32).bounds;
      expect(b.width === unknown.width && b.height === unknown.height, `${p.id}/${e.id}: ${e.art[1]}`).toBe(false);
    }
  });
});

import { PAGES as ALL_PAGES } from '../src/book';
import { it as it2, expect as expect2 } from 'vitest';
it2('sticker ids never have a colon in them (keys are page:sticker)', () => { for (const p of ALL_PAGES) for (const e of p.entries) expect2(e.id.includes(':'), `${p.id}/${e.id}`).toBe(false); });
