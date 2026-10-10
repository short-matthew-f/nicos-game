import { describe, it, expect } from 'vitest';
import {
  ITEMS, item, STARTER, WORKBENCH, PARTS_FOR_SALE, CAR_RECIPE, CAR_SALE, RAMP, SKILLS,
  makeUnit, lineup, guess, buyUnit, sellOne, shelfValue, goalPlace, worth, sellPrice, freshBiz, has, missing, add, use, unlocks, carPrice, nextGoal,
} from '../src/business';
import { START_MONEY } from '../src/state';
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
    const need = WORKBENCH.price + recipeCost({ wheel: wheels });
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
  it('the very first visit offers only units that make a profit (just the starter)', () => {
    for (const seed of [1, 2, 7, 99]) for (const u of lineup(seed, true)) {
      const finds = u.contents.filter(c => item(c.id).kind === 'find').reduce((t, c) => t + c.value, 0);
      expect(finds, `${u.name}`).toBeGreaterThan(u.price);
    }
  });
  it('the first lineup is the starter; later ones are three new units', () => {
    expect(lineup(1, true)).toEqual([STARTER]);
    expect(lineup(1, false).includes(STARTER)).toBe(false);
    expect(lineup(2, false)).toHaveLength(3);
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
    b.flips = 1; expect(step(5)).toMatch(/Save up/);
    expect(step(WORKBENCH.price)).toMatch(/Buy a workbench/);
    b.workbench = true; expect(step(0)).toMatch(/parts/);
    add(b, 'wheel', 4); add(b, 'axle', 2); add(b, 'body'); expect(step(0)).toMatch(/Build/);
    b.designs.push('car'); b.stock.car = 1; use(b, CAR_RECIPE); expect(step(0)).toMatch(/Sell/);
    b.stock.car = 0; b.sold.car = 1; expect(step(0)).toMatch(/New idea.*robot/);   // selling the car brings the next idea
    add(b, 'tin'); add(b, 'gear', 2); add(b, 'battery'); add(b, 'bulb'); expect(step(0)).toMatch(/Build the toy robot/);
    b.designs.push('robot'); b.stock.robot = 1; expect(step(0)).toMatch(/Sell your toy robot/);
    b.stock.robot = 0; b.sold.robot = 1; expect(step(0)).toBeNull();
  });
  it('buying a unit hands over everything at once; selling takes it back off', () => {
    const b = freshBiz();
    expect(buyUnit(b, STARTER, STARTER.price - 1)).toBe(false);
    expect(b.flips).toBe(0);
    expect(buyUnit(b, STARTER, START_MONEY)).toBe(true);
    expect(b.items.wheel).toBe(4); expect(b.finds.map(f => f.id).sort()).toEqual(['radio', 'teddy']);
    expect(b.flips).toBe(1); expect(b.seed).toBe(freshBiz().seed + 1);   // a new lineup next time
    expect(shelfValue(b)).toBe(11);
    expect(sellOne(b, 'radio', 7)).toBe(7);
    expect(sellOne(b, 'radio', 7)).toBe(0);           // can't sell it twice
    expect(sellOne(b, 'wheel', 2)).toBe(2); expect(b.items.wheel).toBe(3);
    b.skills.push('appraiser'); expect(sellOne(b, 'teddy', 4)).toBe(sellPrice(4, true));
  });
  it('the goal star points at the right building', () => {
    const b = freshBiz();
    expect(goalPlace(b, 0)).toBe('storage'); b.flips = 1;
    expect(goalPlace(b, 0)).toBeNull(); expect(goalPlace(b, WORKBENCH.price)).toBe('parts'); b.workbench = true;
    expect(goalPlace(b, 0)).toBe('parts'); add(b, 'wheel', 4); add(b, 'axle', 2); add(b, 'body');
    expect(goalPlace(b, 0)).toBe('garage'); b.designs.push('car'); b.stock.car = 1;
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
