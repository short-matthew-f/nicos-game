import { describe, it, expect } from 'vitest';
import { Exam, EXAM, FRAMES, PATIENTS, patientsToday, framesOf, glassesKey } from '../src/eyes';

describe('eye exams with Dr. Nonna', () => {
  it('always picking the clearer lens homes in on the prescription: 3 stars', () => {
    for (let i = 0; i < 200; i++) {
      const e = new Exam(Exam.random());
      while (!e.done) e.pick(e.better);
      expect(e.stars).toBe(3); expect(e.picks).toBe(EXAM.picks);
    }
  });
  it('picking the blurry one gets fewer stars', () => {
    const e = new Exam(3); while (!e.done) e.pick(e.better === 1 ? 2 : 1); expect(e.stars).toBeLessThan(3);
  });
  it('prescriptions are in quarters between -3.5 and +3.5', () => {
    for (let i = 0; i < 100; i++) { const r = Exam.random(); expect(Math.abs(r)).toBeLessThanOrEqual(3.5); expect(r * 4).toBe(Math.round(r * 4)); }
  });
  it('patients without glasses come first; frames are saved per person', () => {
    const scores = { [glassesKey('maya')]: 2, [glassesKey('leo')]: 1, [glassesKey('sam')]: 3, [glassesKey('ava')]: 4 };
    const today = patientsToday(scores, () => 0.3);
    expect(today.slice(0, 2).map(p => p.who).sort()).toEqual(['mrbrooks', 'mrskim']);
    expect(framesOf(scores, 'maya')).toBe(FRAMES[1]); expect(framesOf(scores, 'mrkim')).toBeNull();
  });
  it('only made-up townspeople are patients (never the family)', () => {
    for (const p of PATIENTS) expect(['nico', 'james', 'primo', 'tempo', 'poppop', 'nonna', 'yiayia', 'rea', 'yarosh', 'alpha'].includes(p.who)).toBe(false);
  });
});
