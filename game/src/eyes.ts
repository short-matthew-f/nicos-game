// Eye exams with Dr. Nonna (the user, 2026-10-12: Nonna was an ophthalmologist; "In the hospital they're Dr."). A
// patient from town sits at the big lens machine. "Better one... or two?": Nico looks through two lenses at the eye
// chart and picks the clearer, again and again, homing in on the patient's prescription; then the patient reads the
// chart back. Then the fun part: picking their new frames, which they wear round town from then on. The patients
// are the made-up townspeople (never the family or real people, whose looks come from photos). Pure; eyesView.ts
// draws it.
export const PATIENTS = [
  { who: 'maya', name: 'Maya' }, { who: 'leo', name: 'Leo' }, { who: 'mrskim', name: 'Mrs. Kim' },
  { who: 'sam', name: 'Sam' }, { who: 'ava', name: 'Ava' }, { who: 'mrbrooks', name: 'Mr. Brooks' },
];
export interface Frame { id: string; name: string; color: string; shape: 'round' | 'rect' | 'soft' | 'cat' }
export const FRAMES: Frame[] = [
  { id: 'round', name: 'Round gold', color: '#C9A040', shape: 'round' },
  { id: 'square', name: 'Square black', color: '#1E2733', shape: 'rect' },
  { id: 'tortoise', name: 'Tortoiseshell', color: '#8A5428', shape: 'soft' },
  { id: 'red', name: 'Bright red', color: '#E5484D', shape: 'rect' },
  { id: 'blue', name: 'Sky blue', color: '#2F7FD8', shape: 'round' },
  { id: 'cat', name: 'Purple cat-eye', color: '#7B5BA6', shape: 'cat' },
];
export const EXAM = { start: 2, picks: 4, patients: 3 };
/** The saved frames (scores['glasses:<who>'] = 1 + index into FRAMES). */
export const glassesKey = (who: string) => `glasses:${who}`;
export const framesOf = (scores: Record<string, number>, who: string): Frame | null => FRAMES[(scores[glassesKey(who)] ?? 0) - 1] ?? null;

export class Exam {
  mid = 0; step = EXAM.start; picks = 0;
  constructor(readonly rx: number) {}
  /** A new patient's prescription: -3.5 to +3.5, in quarters. */
  static random(rnd: () => number = Math.random) { return Math.round((rnd() * 7 - 3.5) * 4) / 4; }
  get lens1() { return this.mid - this.step; }
  get lens2() { return this.mid + this.step; }
  get done() { return this.picks >= EXAM.picks; }
  /** How blurry the chart looks through a lens (0: sharp). */
  blur(lens: number) { return Math.abs(lens - this.rx); }
  pick(which: 1 | 2) { if (this.done) return; this.mid = which === 1 ? this.lens1 : this.lens2; this.step /= 2; this.picks++; }
  /** How well it went: 3 stars spot on, 2 close, 1 off. */
  get stars() { const e = Math.abs(this.mid - this.rx); return e <= 0.26 ? 3 : e <= 0.76 ? 2 : 1; }
  /** The clearer of the two (for tests, and a hint). */
  get better(): 1 | 2 { return this.blur(this.lens1) <= this.blur(this.lens2) ? 1 : 2; }
}
/** Who's waiting today: patients without glasses first, then anyone who fancies new frames. */
export function patientsToday(scores: Record<string, number>, rnd: () => number = Math.random, n = EXAM.patients) {
  const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const none = shuffle(PATIENTS.filter(p => !framesOf(scores, p.who))), have = shuffle(PATIENTS.filter(p => framesOf(scores, p.who)));
  return [...none, ...have].slice(0, n);
}
