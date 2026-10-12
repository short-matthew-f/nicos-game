import { describe, it, expect } from 'vitest';
import { CASES, Steady, channel, distToPath, XRay, XRAY, STEADY } from '../src/surgery';

/** Walk the tweezers along the middle of the opening (and back), as a steady hand would. */
function steadyRun(s: Steady) {
  const ev: string[] = []; const p = s.path;
  ev.push(...s.down(...p[0]));
  const walk = (pts: [number, number][]) => { for (let i = 0; i + 1 < pts.length; i++) for (let k = 1; k <= 20; k++) ev.push(...s.move(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k / 20, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k / 20)); };
  walk(p); walk([...p].reverse());
  return ev;
}
describe('Steady hands with Dr. Poppop', () => {
  it('every case: the opening stays on the table and gets narrower', () => {
    for (const c of CASES) for (const [x, y] of channel(c)) { expect(x).toBeGreaterThan(30); expect(x).toBeLessThan(610); expect(y).toBeGreaterThan(60); expect(y).toBeLessThan(380); }
    for (let i = 1; i < CASES.length; i++) expect(CASES[i].width).toBeLessThan(CASES[i - 1].width);
  });
  it('a steady hand: in, grab it, out: three stars', () => {
    for (const c of CASES) { const s = new Steady(c); const ev = steadyRun(s); expect(ev).toContain('grab'); expect(ev).toContain('done'); expect(s.phase).toBe('done'); expect(s.stars).toBe(3); }
  });
  it('touch the side: BZZT, you let go (and drop it if you had it); three and Poppop takes over', () => {
    const s = new Steady(CASES[0]); s.down(...s.path[0]);
    expect(s.move(s.path[0][0], s.path[0][1] - 200)).toContain('buzz'); expect(s.holding).toBe(false);
    expect(s.move(300, 300)).toEqual([]);   // (not holding: nothing happens)
    s.down(...s.tip); s.move(s.tip[0], s.tip[1] + 200); s.down(...s.tip); expect(s.move(s.tip[0] + 300, s.tip[1] - 300)).toContain('fail'); expect(s.phase).toBe('failed');
  });
  it('distance to the path', () => { expect(distToPath([[0, 0], [10, 0]], 5, 3)).toBeCloseTo(3); });
});
describe('X-ray detective', () => {
  it('the thing is somewhere in the tummy; tap it to find it, then the next patient', () => {
    const x = new XRay(() => 0.4); const { x: cx, y: cy, rx, ry } = XRAY.tummy;
    expect(((x.at[0] - cx) / rx) ** 2 + ((x.at[1] - cy) / ry) ** 2).toBeLessThan(1);
    expect(x.tap(x.at[0] + 200, x.at[1])).toEqual(['nope']);
    expect(x.tap(x.at[0] + 5, x.at[1] - 5)).toEqual(['found']); expect(x.score).toBeGreaterThan(0);
    let ev: string[] = []; for (let t = 0; t < 3; t += 0.1) ev = ev.concat(x.update(0.1)); expect(ev).toContain('next'); expect(x.round).toBe(1);
  });
  it('run out of time: missed; five patients and done', () => {
    const x = new XRay(); const ev: string[] = [];
    for (let t = 0; t < XRAY.rounds * (XRAY.time + 3); t += 0.1) ev.push(...x.update(0.1));
    expect(ev.filter(e => e === 'timeout').length).toBe(XRAY.rounds); expect(ev).toContain('done'); expect(x.found).toBe(0);
  });
  it('the opening is narrow enough to need a steady hand', () => { expect(STEADY.grab).toBeLessThan(CASES[0].width); });
});
