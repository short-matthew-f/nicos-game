// Orders (the user, 2026-10-12: entrepreneurship is Nico's main goal; "orders and customers first"; "don't have
// any hard deadlines. Just. Due."). Once Nico has sold something he made, people and places start ordering from
// him: the Toy Shop wants more cars, the Burger Barn wants toy cars for its kids' meals, the school wants robots,
// Mrs. Kim wants cookies. An order comes in as an offer (take it or not: it waits till he answers), then waits on his order list until he
// brings the lot. Each has a due day: on time earns a thank-you tip, late is fine (full pay, no tip). Nothing
// expires and nothing is lost. Orders pay better than selling one at a time, and they grow as he delivers more.
// Pure: main.ts shows the list, the offers and the deliveries.
import { product, type Biz } from './business';
import { recipe } from './bakery';
import { design } from './jewelry';
import { PAINT_BONUS } from './unlocks';

/** Things that can be ordered: built products (from b.stock) and pieces on a shop's rack (bakery, jewelry). */
export type Source = 'stock' | 'bakery' | 'shop';
export interface Good { id: string; source: Source; name: string; plural: string; emoji: string; price: number }
export const GOODS: Good[] = [
  { id: 'car', source: 'stock', name: 'toy car', plural: 'toy cars', emoji: '🚗', price: product('car').sale.repeat },
  { id: 'robot', source: 'stock', name: 'toy robot', plural: 'toy robots', emoji: '🤖', price: product('robot').sale.repeat },
  ...(['cookie', 'cupcake', 'bread', 'pizzelle'] as const).map(id => ({ id, source: 'bakery' as const, ...bake(id) })),
  ...(['bracelet', 'necklace', 'chime'] as const).map(id => ({ id, source: 'shop' as const, name: design(id).name, plural: `${design(id).name}s`, emoji: design(id).emoji, price: design(id).base + design(id).beads })),
];
function bake(id: string) {
  const r = recipe(id), one: Record<string, string> = { cookie: 'chocolate chip cookie', cupcake: 'cupcake', bread: 'loaf of bread', pizzelle: 'pizzelle' };
  const many: Record<string, string> = { cookie: 'chocolate chip cookies', cupcake: 'cupcakes', bread: 'loaves of bread', pizzelle: 'pizzelle' };
  return { name: one[id], plural: many[id], emoji: r.emoji, price: r.price };
}
export const good = (id: string) => GOODS.find(g => g.id === id)!;
/** What one is worth to Nico now (painted toys sell for more once he has the paint station). */
export const unitPrice = (b: Biz, id: string) => good(id).price + (good(id).source === 'stock' && b.unlocked.includes('paint') ? PAINT_BONUS : 0);
export const goodName = (id: string, n: number) => `${n} ${n === 1 ? good(id).name : good(id).plural}`;

/** Can Nico make this yet? (A proven design, or the bakery or shop and the recipe.) */
export function canMake(b: Biz, id: string): boolean {
  const g = good(id);
  if (g.source === 'stock') return b.designs.includes(id);
  if (g.source === 'bakery') return b.unlocked.includes('bakery') && (!recipe(id).learn || b.learned.includes(recipe(id).learn!));
  return b.unlocked.includes('shop');
}
/** How many he has ready to hand over. */
export function have(b: Biz, id: string): number {
  const g = good(id);
  if (g.source === 'stock') return b.stock[id] ?? 0;
  return (g.source === 'bakery' ? b.bakery : b.shop).rack.filter(p => p.id === id).length;
}

/** Who orders. `at`: a building (deliver to whoever's at its counter) or a townsperson (find them in town). */
export interface Customer {
  id: string; name: string; at: 'place' | 'person';
  wants: string[];             // goods they order (only ones Nico can make get asked for)
  qty: [number, number];       // how many, at first (grows with deliveries: see orderSize)
  per: number;                 // what they pay each, times the good's price
  why: string[];               // why they want them ({n}: the amount, {what}: the goods)
}
export const CUSTOMERS: Customer[] = [
  { id: 'toys', name: 'the Toy Shop', at: 'place', wants: ['car', 'robot'], qty: [3, 4], per: 1.15,
    why: ['Your {what} sell out the day I put them in the window! Could you make me {n}?', 'Kids keep asking for "the ones Nico makes". {n} more, please!'] },
  { id: 'burger', name: 'the Burger Barn', at: 'place', wants: ['car', 'cookie'], qty: [4, 6], per: 1.1,
    why: ['We want a prize in every kids\' meal this week. {n} {what}?', 'Our dessert case is empty! Could you bring {n} {what}?'] },
  { id: 'school', name: 'the School', at: 'place', wants: ['robot', 'cupcake', 'bread'], qty: [2, 3], per: 1.2,
    why: ['The science class wants {what} to program. {n}, if you can!', 'It\'s the bake sale on Friday. {n} {what}, please!', 'The teachers\' lunch: {n} {what}?'] },
  { id: 'hospital', name: 'the Hospital', at: 'place', wants: ['car', 'cupcake'], qty: [2, 4], per: 1.25,
    why: ['Something to cheer up the kids on the children\'s ward: {n} {what}?', 'The nurses work so hard. {n} {what} for the break room?'] },
  { id: 'fire', name: 'the Fire Station', at: 'place', wants: ['bread', 'cookie', 'car'], qty: [2, 4], per: 1.2,
    why: ['It\'s chili night at the station. We need {n} {what}!', 'Open day at the station! {n} {what} for the kids who visit?'] },
  { id: 'nonna', name: 'Nonna', at: 'place', wants: ['pizzelle', 'necklace', 'bread'], qty: [2, 3], per: 1.3,
    why: ['The whole family\'s coming for Sunday dinner. {n} {what}, tesoro?', 'For my friends at church: {n} {what}. They\'ll be so proud of you!'] },
  { id: 'mrskim', name: 'Mrs. Kim', at: 'person', wants: ['cookie', 'chime', 'bread'], qty: [1, 2], per: 1.4,
    why: ['My grandchildren are visiting! {n} {what}, dear?', 'For my porch: {n} {what}. Wouldn\'t that be lovely?'] },
  { id: 'mrbrooks', name: 'Mr. Brooks', at: 'person', wants: ['car', 'robot', 'cupcake'], qty: [1, 2], per: 1.4,
    why: ['My nephew\'s birthday is coming up. {n} {what}?', 'For the office: {n} {what}. My treat.'] },
  { id: 'maya', name: 'Maya', at: 'person', wants: ['bracelet', 'necklace', 'cupcake'], qty: [1, 2], per: 1.4,
    why: ['Friendship {what} for me and my best friend! {n}?', 'It\'s my sister\'s birthday. {n} {what}, please!'] },
  { id: 'sam', name: 'Sam', at: 'person', wants: ['car', 'robot'], qty: [1, 1], per: 1.5,
    why: ['I\'ve been saving up! Could you make me {n} {what}?', 'I want to race my cousin. {n} {what}?'] },
];
export const customer = (id: string) => CUSTOMERS.find(c => c.id === id) ?? null;

export const ORDERS = {
  first: 30,                       // s after the first sale before the first offer
  every: [70, 140] as [number, number],   // s between offers
  open: 3,                         // most orders on the list at once (offers wait till there's room)
  days: [1, 3] as [number, number],       // due in this many days (a day is 12 minutes)
  tip: 0.15,                       // on time: this much extra
  grow: 4,                         // one more in each order for every this many delivered
  max: 8,                          // the biggest order
};

export interface Order { id: number; who: string; what: string; n: number; pay: number; due: number; why: string }
/** b.orders: what he's said yes to; delivered: orders delivered, ever; nextId: for ids. */
export interface OrderBook { list: Order[]; delivered: number; nextId: number }
export const freshBook = (): OrderBook => ({ list: [], delivered: 0, nextId: 1 });

/** Orders start once he's sold something he made (he's proven he can make things people want). */
export const ordersOpen = (b: Biz) => Object.values(b.sold).some(n => n > 0) || b.shop.sold > 0 || b.bakery.sold > 0;

/** How many, for this customer, now: their usual amount plus one for every ORDERS.grow delivered. */
export function orderSize(c: Customer, delivered: number, r: () => number): number {
  const base = c.qty[0] + Math.floor(r() * (c.qty[1] - c.qty[0] + 1));
  return Math.min(ORDERS.max, base + Math.floor(delivered / ORDERS.grow));
}

/** A new offer: someone who isn't waiting on an order already, for something Nico can make; null if nobody. */
export function pickOrder(b: Biz, day: number, r: () => number = Math.random): Order | null {
  const book = b.orders, busy = new Set(book.list.map(o => o.who));
  const who = CUSTOMERS.filter(c => !busy.has(c.id) && c.wants.some(w => canMake(b, w)));
  if (!who.length) return null;
  const c = who[Math.floor(r() * who.length)], can = c.wants.filter(w => canMake(b, w));
  const what = can[Math.floor(r() * can.length)], n = orderSize(c, book.delivered, r);
  const due = day + ORDERS.days[0] + Math.floor(r() * (ORDERS.days[1] - ORDERS.days[0] + 1));
  const why = c.why[Math.floor(r() * c.why.length)].replace('{n}', `${n}`).replace('{what}', n === 1 ? good(what).name : good(what).plural);
  return { id: 0, who: c.id, what, n, pay: Math.round(n * unitPrice(b, what) * c.per), due, why };
}
/** Say yes: it goes on the list (false if the list is full). */
export function accept(b: Biz, o: Order): boolean {
  if (b.orders.list.length >= ORDERS.open) return false;
  b.orders.list.push({ ...o, id: b.orders.nextId++ });
  return true;
}
export const ready = (b: Biz, o: Order) => have(b, o.what) >= o.n;
/** Orders waiting at this customer that he has enough for. */
export const deliverable = (b: Biz, who: string) => b.orders.list.filter(o => o.who === who && ready(b, o));
export const onTime = (o: Order, day: number) => day <= o.due;
/** Hand the lot over: the goods leave his stock or rack, the order's done. Returns what it paid (0: not enough). */
export function deliver(b: Biz, id: number, day: number): { pay: number; tip: number } {
  const i = b.orders.list.findIndex(o => o.id === id), o = b.orders.list[i];
  if (!o || !ready(b, o)) return { pay: 0, tip: 0 };
  const g = good(o.what);
  if (g.source === 'stock') { b.stock[o.what] -= o.n; if (!b.stock[o.what]) delete b.stock[o.what]; }
  else {
    const rack = (g.source === 'bakery' ? b.bakery : b.shop).rack;
    for (let k = 0; k < o.n; k++) rack.splice(rack.findIndex(p => p.id === o.what), 1);
  }
  b.orders.list.splice(i, 1); b.orders.delivered++;
  if (g.source === 'stock') b.sold[o.what] = (b.sold[o.what] ?? 0) + o.n;
  const tip = onTime(o, day) ? Math.round(o.pay * ORDERS.tip) : 0;
  return { pay: o.pay, tip };
}
/** "Due today", "due in 2 days", "was due yesterday" (late is fine: just no tip). */
export function dueText(o: Order, day: number): string {
  const d = o.due - day;
  return d > 1 ? `due in ${d} days` : d === 1 ? 'due tomorrow' : d === 0 ? 'due today' : 'a little late (no rush)';
}
/** The order to show on the goal chip: one he can deliver now, else the soonest due. */
export function focus(b: Biz): Order | null {
  const list = [...b.orders.list].sort((x, y) => x.due - y.due);
  return list.find(o => ready(b, o)) ?? list[0] ?? null;
}
/** The goal chip's line for an order. */
export function orderGoal(b: Biz, o: Order, day: number): string {
  const c = customer(o.who)!, h = have(b, o.what), g = good(o.what);
  const where = g.source === 'stock' ? 'your workbench' : g.source === 'bakery' ? 'your bakery' : 'Bibs and Bobs';
  return ready(b, o) ? `📦 Deliver ${goodName(o.what, o.n)} to ${c.name} (${dueText(o, day)})`
    : `${g.emoji} Make ${o.n - h} more ${o.n - h === 1 ? g.name : g.plural} for ${c.name} at ${where} (${h}/${o.n}, ${dueText(o, day)})`;
}
