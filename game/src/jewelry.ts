// Bibs and Bobs (Nico's idea, 2026-10-10): his own little shop on the beach. He strings the shells he
// finds onto hemp twine (from Parts & Tools) to make bracelets, necklaces and wind chimes, hangs them on
// the shop's shelves, and visitors drop in, browse, and now and then buy one. The money waits in the
// till until he comes to empty it: passive income. Data first; main.ts and workshop.ts call these.
import { see, type Biz } from './business';
import * as store from './store';

/** What each kind of shell adds to a piece's price (the rare ones are worth more). */
export const SHELL_VALUE: Record<string, number> = { scallop: 1, spiral: 1, clam: 1, cowrie: 1, starfish: 2, sanddollar: 3 };

/** The things Nico can make: how many shells each takes (all on one length of twine). */
export interface Design { id: string; name: string; emoji: string; beads: number; base: number }
export const DESIGNS: Design[] = [
  { id: 'bracelet', name: 'shell bracelet', emoji: '📿', beads: 4, base: 1 },
  { id: 'necklace', name: 'shell necklace', emoji: '🐚', beads: 7, base: 1 },
  { id: 'chime', name: 'wind chime', emoji: '🎐', beads: 10, base: 2 },
];
export const design = (id: string) => DESIGNS.find(d => d.id === id)!;

/** Patterns pay: all one kind, two kinds taking turns, or the same both ways (a mirror). */
export const BONUS = { match: 2, pattern: 2, mirror: 1 };
export function bonusOf(shells: string[]): { label: string; amount: number } | null {
  if (shells.length < 2) return null;
  const kinds = new Set(shells);
  if (kinds.size === 1) return { label: 'Matching set', amount: BONUS.match };
  if (kinds.size === 2 && shells.every((s, i) => i < 2 || s === shells[i - 2])) return { label: 'Pattern', amount: BONUS.pattern };
  if (shells.every((s, i) => s === shells[shells.length - 1 - i])) return { label: 'Mirror pattern', amount: BONUS.mirror };
  return null;
}
export const pieceValue = (d: Design, shells: string[]) => d.base + shells.reduce((t, s) => t + (SHELL_VALUE[s] ?? 0), 0) + (bonusOf(shells)?.amount ?? 0);

// ---- the shop (the selling itself is store.ts, shared with the bakery)
export type Piece = store.Piece & { shells: string[] };
export type Shop = store.Shop;
export const freshShop = store.freshShop;
/** rack: pieces the shelves hold. visit: seconds between visitors (lo..hi). buy: the chance a visitor
 * buys something. away: the longest time away that still counts (s). (A greedy hour earns under $6 a
 * minute: test/jewelry.test.ts.) */
export const SHOP = { rack: 8, visit: [20, 40] as [number, number], buy: 0.17, away: 3 * 3600, twine: 'twine' };
export const visitGap = (r: () => number = Math.random) => store.visitGap(SHOP, r);

/** Why a design can't be made right now (null: it can). */
export function cantMake(b: Biz, id: string): string | null {
  const d = design(id), have = Object.values(b.shells).reduce((t, n) => t + n, 0);
  if (b.shop.rack.length >= SHOP.rack) return 'the shelves are full';
  if (!(b.items[SHOP.twine] > 0)) return 'need hemp twine (Parts & Tools)';
  if (have < d.beads) return `need ${d.beads} shells (you have ${have})`;
  return null;
}
/** String the shells onto twine and hang it on the shelves (uses them up). null if it can't. */
export function make(b: Biz, id: string, shells: string[]): Piece | null {
  const d = DESIGNS.find(q => q.id === id);
  if (!d || shells.length !== d.beads || cantMake(b, id)) return null;
  const need: Record<string, number> = {};
  for (const s of shells) need[s] = (need[s] ?? 0) + 1;
  if (Object.entries(need).some(([s, n]) => (b.shells[s] ?? 0) < n)) return null;
  for (const [s, n] of Object.entries(need)) { b.shells[s] -= n; if (b.shells[s] <= 0) delete b.shells[s]; }
  b.items[SHOP.twine] -= 1; if (b.items[SHOP.twine] <= 0) delete b.items[SHOP.twine];
  const p: Piece = { id, shells: [...shells], price: pieceValue(d, shells) };
  b.shop.rack.push(p); see(b, 'jewelry', id);
  return p;
}
export const visit = (b: Biz, r: () => number = Math.random, at?: number) => store.visit(b.shop, SHOP, r, at) as Piece | null;
export const whileAway = (b: Biz, now: number, r: () => number = Math.random) => store.whileAway(b.shop, SHOP, now, r) as Piece[];
export const emptyTill = (b: Biz) => store.emptyTill(b.shop);
