// The save: one small versioned object in localStorage. When the shape changes, bump
// VERSION and add a step to migrate(), so a change of plan never wipes Nico's progress.
import { freshBiz, type Biz } from './business';

export const VERSION = 5;
export const START_MONEY = 20;
const KEY = 'nico-city-save';

export interface Save {
  v: number;
  money: number;
  nico: { x: number; y: number } | null;          // null = start at the default spot
  car: { x: number; y: number; h: number } | null;
  driving: boolean;
  biz: Biz;                                       // the business: parts, finds, workbench, toy cars
}

export const fresh = (): Save => ({ v: VERSION, money: START_MONEY, nico: null, car: null, driving: false, biz: freshBiz() });

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
  const num = (x: unknown, d: number) => (typeof x === 'number' && isFinite(x) ? x : d);
  const pt = (p: unknown) => (p && typeof p === 'object' && isFinite((p as { x: number }).x) && isFinite((p as { y: number }).y) ? p : null);
  return {
    v: VERSION,
    money: Math.max(0, num(o.money, START_MONEY)),
    nico: pt(o.nico) as Save['nico'],
    car: pt(o.car) ? { ...(o.car as Save['car'])!, h: num((o.car as { h: number }).h, 0) } : null,
    driving: o.driving === true,
    biz: cleanBiz(o.biz),
  };
}

/** A business object from the save, with anything missing or broken put back to fresh. */
function cleanBiz(raw: unknown): Biz {
  const f = freshBiz();
  if (!raw || typeof raw !== 'object') return f;
  const b = raw as Partial<Biz>;
  const count = (x: unknown) => (typeof x === 'number' && isFinite(x) && x >= 0 ? Math.floor(x) : 0);
  const items: Record<string, number> = {};
  if (b.items && typeof b.items === 'object') for (const [k, v] of Object.entries(b.items)) if (count(v) > 0) items[k] = count(v);
  const strs = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string') : []);
  const finds = Array.isArray(b.finds) ? b.finds.filter(f => f && typeof f.id === 'string' && count(f.value) > 0).map(f => ({ id: f.id, value: count(f.value) })) : [];
  return {
    items, finds, workbench: b.workbench === true, designs: strs(b.designs), skills: strs(b.skills),
    cars: count(b.cars), sold: count(b.sold), flips: count(b.flips), seed: count(b.seed) || f.seed,
  };
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
