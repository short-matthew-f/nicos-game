// Nico's Bakery (Nico, 2026-10-10: "he wants to be able to open a bakery"): buy it like Bibs and Bobs,
// bake trays of cookies, cupcakes and bread (a mini game: into the bowl, stir, and out of the oven at
// just the right moment), and they go in the display case. Visitors pop in and buy (store.ts): food
// sells faster than jewelry, but for less. Ingredients come from the pantry shelf in the bakery; eggs
// are free from the hen house at the farm. Data first; main.ts and workshop.ts call these.
import type { Biz } from './business';
import * as store from './store';

/** Ingredients (they're items in the bag: business.ts), and what the pantry shelf charges. */
export const PANTRY: { id: string; price: number }[] = [
  { id: 'flour', price: 1 }, { id: 'sugar', price: 1 }, { id: 'butter', price: 1 }, { id: 'egg', price: 1 }, { id: 'chocolate', price: 2 },
];
export interface Recipe { id: string; name: string; emoji: string; needs: Record<string, number>; makes: number; price: number; oven: number; learn?: string }
/** makes: how many come out of the oven; price: each; oven: seconds till it's golden (the timing game). */
export const RECIPES: Recipe[] = [
  { id: 'cookie', name: 'chocolate chip cookies', emoji: '🍪', needs: { flour: 1, sugar: 1, butter: 1, egg: 1, chocolate: 1 }, makes: 4, price: 3, oven: 3.2 },
  { id: 'cupcake', name: 'cupcakes', emoji: '🧁', needs: { flour: 1, sugar: 1, butter: 1, egg: 2 }, makes: 3, price: 4, oven: 3.8 },
  { id: 'bread', name: 'loaves of bread', emoji: '🍞', needs: { flour: 2, egg: 1, butter: 1 }, makes: 2, price: 5, oven: 4.6 },
  // Nonna's recipe: she teaches it at her house
  { id: 'pizzelle', name: "Nonna's pizzelle", emoji: '🧇', needs: { flour: 1, sugar: 1, egg: 2, butter: 1 }, makes: 4, price: 3, oven: 2.6, learn: 'pizzelle' },
];
export const recipe = (id: string) => RECIPES.find(r => r.id === id)!;

/** How it came out of the oven, by how close to golden (seconds early or late): a golden tray earns $1
 * more a piece; a little early or late is fine; too early is doughy and too late is burnt (half price). */
export const BAKE = { golden: 0.35, ok: 0.9 };
export type Doneness = 'golden' | 'ok' | 'doughy' | 'burnt';
export function doneness(r: Recipe, t: number): Doneness {
  const off = t - r.oven;
  if (Math.abs(off) <= BAKE.golden) return 'golden';
  if (Math.abs(off) <= BAKE.ok) return 'ok';
  return off < 0 ? 'doughy' : 'burnt';
}
export const priceFor = (r: Recipe, d: Doneness) => (d === 'golden' ? r.price + 1 : d === 'ok' ? r.price : Math.max(1, Math.ceil(r.price / 2)));

// ---- the bakery's display case (the selling is store.ts)
/** Holds 8; people come by often and buy food more readily than jewelry. (A greedy hour earns well
 * under $6 a minute after ingredients: test/bakery.test.ts.) */
export const BAKERY = { rack: 8, visit: [15, 30] as [number, number], buy: 0.3, away: 3 * 3600 };
export const visitGap = (r: () => number = Math.random) => store.visitGap(BAKERY, r);

/** Why a recipe can't be baked now (null: it can). */
export function cantBake(b: Biz, id: string): string | null {
  const r = recipe(id), room = BAKERY.rack - b.bakery.rack.length;
  if (r.learn && !b.learned.includes(r.learn)) return 'Nonna can teach you this one';
  if (room <= 0) return 'the display case is full';
  const short = Object.entries(r.needs).filter(([k, n]) => (b.items[k] ?? 0) < n);
  if (short.length) return `need ${short.map(([k, n]) => `${n - (b.items[k] ?? 0)} ${k}`).join(', ')}`;
  return null;
}
/** Bake it: uses the ingredients, puts what came out in the case (as many as fit). null if it can't. */
export function bake(b: Biz, id: string, d: Doneness): store.Piece[] | null {
  const r = RECIPES.find(q => q.id === id);
  if (!r || cantBake(b, id)) return null;
  for (const [k, n] of Object.entries(r.needs)) { b.items[k] -= n; if (b.items[k] <= 0) delete b.items[k]; }
  const out = Array.from({ length: Math.min(r.makes, BAKERY.rack - b.bakery.rack.length) }, () => ({ id, price: priceFor(r, d) }));
  b.bakery.rack.push(...out);
  return out;
}
export const visit = (b: Biz, r: () => number = Math.random, at?: number) => store.visit(b.bakery, BAKERY, r, at);
export const whileAway = (b: Biz, now: number, r: () => number = Math.random) => store.whileAway(b.bakery, BAKERY, now, r);
export const emptyTill = (b: Biz) => store.emptyTill(b.bakery);

/** The hen house at the farm: eggs to collect, one laid every `lay` seconds, up to `max`. */
export const HENS = { max: 6, lay: 25 };
