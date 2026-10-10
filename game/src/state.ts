// The save: one small versioned object in localStorage. When the shape changes, bump
// VERSION and add a step to migrate(), so a change of plan never wipes Nico's progress.
import { freshBiz, freshDoors, HALL, ITEMS, type Biz } from './business';
import { migrateUnlocks } from './unlocks';
import { freshShop, DESIGNS, SHOP, type Shop } from './jewelry';

export const VERSION = 6;
export const START_MONEY = 20;
const KEY = 'nico-city-save';

export interface Save {
  v: number;
  money: number;
  nico: { x: number; y: number } | null;          // null = start at the default spot
  car: { x: number; y: number; h: number } | null;
  driving: boolean;
  biz: Biz;                                       // the business: parts, finds, workbench, toy cars
  job: SavedJob | null;                           // the odd job in progress (the game checks the id still exists)
  clock?: number | null;                          // the time of day, 0..1 (night.ts); null: a fresh morning
}
/** A job in progress: which one ('want:<giver>:<item>' for an item request), which step, and
 * the spot picked for each step. */
export interface SavedJob { id: string; step: number; at: ([number, number] | null)[] }

export const fresh = (): Save => ({ v: VERSION, money: START_MONEY, nico: null, car: null, driving: false, biz: freshBiz(), job: null });

/** Bring any older save up to date; anything unreadable starts fresh. */
export function migrate(raw: unknown): Save {
  if (!raw || typeof raw !== 'object') return fresh();
  const o = raw as Partial<Save>;
  if (typeof o.v !== 'number' || o.v > VERSION) return fresh();
  // v1 -> v2: the town was rebuilt 1.6x bigger, so old positions point at the wrong
  // places. Keep the money; Nico and his car go back to their starting spots.
  if (o.v === 1) { o.nico = null; o.car = null; o.driving = false; o.v = 2; }
  // v2 -> v3: the town shrank to a middle size (1.35x): same again
  if (o.v === 2) { o.nico = null; o.car = null; o.driving = false; o.v = 3; }
  // v3 -> v4: the town was re-laid out block by block (buildings, park, field moved): same again
  if (o.v === 3) { o.nico = null; o.car = null; o.driving = false; o.v = 4; }
  // v4 -> v5: the business arrives (nothing owned yet); positions are still good
  if (o.v === 4) { o.biz = freshBiz(); o.v = 5; }
  // v5 -> v6: built things are counted per product (toy cars were just a number), and the
  // job in progress is saved
  if (o.v === 5) {
    const b = (o.biz ?? {}) as Partial<Biz> & { cars?: unknown; sold?: unknown };
    if (b && typeof b === 'object') {
      b.stock = { car: typeof b.cars === 'number' ? b.cars : 0 };
      b.sold = { car: typeof b.sold === 'number' ? b.sold : 0 };
      delete b.cars;
    }
    o.job = null; o.v = 6;
  }
  const num = (x: unknown, d: number) => (typeof x === 'number' && isFinite(x) ? x : d);
  const pt = (p: unknown) => (p && typeof p === 'object' && isFinite((p as { x: number }).x) && isFinite((p as { y: number }).y) ? p : null);
  return {
    v: VERSION,
    money: Math.max(0, num(o.money, START_MONEY)),
    nico: pt(o.nico) as Save['nico'],
    car: pt(o.car) ? { ...(o.car as Save['car'])!, h: num((o.car as { h: number }).h, 0) } : null,
    driving: o.driving === true,
    biz: cleanBiz(o.biz),
    job: cleanJob(o.job),
    ...(typeof o.clock === 'number' && isFinite(o.clock) ? { clock: ((o.clock % 1) + 1) % 1 } : {}),
  };
}

/** A business object from the save, with anything missing or broken put back to fresh. */
function cleanBiz(raw: unknown): Biz {
  const f = freshBiz();
  if (!raw || typeof raw !== 'object') return f;
  const b = raw as Partial<Biz>;
  const count = (x: unknown) => (typeof x === 'number' && isFinite(x) && x >= 0 ? Math.floor(x) : 0);
  const counts = (x: unknown) => {
    const r: Record<string, number> = {};
    if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) if (count(v) > 0) r[k] = count(v);
    return r;
  };
  const items = counts(b.items);
  const strs = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string') : []);
  const finds = Array.isArray(b.finds) ? b.finds.filter(f => f && typeof f.id === 'string' && count(f.value) > 0).map(f => ({ id: f.id, value: count(f.value) })) : [];
  const out: Biz = {
    items, finds, workbench: b.workbench === true, designs: strs(b.designs), skills: strs(b.skills),
    tools: strs(b.tools), shells: counts(b.shells), photos: counts(b.photos), shown: strs(b.shown), unlocked: strs(b.unlocked),
    doors: cleanDoors(b.doors, count(b.seed) || f.seed), unit: cleanUnit(b.unit),
    stock: counts(b.stock), sold: counts(b.sold), flips: count(b.flips), seed: count(b.seed) || f.seed,
    found: [...new Set([...strs(b.found), ...Object.keys(counts(b.shells))])],   // (a save from before the shop: what's in hand was found)
    shop: cleanShop(b.shop),
  };
  migrateUnlocks(out);   // (a save with a workbench already has its shed)
  return out;
}

export function load(store: Pick<Storage, 'getItem'> | null = safeStorage()): Save {
  try { return migrate(JSON.parse(store?.getItem(KEY) ?? 'null')); } catch { return fresh(); }
}

export function save(s: Save, store: Pick<Storage, 'setItem'> | null = safeStorage()): void {
  try { store?.setItem(KEY, JSON.stringify(s)); } catch { /* private mode or full: play on */ }
}

function safeStorage(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}

function cleanJob(raw: unknown): SavedJob | null {
  if (!raw || typeof raw !== 'object') return null;
  const j = raw as Partial<SavedJob>;
  if (typeof j.id !== 'string' || typeof j.step !== 'number' || !Number.isInteger(j.step) || j.step < 0 || !Array.isArray(j.at)) return null;
  const at = j.at.map(p => (Array.isArray(p) && p.length === 2 && p.every(n => typeof n === 'number' && isFinite(n)) ? [p[0], p[1]] as [number, number] : null));
  return { id: j.id, step: j.step, at };
}

function cleanDoors(raw: unknown, seed: number): Biz['doors'] {
  const fresh = freshDoors(seed);
  if (!Array.isArray(raw) || raw.length !== fresh.length) return fresh;
  return fresh.map((d, i) => {
    const r = raw[i] as Partial<Biz['doors'][number]> | null;
    if (!r || typeof r !== 'object') return d;
    const seedOk = typeof r.seed === 'number' && Number.isInteger(r.seed) && r.seed > 0;
    const sold = typeof r.sold === 'number' && isFinite(r.sold) ? Math.min(HALL.restock, Math.max(0, r.sold)) : 0;
    return { seed: seedOk ? r.seed! : d.seed, sold, ...(typeof r.must === 'string' && ITEMS.some(it => it.id === r.must) ? { must: r.must } : {}) };
  });
}
function cleanUnit(raw: unknown): Biz['unit'] {
  if (!raw || typeof raw !== 'object') return null;
  const u = raw as Partial<NonNullable<Biz['unit']>>;
  if (typeof u.door !== 'number' || !Number.isInteger(u.door) || u.door < 0 || u.door >= HALL.doors || !Array.isArray(u.items)) return null;
  const items = u.items.filter(it => it && ITEMS.some(i => i.id === it.id) && typeof it.value === 'number' && it.value >= 0 && Number.isInteger(it.slot))
    .map(it => ({ id: it.id, value: Math.floor(it.value), slot: it.slot }));
  if (!items.length) return null;
  const n = (x: unknown) => (typeof x === 'number' && isFinite(x) && x >= 0 ? x : 0);
  return { door: u.door, name: typeof u.name === 'string' ? u.name : 'A', paid: n(u.paid), got: n(u.got), items };
}

function cleanShop(raw: unknown): Shop {
  const f = freshShop();
  if (!raw || typeof raw !== 'object') return f;
  const o = raw as Partial<Shop>;
  const n = (x: unknown) => (typeof x === 'number' && isFinite(x) && x >= 0 ? x : 0);
  const rack = (Array.isArray(o.rack) ? o.rack : []).filter(p => p && DESIGNS.some(d => d.id === p.id) && Array.isArray(p.shells) && p.shells.every(s => typeof s === 'string') && n(p.price) > 0)
    .slice(0, SHOP.rack).map(p => ({ id: p.id, shells: [...p.shells], price: Math.floor(p.price) }));
  return { rack, till: Math.floor(n(o.till)), sold: Math.floor(n(o.sold)), last: n(o.last) };
}
