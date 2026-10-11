// Closed paths for cars: corner-smoothed polylines walked by arc length.
export type P = [number, number];

/** Round each corner of a closed polygon with a quadratic curve of reach R, keeping the
 * straight runs straight (cars stay in lane until the turn). */
export function roundCorners(pts: P[], R0 = 90, steps = 10): P[] {
  const out: P[] = [];
  for (let i = 0; i < pts.length; i++) {
    const q = pts[(i + pts.length - 1) % pts.length], p = pts[i], n = pts[(i + 1) % pts.length];
    const lu = Math.hypot(p[0] - q[0], p[1] - q[1]), lv = Math.hypot(n[0] - p[0], n[1] - p[1]);
    const R = Math.min(R0, lu / 2, lv / 2);   // (a short run between two corners shares it out)
    const a: P = [p[0] - (p[0] - q[0]) / lu * R, p[1] - (p[1] - q[1]) / lu * R];
    const b: P = [p[0] + (n[0] - p[0]) / lv * R, p[1] + (n[1] - p[1]) / lv * R];
    for (let k = 0; k <= steps; k++) {
      const t = k / steps, u = 1 - t;
      out.push([u * u * a[0] + 2 * u * t * p[0] + t * t * b[0], u * u * a[1] + 2 * u * t * p[1] + t * t * b[1]]);
    }
  }
  return out;
}

/** Chaikin corner cutting on a closed polygon. */
export function smooth(pts: P[], iters = 4): P[] {
  let p = pts;
  for (let k = 0; k < iters; k++) {
    const q: P[] = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      q.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    p = q;
  }
  return p;
}

export class Loop {
  readonly cum: number[] = [0];
  readonly length: number;
  constructor(readonly pts: P[]) {
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      this.cum.push(this.cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    this.length = this.cum[pts.length];
  }
  at(s: number): P {
    s = ((s % this.length) + this.length) % this.length;
    let lo = 0, hi = this.pts.length;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (this.cum[m] <= s) lo = m; else hi = m; }
    const a = this.pts[lo], b = this.pts[(lo + 1) % this.pts.length];
    const u = (s - this.cum[lo]) / (this.cum[lo + 1] - this.cum[lo] || 1);
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  }
  heading(s: number, look = 24): number {
    const a = this.at(s - look), b = this.at(s + look);
    return Math.atan2(b[1] - a[1], b[0] - a[0]);
  }
}
