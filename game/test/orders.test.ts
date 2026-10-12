import { describe, it, expect } from 'vitest';
import { freshBiz, partsCost, product, rng } from '../src/business';
import { GOODS, CUSTOMERS, ORDERS, pickOrder, accept, deliver, deliverable, ordersOpen, canMake, have, dueText, focus, orderGoal, good, unitPrice, type Order } from '../src/orders';
import { priceOf } from '../src/business';
import { migrate, fresh } from '../src/state';

const maker = () => { const b = freshBiz(); b.designs = ['car']; b.sold = { car: 1 }; return b; };
const order = (o: Partial<Order> = {}): Order => ({ id: 0, who: 'toys', what: 'car', n: 3, pay: 100, due: 5, why: '', ...o });

describe('orders', () => {
  it('start once Nico has sold something he made', () => {
    const b = freshBiz(); expect(ordersOpen(b)).toBe(false);
    b.sold = { car: 1 }; expect(ordersOpen(b)).toBe(true);
    const c = freshBiz(); c.bakery.sold = 1; expect(ordersOpen(c)).toBe(true);
  });
  it('only ask for things he can make', () => {
    const b = maker();
    for (let s = 1; s < 200; s++) { const o = pickOrder(b, 3, rng(s)); expect(o).not.toBeNull(); expect(canMake(b, o!.what)).toBe(true); }
    const none = freshBiz(); expect(pickOrder(none, 3, rng(1))).toBeNull();
  });
  it('pay more than selling them one at a time, and more than the parts cost', () => {
    for (const c of CUSTOMERS) expect(c.per).toBeGreaterThan(1);
    const b = maker();
    for (let s = 1; s < 200; s++) {
      const o = pickOrder(b, 3, rng(s))!;
      expect(o.pay).toBeGreaterThanOrEqual(o.n * good(o.what).price);
      if (o.what === 'car') expect(o.pay).toBeGreaterThan(o.n * partsCost(product('car').recipe));
    }
    b.unlocked = ['paint'];   // (painted toys sell for more at the Toy Shop: orders keep up)
    expect(unitPrice(b, 'car')).toBe(priceOf(b, 'car'));
    for (let s = 1; s < 100; s++) { const o = pickOrder(b, 3, rng(s))!; expect(o.pay).toBeGreaterThan(o.n * priceOf(b, o.what)); }
  });
  it('are due a day or few away (soft: nothing expires)', () => {
    const b = maker();
    for (let s = 1; s < 100; s++) { const o = pickOrder(b, 10, rng(s))!; expect(o.due - 10).toBeGreaterThanOrEqual(ORDERS.days[0]); expect(o.due - 10).toBeLessThanOrEqual(ORDERS.days[1]); }
    expect(dueText(order({ due: 5 }), 9)).toMatch(/late/);
  });
  it('one order per customer at a time, and only so many at once', () => {
    const b = maker();
    for (let k = 0; k < 10; k++) { const o = pickOrder(b, 1, rng(k + 1)); if (o) accept(b, o); }
    expect(b.orders.list.length).toBe(ORDERS.open);
    expect(new Set(b.orders.list.map(o => o.who)).size).toBe(b.orders.list.length);
    expect(new Set(b.orders.list.map(o => o.id)).size).toBe(b.orders.list.length);
    expect(accept(b, order())).toBe(false);
  });
  it('deliver the whole lot: stock goes, money comes, a tip when on time', () => {
    const b = maker(); accept(b, order({ n: 3, pay: 100, due: 5 }));
    const id = b.orders.list[0].id;
    expect(deliverable(b, 'toys')).toHaveLength(0);
    expect(deliver(b, id, 4)).toEqual({ pay: 0, tip: 0 });   // (no cars yet)
    b.stock.car = 4;
    expect(deliverable(b, 'toys')).toHaveLength(1); expect(deliverable(b, 'burger')).toHaveLength(0);
    expect(deliver(b, id, 4)).toEqual({ pay: 100, tip: 15 });
    expect(b.stock.car).toBe(1); expect(b.orders.list).toHaveLength(0); expect(b.orders.delivered).toBe(1); expect(b.sold.car).toBe(4);
  });
  it('late is fine: full pay, just no tip', () => {
    const b = maker(); b.stock.car = 3; accept(b, order({ due: 5 }));
    expect(deliver(b, b.orders.list[0].id, 9)).toEqual({ pay: 100, tip: 0 });
  });
  it('bakery orders come off the bakery rack', () => {
    const b = freshBiz(); b.unlocked = ['bakery']; b.bakery.sold = 1;
    b.bakery.rack = [{ id: 'cookie', price: 3 }, { id: 'bread', price: 5 }, { id: 'cookie', price: 3 }];
    expect(have(b, 'cookie')).toBe(2);
    accept(b, order({ who: 'mrskim', what: 'cookie', n: 2, pay: 9 }));
    expect(deliver(b, b.orders.list[0].id, 0).pay).toBe(9);
    expect(b.bakery.rack.map(p => p.id)).toEqual(['bread']);
    expect(canMake(b, 'pizzelle')).toBe(false); b.learned = ['pizzelle']; expect(canMake(b, 'pizzelle')).toBe(true);
  });
  it('grow as he delivers more', () => {
    const b = maker(), small = Math.max(...Array.from({ length: 50 }, (_, s) => pickOrder(b, 1, rng(s + 1))!.n));
    b.orders.delivered = 40;
    const big = Math.min(...Array.from({ length: 50 }, (_, s) => pickOrder(b, 1, rng(s + 1))!.n));
    expect(big).toBeGreaterThan(Math.min(small, ORDERS.max - 1));
    expect(Math.max(...Array.from({ length: 50 }, (_, s) => pickOrder(b, 1, rng(s + 1))!.n))).toBeLessThanOrEqual(ORDERS.max);
  });
  it('the goal chip: one he can deliver first, else the soonest due', () => {
    const b = maker(); b.designs = ['car', 'robot'];
    accept(b, order({ who: 'toys', what: 'car', due: 3 })); accept(b, order({ who: 'school', what: 'robot', n: 1, due: 8 }));
    expect(focus(b)!.who).toBe('toys'); expect(orderGoal(b, focus(b)!, 1)).toMatch(/Make 3 more toy cars for the Toy Shop/);
    b.stock.robot = 1; expect(focus(b)!.who).toBe('school'); expect(orderGoal(b, focus(b)!, 1)).toMatch(/Deliver 1 toy robot to the School/);
  });
  it('every customer is someone real, every good has a name', () => {
    for (const c of CUSTOMERS) for (const w of c.wants) expect(GOODS.some(g => g.id === w)).toBe(true);
    for (const g of GOODS) { expect(g.price).toBeGreaterThan(0); expect(g.plural).toBeTruthy(); }
  });
  it('are saved, and a broken order book is cleaned up', () => {
    const s = fresh(); accept(s.biz, order()); s.biz.orders.delivered = 2;
    const back = migrate(JSON.parse(JSON.stringify(s)));
    expect(back.biz.orders.list).toHaveLength(1); expect(back.biz.orders.delivered).toBe(2); expect(back.biz.orders.nextId).toBe(2);
    const bad = JSON.parse(JSON.stringify(s)); bad.biz.orders = { list: [{ id: 1, who: 'nobody', what: 'car', n: 1, pay: 1, due: 1 }, { id: 'x' }, null], delivered: -3 };
    expect(migrate(bad).biz.orders).toEqual({ list: [], delivered: 0, nextId: 1 });
    const old = JSON.parse(JSON.stringify(s)); delete old.biz.orders;
    expect(migrate(old).biz.orders.list).toEqual([]);
  });
});
