// The save: one small versioned object in localStorage. When the shape changes, bump
// VERSION and add a step to migrate(), so a change of plan never wipes Nico's progress.
export const VERSION = 4;
export const START_MONEY = 20;
const KEY = 'nico-city-save';

export interface Save {
  v: number;
  money: number;
  nico: { x: number; y: number } | null;          // null = start at the default spot
  car: { x: number; y: number; h: number } | null;
  driving: boolean;
}

export const fresh = (): Save => ({ v: VERSION, money: START_MONEY, nico: null, car: null, driving: false });

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
  const num = (x: unknown, d: number) => (typeof x === 'number' && isFinite(x) ? x : d);
  const pt = (p: unknown) => (p && typeof p === 'object' && isFinite((p as { x: number }).x) && isFinite((p as { y: number }).y) ? p : null);
  return {
    v: VERSION,
    money: Math.max(0, num(o.money, START_MONEY)),
    nico: pt(o.nico) as Save['nico'],
    car: pt(o.car) ? { ...(o.car as Save['car'])!, h: num((o.car as { h: number }).h, 0) } : null,
    driving: o.driving === true,
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
