// Pad rhythm at the dojo (the user, 2026-10-11: "Kick and punch practice that feels like a rhythm game"). An instructor
// holds the pads; punches, kicks and kihaps slide in along the track in time with a drum beat, and Nico hits them as
// they reach the line: Perfect, Great, OK or Miss, a combo that builds, a grade at the end and a best score per song.
// The charts are data: one character per eighth note. Pure; dojoGames.ts plays the music and draws it.

export type Note = 'P' | 'K' | 'H';   // punch, kick, kihap
export interface Song { id: string; name: string; bpm: number; holder: string; chart: string; swing?: number }
const bars = (...b: string[]) => b.join('');
export const SONGS: Song[] = [
  { id: 'warmup', name: 'Warm-Up', bpm: 92, holder: 'erin', chart: bars(
    '........', 'P...P...', 'P...P...', 'K.......', 'P...P...', 'K...K...', 'P.P.K...', 'H.......',
    'P...K...', 'P...K...', 'P.P.P...', 'K...K...', 'P...P...', 'K...P...', 'P.P.K...', 'H.......') },
  { id: 'hanadul', name: 'Hana Dul Set', bpm: 110, holder: 'mrskrantz', chart: bars(
    '........', 'P.P.K...', 'P.P.K...', 'P.K.P.K.', 'H.......', 'K.K.P...', 'P.P.P.K.', 'K...K.P.', 'H.......',
    'P.PKP...', 'K.P.K.P.', 'P.P.K.K.', 'H...H...', 'P.K.P.K.', 'PPK.PPK.', 'K.K.K...', 'H.......') },
  { id: 'blackbelt', name: 'Black Belt Beat', bpm: 128, holder: 'schindewolf', chart: bars(
    '........', 'P.PKP.PK', 'K.K.P.P.', 'PPK.PPK.', 'H...H...', 'P.K.KP.K', 'PPPKPPPK', 'K.PK.PK.', 'H.H.H...',
    'PKPKPKPK', 'K..K..P.', 'PP.KPP.K', 'H.......', 'P.KPK.PK', 'KPKPKPP.', 'PPKKPPKK', 'H.H.H.H.', 'H.......') },
];
export const WINDOW = { perfect: 0.075, great: 0.13, ok: 0.2 };
export type Judge = 'perfect' | 'great' | 'ok' | 'miss';
export const POINTS: Record<Judge, number> = { perfect: 300, great: 200, ok: 100, miss: 0 };
export const LEAD = 2.4;   // s before the first beat (a bar's count-in)

export interface Chart { t: number; type: Note; judged?: Judge }
/** The notes, with when each should be hit (s from the start). */
export function chartOf(song: Song): Chart[] {
  const eighth = 60 / song.bpm / 2, out: Chart[] = [];
  [...song.chart].forEach((c, i) => { if (c === 'P' || c === 'K' || c === 'H') out.push({ t: LEAD + i * eighth, type: c }); });
  return out;
}
export const songLength = (song: Song) => LEAD + song.chart.length * 60 / song.bpm / 2 + 1.2;

export class Rhythm {
  notes: Chart[]; score = 0; combo = 0; best = 0; counts: Record<Judge, number> = { perfect: 0, great: 0, ok: 0, miss: 0 };
  done = false;
  constructor(readonly song: Song) { this.notes = chartOf(song); }
  /** A button pressed at song time `t`: judges the nearest unjudged note of that kind in the window. */
  press(type: Note, t: number): { judge: Judge; note: Chart } | null {
    let best: Chart | null = null, bd = Infinity;
    for (const n of this.notes) if (!n.judged && n.type === type) { const d = Math.abs(n.t - t); if (d < bd) { bd = d; best = n; } }
    if (!best || bd > WINDOW.ok) return null;   // (a stray press: no penalty, it's practice)
    const judge: Judge = bd <= WINDOW.perfect ? 'perfect' : bd <= WINDOW.great ? 'great' : 'ok';
    this.mark(best, judge);
    return { judge, note: best };
  }
  /** Time passing: notes that have gone by unhit are misses. */
  update(t: number): Chart[] {
    const missed: Chart[] = [];
    for (const n of this.notes) if (!n.judged && t - n.t > WINDOW.ok) { this.mark(n, 'miss'); missed.push(n); }
    if (t >= songLength(this.song)) this.done = true;
    return missed;
  }
  private mark(n: Chart, j: Judge) {
    n.judged = j; this.counts[j]++;
    if (j === 'miss') { this.combo = 0; return; }
    this.combo++; this.best = Math.max(this.best, this.combo);
    this.score += Math.round(POINTS[j] * (1 + Math.min(1, this.combo / 20)) * (n.type === 'H' ? 1.5 : 1));
  }
  /** How well it went: the share of perfect-equivalent points, and a grade. */
  get accuracy() { const n = this.notes.length; return n ? (this.counts.perfect + 0.75 * this.counts.great + 0.4 * this.counts.ok) / n : 0; }
  get grade() { const a = this.accuracy; return a >= 0.95 ? 'S' : a >= 0.85 ? 'A' : a >= 0.7 ? 'B' : a >= 0.5 ? 'C' : 'D'; }
}
