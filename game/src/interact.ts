// Things Nico can use. Walking up to one shows its action button; tapping it (or E /
// Space / Enter) runs it. Places, the car and the playground are all spots.

export interface Spot {
  id: string;
  x: number; y: number; r: number;   // in reach within r of (x, y)
  label: string | (() => string);
  run: () => void;
  when?: () => boolean;              // only offered while this is true
}

/** The closest usable spot within reach of (x, y), or null. */
export function nearest(spots: Spot[], x: number, y: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of spots) {
    const d = Math.hypot(s.x - x, s.y - y);
    if (d <= s.r && d < bd && (!s.when || s.when())) { best = s; bd = d; }
  }
  return best;
}

export const labelOf = (s: Spot) => (typeof s.label === 'function' ? s.label() : s.label);

/** The big action button. */
export class ActionButton {
  private el = document.getElementById('action') as HTMLButtonElement;
  private current: Spot | null = null;
  constructor() {
    const fire = (e: Event) => { e.preventDefault(); this.current?.run(); };
    this.el.addEventListener('click', fire);
    window.addEventListener('keydown', e => {
      if (e.repeat || !this.current || document.querySelector('.modal:not([hidden]), #update:not([hidden])')) return;
      if (e.key === 'e' || e.key === 'E' || e.key === ' ' || e.key === 'Enter') fire(e);
    });
  }
  show(s: Spot | null) {
    this.current = s;
    this.el.hidden = !s;
    if (s) { const t = labelOf(s); if (this.el.textContent !== t) this.el.textContent = t; }
  }
  get spot() { return this.current; }
}
