// Brick Breaker, on a cabinet in Alpha's Retro Games: bounce the ball off your paddle and knock out the wall of
// bricks. Where it hits the paddle sets the angle (the edges send it off steep); it gets a little faster with every
// brick. Three balls; clear the wall for the next, faster level. Drag on the screen (or the arrows) to move the
// paddle; FIRE launches. Pure rules; games.ts draws it.
import type { Key } from './blasters';
export const BR = { w: 420, h: 300, padY: 282, padW: 66, padH: 8, padSpeed: 320, r: 4.5, speed: 200, faster: 4, top: 340, cols: 10, rows: 5, bw: 38, bh: 12, gap: 3, y0: 40, lives: 3 };
export interface Brick { x: number; y: number; row: number; alive: boolean }

export class Bricks {
  pad = BR.w / 2; aimX: number | null = null;
  ball = { x: BR.w / 2, y: BR.padY - 10, vx: 0, vy: 0, stuck: true };
  bricks: Brick[] = []; speed = BR.speed;
  score = 0; lives = BR.lives; level = 1; over = false;
  constructor(private rnd: () => number = Math.random) { this.build(); }
  build() {
    this.bricks = []; const x0 = (BR.w - (BR.cols * BR.bw + (BR.cols - 1) * BR.gap)) / 2;
    for (let r = 0; r < BR.rows; r++) for (let c = 0; c < BR.cols; c++) this.bricks.push({ x: x0 + c * (BR.bw + BR.gap), y: BR.y0 + r * (BR.bh + BR.gap), row: r, alive: true });
    this.speed = BR.speed * (1 + 0.12 * (this.level - 1)); this.stick();
  }
  private stick() { Object.assign(this.ball, { stuck: true, vx: 0, vy: 0, x: this.pad, y: BR.padY - BR.r - 1 }); }
  press(k: Key) { if (k === 'fire' || k === 'up') this.launch(); }
  aim(x: number) { this.aimX = x; }
  launch() {
    if (!this.ball.stuck || this.over) return;
    const a = (this.rnd() - 0.5) * 0.9; this.ball.stuck = false; this.ball.vx = Math.sin(a) * this.speed; this.ball.vy = -Math.cos(a) * this.speed;
  }
  update(dt: number, held: Set<Key>): string[] {
    if (this.over) return [];
    const ev: string[] = [];
    const d = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
    if (d) { this.pad += d * BR.padSpeed * dt; this.aimX = null; }
    else if (this.aimX !== null) { const m = BR.padSpeed * 1.6 * dt; this.pad += Math.max(-m, Math.min(m, this.aimX - this.pad)); }
    this.pad = Math.max(BR.padW / 2, Math.min(BR.w - BR.padW / 2, this.pad));
    const b = this.ball;
    if (b.stuck) { b.x = this.pad; b.y = BR.padY - BR.r - 1; if (held.has('fire')) this.launch(); return ev; }
    const n = Math.ceil(Math.hypot(b.vx, b.vy) * dt / 3);
    for (let i = 0; i < n && !b.stuck; i++) this.move(dt / n, ev);
    return ev;
  }
  private move(dt: number, ev: string[]) {
    const b = this.ball, r = BR.r;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < r) { b.x = r; b.vx = Math.abs(b.vx); ev.push('wall'); }
    if (b.x > BR.w - r) { b.x = BR.w - r; b.vx = -Math.abs(b.vx); ev.push('wall'); }
    if (b.y < r) { b.y = r; b.vy = Math.abs(b.vy); ev.push('wall'); }
    // the paddle
    if (b.vy > 0 && b.y + r >= BR.padY && b.y - r <= BR.padY + BR.padH && Math.abs(b.x - this.pad) <= BR.padW / 2 + r) {
      const off = Math.max(-1, Math.min(1, (b.x - this.pad) / (BR.padW / 2))), a = off * 1.05;
      b.vx = Math.sin(a) * this.speed; b.vy = -Math.cos(a) * this.speed; b.y = BR.padY - r; ev.push('bounce');
    }
    // a brick
    const k = this.bricks.find(q => q.alive && b.x + r > q.x && b.x - r < q.x + BR.bw && b.y + r > q.y && b.y - r < q.y + BR.bh);
    if (k) {
      k.alive = false; this.score += (BR.rows - k.row) * 10; ev.push('brick');
      const px = Math.min(b.x + r - k.x, k.x + BR.bw - (b.x - r)), py = Math.min(b.y + r - k.y, k.y + BR.bh - (b.y - r));
      if (px < py) b.vx = -b.vx; else b.vy = -b.vy;
      this.speed = Math.min(BR.top, this.speed + BR.faster); const s = this.speed / Math.hypot(b.vx, b.vy); b.vx *= s; b.vy *= s;
      if (!this.bricks.some(q => q.alive)) { this.level++; this.score += 100; this.build(); ev.push('level'); return; }
    }
    if (b.y - r > BR.h) {
      this.lives--;
      if (this.lives <= 0) { this.over = true; ev.push('die'); } else { this.stick(); ev.push('lose'); }
    }
  }
}
