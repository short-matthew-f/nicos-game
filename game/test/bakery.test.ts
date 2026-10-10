import { describe, it, expect } from 'vitest';
import { RECIPES, PANTRY, BAKERY, BAKE, recipe, doneness, priceFor, cantBake, bake, visit, whileAway, emptyTill, visitGap } from '../src/bakery';
import { freshBiz, ITEMS, makeUnit } from '../src/business';
import { unlockOf } from '../src/unlocks';
import { migrate, VERSION } from '../src/state';

const seeded = (n: number) => () => (n = (n * 16807) % 2147483647) / 2147483647;
const stocked = () => { const b = freshBiz(); b.items = { flour: 9, sugar: 9, butter: 9, egg: 9, chocolate: 9 }; return b; };

describe("Nico's Bakery", () => {
  it('is a $40 sticker; every ingredient is an item, sold in the pantry, never found in storage units', () => {
    expect(unlockOf('bakery').price).toBe(40);
    for (const r of RECIPES) for (const k of Object.keys(r.needs)) { expect(ITEMS.find(i => i.id === k)?.where, k).toBe('shop'); expect(PANTRY.some(q => q.id === k), k).toBe(true); }
    for (let s = 1; s < 200; s++) expect(makeUnit(s, 'A').contents.some(c => PANTRY.some(q => q.id === c.id))).toBe(false);
  });
  it('the oven: golden in the gold zone, fine a little either side, doughy too early, burnt too late', () => {
    const r = recipe('cookie');
    expect(doneness(r, r.oven)).toBe('golden'); expect(doneness(r, r.oven + BAKE.golden - 0.01)).toBe('golden');
    expect(doneness(r, r.oven - BAKE.ok + 0.05)).toBe('ok'); expect(doneness(r, r.oven + BAKE.ok - 0.05)).toBe('ok');
    expect(doneness(r, 0.5)).toBe('doughy'); expect(doneness(r, r.oven + 2)).toBe('burnt');
    expect(priceFor(r, 'golden')).toBe(r.price + 1); expect(priceFor(r, 'ok')).toBe(r.price); expect(priceFor(r, 'burnt')).toBeLessThan(r.price);
  });
  it('baking uses the ingredients and fills the display case (as much as fits)', () => {
    const b = stocked(), out = bake(b, 'cookie', 'golden')!;
    expect(out.length).toBe(recipe('cookie').makes); expect(out[0].price).toBe(recipe('cookie').price + 1);
    expect(b.items.flour).toBe(8); expect(b.items.chocolate).toBe(8); expect(b.bakery.rack.length).toBe(4);
    bake(b, 'cookie', 'ok'); expect(b.bakery.rack.length).toBe(8);
    expect(cantBake(b, 'bread')).toMatch(/full/); expect(bake(b, 'bread', 'ok')).toBeNull();
    const none = freshBiz(); expect(cantBake(none, 'bread')).toMatch(/need 2 flour/);
    b.bakery.rack.splice(0, 7); expect(bake(b, 'cupcake', 'ok')!.length).toBe(3);
  });
  it('customers buy (food goes faster than jewelry); the till; catching up while away', () => {
    const b = stocked(); bake(b, 'bread', 'ok');
    expect(visit(b, () => BAKERY.buy + 0.01)).toBeNull();
    const p = visit(b, () => 0)!; expect(b.bakery.till).toBe(p.price); expect(emptyTill(b)).toBe(p.price);
    whileAway(b, 1000); expect(whileAway(b, 1000 + 86_400_000, seeded(4)).length).toBe(1);   // (only what's in the case)
    expect(b.bakery.rack.length).toBe(0);
  });
  it('no endless money: an hour of baking golden trays nonstop earns under $6 a minute after ingredients', () => {
    const b = freshBiz(), r = seeded(21);
    let money = 0;
    for (let t = 0, next = visitGap(r); t < 3600; t++) {
      for (const rc of RECIPES) while (b.bakery.rack.length + rc.makes <= BAKERY.rack) {   // (buy exactly what it needs, bake it golden)
        for (const [k, n] of Object.entries(rc.needs)) { b.items[k] = (b.items[k] ?? 0) + n; money -= n * PANTRY.find(q => q.id === k)!.price * (k === 'egg' ? 0 : 1); }   // (eggs free from the farm)
        bake(b, rc.id, 'golden');
      }
      if (t >= next) { next += visitGap(r); visit(b, r); }
    }
    money += emptyTill(b);
    const perMinute = money / 60; console.log(`bakery: $${perMinute.toFixed(1)}/min (${b.bakery.sold} sold)`);
    expect(perMinute).toBeLessThan(6); expect(perMinute).toBeGreaterThan(0.5);
  });
  it('the save keeps the bakery and mends a broken one', () => {
    const b = stocked(); bake(b, 'cupcake', 'golden'); b.bakery.till = 9;
    const back = migrate(JSON.parse(JSON.stringify({ v: VERSION, money: 3, nico: null, car: null, driving: false, job: null, biz: b }))).biz;
    expect(back.bakery).toEqual(b.bakery);
    const bad = migrate({ v: VERSION, money: 3, biz: { bakery: { rack: [{ id: 'cake', price: 3 }, { id: 'bread', price: 0 }], till: -1 } } }).biz;
    expect(bad.bakery).toEqual({ rack: [], till: 0, sold: 0, last: 0 });
  });
});
