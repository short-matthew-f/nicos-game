import { describe, it, expect } from 'vitest';
import { Rhythm, SONGS, chartOf, songLength, WINDOW, LEAD } from '../src/rhythm';

describe('pad rhythm', () => {
  it('every chart is whole bars of eighths, only punches, kicks and kihaps, and starts after the count-in', () => {
    for (const s of SONGS) {
      expect(s.chart.length % 8).toBe(0);
      expect(/^[PKH.]+$/.test(s.chart)).toBe(true);
      const c = chartOf(s); expect(c.length).toBeGreaterThan(15); expect(c[0].t).toBeGreaterThanOrEqual(LEAD);
      expect(songLength(s)).toBeLessThan(75);
    }
  });
  it('the songs get harder: faster and busier', () => {
    const density = SONGS.map(s => chartOf(s).length / songLength(s));
    expect(SONGS[0].bpm).toBeLessThan(SONGS[2].bpm); expect(density[0]).toBeLessThan(density[2]);
  });
  it('hitting on the beat is perfect, a bit off is great or ok, too far is nothing, and passing notes miss', () => {
    const r = new Rhythm(SONGS[0]), n = r.notes[0];
    expect(r.press(n.type, n.t + 0.02)?.judge).toBe('perfect');
    const m = r.notes.find(q => !q.judged && q.type === 'P')!;
    expect(r.press('P', m.t - 0.1)?.judge).toBe('great');
    const o = r.notes.find(q => !q.judged && q.type === 'P')!;
    expect(r.press('P', o.t + 0.17)?.judge).toBe('ok');
    expect(r.press('P', -5)).toBeNull();
    const missed = r.update(r.notes[5].t + WINDOW.ok + 0.01);
    expect(missed.length).toBeGreaterThan(0); expect(r.combo).toBe(0);
  });
  it('a perfect run is an S, with a combo the length of the song; doing nothing is a D', () => {
    const r = new Rhythm(SONGS[1]);
    for (const n of [...r.notes]) r.press(n.type, n.t);
    r.update(songLength(SONGS[1]) + 1);
    expect(r.grade).toBe('S'); expect(r.best).toBe(r.notes.length); expect(r.done).toBe(true);
    const z = new Rhythm(SONGS[1]); z.update(999); expect(z.grade).toBe('D'); expect(z.score).toBe(0);
  });
});
