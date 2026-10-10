import { describe, it, expect } from 'vitest';
import { DESIGNS, design, pieceValue, bonusOf, BONUS, SHELL_VALUE, SHOP, make, cantMake, visit, whileAway, emptyTill, visitGap } from '../src/jewelry';
import { freshBiz, PARTS_FOR_SALE, ITEMS, makeUnit } from '../src/business';
import { pickShell, SHELLS, SHELL_KINDS } from '../src/world/beach';
import { migrate, VERSION } from '../src/state';

const seeded = (n: number) => () => (n = (n * 16807) % 2147483647) / 2147483647;
const stocked = () => { const b = freshBiz(); b.shells = { scallop: 10, clam: 10, starfish: 2 }; b.items.twine = 5; return b; };

describe('Bibs and Bobs: making jewelry', () => {
  it('a piece is worth its base, its shells, and any pattern', () => {
    const br = design('bracelet');
    expect(pieceValue(br, ['scallop', 'clam', 'spiral', 'cowrie'])).toBe(br.base + 4);
    expect(bonusOf(['clam', 'clam', 'clam', 'clam'])).toEqual({ label: 'Matching set', amount: BONUS.match });
    expect(bonusOf(['clam', 'starfish', 'clam', 'starfish'])?.label).toBe('Pattern');
    expect(bonusOf(['clam', 'starfish', 'scallop', 'starfish', 'clam'])?.label).toBe('Mirror pattern');
    expect(bonusOf(['clam', 'starfish', 'scallop', 'clam'])).toBeNull();
    expect(pieceValue(br, ['starfish', 'starfish', 'starfish', 'starfish'])).toBe(br.base + 4 * SHELL_VALUE.starfish + BONUS.match);
    for (const k of SHELL_KINDS) expect(SHELL_VALUE[k.id], k.id).toBeGreaterThan(0);
  });
  it('making one uses up the shells and a length of twine, and hangs it on the shelves', () => {
    const b = stocked();
    const p = make(b, 'bracelet', ['scallop', 'starfish', 'scallop', 'starfish'])!;
    expect(p.price).toBe(pieceValue(design('bracelet'), p.shells));
    expect(b.shells).toEqual({ scallop: 8, clam: 10 });   // (none left: gone from the bag)
    expect(b.items.twine).toBe(4); expect(b.shop.rack).toEqual([p]);
  });
  it("won't make one without twine, with shells you don't have, the wrong number, or full shelves", () => {
    const b = stocked();
    expect(make(b, 'bracelet', ['starfish', 'starfish', 'starfish', 'clam'])).toBeNull();   // only 2 starfish
    expect(make(b, 'bracelet', ['clam', 'clam', 'clam'])).toBeNull();
    expect(make(b, 'nope', ['clam'])).toBeNull();
    b.items = {}; expect(cantMake(b, 'bracelet')).toMatch(/twine/); expect(make(b, 'bracelet', ['clam', 'clam', 'clam', 'clam'])).toBeNull();
    b.items.twine = 99; b.shells.clam = 99;
    for (let i = 0; i < SHOP.rack; i++) expect(make(b, 'bracelet', ['clam', 'clam', 'clam', 'clam'])).not.toBeNull();
    expect(cantMake(b, 'bracelet')).toMatch(/full/); expect(make(b, 'bracelet', ['clam', 'clam', 'clam', 'clam'])).toBeNull();
    expect(b.shop.rack.length).toBe(SHOP.rack);
    const few = freshBiz(); few.items.twine = 1; few.shells = { clam: 3 }; expect(cantMake(few, 'bracelet')).toMatch(/need 4 shells/);
  });
  it('twine is sold at Parts & Tools and never turns up in a storage unit', () => {
    expect(PARTS_FOR_SALE.some(q => q.id === 'twine')).toBe(true);
    expect(ITEMS.find(i => i.id === 'twine')?.kind).toBe('part');
    for (let s = 1; s < 300; s++) expect(makeUnit(s, 'A').contents.some(c => c.id === 'twine'), `seed ${s}`).toBe(false);
  });
});

describe('Bibs and Bobs: selling', () => {
  it('a visitor sometimes buys (the one they looked at), and the money waits in the till', () => {
    const b = stocked(); make(b, 'bracelet', ['clam', 'clam', 'clam', 'clam']); make(b, 'bracelet', ['scallop', 'scallop', 'scallop', 'scallop']);
    expect(visit(b, () => SHOP.buy + 0.01)).toBeNull(); expect(b.shop.rack.length).toBe(2);
    const p = visit(b, () => 0, 1)!;
    expect(p.shells[0]).toBe('scallop'); expect(b.shop.till).toBe(p.price); expect(b.shop.sold).toBe(1);
    expect(emptyTill(b)).toBe(p.price); expect(b.shop.till).toBe(0); expect(emptyTill(b)).toBe(0);
    b.shop.rack = []; expect(visit(b, () => 0)).toBeNull();
  });
  it('keeps selling while Nico is away, but only what is on the shelves, and only a few hours of it', () => {
    const b = stocked(); b.items.twine = 9; b.shells.clam = 40;
    for (let i = 0; i < 5; i++) make(b, 'bracelet', ['clam', 'clam', 'clam', 'clam']);
    expect(whileAway(b, 1_000_000)).toEqual([]); expect(b.shop.last).toBe(1_000_000);   // (the first time just starts the clock)
    expect(whileAway(b, 1_000_000 + 30_000, seeded(3)).length).toBeLessThanOrEqual(2);   // half a minute: a visitor or so
    const days = whileAway(b, 1_000_000 + 9 * 86_400_000, seeded(5));
    expect(b.shop.rack.length + days.length).toBeLessThanOrEqual(5);
    // the cap: a week away sells no more than SHOP.away's worth of visitors could buy
    const c = stocked(); c.shells.clam = 999; c.items.twine = 999; c.shop.rack = Array.from({ length: 200 }, () => ({ id: 'bracelet', shells: ['clam'], price: 1 }));
    c.shop.last = 1; const n = whileAway(c, 1 + 7 * 86_400_000, seeded(9)).length;
    expect(n).toBeLessThanOrEqual(SHOP.away / SHOP.visit[0]);
    expect(n).toBeGreaterThan(SHOP.away / SHOP.visit[1] * SHOP.buy * 0.5);
  });
  it('no endless money: an hour of gathering every shell and making the best pieces earns under $6 a minute', () => {
    // every shell on the beach picked up the moment it washes up, the priciest pieces made (with a pattern
    // bonus every time), the shelves never empty, twine bought as needed
    const b = freshBiz(), r = seeded(11);
    let money = 0, carry = 0;
    for (let t = 0, nextVisit = visitGap(r); t < 3600; t++) {
      carry += SHELLS.count / SHELLS.respawn;
      for (; carry >= 1; carry--) { const k = pickShell(r); b.shells[k] = (b.shells[k] ?? 0) + 1; }
      for (const d of [...DESIGNS].sort((x, y) => y.beads - x.beads)) {
        if (b.shop.rack.length >= SHOP.rack) break;
        const bag = Object.entries(b.shells).flatMap(([k, n]) => Array(n).fill(k) as string[]).sort((x, y) => SHELL_VALUE[y] - SHELL_VALUE[x]);
        if (bag.length < d.beads) continue;
        b.items.twine = 1; money -= PARTS_FOR_SALE.find(q => q.id === 'twine')!.price;
        const p = make(b, d.id, bag.slice(0, d.beads))!; p.price = pieceValue(d, p.shells) + Math.max(BONUS.match, BONUS.pattern) - (bonusOf(p.shells)?.amount ?? 0);
      }
      if (t >= nextVisit) { nextVisit += visitGap(r); visit(b, r); }
    }
    money += emptyTill(b);
    const perMinute = money / 60; console.log(`shell shop: $${perMinute.toFixed(1)}/min (${b.shop.sold} sold)`);
    expect(perMinute).toBeLessThan(6);
    expect(perMinute).toBeGreaterThan(1);   // (but it's worth having)
  });
});

describe('Bibs and Bobs: the save', () => {
  it('keeps the shop and the shell kinds found; mends anything broken', () => {
    const b = stocked(); make(b, 'necklace', ['clam', 'clam', 'clam', 'clam', 'clam', 'clam', 'clam']); b.shop.till = 12; b.shop.last = 5; b.found = ['clam', 'scallop'];
    const back = migrate(JSON.parse(JSON.stringify({ v: VERSION, money: 3, nico: null, car: null, driving: false, job: null, biz: b }))).biz;
    expect(back.shop).toEqual(b.shop); expect(back.found.sort()).toEqual(['clam', 'scallop', 'starfish']);   // (starfish: in the bag, so found)
    const bad = migrate({ v: VERSION, money: 3, biz: { ...b, found: 'x', shop: { rack: [{ id: 'bogus', shells: [], price: 3 }, { id: 'bracelet', shells: ['clam'], price: -1 }, null], till: 'lots', sold: -2 } } }).biz;
    expect(bad.shop).toEqual({ rack: [], till: 0, sold: 0, last: 0 });
    expect(migrate({ v: VERSION, money: 3, biz: { shells: { clam: 2 } } }).biz.found).toEqual(['clam']);   // (a save from before the shop)
  });
});
