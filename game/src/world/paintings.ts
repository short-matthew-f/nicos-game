// Yia-Yia's own paintings, redrawn in the game's flat style from photos of her real ones (the photos stay
// out of the repo). Each is drawn w x h from (0, 0) and clipped to its canvas, so nothing pokes out.
//  0: long grass blades sweeping round a carved stone pillar (a fish carved on its band), one pink flower,
//     on a gold mosaic of dabs.
//  1: a fair-haired little girl with a fringe and big blue-green eyes, wrapped in a loose white gown,
//     sitting on a teal floor against a deep olive wall.
import { Container, Graphics } from 'pixi.js';

let seed = 1;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/** A grass blade: a long, wavy, tapering ribbon along a cubic curve p0 -> (c1, c2) -> p1 (it can arch over and droop). */
function blade(g: Graphics, [x0, y0, ax, ay, bx, by, x1, y1]: number[], wid: number, dark: string, light: string) {
  const N = 22, L: [number, number][] = [], R: [number, number][] = [], mid: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, u = 1 - t;
    const x = u * u * u * x0 + 3 * u * u * t * ax + 3 * u * t * t * bx + t * t * t * x1, y = u * u * u * y0 + 3 * u * u * t * ay + 3 * u * t * t * by + t * t * t * y1;
    const dx = 3 * u * u * (ax - x0) + 6 * u * t * (bx - ax) + 3 * t * t * (x1 - bx), dy = 3 * u * u * (ay - y0) + 6 * u * t * (by - ay) + 3 * t * t * (y1 - by), d = Math.hypot(dx, dy) || 1;
    const half = wid * (1 - t) * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, t * 1.6)));   // (widest a third of the way along, to a point)
    L.push([x - dy / d * half, y + dx / d * half]); R.push([x + dy / d * half, y - dx / d * half]); mid.push([x, y]);
  }
  g.poly([...L, ...R.reverse()].flat()).fill(dark);
  g.moveTo(mid[1][0], mid[1][1]); for (const [x, y] of mid.slice(2, N - 1)) g.lineTo(x, y);
  g.stroke({ width: Math.max(1, wid * 0.22), color: light, alpha: 0.85 });
}

export function yiayiaPainting(which: 0 | 1, w: number, h: number): Container {
  const c = new Container(), g = new Graphics(), mask = new Graphics().rect(0, 0, w, h).fill(0xffffff);
  c.addChild(g, mask); c.mask = mask;
  seed = which ? 77 : 41;
  if (which === 0) {
    // the gold mosaic: little square dabs of ochre, olive and cream all over
    g.rect(0, 0, w, h).fill('#C9A445');
    const dab = Math.max(2.5, w / 60);
    for (let i = 0; i < (w * h) / (dab * dab * 1.6); i++) {   // soft dabs, scattered, not on a grid
      const r = rnd(), x = rnd() * w, y = rnd() * h, s = dab * (0.6 + rnd() * 0.8);
      g.roundRect(x, y, s, s * (0.7 + rnd() * 0.5), s * 0.3).fill({ color: r < 0.3 ? '#E8CF7A' : r < 0.5 ? '#B59A3E' : r < 0.72 ? '#F1E3B0' : r < 0.88 ? '#9C9A4E' : '#D9B85A', alpha: 0.55 });
    }
    // dark leafy shade behind the grass on the left (dabbed, like the rest)
    g.ellipse(w * 0.24, h * 0.56, w * 0.19, h * 0.29).fill({ color: '#2A3420', alpha: 0.8 });
    for (let i = 0; i < 700; i++) { const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * 1.1; g.roundRect(w * 0.24 + Math.cos(a) * rr * w * 0.2, h * 0.56 + Math.sin(a) * rr * h * 0.3, dab * 1.3, dab * 1.3, dab * 0.4).fill({ color: rnd() < 0.55 ? '#2A3420' : rnd() < 0.7 ? '#45542C' : '#5E6E36', alpha: 0.8 }); }
    // the stone pillar: a top slab, the carved capital, the band with the fish, a lower band, the fluted column
    const P = (x: number) => w * x, Q = (y: number) => h * y, stone = '#E7E3DA', shadow = '#C9C3B6';
    g.rect(P(0.53), Q(0.17), P(0.24), Q(0.06)).fill(stone).rect(P(0.53), Q(0.21), P(0.24), Q(0.02)).fill(shadow);
    g.rect(P(0.44), Q(0.23), P(0.4), Q(0.12)).fill(stone);
    for (let i = 1; i <= 4; i++) g.ellipse(P(0.64), Q(0.36), P(0.04 + i * 0.04), Q(0.02 + i * 0.022)).stroke({ width: Math.max(1, w / 260), color: '#B9B2A2', alpha: 0.8 });   // carved arcs
    g.rect(P(0.44), Q(0.33), P(0.4), Q(0.03)).fill(shadow);
    g.rect(P(0.48), Q(0.38), P(0.32), Q(0.13)).fill('#9F9AA8').rect(P(0.47), Q(0.36), P(0.34), Q(0.02)).fill(stone);
    g.ellipse(P(0.63), Q(0.445), P(0.085), Q(0.03)).fill('#3A3532').poly([P(0.71), Q(0.445), P(0.75), Q(0.41), P(0.75), Q(0.48)]).fill('#3A3532');   // the fish
    g.rect(P(0.46), Q(0.51), P(0.36), Q(0.08)).fill(stone).rect(P(0.46), Q(0.57), P(0.36), Q(0.02)).fill(shadow);
    g.rect(P(0.5), Q(0.59), P(0.28), Q(0.41)).fill('#F1EEE6');
    for (let i = 1; i < 7; i++) g.rect(P(0.5 + i * 0.04), Q(0.6), Math.max(1, w / 220), Q(0.4)).fill('#D6D0C2');   // flutes
    // a white picket-ish rail low on the left
    g.rect(0, Q(0.78), P(0.5), Q(0.05)).fill({ color: '#E7E3DA', alpha: 0.9 }).rect(P(0.08), Q(0.7), P(0.04), Q(0.3)).fill('#E7E3DA').rect(P(0.3), Q(0.66), P(0.04), Q(0.34)).fill('#E7E3DA');
    // the grass: long blades sweeping up from the bottom left, arching over the pillar, and a clump at the right
    const DK = ['#3B5A26', '#4A6B2E', '#2F4A1F'], LT = '#8FA65A', bw = w * 0.022;
    // [x0, y0, c1x, c1y, c2x, c2y, x1, y1] as fractions: up from the bottom left, arching over and drooping down,
    // some crossing the pillar's top, a few wavy ones on the right curling back in
    const sweeps: number[][] = [
      [0.02, 1.05, 0.0, 0.5, 0.15, 0.05, 0.4, 0.2], [0.05, 1.05, 0.1, 0.3, 0.45, 0.05, 0.58, 0.32], [0.1, 1.05, 0.2, 0.4, 0.55, 0.0, 0.78, 0.12],
      [0.0, 0.8, 0.05, 0.2, 0.2, 0.08, 0.28, 0.32], [0.08, 1.05, 0.25, 0.3, 0.5, 0.15, 0.62, 0.55], [0.16, 1.05, 0.3, 0.5, 0.42, 0.3, 0.38, 0.78],
      [0.03, 1.05, 0.05, 0.6, 0.25, 0.45, 0.3, 0.7], [0.2, 1.05, 0.25, 0.7, 0.45, 0.62, 0.56, 0.8], [0.12, 1.05, 0.1, 0.5, 0.0, 0.35, 0.05, 0.15],
      [0.26, 1.05, 0.38, 0.75, 0.6, 0.78, 0.66, 0.98], [0.18, 1.05, 0.5, 0.3, 0.7, 0.38, 0.62, 0.62], [0.3, 1.05, 0.32, 0.8, 0.5, 0.88, 0.48, 1.05],
      [0.06, 1.05, 0.3, 0.1, 0.62, 0.05, 0.92, 0.22], [0.22, 1.05, 0.4, 0.45, 0.66, 0.3, 0.72, 0.52],
      [1.02, 1.05, 0.8, 0.85, 0.92, 0.5, 0.78, 0.38], [0.98, 1.05, 0.9, 0.6, 1.05, 0.4, 0.92, 0.12], [0.95, 1.05, 0.72, 0.9, 0.7, 0.62, 0.86, 0.5],
      [1.02, 0.9, 0.8, 0.7, 0.85, 0.3, 0.98, 0.3], [0.9, 1.05, 0.98, 0.75, 0.8, 0.6, 0.84, 0.78],
    ];
    sweeps.forEach((q, i) => blade(g, q.map((v, k) => (k % 2 ? Q(v) : P(v))), bw * (0.8 + (i % 3) * 0.25), DK[i % 3], LT));
    // the pink flower among the grass on the left
    const fx = P(0.3), fy = Q(0.36), fr = w * 0.045;
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.3; g.circle(fx + Math.cos(a) * fr * 0.6, fy + Math.sin(a) * fr * 0.6, fr * 0.62).fill(i % 2 ? '#F2B6C4' : '#E99BB0'); }
    g.circle(fx, fy, fr * 0.28).fill('#C9708A').circle(fx, fy, fr * 0.12).fill('#F9E39A');
  } else {
    // the wall (deep olive, darker at the top) and the teal floor, with a soft line where they meet
    g.rect(0, 0, w, h * 0.66).fill('#4E5A2E');
    for (let i = 0; i < 8; i++) g.rect(0, h * 0.66 * i / 8, w, h * 0.66 / 8).fill({ color: '#6A7838', alpha: i / 14 });
    g.rect(0, h * 0.66, w, h * 0.34).fill('#2F6460').rect(0, h * 0.66, w, h * 0.04).fill({ color: '#3E7A70', alpha: 0.8 });
    const cx = w / 2, P = (x: number) => w * x, Q = (y: number) => h * y;
    // her reflection on the floor
    g.ellipse(cx, Q(0.86), P(0.3), Q(0.06)).fill({ color: '#CFE6E2', alpha: 0.25 });
    // the white gown: she sits cross-legged, the gown spreading into a wide soft heap; sleeves folded over her lap
    g.ellipse(cx, Q(0.76), P(0.36), Q(0.11)).fill('#F2F4EF');
    g.poly([cx - P(0.3), Q(0.76), cx - P(0.2), Q(0.5), cx - P(0.1), Q(0.42), cx + P(0.1), Q(0.42), cx + P(0.2), Q(0.5), cx + P(0.3), Q(0.76)]).fill('#F7F8F4');
    for (const sd of [-1, 1]) g.moveTo(cx + sd * P(0.17), Q(0.48)).quadraticCurveTo(cx + sd * P(0.22), Q(0.62), cx + sd * P(0.04), Q(0.66)).stroke({ width: Math.max(2, w / 70), color: '#E6EDE8' });   // sleeves, arms folded in her lap
    g.ellipse(cx + P(0.06), Q(0.79), P(0.27), Q(0.05)).fill('#D8EBEC').ellipse(cx - P(0.16), Q(0.8), P(0.12), Q(0.035)).fill('#C9E2E4');      // folds, pale blue
    g.moveTo(cx - P(0.22), Q(0.72)).quadraticCurveTo(cx - P(0.05), Q(0.7), cx + P(0.12), Q(0.74)).stroke({ width: Math.max(1, w / 140), color: '#D3E6E8' });
    g.moveTo(cx, Q(0.43)).lineTo(cx, Q(0.53)).stroke({ width: Math.max(1, w / 160), color: '#D9DCD6' });   // the neckline
    // her neck and face, and the hair: straight and fair, falling past her chin, with a full fringe
    g.rect(cx - P(0.035), Q(0.36), P(0.07), Q(0.07)).fill('#EFD0B8');
    g.ellipse(cx, Q(0.28), P(0.14), Q(0.11)).fill('#E3C46A');                                   // the crown
    g.poly([cx - P(0.14), Q(0.28), cx + P(0.14), Q(0.28), cx + P(0.15), Q(0.45), cx + P(0.08), Q(0.43), cx - P(0.08), Q(0.43), cx - P(0.15), Q(0.45)]).fill('#E3C46A');   // falling to the shoulders
    g.ellipse(cx, Q(0.325), P(0.095), Q(0.09)).fill('#F2D5BE');                                  // face
    g.rect(cx - P(0.105), Q(0.215), P(0.21), Q(0.065)).fill('#EBCD74');                          // the fringe
    for (let i = 0; i < 6; i++) g.rect(cx - P(0.1) + i * P(0.036), Q(0.215), Math.max(1, w / 220), Q(0.065)).fill({ color: '#C9A64E', alpha: 0.55 });
    for (const s2 of [-1, 1]) g.moveTo(cx + s2 * P(0.13), Q(0.3)).lineTo(cx + s2 * P(0.14), Q(0.44)).stroke({ width: Math.max(1, w / 200), color: '#C9A64E', alpha: 0.6 });
    // big blue-green eyes, a small nose, a pout
    for (const s of [-1, 1]) g.ellipse(cx + s * P(0.042), Q(0.32), P(0.03), Q(0.022)).fill('#FFFFFF').circle(cx + s * P(0.042), Q(0.32), P(0.02)).fill('#4E8E96').circle(cx + s * P(0.042), Q(0.32), P(0.009)).fill('#1E2A2E');
    g.ellipse(cx, Q(0.345), P(0.008), Q(0.006)).fill('#D9A88E').ellipse(cx, Q(0.37), P(0.022), Q(0.01)).fill('#D98A8A');
  }
  return c;
}
