import { describe, it, expect } from 'vitest';
import { Spar, RIVALS, ATTACKS, SPAR, type Input } from '../src/spar';

const none: Input = { left: false, right: false, block: false, punch: false, kick: false, spin: false };
const run = (s: Spar, secs: number, inp: (t: number) => Partial<Input> = () => ({}), dt = 1 / 60) => {
  const ev = []; for (let t = 0; t < secs; t += dt) ev.push(...s.update(dt, { ...none, ...inp(t) })); return ev;
};
const calm = () => 0.99;   // (a rival that never decides to do anything: r() is always high)

describe('sparring', () => {
  it('starts after the intro, Nico on the left, the rival on the right, facing each other', () => {
    const s = new Spar(RIVALS[0], calm);
    expect(run(s, 2.5).some(e => e.kind === 'start')).toBe(true);
    expect(s.nico.x).toBeLessThan(s.rival.x); expect(s.nico.face).toBe(1); expect(s.rival.face).toBe(-1);
  });
  it('a jab in range hits: damage, knockback, a stunned rival', () => {
    const s = new Spar(RIVALS[0], calm); run(s, 2.3);
    s.nico.x = s.rival.x - 102; const x0 = s.rival.x;
    const ev = run(s, 0.3, t => ({ punch: t < 0.02 }));
    expect(ev.find(e => e.kind === 'hit')?.dmg).toBe(ATTACKS.jab.dmg);
    expect(s.rival.hp).toBe(SPAR.hp - ATTACKS.jab.dmg);
    expect(s.rival.x).toBeGreaterThan(x0);
  });
  it('out of range it whiffs; a block takes almost nothing', () => {
    const s = new Spar(RIVALS[0], calm); run(s, 2.3);
    s.nico.x = s.rival.x - 200;
    expect(run(s, 0.5, t => ({ kick: t < 0.02 })).some(e => e.kind === 'whiff')).toBe(true);
    s.nico.x = s.rival.x - 116; s.rival.state = 'block'; s.rival.face = -1;
    (s as unknown as { blockFor: number }).blockFor = 2;
    const ev = run(s, 0.6, t => ({ kick: t < 0.02 }));
    expect(ev.some(e => e.kind === 'blocked')).toBe(true);
    expect(s.rival.hp).toBeGreaterThan(SPAR.hp - 3);
  });
  it('landing hits fills the Kihap meter, which lets loose a spinning kick (it goes through a block)', () => {
    const s = new Spar(RIVALS[0], calm); run(s, 2.3);
    s.nico.meter = 100; s.nico.x = s.rival.x - 136; s.rival.state = 'block'; (s as unknown as { blockFor: number }).blockFor = 2;
    const ev = run(s, 0.8, t => ({ spin: t < 0.02 }));
    expect(ev.find(e => e.kind === 'hit')?.attack).toBe('spin');
    expect(s.nico.meter).toBeLessThan(100);
  });
  it('the instructors fight back: left standing, Nico loses (each one, the toughest fastest)', () => {
    const times: number[] = [];
    for (const r of RIVALS) {
      let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const s = new Spar(r, rnd); let t = 0;
      for (; t < 70 && !s.over; t += 1 / 60) s.update(1 / 60, none);
      expect(s.over).toBe(true); expect(s.winner).toBe('rival');
      times.push(t);
    }
    expect(times[3]).toBeLessThan(times[0]);
  });
  it('a kid mashing buttons can beat Erin', () => {
    let wins = 0;
    for (let g = 0; g < 10; g++) {
      let seed = 7 + g; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const s = new Spar(RIVALS[0], rnd);
      for (let t = 0, k = 0; t < 70 && !s.over; t += 1 / 60, k++) {
        const d = s.rival.x - s.nico.x;
        s.update(1 / 60, { ...none, right: d > 126, punch: k % 20 === 0 && d < 126, kick: k % 33 === 0, spin: s.nico.meter >= 100 });
      }
      if (s.winner === 'nico') wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(5);
  });
});
