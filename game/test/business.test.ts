import { describe, it, expect } from 'vitest';
import {
  ITEMS, item, STARTER, PARTS_FOR_SALE, CAR_RECIPE, CAR_SALE, RAMP, SKILLS,
  makeUnit, guess, sellOne, doorState, doorUnit, buyDoor, decide, tickDoors, HALL, DOOR_NAMES, shelfValue, goalPlace, worth, sellPrice, freshBiz, has, missing, add, use, unlocks, carPrice, nextGoal,
} from '../src/business';
import { START_MONEY, migrate, VERSION } from '../src/state';
import { unlockOf, unlock, canUnlock, isUnlocked, UNLOCKS, PAINT_BONUS } from '../src/unlocks';
import { SHED_SLOTS } from '../src/world/rooms';
import { PRODUCTS, product, unlockedProducts, partsCost, priceOf, runProgram, ROBOT_LEVEL, type Move } from '../src/business';
import { PLANS } from '../src/plans';
import { photoStars } from '../src/business';
import { JOBS } from '../src/jobs';
import { COIN_SPOTS, COIN } from '../src/world/life';

const partPrice = (id: string) => PARTS_FOR_SALE.find(p => p.id === id)!.price;
const recipeCost = (have: Record<string, number> = {}) =>
  Object.entries(CAR_RECIPE).reduce((s, [id, n]) => s + Math.max(0, n - (have[id] ?? 0)) * partPrice(id), 0);

describe('the economy closes from the starting money', () => {
  it('the first unit is affordable and always a profit, even keeping its parts', () => {
    expect(STARTER.price).toBeLessThanOrEqual(START_MONEY);
    const finds = STARTER.contents.filter(c => item(c.id).kind === 'find').reduce((s, c) => s + c.value, 0);
    expect(finds).toBeGreaterThan(STARTER.price);            // sell the finds, keep the wheels: still ahead
    expect(STARTER.contents.some(c => c.id === 'wheel')).toBe(true);   // the hustle feeds the toy car
    for (const c of STARTER.contents) { const [lo, hi] = item(c.id).value; expect(c.value).toBeGreaterThanOrEqual(lo); expect(c.value).toBeLessThanOrEqual(hi); }
  });
  it('workbench + the rest of the parts are reachable with the first unit, a few jobs and coins', () => {
    const afterStarter = START_MONEY - STARTER.price + STARTER.contents.filter(c => item(c.id).kind === 'find').reduce((s, c) => s + c.value, 0);
    const wheels = STARTER.contents.filter(c => c.id === 'wheel').length;
    const need = unlockOf('shed').price + unlockOf('workbench').price + recipeCost({ wheel: wheels });   // the shed and its bench, then the rest of the parts
    const jobs = JOBS.map(j => j.reward).sort((a, b) => b - a);
    const coins = COIN_SPOTS.length * COIN.value;
    // three jobs (not all five) plus the coins get there
    expect(afterStarter + jobs[0] + jobs[1] + jobs[2] + coins).toBeGreaterThanOrEqual(need);
  });
  it('a toy car sells for more than its parts cost, first one most of all', () => {
    expect(CAR_SALE.repeat).toBeGreaterThan(recipeCost());
    expect(CAR_SALE.first).toBeGreaterThan(CAR_SALE.repeat);
    const b = freshBiz(); expect(carPrice(b)).toBe(CAR_SALE.first); b.sold.car = 1; expect(carPrice(b)).toBe(CAR_SALE.repeat);
  });
  it('every car part can be bought at Parts & Tools', () => {
    for (const id of Object.keys(CAR_RECIPE)) expect(PARTS_FOR_SALE.some(p => p.id === id), id).toBe(true);
  });
  it('the ramp test can be passed and can be failed', () => {
    expect(RAMP.heights).toContain(RAMP.pass);
    expect(RAMP.heights.some(h => h < RAMP.pass)).toBe(true);
  });
});

describe('storage units', () => {
  const units = Array.from({ length: 400 }, (_, i) => makeUnit(i + 1, 'X'));
  it('the same seed always makes the same unit', () => {
    expect(makeUnit(42, 'B')).toEqual(makeUnit(42, 'B'));
  });
  it('the real value is always inside the estimate shown (both kinds of guess)', () => {
    for (const u of [STARTER, ...units]) for (const ap of [false, true]) {
      const [lo, hi] = guess(u, ap), w = worth(u);
      expect(w).toBeGreaterThanOrEqual(lo); expect(w).toBeLessThanOrEqual(hi);
    }
  });
  it("an appraiser's guess is never wider", () => {
    for (const u of units) { const a = guess(u, true), b = guess(u, false); expect(a[1] - a[0]).toBeLessThanOrEqual(b[1] - b[0]); }
  });
  it('usually a profit, sometimes not: a real gamble, but a fair one', () => {
    const profit = units.map(u => worth(u) - u.price);
    const mean = profit.reduce((s, p) => s + p, 0) / profit.length;
    const losses = profit.filter(p => p < 0).length / profit.length;
    expect(mean).toBeGreaterThan(0);
    expect(losses).toBeGreaterThan(0.05); expect(losses).toBeLessThan(0.4);
  });
  it('every item in a unit is a real item, valued within its range, and you can peek at some', () => {
    for (const u of units) {
      expect(u.peek.length).toBeGreaterThan(0);
      for (const c of u.contents) { const [lo, hi] = item(c.id).value; expect(c.value).toBeGreaterThanOrEqual(lo); expect(c.value).toBeLessThanOrEqual(hi); }
      for (const p of u.peek) expect(u.contents.some(c => c.id === p)).toBe(true);
    }
  });
  it('the very first visit offers just the starter unit (a sure profit); the other doors wait', () => {
    const b = freshBiz();
    expect(doorState(b, 0)).toBe('sale'); expect(doorUnit(b, 0)).toBe(STARTER);
    for (let i = 1; i < DOOR_NAMES.length; i++) expect(doorState(b, i)).toBe('locked');
    const finds = STARTER.contents.filter(c => item(c.id).kind === 'find').reduce((t, c) => t + c.value, 0);
    expect(finds).toBeGreaterThan(STARTER.price);
  });
  it('appraisers sell for more', () => {
    expect(sellPrice(10, true)).toBeGreaterThan(sellPrice(10, false));
  });
  it('item ids are unique', () => {
    expect(new Set(ITEMS.map(i => i.id)).size).toBe(ITEMS.length);
  });
});

describe('what Nico owns', () => {
  it('parts get used up by a build, only if there are enough', () => {
    const b = freshBiz();
    expect(use(b, CAR_RECIPE)).toBe(false);
    add(b, 'wheel', 4); add(b, 'axle', 2);
    expect(missing(b, CAR_RECIPE)).toEqual([['body', 1]]);
    add(b, 'body'); add(b, 'radio');
    expect(has(b, CAR_RECIPE)).toBe(true);
    expect(use(b, CAR_RECIPE)).toBe(true);
    expect(b.items).toEqual({ radio: 1 });   // used-up parts are gone, not left at 0
  });
  it('skills unlock once, after enough units', () => {
    const b = freshBiz(), ap = SKILLS.find(s => s.id === 'appraiser')!;
    b.flips = ap.flips - 1; expect(unlocks(b)).toEqual([]);
    b.flips = ap.flips; expect(unlocks(b).map(s => s.id)).toEqual(['appraiser']);
    expect(unlocks(b)).toEqual([]);
  });
  it('the goal chip walks through the loop, one step at a time, then gets out of the way', () => {
    const b = freshBiz(), seen: string[] = [];
    const step = (m: number) => { const g = nextGoal(b, m); seen.push(g ?? 'done'); return g; };
    expect(step(20)).toMatch(/storage/);
    b.flips = 1; expect(step(5)).toMatch(/Save up.*shed/);
    expect(step(unlockOf('shed').price)).toMatch(/Build your work shed/);
    unlock(b, 'shed', 99); expect(step(0)).toMatch(/Save up.*workbench/);
    expect(step(unlockOf('workbench').price)).toMatch(/workbench in your shed/);
    unlock(b, 'workbench', 99); expect(b.workbench).toBe(true); expect(step(0)).toMatch(/parts/);
    add(b, 'wheel', 4); add(b, 'axle', 2); add(b, 'body'); expect(step(0)).toMatch(/Build/);
    b.designs.push('car'); b.stock.car = 1; use(b, CAR_RECIPE); expect(step(0)).toMatch(/Sell/);
    b.stock.car = 0; b.sold.car = 1; expect(step(0)).toMatch(/New idea.*robot/);   // selling the car brings the next idea
    add(b, 'tin'); add(b, 'gear', 2); add(b, 'battery'); add(b, 'bulb'); expect(step(0)).toMatch(/Build the toy robot/);
    b.designs.push('robot'); b.stock.robot = 1; expect(step(0)).toMatch(/Sell your toy robot/);
    b.stock.robot = 0; b.sold.robot = 1; expect(step(0)).toBeNull();
  });
  it('buy a unit, then sort it one thing at a time: sell, keep or trash; one unit at a time', () => {
    const b = freshBiz();
    expect(buyDoor(b, 0, STARTER.price - 1)).toBe(false); expect(b.flips).toBe(0);
    expect(buyDoor(b, 0, START_MONEY)).toBe(true);
    expect(b.flips).toBe(1); expect(doorState(b, 0)).toBe('yours'); expect(b.unit!.items).toHaveLength(STARTER.contents.length);
    expect(doorState(b, 1)).toBe('sale');
    expect(buyDoor(b, 1, 999)).toBe(false);   // still sorting Unit A
    const slotOf = (id: string) => b.unit!.items.find(i => i.id === id)!.slot;
    expect(decide(b, slotOf('radio'), 'sell')).toEqual({ money: 7, done: false });
    expect(decide(b, slotOf('teddy'), 'trash')).toEqual({ money: 0, done: false });
    expect(b.finds).toEqual([]);
    for (let k = 0; k < 3; k++) expect(decide(b, slotOf('wheel'), 'keep').done).toBe(false);
    expect(decide(b, slotOf('wheel'), 'keep')).toEqual({ money: 0, done: true });
    expect(b.items.wheel).toBe(4); expect(b.unit).toBeNull();
    expect(decide(b, 0, 'sell')).toEqual({ money: 0, done: false });   // nothing to sort now
  });
  it("a sorted unit is SOLD until new stuff arrives (only while you're playing)", () => {
    const b = freshBiz(); buyDoor(b, 0, 99);
    for (const it of [...b.unit!.items]) decide(b, it.slot, 'sell');
    expect(doorState(b, 0)).toBe('sold');
    tickDoors(b, HALL.restock - 1); expect(doorState(b, 0)).toBe('sold');
    tickDoors(b, 1); expect(doorState(b, 0)).toBe('sale');
    expect(doorUnit(b, 0)).not.toBe(STARTER);   // something new behind it
  });
  it('junk is worth nothing (the trash is for it); finds can be kept and sold later', () => {
    for (const id of ['socks', 'papers', 'bucket']) { expect(item(id).value).toEqual([0, 0]); expect(sellPrice(0, true)).toBe(0); }
    const b = freshBiz(); b.finds.push({ id: 'radio', value: 7 });
    expect(shelfValue(b)).toBe(7); expect(sellOne(b, 'radio', 7)).toBe(7); expect(sellOne(b, 'radio', 7)).toBe(0);
    b.skills.push('appraiser'); b.finds.push({ id: 'teddy', value: 4 }); expect(sellOne(b, 'teddy', 4)).toBe(sellPrice(4, true));
  });
  it('no endless money: a greedy player buying and selling everything earns only so much an hour', () => {
    // Nico found he could buy auction units over and over. Now: six doors, one unit at a time, and a
    // sorted unit's door stays shut for minutes. Simulate an hour of buying the best-looking unit as
    // soon as possible (with Appraiser: exact guesses, +20%) and selling everything straight away.
    const b = freshBiz(); b.skills.push('appraiser');
    let money = 1000, bought = 0;
    for (let t = 0; t < 3600; t++) {
      tickDoors(b, 1);
      if (!b.unit) {
        const best = DOOR_NAMES.map((_, i) => i).filter(i => doorState(b, i) === 'sale')
          .map(i => { const u = doorUnit(b, i), [lo, hi] = guess(u, true); return { i, u, gain: (lo + hi) / 2 * 1.2 - u.price }; })
          .sort((x, y) => y.gain - x.gain)[0];
        if (best && buyDoor(b, best.i, money)) { money -= best.u.price; bought++; }
      }
      if (b.unit) for (const it of [...b.unit.items]) money += decide(b, it.slot, 'sell').money;
    }
    const perMinute = (money - 1000) / 60; console.log(`greedy: $${perMinute.toFixed(1)}/min from ${bought} units`);
    expect(bought).toBeLessThanOrEqual(DOOR_NAMES.length * (1 + 3600 / HALL.restock));
    expect(perMinute, `$${perMinute.toFixed(1)} a minute from ${bought} units`).toBeLessThan(6);
  });
  it('the goal star points at the right building', () => {
    const b = freshBiz();
    expect(goalPlace(b, 0)).toBe('storage'); b.flips = 1;
    expect(goalPlace(b, 0)).toBeNull(); expect(goalPlace(b, unlockOf('shed').price)).toBe('shed'); unlock(b, 'shed', 99);
    expect(goalPlace(b, unlockOf('workbench').price)).toBe('shed'); unlock(b, 'workbench', 99);
    expect(goalPlace(b, 0)).toBe('parts'); add(b, 'wheel', 4); add(b, 'axle', 2); add(b, 'body');
    expect(goalPlace(b, 0)).toBe('shed'); b.designs.push('car'); b.stock.car = 1;
    expect(goalPlace(b, 0)).toBe('toys'); b.sold.car = 1; b.stock.car = 0;
    expect(goalPlace(b, 0)).toBe('parts');   // the robot's parts
    b.sold.robot = 1; b.designs.push('robot');
    expect(goalPlace(b, 0)).toBeNull();
  });
});

describe('products', () => {
  it('each plan matches its recipe: one slot per part, the tray holds exactly the recipe, quick steps cover every part', () => {
    for (const p of PRODUCTS) {
      const plan = PLANS[p.id]; expect(plan, p.id).toBeDefined();
      const count = (xs: { kind: string }[]) => xs.reduce((m, x) => ({ ...m, [x.kind]: (m[x.kind] ?? 0) + 1 }), {} as Record<string, number>);
      expect(count(plan.slots), `${p.id} slots`).toEqual(p.recipe);
      expect(count(plan.tray), `${p.id} tray`).toEqual(p.recipe);
      expect(new Set(plan.steps.map(s => s[1])), `${p.id} steps`).toEqual(new Set(Object.keys(p.recipe)));
      // the order can always be finished: every slot's needs exist, and there's no loop
      const done = new Set<string>(); let moved = true;
      while (moved) { moved = false; for (const sl of plan.slots) if (!done.has(sl.id) && sl.needs.every(n => done.has(n))) { done.add(sl.id); moved = true; } }
      expect(done.size, `${p.id} buildable in order`).toBe(plan.slots.length);
    }
  });
  it('every part is a real item, sold at Parts & Tools, and every product sells for more than its parts', () => {
    for (const p of PRODUCTS) {
      for (const id of Object.keys(p.recipe)) { expect(item(id)?.kind, id).toBe('part'); expect(PARTS_FOR_SALE.some(q => q.id === id), id).toBe(true); }
      expect(p.sale.repeat, p.id).toBeGreaterThan(partsCost(p.recipe));
      expect(p.sale.first, p.id).toBeGreaterThan(p.sale.repeat);
    }
  });
  it('one idea at a time: each later product unlocks when the one before it sells', () => {
    const b = freshBiz();
    expect(unlockedProducts(b).map(p => p.id)).toEqual(['car']);
    b.sold.car = 1; expect(unlockedProducts(b).map(p => p.id)).toEqual(['car', 'robot']);
    for (const p of PRODUCTS) if (p.after) expect(PRODUCTS.some(q => q.id === p.after), p.id).toBe(true);
    expect(priceOf(b, 'robot')).toBe(product('robot').sale.first);
  });
  it("the robot's test can be passed and can be failed (a bump, or stopping short)", () => {
    const solve: Move[] = ['U', 'U', 'R', 'R', 'R', 'D', 'R', 'R', 'U', 'U'];
    expect(runProgram(solve).result).toBe('star');
    expect(solve.length).toBeLessThanOrEqual(ROBOT_LEVEL.maxMoves);
    expect(runProgram(['R', 'R']).result).toBe('bump');     // into a box
    expect(runProgram(['L']).result).toBe('bump');          // off the edge
    expect(runProgram(['U']).result).toBe('short');
    expect(runProgram(['U', 'U', 'R', 'R', 'R', 'D', 'R', 'R', 'U', 'U']).path.at(-1)).toEqual(ROBOT_LEVEL.star);
  });
});

describe('photos', () => {
  it('centred is three stars, near the edge one, outside the frame none; a running animal comes out blurry', () => {
    expect(photoStars(0, 0, false)).toBe(3);
    expect(photoStars(0.5, -0.2, false)).toBe(2);
    expect(photoStars(0.9, 0.9, false)).toBe(1);
    expect(photoStars(1.2, 0, false)).toBeNull();
    expect(photoStars(0, 0, true)).toBe(2);
    expect(photoStars(0.9, 0, true)).toBe(1);   // never less than one
  });
});

describe('unlocks (bought and stuck onto the world)', () => {
  it('each costs something, can only be bought once, and things inside the shed need the shed first', () => {
    const b = freshBiz();
    for (const u of UNLOCKS) expect(u.price, u.id).toBeGreaterThan(0);
    expect(canUnlock(b, 'workbench')).toBe(false);
    expect(unlock(b, 'shed', unlockOf('shed').price - 1)).toBe(false);
    expect(unlock(b, 'shed', 99)).toBe(true); expect(unlock(b, 'shed', 99)).toBe(false);
    expect(canUnlock(b, 'workbench')).toBe(true);
    for (const u of UNLOCKS) if (u.after) expect(UNLOCKS.some(q => q.id === u.after), u.id).toBe(true);
  });
  it("a save from before the shed that has a workbench gets its shed and bench (Nico's save)", () => {
    const old = { v: VERSION, money: 50, biz: { ...freshBiz(), workbench: true, unlocked: undefined } };
    const b = migrate(old).biz;
    expect(isUnlocked(b, 'shed')).toBe(true); expect(isUnlocked(b, 'workbench')).toBe(true);
    expect(migrate({ v: VERSION, money: 5, biz: { ...freshBiz(), unlocked: ['shed', 42] } }).biz.unlocked).toEqual(['shed']);
  });
  it("shed equipment comes in order (shelves with the shed; bins and paint once there's a bench), each has a place", () => {
    const b = freshBiz(); unlock(b, 'shed', 99);
    expect(canUnlock(b, 'shelves')).toBe(true); expect(canUnlock(b, 'paint')).toBe(false); expect(canUnlock(b, 'bins')).toBe(false);
    unlock(b, 'workbench', 99); expect(canUnlock(b, 'paint')).toBe(true); expect(canUnlock(b, 'bins')).toBe(true);
    for (const u of UNLOCKS) if (u.room === 'shed') expect(SHED_SLOTS[u.id], u.id).toBeDefined();
  });
  it('the paint station makes every toy sell for more', () => {
    const b = freshBiz(), before = priceOf(b, 'car');
    unlock(b, 'shed', 99); unlock(b, 'workbench', 99); unlock(b, 'paint', 99);
    expect(priceOf(b, 'car')).toBe(before + PAINT_BONUS);
    b.sold.robot = 1; expect(priceOf(b, 'robot')).toBe(product('robot').sale.repeat + PAINT_BONUS);
  });
});
