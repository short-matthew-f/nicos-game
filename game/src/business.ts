// The business loop (v2): flip storage units for money and parts, buy a workbench, build
// the toy car, test it, sell it. Data first, like places.ts and jobs.ts: every price and
// item here is a one-line edit. The game only calls the small pure functions at the end.

export type ItemKind = 'part' | 'find';
export interface Item { id: string; label: string; kind: ItemKind; value: [number, number] }   // value: what it sells for, lo..hi

export const ITEMS: Item[] = [
  // parts for the toy car (also sold at Parts & Tools)
  { id: 'wheel', label: '🛞 Wheel', kind: 'part', value: [1, 2] },
  { id: 'axle', label: '🥢 Axle', kind: 'part', value: [1, 3] },
  { id: 'body', label: '🪵 Wooden body', kind: 'part', value: [3, 5] },
  // things people leave in storage units
  { id: 'teddy', label: '🧸 Old teddy', kind: 'find', value: [2, 5] },
  { id: 'radio', label: '📻 Radio', kind: 'find', value: [4, 9] },
  { id: 'books', label: '📚 Box of books', kind: 'find', value: [1, 4] },
  { id: 'lamp', label: '🪔 Lamp', kind: 'find', value: [2, 6] },
  { id: 'chair', label: '🪑 Chair', kind: 'find', value: [3, 8] },
  { id: 'suitcase', label: '🧳 Suitcase', kind: 'find', value: [3, 7] },
  { id: 'skateboard', label: '🛹 Skateboard', kind: 'find', value: [5, 12] },
  { id: 'guitar', label: '🎸 Guitar', kind: 'find', value: [8, 20] },
  { id: 'painting', label: '🖼️ Painting', kind: 'find', value: [2, 25] },
  { id: 'console', label: '🎮 Old game console', kind: 'find', value: [10, 22] },
  { id: 'clock', label: '⏰ Clock', kind: 'find', value: [2, 6] },
  { id: 'trophy', label: '🏆 Trophy', kind: 'find', value: [3, 9] },
];
export const item = (id: string) => ITEMS.find(i => i.id === id)!;

// ---- the shops
export const WORKBENCH = { price: 25 };
export const PARTS_FOR_SALE: { id: string; price: number }[] = [
  { id: 'wheel', price: 2 }, { id: 'axle', price: 3 }, { id: 'body', price: 5 },
];
/** What the toy car needs. */
export const CAR_RECIPE: Record<string, number> = { axle: 2, wheel: 4, body: 1 };
export const CAR_SALE = { first: 40, repeat: 30 };   // the toy shop pays more for the very first one
export const RAMP = { heights: [1, 2, 3], pass: 2 };  // ramp heights to try; the car reaches the line from `pass` up

// ---- skills
export interface Skill { id: string; name: string; text: string; flips: number }   // unlocked after this many units
export const SKILLS: Skill[] = [
  { id: 'appraiser', name: 'Appraiser', flips: 3,
    text: 'You can tell what things are really worth: closer guesses on storage units, and finds sell for 20% more.' },
];
export const APPRAISER_BONUS = 1.2;

// ---- storage units
export interface Unit {
  name: string; size: 'Small' | 'Medium' | 'Big';
  price: number;
  contents: { id: string; value: number }[];   // the real values, rolled when the unit appears
  peek: string[];                             // what you can see through the door (item ids)
  starter?: boolean;
}

/** The first unit Nico ever sees: cheap, always a profit, and it has wheels for the car. */
export const STARTER: Unit = {
  name: 'A', size: 'Small', price: 10, starter: true,
  contents: [{ id: 'wheel', value: 2 }, { id: 'wheel', value: 2 }, { id: 'wheel', value: 2 }, { id: 'wheel', value: 2 },
             { id: 'teddy', value: 4 }, { id: 'radio', value: 7 }],
  peek: ['wheel', 'teddy'],
};

/** A small seeded random generator (mulberry32), so a lineup is the same every time it's opened. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SIZES: { size: Unit['size']; n: [number, number] }[] = [
  { size: 'Small', n: [3, 4] }, { size: 'Medium', n: [4, 6] }, { size: 'Big', n: [6, 8] },
];

/** A random unit. Its price is set around what it's worth: usually a profit, sometimes not. */
export function makeUnit(seed: number, name: string): Unit {
  const r = rng(seed), pick = <T>(a: T[]) => a[Math.floor(r() * a.length)];
  const sz = pick(SIZES), n = sz.n[0] + Math.floor(r() * (sz.n[1] - sz.n[0] + 1));
  const contents = Array.from({ length: n }, () => {
    const it = r() < 0.3 ? pick(ITEMS.filter(i => i.kind === 'part')) : pick(ITEMS.filter(i => i.kind === 'find'));
    return { id: it.id, value: it.value[0] + Math.floor(r() * (it.value[1] - it.value[0] + 1)) };
  });
  const [lo, hi] = guess({ contents } as Unit, true);
  const price = Math.max(5, Math.round((lo + (hi - lo) * (0.25 + r() * 0.5)) * (0.7 + r() * 0.3)));
  const peek = [...new Set(contents.map(c => c.id))].slice(0, 2);
  return { name, size: sz.size, price, contents, peek };
}

/** Units up for auction: three of them, except the very first visit, which has only the
 * starter (so the first buy can't be a loss). */
export function lineup(seed: number, firstTime: boolean): Unit[] {
  if (firstTime) return [STARTER];
  return ['A', 'B', 'C'].map((nm, i) => makeUnit(seed * 3 + i + 1, nm));
}

/** The estimate shown before buying: the real total is always inside it. Appraisers guess
 * closer (the exact lo..hi of what's in there); otherwise it's a wider guess. */
export function guess(u: Pick<Unit, 'contents'>, appraiser: boolean): [number, number] {
  let lo = 0, hi = 0;
  for (const c of u.contents) { const v = item(c.id).value; lo += v[0]; hi += v[1]; }
  return appraiser ? [lo, hi] : [Math.floor(lo * 0.7), Math.ceil(hi * 1.25)];
}

export const worth = (u: Pick<Unit, 'contents'>) => u.contents.reduce((s, c) => s + c.value, 0);
/** What a find sells for. */
export const sellPrice = (value: number, appraiser: boolean) => Math.round(value * (appraiser ? APPRAISER_BONUS : 1));

// ---- what Nico owns (part of the save)
export interface Biz {
  items: Record<string, number>;   // parts, by id
  finds: { id: string; value: number }[];   // things kept from storage units (the garage shelf), with what each is worth
  workbench: boolean;
  designs: string[];               // proven designs: 'car' once it passes the ramp test
  cars: number;                    // toy cars built and not sold yet
  sold: number;                    // toy cars sold, ever
  flips: number;                   // storage units bought, ever
  skills: string[];
  seed: number;                    // which auction lineup is up
}
export const freshBiz = (): Biz => ({ items: {}, finds: [], workbench: false, designs: [], cars: 0, sold: 0, flips: 0, skills: [], seed: 1 });

export const has = (b: Biz, recipe: Record<string, number>) => Object.entries(recipe).every(([id, n]) => (b.items[id] ?? 0) >= n);
export const missing = (b: Biz, recipe: Record<string, number>) =>
  Object.entries(recipe).map(([id, n]) => [id, Math.max(0, n - (b.items[id] ?? 0))] as [string, number]).filter(([, n]) => n > 0);
export function add(b: Biz, id: string, n = 1) { b.items[id] = (b.items[id] ?? 0) + n; if (b.items[id] <= 0) delete b.items[id]; }
export function use(b: Biz, recipe: Record<string, number>): boolean {
  if (!has(b, recipe)) return false;
  for (const [id, n] of Object.entries(recipe)) add(b, id, -n);
  return true;
}
/** Skills newly earned by the number of units flipped (added to b.skills). */
export function unlocks(b: Biz): Skill[] {
  const got = SKILLS.filter(s => b.flips >= s.flips && !b.skills.includes(s.id));
  for (const s of got) b.skills.push(s.id);
  return got;
}
/** Buy a unit: everything in it is Nico's straight away (parts to his parts, finds to the
 * shelf), so leaving halfway through sorting never loses anything. False if he can't afford it. */
export function buyUnit(b: Biz, u: Unit, money: number): boolean {
  if (u.price > money) return false;
  for (const c of u.contents) if (item(c.id).kind === 'part') add(b, c.id); else b.finds.push({ ...c });
  b.flips++; b.seed++;
  return true;
}
/** Sell one thing from a unit (a find off the shelf, or a part): what it fetched, or 0 if it's not there. */
export function sellOne(b: Biz, id: string, value: number): number {
  const ap = b.skills.includes('appraiser');
  if (item(id).kind === 'part') { if (!(b.items[id] > 0)) return 0; add(b, id, -1); return sellPrice(value, ap); }
  const i = b.finds.findIndex(f => f.id === id && f.value === value);
  if (i < 0) return 0;
  b.finds.splice(i, 1);
  return sellPrice(value, ap);
}
export const shelfValue = (b: Biz) => b.finds.reduce((s, f) => s + sellPrice(f.value, b.skills.includes('appraiser')), 0);

export const carPrice = (b: Biz) => (b.sold === 0 ? CAR_SALE.first : CAR_SALE.repeat);

/** Where the next goal is (a building id), for the minimap star; null when it's not a place. */
export function goalPlace(b: Biz, money: number): string | null {
  if (b.flips === 0) return 'storage';
  if (!b.workbench) return money >= WORKBENCH.price ? 'parts' : null;
  if (!b.designs.includes('car')) return missing(b, CAR_RECIPE).length ? 'parts' : 'garage';
  if (b.sold === 0) return b.cars > 0 ? 'toys' : 'garage';
  return null;
}

/** The next thing to do, for the goal chip (null when the loop's been done once). */
export function nextGoal(b: Biz, money: number): string | null {
  if (b.flips === 0) return '📦 Check out the storage units (bottom right of town)';
  if (!b.workbench) return money >= WORKBENCH.price ? `🛠️ Buy a workbench at Parts & Tools ($${WORKBENCH.price})` : `💰 Save up $${WORKBENCH.price} for a workbench (jobs, coins, storage units)`;
  if (!b.designs.includes('car')) {
    const need = missing(b, CAR_RECIPE);
    if (need.length) return `🔩 Get car parts: ${need.map(([id, n]) => `${n} ${item(id).label.split(' ')[0]}`).join(' ')} (Parts & Tools)`;
    return '🚗 Build the toy car at your workbench (your garage)';
  }
  if (b.sold === 0) return b.cars > 0 ? '🧸 Sell your toy car at the Toy Shop' : '🚗 Build a toy car at your workbench';
  return null;
}
