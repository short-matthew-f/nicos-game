// A little shop of Nico's that sells on its own (Bibs and Bobs, the bakery): things on display, a
// visitor every so often who sometimes buys one, the money waiting in the till, and the sales that
// happened while he was away. Each shop has its own rules (how much it holds, how often people come,
// how likely they are to buy). Data and small pure functions; jewelry.ts and bakery.ts use these.
export interface Piece { id: string; price: number; shells?: string[] }
export interface Shop {
  rack: Piece[];     // on display, for sale
  till: number;      // takings waiting to be collected
  sold: number;      // sold, ever
  last: number;      // when the shop was last open with Nico playing (ms since 1970; 0: never)
}
/** rack: how many things it holds. visit: seconds between visitors (lo..hi). buy: the chance a visitor
 * buys something. away: the longest time away that still counts (s). */
export interface Rules { rack: number; visit: [number, number]; buy: number; away: number }
export const freshShop = (): Shop => ({ rack: [], till: 0, sold: 0, last: 0 });
export const visitGap = (rules: Rules, r: () => number = Math.random) => rules.visit[0] + r() * (rules.visit[1] - rules.visit[0]);
/** A visitor looks round: maybe they buy something (`at`: the one they were looking at, else any). */
export function visit(s: Shop, rules: Rules, r: () => number = Math.random, at?: number): Piece | null {
  if (!s.rack.length || r() >= rules.buy) return null;
  const i = at !== undefined && at >= 0 && at < s.rack.length ? at : Math.floor(r() * s.rack.length);
  const [p] = s.rack.splice(i, 1);
  s.till += p.price; s.sold++;
  return p;
}
/** Catch up on the time Nico was away (up to rules.away): a visitor every so often, as if he'd been
 * playing. Returns what sold. Then the clock is set to now. */
export function whileAway(s: Shop, rules: Rules, now: number, r: () => number = Math.random): Piece[] {
  const out: Piece[] = [];
  if (s.last > 0 && now > s.last) {
    let t = Math.min(rules.away, (now - s.last) / 1000);
    while ((t -= visitGap(rules, r)) > 0 && s.rack.length) { const p = visit(s, rules, r); if (p) out.push(p); }
  }
  s.last = now;
  return out;
}
/** Empty the till: what was in it. */
export function emptyTill(s: Shop): number { const n = s.till; s.till = 0; return n; }
