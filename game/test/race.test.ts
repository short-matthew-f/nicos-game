import { describe, it, expect } from 'vitest';
import { COURSES, Race, RACE, nicoStart } from '../src/race';
import { SOLIDS, WORLD } from '../src/world/map';
import { freeAt, WALK_SPEED } from '../src/player';

describe('racing Tempo', () => {
  for (const c of COURSES) {
    it(`${c.name}: the course runs over open ground (nothing solid in the way)`, () => {
      const pts = [...c.path, c.flag];
      for (let i = 0; i + 1 < pts.length; i++) {
        const [a, b] = [pts[i], pts[i + 1]], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 8);
        for (let k = 0; k <= n; k++) { const x = a[0] + (b[0] - a[0]) * k / n, y = a[1] + (b[1] - a[1]) * k / n; expect(freeAt(x, y, SOLIDS, WORLD), `${c.id} at ${Math.round(x)},${Math.round(y)}`).toBe(true); }
      }
      expect(freeAt(...nicoStart(c), SOLIDS, WORLD)).toBe(true);
    });
    const run = (nicoSpeed: number) => {
      const r = new Race(c); let [nx, ny] = nicoStart(c);
      for (let t = 0; t < 80 && r.phase !== 'done'; t += 1 / 60) {
        r.update(1 / 60, nx, ny);
        if (r.phase === 'go') { const dx = c.flag[0] - nx, dy = c.flag[1] - ny, d = Math.hypot(dx, dy); if (d > 1) { nx += dx / d * nicoSpeed / 60; ny += dy / d * nicoSpeed / 60; } }
      }
      return r;
    };
    it(`${c.name}: Nico running flat out (straight for the flag) beats Tempo, just`, () => {
      const r = run(WALK_SPEED); expect(r.winner).toBe('nico');
      expect(Math.hypot(r.tempo.x - c.flag[0], r.tempo.y - c.flag[1])).toBeLessThan(400);   // (close!)
    });
    it(`${c.name}: dawdle and Tempo wins`, () => { expect(run(WALK_SPEED * 0.75).winner).toBe('tempo'); });
  }
  it('3, 2, 1, GO: nobody moves till GO', () => {
    const r = new Race(COURSES[0]); const x0 = r.tempo.x; const ev: string[] = [];
    for (let t = 0; t < RACE.count - 0.1; t += 1 / 60) ev.push(...r.update(1 / 60, 0, 0));
    expect(r.tempo.x).toBe(x0); expect(ev.filter(e => e === 'beep').length).toBe(2);
    for (let t = 0; t < 0.2; t += 1 / 60) ev.push(...r.update(1 / 60, 0, 0));
    expect(ev).toContain('go');
  });
});
