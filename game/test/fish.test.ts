import { describe, it, expect } from 'vitest';
import { Fishing, FISHING, SPECIES, pickSpecies } from '../src/fish';

const run = (f: Fishing, secs: number) => { const ev: string[] = []; for (let t = 0; t < secs; t += 1 / 60) ev.push(...f.update(1 / 60)); return ev; };
const castOut = (f: Fishing, hold = 0.5) => { f.press(); run(f, hold); f.release(); return run(f, FISHING.fly + 0.05); };
describe('fishing off the pier', () => {
  it('hold to wind up, let go to cast: the longer the wind-up (to the top), the further', () => {
    const a = new Fishing(() => 0.5); castOut(a, 0.2); const b = new Fishing(() => 0.5); castOut(b, FISHING.sweep * 0.95);
    expect(b.dist).toBeGreaterThan(a.dist); expect(a.phase).toBe('waiting');
  });
  it('nibbles, then a bite; tap during the bite to hook it', () => {
    const f = new Fishing(() => 0.5); castOut(f); const ev = run(f, 10);
    expect(ev).toContain('nibble'); expect(ev).toContain('bite');
  });
  it('tap too early: it swims off and you wait again', () => {
    const f = new Fishing(() => 0.5); castOut(f); expect(f.press()).toEqual(['early']); expect(f.phase).toBe('waiting');
  });
  it('too slow: it steals your bait', () => {
    const f = new Fishing(() => 0.5); castOut(f); f.biteNow(); const ev = run(f, FISHING.bite + 0.2);
    expect(ev).toContain('stole'); expect(f.phase).toBe('lost');
  });
  it('hook it, then reel in (letting go when it runs) to land it', () => {
    const f = new Fishing(() => 0.5); castOut(f); f.biteNow(); run(f, 0.05); expect(f.press()).toEqual(['hooked']); expect(f.phase).toBe('fight');
    let ev: string[] = [];
    for (let t = 0; t < 90 && f.phase === 'fight'; t += 1 / 60) {
      const ease = f.running || f.tension > 0.75; if (ease && f.holding) f.release(); if (!ease && !f.holding) f.press();
      ev = ev.concat(f.update(1 / 60));
    }
    expect(f.phase).toBe('caught'); expect(f.fish).not.toBeNull(); expect(f.size).toBeGreaterThan(0);
  });
  it('hold on through a run and the line snaps', () => {
    const f = new Fishing(() => 0.5); castOut(f, FISHING.sweep * 0.95); f.biteNow(); run(f, 0.05); f.press(); f.fish = SPECIES.find(s => s.id === 'striper')!;
    const ev = run(f, 60); expect(ev).toContain('snap'); expect(f.why).toBe('snap');
  });
  it('never reel and it swims away', () => {
    const f = new Fishing(() => 0.5); castOut(f, FISHING.sweep * 0.95); f.biteNow(); run(f, 0.05); f.press(); f.release();
    run(f, 120); expect(f.phase).toBe('lost'); expect(f.why).toBe('away');
  });
  it('far casts favour the big fish; near ones the little ones', () => {
    const count = (d: number, id: string) => { let n = 0; for (let i = 0; i < 4000; i++) if (pickSpecies(d).id === id) n++; return n; };
    expect(count(1, 'striper')).toBeGreaterThan(count(0.2, 'striper') * 2); expect(count(0.2, 'sardine')).toBeGreaterThan(count(1, 'sardine'));
    expect(SPECIES.find(s => s.id === 'golden')!.weight).toBeLessThan(1);
  });
});
