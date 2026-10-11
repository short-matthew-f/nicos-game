// The Litchfield Tang Soo Do emblem (Nico's school; the user shared it on 2026-10-11, reference only: this is a
// redrawing, not the image): a red-edged navy ring with the school's name round the top and 당수도 along the
// bottom, and inside, on white, a red and blue swirl coiling out from a little red-and-blue centre.
import { Container, Graphics, Text } from 'pixi.js';

const NAVY = '#24357A', RED = '#C8282D', WHITE = '#FFFFFF';

/** The emblem, centred on (0, 0), `r` px in radius. `words`: draw the lettering (too small to read below ~40). */
export function emblem(r: number, words = r >= 40): Container {
  const c = new Container(), g = new Graphics();
  g.circle(0, 0, r).fill(RED).circle(0, 0, r * 0.955).fill(NAVY).circle(0, 0, r * 0.69).fill(RED).circle(0, 0, r * 0.665).fill(WHITE);
  // the swirl: two bands, red and blue, coiling outward from the centre, thick near the middle and thinning to a point
  const sw = new Graphics(); sw.scale.y = -1;   // (turning the way the school's swirl turns)
  const coil = (color: string, turn: number) => {
    const n = 60;
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const at = (t: number) => { const a = turn + t * Math.PI * 1.0, rr = r * (0.24 + 0.38 * t); return [Math.cos(a) * rr, Math.sin(a) * rr]; };
      const [x0, y0] = at(t0), [x1, y1] = at(t1);
      sw.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: Math.max(0.6, r * 0.19 * (1 - t0 * 0.95)), color, cap: 'round' });
    }
  };
  coil(RED, Math.PI); coil(NAVY, 0);
  // the centre: red over blue with an S between them
  const k = r * 0.22, mid = new Graphics();
  mid.circle(0, 0, k).fill(NAVY);
  mid.arc(0, 0, k, Math.PI, 0).fill(RED);
  mid.circle(-k / 2, 0, k / 2).fill(RED).circle(k / 2, 0, k / 2).fill(NAVY);
  c.addChild(g, sw, mid);
  if (words) {
    const style = { fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '900' as const, fontSize: r * 0.175, fill: WHITE };
    const name = 'LITCHFIELD TANG SOO DO', span = Math.PI * 1.3, mid = -Math.PI / 2, rr = r * 0.825;
    [...name].forEach((ch, i) => {
      const a = mid - span / 2 + span * (i + 0.5) / name.length;
      const t = new Text({ text: ch, style }); t.anchor.set(0.5); t.position.set(Math.cos(a) * rr, Math.sin(a) * rr); t.rotation = a + Math.PI / 2; c.addChild(t);
    });
    const ko = new Text({ text: '당수도', style: { ...style, fontSize: r * 0.2, letterSpacing: r * 0.09 } }); ko.anchor.set(0.5); ko.position.set(0, r * 0.82); c.addChild(ko);
  }
  return c;
}
