// The save: one small versioned object in localStorage. When the shape changes, bump
// VERSION and add a step to migrate(), so a change of plan never wipes Nico's progress.
export const VERSION = 1;
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
  // (v1 is the first version: future steps go here, e.g. if (o.v === 1) { ...; o.v = 2 })
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
