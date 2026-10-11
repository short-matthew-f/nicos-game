// The Snake cabinet on screen (Alpha's Retro Games): a marquee, a green-glow CRT with scanlines, a joystick
// pad of four arrow buttons and a START button. Swipe on the screen to steer too, or arrows / WASD on a
// keyboard. Drawn with a 2D canvas, a cell at a time.
import { Snake, GRID, type Dir } from './snake';
import { audio } from '../sound';

export interface ArcadeHost { high(): number; setHigh(n: number): void; opened(on: boolean): void }
const GLOW = '#4FE3C1', GOLD = '#F9C846', FOOD = '#FF5A7A', DIM = '#0B1E19';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e;
}
const bleep = {
  eat: () => audio.tone('square', 660, 990, 0.07, 0.05),
  gold: () => { for (let i = 0; i < 4; i++) audio.tone('square', 880 + i * 220, 880 + i * 220, 0.06, 0.05, i * 0.06); },
  die: () => { audio.tone('sawtooth', 440, 60, 0.6, 0.06); audio.noise(0.25, 0.15, 600); },
  start: () => { [523, 659, 784, 1047].forEach((f, i) => audio.tone('square', f, f, 0.08, 0.05, i * 0.08)); },
  turn: () => audio.tone('triangle', 220, 220, 0.03, 0.04),
};

export class Arcade {
  readonly el: HTMLElement;
  game: Snake | null = null;
  private screen: HTMLCanvasElement; private start: HTMLButtonElement; private scoreEl: HTMLElement; private highEl: HTMLElement;
  private raf = 0; private last = 0; private off: (() => void)[] = []; private t = 0; private best = 0; private flash = 0;
  private cell = 20;

  constructor(private host: ArcadeHost) {
    this.el = el('div', 'arcade'); this.el.id = 'arcade'; this.el.hidden = true;
    const cab = el('div', 'ac-cab');
    const marquee = el('div', 'ac-marquee'); marquee.append(el('b', '', 'SNAKE'), el('small', '', "ALPHA'S RETRO GAMES"));
    const bar = el('div', 'ac-bar'); this.scoreEl = el('span', '', 'SCORE 0'); this.highEl = el('span', '', 'HI 0'); bar.append(this.scoreEl, this.highEl);
    const bezel = el('div', 'ac-bezel'); this.screen = el('canvas', 'ac-screen');
    this.start = el('button', 'ac-start', 'PRESS START'); this.start.type = 'button';
    bezel.append(this.screen, this.start);
    cab.append(marquee, bar, bezel);
    const pad = el('div', 'ac-pad');
    const arrows: [Dir, string][] = [['up', '▲'], ['left', '◀'], ['right', '▶'], ['down', '▼']];
    for (const [d, s] of arrows) {
      const b = el('button', `ac-btn ac-${d}`, s); b.type = 'button'; b.setAttribute('aria-label', d);
      b.addEventListener('pointerdown', e => { e.preventDefault(); b.classList.add('on'); this.steer(d); });
      for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => b.classList.remove('on'));
      pad.append(b);
    }
    const close = el('button', 'ac-close', '✕'); close.type = 'button'; close.setAttribute('aria-label', 'Stop playing');
    this.el.append(cab, pad, close);
    document.body.append(this.el);
    // swipe on the screen to steer
    let sw: [number, number] | null = null;
    this.screen.addEventListener('pointerdown', e => { e.preventDefault(); sw = [e.clientX, e.clientY]; });
    this.screen.addEventListener('pointermove', e => {
      if (!sw) return; const dx = e.clientX - sw[0], dy = e.clientY - sw[1];
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      this.steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')); sw = [e.clientX, e.clientY];
    });
    for (const ev of ['pointerup', 'pointercancel']) this.screen.addEventListener(ev, () => { sw = null; });
    this.start.addEventListener('click', () => this.play());
    close.addEventListener('click', () => this.close());
    this.el.addEventListener('contextmenu', e => e.preventDefault());
  }
  get isOpen() { return !this.el.hidden; }
  open() {
    if (this.isOpen) return;
    this.el.hidden = false; this.host.opened(true);
    this.best = this.host.high(); this.game = null; this.showStart('PRESS START');
    const onKey = (e: KeyboardEvent) => this.key(e), onResize = () => this.layout();
    window.addEventListener('keydown', onKey, true); window.addEventListener('resize', onResize);
    this.off = [() => window.removeEventListener('keydown', onKey, true), () => window.removeEventListener('resize', onResize)];
    this.layout();
    this.last = performance.now();
    const loop = (now: number) => { this.raf = requestAnimationFrame(loop); this.frame(Math.min(1 / 20, (now - this.last) / 1000)); this.last = now; };
    this.raf = requestAnimationFrame(loop);
  }
  close() {
    if (!this.isOpen) return;
    cancelAnimationFrame(this.raf); for (const f of this.off) f(); this.off = [];
    this.saveHigh(); this.el.hidden = true; this.host.opened(false);
  }
  play() { this.game = new Snake(); this.start.hidden = true; this.flash = 0; bleep.start(); }
  steer(d: Dir) {
    if (!this.game || this.game.over) return;
    this.game.turn(d); bleep.turn();
  }
  snapshot() { const g = this.game; return { open: this.isOpen, playing: !!g && !g.over, over: !!g?.over, score: g?.score ?? 0, length: g?.body.length ?? 0, high: Math.max(this.best, g?.score ?? 0), dir: g?.dir ?? null, head: g?.body[0] ?? null, food: g?.food ?? null }; }
  private showStart(text: string) { this.start.hidden = false; this.start.textContent = text; }
  private saveHigh() { if (this.best > this.host.high()) this.host.setHigh(this.best); }
  private key(e: KeyboardEvent) {
    if (!this.isOpen) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') { this.close(); e.stopPropagation(); return; }
    const d: Dir | null = k === 'arrowup' || k === 'w' ? 'up' : k === 'arrowdown' || k === 's' ? 'down' : k === 'arrowleft' || k === 'a' ? 'left' : k === 'arrowright' || k === 'd' ? 'right' : null;
    if (d) { e.preventDefault(); e.stopPropagation(); if (e.repeat) return; this.steer(d); return; }
    if ((k === ' ' || k === 'enter') && (!this.game || this.game.over)) { e.preventDefault(); e.stopPropagation(); this.play(); }
  }
  /** As big a screen as fits, the pad beside it (or under it, standing up). */
  private layout() {
    const W = window.innerWidth, H = window.innerHeight, tall = H > W * 1.1;
    this.el.classList.toggle('tall', tall);
    const maxW = tall ? W - 60 : W - 420, maxH = tall ? H - 420 : H - 190;
    this.cell = Math.max(10, Math.floor(Math.min(maxW / GRID.w, maxH / GRID.h)));
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = this.cell * GRID.w, h = this.cell * GRID.h;
    this.screen.width = w * dpr; this.screen.height = h * dpr; this.screen.style.width = `${w}px`; this.screen.style.height = `${h}px`;
    this.screen.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  private frame(dt: number) {
    this.t += dt; this.flash = Math.max(0, this.flash - dt);
    const g = this.game;
    if (g && !g.over) for (const e of g.update(dt)) {
      if (e === 'eat') bleep.eat();
      if (e === 'gold') { bleep.gold(); this.flash = 0.25; }
      if (e === 'die') { bleep.die(); this.best = Math.max(this.best, g.score); this.saveHigh(); this.showStart(g.score >= this.host.high() && g.score > 0 ? `NEW HIGH SCORE! ${g.score}` : 'GAME OVER · PLAY AGAIN'); }
    }
    if (g) this.best = Math.max(this.best, g.score);
    this.scoreEl.textContent = `SCORE ${g?.score ?? 0}`; this.highEl.textContent = `HI ${this.best}`;
    this.draw();
  }
  private draw() {
    const c = this.screen.getContext('2d')!, s = this.cell, W = s * GRID.w, H = s * GRID.h, g = this.game;
    c.fillStyle = this.flash > 0 ? '#1E3A30' : DIM; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(79,227,193,.06)';   // the faint grid of the phosphor
    for (let x = 0; x < GRID.w; x++) for (let y = 0; y < GRID.h; y++) if ((x + y) % 2) c.fillRect(x * s, y * s, s, s);
    const px = (x: number, y: number, color: string, inset = 1.5) => { c.fillStyle = color; c.fillRect(x * s + inset, y * s + inset, s - inset * 2, s - inset * 2); };
    if (!g) {   // the attract screen: a snake chasing round the edge
      const n = 2 * (GRID.w + GRID.h) - 4, p = Math.floor(this.t * 12);
      for (let i = 0; i < 8; i++) { const [x, y] = edgeCell((p - i + n * 10) % n); px(x, y, i ? GLOW : '#B8FFF0'); }
    } else {
      c.shadowColor = GLOW; c.shadowBlur = s * 0.6;
      g.body.forEach(([x, y], i) => px(x, y, i === 0 ? '#B8FFF0' : GLOW, i === 0 ? 1 : 2));
      c.shadowColor = FOOD; px(g.food[0], g.food[1], FOOD, s * 0.22);
      if (g.gold && (g.goldT > 2 || Math.floor(this.t * 8) % 2)) { c.shadowColor = GOLD; px(g.gold[0], g.gold[1], GOLD, s * 0.12); }
      c.shadowBlur = 0;
      if (!g.over) {   // the eyes, looking where it's going
        const [hx, hy] = g.body[0], o = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[g.dir];
        c.fillStyle = DIM;
        for (const sgn of [-1, 1]) c.fillRect(hx * s + s / 2 + o[0] * s * 0.18 + (o[1] ? sgn : 0) * s * 0.2 - s * 0.08, hy * s + s / 2 + o[1] * s * 0.18 + (o[0] ? sgn : 0) * s * 0.2 - s * 0.08, s * 0.16, s * 0.16);
      }
    }
    c.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < H; y += 3) c.fillRect(0, y, W, 1);   // scanlines
  }
}
function edgeCell(i: number): [number, number] {
  const w = GRID.w, h = GRID.h;
  if (i < w) return [i, 0]; i -= w;
  if (i < h - 1) return [w - 1, i + 1]; i -= h - 1;
  if (i < w - 1) return [w - 2 - i, h - 1]; i -= w - 1;
  return [0, h - 2 - i];
}
