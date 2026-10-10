// Floating thumbstick (touch/mouse) plus keyboard. The stick appears where the finger
// lands and steers until it lifts, even if the finger leaves the stick area.

export const STICK_R = 60;      // CSS px from centre to full deflection
export const DEADZONE = 0.12;

/** Finger offset from the stick centre -> movement vector, length 0..1. */
export function stickVector(dx: number, dy: number, R = STICK_R, dead = DEADZONE): [number, number] {
  const d = Math.hypot(dx, dy);
  if (d < dead * R) return [0, 0];
  const m = Math.min(1, (d - dead * R) / (R * (1 - dead)));
  return [dx / d * m, dy / d * m];
}

export class Input {
  vx = 0; vy = 0;
  private keys = new Set<string>();
  private touch = { id: -1, cx: 0, cy: 0, x: 0, y: 0 };
  private base: HTMLElement; private knob: HTMLElement;

  /** A touch that lands where this says true goes to `onTap` instead of starting the stick. */
  reserved: (x: number, y: number) => boolean = () => false;
  onTap: (x: number, y: number) => void = () => {};

  constructor(surface: HTMLElement) {
    this.base = document.createElement('div'); this.base.className = 'stick-base';
    this.knob = document.createElement('div'); this.knob.className = 'stick-knob';
    this.base.appendChild(this.knob); document.body.appendChild(this.base);

    surface.addEventListener('pointerdown', e => {
      if (this.touch.id !== -1) return;
      if (this.reserved(e.clientX, e.clientY)) { this.onTap(e.clientX, e.clientY); e.preventDefault(); return; }
      surface.setPointerCapture(e.pointerId);
      this.touch = { id: e.pointerId, cx: e.clientX, cy: e.clientY, x: e.clientX, y: e.clientY };
      this.base.style.display = 'block';
      this.base.style.left = `${e.clientX}px`; this.base.style.top = `${e.clientY}px`;
      this.update(); e.preventDefault();
    });
    surface.addEventListener('pointermove', e => {
      if (e.pointerId !== this.touch.id) return;
      this.touch.x = e.clientX; this.touch.y = e.clientY; this.update();
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.touch.id) return;
      this.touch.id = -1; this.base.style.display = 'none'; this.update();
    };
    surface.addEventListener('pointerup', end);
    surface.addEventListener('pointercancel', end);
    window.addEventListener('keydown', e => { this.keys.add(e.key.toLowerCase()); this.update(); });
    window.addEventListener('keyup', e => { this.keys.delete(e.key.toLowerCase()); this.update(); });
    window.addEventListener('blur', () => { this.keys.clear(); this.update(); });
  }

  private update() {
    if (this.touch.id !== -1) {
      let dx = this.touch.x - this.touch.cx, dy = this.touch.y - this.touch.cy;
      [this.vx, this.vy] = stickVector(dx, dy);
      const d = Math.hypot(dx, dy);
      if (d > STICK_R) { dx *= STICK_R / d; dy *= STICK_R / d; }
      this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
      return;
    }
    const k = this.keys;
    const x = (+(k.has('d') || k.has('arrowright'))) - (+(k.has('a') || k.has('arrowleft')));
    const y = (+(k.has('s') || k.has('arrowdown'))) - (+(k.has('w') || k.has('arrowup')));
    const m = Math.hypot(x, y) || 1;
    this.vx = x / m; this.vy = y / m;
  }
}
