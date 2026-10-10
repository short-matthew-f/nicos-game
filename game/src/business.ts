// The business loop (v2): flip storage units for money and parts, buy a workbench, build
// the toy car, test it, sell it. Data first, like places.ts and jobs.ts: every price and
// item here is a one-line edit. The game only calls the small pure functions at the end.

export type ItemKind = 'part' | 'find';
export interface Item { id: string; label: string; kind: ItemKind; value: [number, number]; where?: 'beach' }   // value: what it sells for, lo..hi; where: only found there (not in storage units)

export const ITEMS: Item[] = [
  // parts for the toy car (also sold at Parts & Tools)
  { id: 'wheel', label: '🛞 Wheel', kind: 'part', value: [1, 2] },
  { id: 'axle', label: '🥢 Axle', kind: 'part', value: [1, 3] },
  { id: 'body', label: '🪵 Wooden body', kind: 'part', value: [3, 5] },
  { id: 'tin', label: '🥫 Tin body', kind: 'part', value: [2, 5] },
  { id: 'gear', label: '⚙️ Gear', kind: 'part', value: [1, 3] },
  { id: 'battery', label: '🔋 Battery', kind: 'part', value: [2, 4] },
  { id: 'bulb', label: '💡 Light bulb', kind: 'part', value: [1, 2] },
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
  // dug up on the beach with the metal detector
  { id: 'bottle', label: '🍾 Old bottle', kind: 'find', value: [1, 3], where: 'beach' },
  { id: 'oldkey', label: '🗝️ Old key', kind: 'find', value: [2, 6], where: 'beach' },
  { id: 'watch', label: '⌚ Watch', kind: 'find', value: [5, 14], where: 'beach' },
  { id: 'piratecoin', label: '🪙 Pirate coin', kind: 'find', value: [8, 20], where: 'beach' },
  { id: 'ring', label: '💍 Gold ring', kind: 'find', value: [12, 30], where: 'beach' },
];
/** Tools Nico can buy at Parts & Tools for the activities round town. */
export const TOOLS = [
  { id: 'detector', label: '📡 Metal detector', price: 12, text: 'Beeps faster near buried treasure on the beach.' },
  { id: 'camera', label: '📷 Camera', price: 10, text: 'Photograph the animals: the forest has the shyest ones.' },
];
export const item = (id: string) => ITEMS.find(i => i.id === id)!;

// ---- the shops
export const WORKBENCH = { price: 25 };
export const PARTS_FOR_SALE: { id: string; price: number }[] = [
  { id: 'wheel', price: 2 }, { id: 'axle', price: 3 }, { id: 'body', price: 5 },
  { id: 'tin', price: 4 }, { id: 'gear', price: 3 }, { id: 'battery', price: 4 }, { id: 'bulb', price: 2 },
];

// ---- products: each one is an idea Nico can design (build + test once), then make more of
export interface Product {
  id: string; name: string; emoji: string;
  recipe: Record<string, number>;
  sale: { first: number; repeat: number };   // the toy shop pays more for the very first one
  test: 'ramp' | 'program';                   // the test minigame (workshop.ts)
  after?: string;                             // unlocked once this product has sold (one new idea at a time)
  idea: string;                               // how the idea is pitched
}
export const PRODUCTS: Product[] = [
  { id: 'car', name: 'toy car', emoji: '🚗', recipe: { axle: 2, wheel: 4, body: 1 }, sale: { first: 40, repeat: 30 }, test: 'ramp',
    idea: 'A wooden toy car that really rolls.' },
  { id: 'robot', name: 'toy robot', emoji: '🤖', recipe: { tin: 1, gear: 2, battery: 1, bulb: 1 }, sale: { first: 55, repeat: 38 }, test: 'program', after: 'car',
    idea: 'A little robot you can program to walk around!' },
];
export const product = (id: string) => PRODUCTS.find(p => p.id === id)!;
/** Ideas Nico can work on now. */
export const unlockedProducts = (b: Biz) => PRODUCTS.filter(p => !p.after || (b.sold[p.after] ?? 0) > 0);
export const partsCost = (recipe: Record<string, number>) => Object.entries(recipe).reduce((t, [id, n]) => t + n * (PARTS_FOR_SALE.find(q => q.id === id)?.price ?? Infinity), 0);

/** What the toy car needs (kept for the car's screens). */
export const CAR_RECIPE: Record<string, number> = PRODUCTS[0].recipe;
export const CAR_SALE = PRODUCTS[0].sale;
export const RAMP = { heights: [1, 2, 3], pass: 2 };  // ramp heights to try; the car reaches the line from `pass` up
/** The robot's test: a grid; walk from start to the star without bumping a box. */
export const ROBOT_LEVEL = { cols: 6, rows: 4, start: [0, 3] as [number, number], star: [5, 0] as [number, number],
  boxes: [[2, 3], [2, 2], [4, 0], [4, 1]] as [number, number][], maxMoves: 12 };
export type Move = 'U' | 'D' | 'L' | 'R';
/** Run a program: every cell the robot reaches, and how it ended. */
export function runProgram(moves: Move[], lv = ROBOT_LEVEL): { path: [number, number][]; result: 'star' | 'bump' | 'short' } {
  const d: Record<Move, [number, number]> = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
  let [x, y] = lv.start; const path: [number, number][] = [[x, y]];
  for (const m of moves) {
    const nx = x + d[m][0], ny = y + d[m][1];
    if (nx < 0 || ny < 0 || nx >= lv.cols || ny >= lv.rows || lv.boxes.some(([bx, by]) => bx === nx && by === ny)) return { path, result: 'bump' };
    x = nx; y = ny; path.push([x, y]);
    if (x === lv.star[0] && y === lv.star[1]) return { path, result: 'star' };
  }
  return { path, result: 'short' };
}

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
export function makeUnit(seed: number, name: string, must?: string): Unit {
  const r = rng(seed), pick = <T>(a: T[]) => a[Math.floor(r() * a.length)];
  const sz = pick(SIZES), n = sz.n[0] + Math.floor(r() * (sz.n[1] - sz.n[0] + 1));
  const roll = (it: Item) => ({ id: it.id, value: it.value[0] + Math.floor(r() * (it.value[1] - it.value[0] + 1)) });
  const contents = Array.from({ length: n }, () => roll(r() < 0.3 ? pick(ITEMS.filter(i => i.kind === 'part')) : pick(ITEMS.filter(i => i.kind === 'find' && !i.where))));
  if (must && !contents.some(c => c.id === must)) contents[contents.length - 1] = roll(item(must));   // (someone asked for one)
  const [lo, hi] = guess({ contents } as Unit, true);
  const price = Math.max(5, Math.round((lo + (hi - lo) * (0.25 + r() * 0.5)) * (0.7 + r() * 0.3)));
  const peek = [...new Set(contents.map(c => c.id))].slice(0, 2);
  return { name, size: sz.size, price, contents, peek };
}

/** Units up for auction: three of them, except the very first visit, which has only the
 * starter (so the first buy can't be a loss). */
export function lineup(seed: number, firstTime: boolean, want?: string | null): Unit[] {
  if (firstTime) return [STARTER];
  const units = ['A', 'B', 'C'].map((nm, i) => makeUnit(seed * 3 + i + 1, nm));
  // someone wants a thing: make sure one unit has it, so a request never stalls on bad luck
  if (want && !units.some(u => u.contents.some(c => c.id === want))) {
    const i = seed % 3; units[i] = makeUnit(seed * 3 + i + 1, units[i].name, want);
  }
  // ...and it shows through the door, so it's clear which one to buy
  if (want) for (const u of units) if (u.contents.some(c => c.id === want)) u.peek = [want, ...u.peek.filter(p => p !== want)].slice(0, 2);
  return units;
}
/** Stars for a photo: how close to the middle of the frame (0 = dead centre, 1 = the edge), and
 * whether the animal was running (blurry). Null if it's out of the frame. */
export function photoStars(offX: number, offY: number, running: boolean): number | null {
  const r = Math.max(Math.abs(offX), Math.abs(offY));
  if (r > 1) return null;
  const stars = r < 0.35 ? 3 : r < 0.7 ? 2 : 1;
  return Math.max(1, stars - (running ? 1 : 0));
}
export const RANGER_PAYS = 3;   // $ for each animal's photo, the first time you show it

/** A beach find dug up: its value, rolled now. */
export function dugUp(b: Biz, id: string, r: () => number = Math.random): number {
  const [lo, hi] = item(id).value, value = lo + Math.floor(r() * (hi - lo + 1));
  b.finds.push({ id, value }); return value;
}

/** Hand over one of these (the cheapest one, if there are several kept): false if Nico has none. */
export function take(b: Biz, id: string): boolean {
  if (item(id).kind === 'part') { if (!(b.items[id] > 0)) return false; add(b, id, -1); return true; }
  let best = -1;
  b.finds.forEach((f, i) => { if (f.id === id && (best < 0 || f.value < b.finds[best].value)) best = i; });
  if (best < 0) return false;
  b.finds.splice(best, 1); return true;
}
export const owns = (b: Biz, id: string) => (item(id).kind === 'part' ? (b.items[id] ?? 0) > 0 : b.finds.some(f => f.id === id));

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
  stock: Record<string, number>;   // things Nico has built and not sold yet, by product ('car')
  sold: Record<string, number>;    // sold, ever, by product
  flips: number;                   // storage units bought, ever
  skills: string[];
  seed: number;                    // which auction lineup is up
  tools: string[];                 // 'detector', ...
  shells: Record<string, number>;  // shells collected, by kind
  photos: Record<string, number>;  // best photo of each animal (1-3 stars)
  shown: string[];                 // animals whose photo the ranger has paid for
}
export const freshBiz = (): Biz => ({ items: {}, finds: [], workbench: false, designs: [], stock: {}, sold: {}, flips: 0, skills: [], seed: 1, tools: [], shells: {}, photos: {}, shown: [] });

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

export const priceOf = (b: Biz, pid: string) => (!b.sold[pid] ? product(pid).sale.first : product(pid).sale.repeat);
export const carPrice = (b: Biz) => priceOf(b, 'car');
/** Everything sold, all products. */
export const soldAll = (b: Biz) => Object.values(b.sold).reduce((t, n) => t + n, 0);

/** The idea being worked on: the first unlocked product not sold yet (null: all done). */
export const currentIdea = (b: Biz) => unlockedProducts(b).find(p => !b.sold[p.id]) ?? null;

/** Where the next goal is (a building id), for the minimap star; null when it's not a place. */
export function goalPlace(b: Biz, money: number): string | null {
  if (b.flips === 0) return 'storage';
  if (!b.workbench) return money >= WORKBENCH.price ? 'parts' : null;
  const p = currentIdea(b);
  if (!p) return null;
  if (!b.designs.includes(p.id)) return missing(b, p.recipe).length ? 'parts' : 'garage';
  return b.stock[p.id] ? 'toys' : 'garage';
}

/** The next thing to do, for the goal chip (null when every idea has been made and sold). */
export function nextGoal(b: Biz, money: number): string | null {
  if (b.flips === 0) return '📦 Check out the storage units (bottom right of town)';
  if (!b.workbench) return money >= WORKBENCH.price ? `🛠️ Buy a workbench at Parts & Tools ($${WORKBENCH.price})` : `💰 Save up $${WORKBENCH.price} for a workbench (jobs, coins, storage units)`;
  const p = currentIdea(b);
  if (!p) return null;
  const fresh = p.after && !b.designs.includes(p.id) ? '💡 New idea! ' : '';
  if (!b.designs.includes(p.id)) {
    const need = missing(b, p.recipe);
    if (need.length) return `${fresh}🔩 Get ${p.name} parts: ${need.map(([id, n]) => `${n} ${item(id).label.split(' ')[0]}`).join(' ')} (Parts & Tools)`;
    return `${fresh}${p.emoji} Build the ${p.name} at your workbench (your garage)`;
  }
  return b.stock[p.id] ? `🧸 Sell your ${p.name} at the Toy Shop` : `${p.emoji} Build a ${p.name} at your workbench`;
}
