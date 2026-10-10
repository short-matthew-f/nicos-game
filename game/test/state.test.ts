import { describe, it, expect } from 'vitest';
import { migrate, load, save, fresh, START_MONEY, VERSION } from '../src/state';
import { nearest, type Spot } from '../src/interact';

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } }; };

describe('save', () => {
  it('starts fresh with the starting money', () => {
    expect(load(mem())).toEqual(fresh());
    expect(fresh().money).toBe(START_MONEY);
  });
  it('round-trips', () => {
    const s = mem();
    save({ v: VERSION, money: 7, nico: { x: 1, y: 2 }, car: { x: 3, y: 4, h: 1 }, driving: true }, s);
    expect(load(s)).toEqual({ v: VERSION, money: 7, nico: { x: 1, y: 2 }, car: { x: 3, y: 4, h: 1 }, driving: true });
  });
  it('survives junk instead of crashing or wiping into nonsense', () => {
    expect(migrate('x')).toEqual(fresh());
    expect(migrate({ v: VERSION, money: 'lots', nico: { x: NaN, y: 1 } })).toEqual({ ...fresh(), money: START_MONEY });
    expect(migrate({ v: VERSION, money: -5 }).money).toBe(0);
    const s = { getItem: () => '{not json' };
    expect(load(s)).toEqual(fresh());
  });
  it('a v1 save (smaller town) keeps its money but not its positions', () => {
    expect(migrate({ v: 1, money: 11, nico: { x: 5, y: 6 }, car: { x: 1, y: 2, h: 0 }, driving: true }))
      .toEqual({ v: VERSION, money: 11, nico: null, car: null, driving: false });
  });
  it('a v2 save (1.6x town) keeps its money but not its positions', () => {
    expect(migrate({ v: 2, money: 9, nico: { x: 5, y: 6 }, car: null, driving: false }))
      .toEqual({ v: VERSION, money: 9, nico: null, car: null, driving: false });
  });
  it('a v3 save (before the re-layout) keeps its money but not its positions', () => {
    expect(migrate({ v: 3, money: 31, nico: { x: 2200, y: 3200 }, car: { x: 1, y: 2, h: 0 }, driving: true }))
      .toEqual({ v: VERSION, money: 31, nico: null, car: null, driving: false });
  });
  it('a save from a newer game version is not misread', () => {
    expect(migrate({ v: VERSION + 1, money: 999 })).toEqual(fresh());
  });
});

describe('spots', () => {
  const spots: Spot[] = [
    { id: 'a', x: 0, y: 0, r: 100, label: 'A', run: () => {} },
    { id: 'b', x: 150, y: 0, r: 100, label: 'B', run: () => {} },
    { id: 'c', x: 60, y: 0, r: 100, label: 'C', run: () => {}, when: () => false },
  ];
  it('offers the closest usable spot in reach', () => {
    expect(nearest(spots, 20, 0)?.id).toBe('a');
    expect(nearest(spots, 100, 0)?.id).toBe('b');
    expect(nearest(spots, 400, 0)).toBeNull();
  });
  it('a higher-priority spot in reach beats a nearer one (a job step at a shop door)', () => {
    const door: Spot = { id: 'door', x: 0, y: 0, r: 100, label: 'Go in', run: () => {} };
    const job: Spot = { id: 'job', x: 30, y: 0, r: 100, label: 'Pick up', run: () => {}, priority: 1 };
    expect(nearest([door, job], 0, 0)?.id).toBe('job');
    expect(nearest([door, job], -90, 0)?.id).toBe('door');   // the job spot is out of reach
  });
  it('skips spots that are switched off', () => {
    expect(nearest(spots, 60, 0)?.id).toBe('a');
  });
});
