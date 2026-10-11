// An arcade cabinet on screen (Alpha's Retro Games): the game's marquee, a glowing CRT with scanlines, and the
// controls it needs: a pad of four arrows (Snake, Frog Hop), or left / right and a big FIRE (Space Blasters, Brick
// Breaker: drag on the screen to move the paddle too). Swipe on the screen to steer the arrow games; arrows / WASD
// and space on a keyboard. Each game draws a 420 x 300 picture; this scales it up to fit.
import { CABINETS, SW, SH, type Cabinet, type Machine, type Key } from './games';
import { audio } from '../sound';

export interface ArcadeHost { high(id: string): number; setHigh(id: string, n: number): void; opened(on: boolean, id: string): void }

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e;
}
const tone = (type: OscillatorType, a: number, b: number, len: number, vol = 0.05, delay = 0) => audio.tone(type, a, b, len, vol, delay);
const SOUNDS: Record<string, () => void> = {
  eat: () => tone('square', 660, 990, 0.07), gold: () => { for (let i = 0; i < 4; i++) tone('square', 880 + i * 220, 880 + i * 220, 0.06, 0.05, i * 0.06); },
  shoot: () => tone('square', 1200, 300, 0.09, 0.035), boom: () => audio.noise(0.15, 0.12, 1400), ufo: () => tone('triangle', 500, 700, 0.3, 0.03), ufohit: () => { for (let i = 0; i < 5; i++) tone('square', 400 + i * 160, 400 + i * 160, 0.05, 0.05, i * 0.05); },
  march: () => tone('triangle', 90, 70, 0.06, 0.06),
  wall: () => tone('square', 330, 330, 0.03, 0.03), bounce: () => tone('square', 520, 520, 0.05, 0.045), brick: () => tone('square', 880, 880, 0.05, 0.04),
  hop: () => tone('square', 300, 600, 0.06, 0.04), home: () => [523, 784, 1047].forEach((f, i) => tone('square', f, f, 0.08, 0.05, i * 0.08)),
  squish: () => audio.noise(0.2, 0.15, 500), splash: () => audio.noise(0.3, 0.12, 2400),
  lose: () => tone('sawtooth', 440, 110, 0.4, 0.05),
  level: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone('square', f, f, 0.08, 0.05, i * 0.07)),
  die: () => { tone('sawtooth', 440, 60, 0.6, 0.06); audio.noise(0.25, 0.15, 600); },
  start: () => [523, 659, 784, 1047].forEach((f, i) => tone('square', f, f, 0.08, 0.05, i * 0.08)),
};

export class Arcade {
  readonly el: HTMLElement;
  cab: Cabinet = CABINETS[0]; game: Machine | null = null;
  private screen: HTMLCanvasElement; private start: HTMLButtonElement; private scoreEl: HTMLElement; private highEl: HTMLElement;
  private title: HTMLElement; private howEl: HTMLElement; private pads: Record<string, HTMLElement> = {};
  private held = new Set<Key>(); private raf = 0; private last = 0; private off: (() => void)[] = []; private t = 0; private best = 0; private scale = 1;

  constructor(private host: ArcadeHost) {
    this.el = el('div', 'arcade'); this.el.id = 'arcade'; this.el.hidden = true;
    const cab = el('div', 'ac-cab');
    const marquee = el('div', 'ac-marquee'); this.title = el('b', '', 'SNAKE'); marquee.append(this.title, el('small', '', "ALPHA'S RETRO GAMES"));
    const bar = el('div', 'ac-bar'); this.scoreEl = el('span', '', 'SCORE 0'); this.highEl = el('span', '', 'HI 0'); bar.append(this.scoreEl, this.highEl);
    const bezel = el('div', 'ac-bezel'); this.screen = el('canvas', 'ac-screen');
    this.start = el('button', 'ac-start', 'PRESS START'); this.start.type = 'button';
    this.howEl = el('div', 'ac-how');
    bezel.append(this.screen, this.start, this.howEl);
    cab.append(marquee, bar, bezel);
    // the controls: an arrow pad, or left / right / FIRE
    const hold = (b: HTMLElement, k: Key) => {
      b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); b.classList.add('on'); this.down(k); });
      for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, () => { if (!b.classList.contains('on')) return; b.classList.remove('on'); this.up(k); });
    };
    const btn = (cls: string, text: string, k: Key) => { const b = el('button', `ac-btn ${cls}`, text); b.type = 'button'; b.setAttribute('aria-label', k); hold(b, k); return b; };
    const dpad = el('div', 'ac-pad ac-dpad'); dpad.append(btn('ac-up', '▲', 'up'), btn('ac-left', '◀', 'left'), btn('ac-right', '▶', 'right'), btn('ac-down', '▼', 'down'));
    const lr = el('div', 'ac-pad ac-lr'); lr.append(btn('ac-left', '◀', 'left'), btn('ac-right', '▶', 'right'));
    const fire = el('div', 'ac-pad ac-firepad'); fire.append(btn('ac-fire', 'FIRE', 'fire'));
    this.pads = { dpad, lr, fire };
    const close = el('button', 'ac-close', '✕'); close.type = 'button'; close.setAttribute('aria-label', 'Stop playing');
    this.el.append(lr, cab, dpad, fire, close);
    document.body.append(this.el);
    // on the screen: swipe to steer (arrow games), drag to move the paddle, tap to fire
    let sw: [number, number] | null = null;
    this.screen.addEventListener('pointerdown', e => { e.preventDefault(); sw = [e.clientX, e.clientY]; this.screen.setPointerCapture?.(e.pointerId); this.aim(e); if (this.cab.controls !== 'dpad') this.game?.press('fire'); });
    this.screen.addEventListener('pointermove', e => {
      if (!sw) return; this.aim(e);
      if (this.cab.controls !== 'dpad') return;
      const dx = e.clientX - sw[0], dy = e.clientY - sw[1];
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      this.down(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')); this.held.clear(); sw = [e.clientX, e.clientY];
    });
    for (const ev of ['pointerup', 'pointercancel']) this.screen.addEventListener(ev, () => { sw = null; });
    this.start.addEventListener('click', () => this.play());
    close.addEventListener('click', () => this.close());
    this.el.addEventListener('contextmenu', e => e.preventDefault());
  }
  get isOpen() { return !this.el.hidden; }
  open(id = 'snake') {
    if (this.isOpen) return;
    this.cab = CABINETS.find(c => c.id === id) ?? CABINETS[0];
    this.el.hidden = false; this.host.opened(true, this.cab.id);
    this.el.style.setProperty('--glow', this.cab.glow); this.el.style.setProperty('--body', this.cab.body);
    this.title.textContent = this.cab.name; this.howEl.textContent = this.cab.how;
    this.el.dataset.controls = this.cab.controls;
    this.pads.dpad.hidden = this.cab.controls !== 'dpad'; this.pads.lr.hidden = this.pads.fire.hidden = this.cab.controls === 'dpad';
    this.best = this.host.high(this.cab.id); this.game = null; this.held.clear(); this.showStart('PRESS START');
    const onKey = (e: KeyboardEvent) => this.key(e), onResize = () => this.layout();
    window.addEventListener('keydown', onKey, true); window.addEventListener('keyup', onKey, true); window.addEventListener('resize', onResize);
    this.off = [() => window.removeEventListener('keydown', onKey, true), () => window.removeEventListener('keyup', onKey, true), () => window.removeEventListener('resize', onResize)];
    this.layout();
    this.last = performance.now();
    const loop = (now: number) => { this.raf = requestAnimationFrame(loop); this.frame(Math.min(1 / 20, (now - this.last) / 1000)); this.last = now; };
    this.raf = requestAnimationFrame(loop);
  }
  close() {
    if (!this.isOpen) return;
    cancelAnimationFrame(this.raf); for (const f of this.off) f(); this.off = [];
    this.saveHigh(); this.el.hidden = true; this.host.opened(false, this.cab.id);
  }
  play() { this.game = this.cab.make(); this.start.hidden = true; this.howEl.hidden = true; this.held.clear(); SOUNDS.start(); }
  snapshot() {
    const g = this.game;
    return { open: this.isOpen, cab: this.cab.id, playing: !!g && !g.over, over: !!g?.over, score: g?.score ?? 0, lives: g?.lives ?? null, high: Math.max(this.best, g?.score ?? 0), ...(g ? g.info() : {}) };
  }
  private down(k: Key) { if (!this.game || this.game.over) return; this.held.add(k); this.game.press(k); }
  private up(k: Key) { this.held.delete(k); }
  private aim(e: PointerEvent) { if (!this.game?.aim) return; const r = this.screen.getBoundingClientRect(); this.game.aim((e.clientX - r.left) / r.width * SW); }
  private showStart(text: string) { this.start.hidden = false; this.start.textContent = text; this.howEl.hidden = false; }
  private saveHigh() { if (this.best > this.host.high(this.cab.id)) this.host.setHigh(this.cab.id, this.best); }
  private key(e: KeyboardEvent) {
    if (!this.isOpen) return;
    const k = e.key.toLowerCase(), isDown = e.type === 'keydown';
    if (k === 'escape') { if (isDown) this.close(); e.stopPropagation(); return; }
    const d: Key | null = k === 'arrowup' || k === 'w' ? 'up' : k === 'arrowdown' || k === 's' ? 'down' : k === 'arrowleft' || k === 'a' ? 'left' : k === 'arrowright' || k === 'd' ? 'right' : k === ' ' || k === 'enter' ? 'fire' : null;
    if (!d) return;
    e.preventDefault(); e.stopPropagation();
    if (d === 'fire' && isDown && (!this.game || this.game.over)) { this.play(); return; }
    if (isDown) { if (!e.repeat) this.down(d); } else this.up(d);
  }
  /** As big a screen as fits, the controls either side (or under it, standing up). */
  private layout() {
    const W = window.innerWidth, H = window.innerHeight, tall = H > W * 1.1;
    this.el.classList.toggle('tall', tall);
    const maxW = tall ? W - 60 : W - (this.cab.controls === 'dpad' ? 420 : 440), maxH = tall ? H - 420 : H - 190;
    this.scale = Math.max(0.5, Math.min(maxW / SW, maxH / SH));
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.floor(SW * this.scale), h = Math.floor(SH * this.scale);
    this.screen.width = w * dpr; this.screen.height = h * dpr; this.screen.style.width = `${w}px`; this.screen.style.height = `${h}px`;
  }
  private frame(dt: number) {
    this.t += dt;
    const g = this.game;
    if (g && !g.over) for (const e of g.update(dt, this.held)) {
      SOUNDS[e]?.();
      if (e === 'die') { this.best = Math.max(this.best, g.score); const rec = g.score > 0 && g.score >= this.host.high(this.cab.id); this.saveHigh(); this.showStart(rec ? `NEW HIGH SCORE! ${g.score}` : 'GAME OVER · PLAY AGAIN'); }
    }
    if (g) this.best = Math.max(this.best, g.score);
    this.scoreEl.textContent = `SCORE ${g?.score ?? 0}`; this.highEl.textContent = `HI ${this.best}`;
    const c = this.screen.getContext('2d')!, k = this.screen.width / SW;
    c.setTransform(k, 0, 0, k, 0, 0); c.imageSmoothingEnabled = false;
    if (g) g.draw(c, this.t); else this.attract(c);
    c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = 'rgba(0,0,0,.2)'; for (let y = 0; y < this.screen.height; y += 3 * k) c.fillRect(0, y, this.screen.width, k);   // scanlines
  }
  /** Before you press start: the game's title screen, a dot chasing round the edge. */
  private attract(c: CanvasRenderingContext2D) {
    c.fillStyle = '#0B0A18'; c.fillRect(0, 0, SW, SH);
    const n = 2 * (SW + SH) / 20, p = Math.floor(this.t * 14);
    for (let i = 0; i < 10; i++) {
      let q = ((p - i) % n + n) % n * 20, x = 0, y = 0;
      if (q < SW) { x = q; } else if ((q -= SW) < SH) { x = SW - 20; y = q; } else if ((q -= SH) < SW) { x = SW - 20 - q; y = SH - 20; } else { y = SH - 20 - (q - SW); }
      c.fillStyle = i ? this.cab.glow : '#FFFFFF'; c.fillRect(x + 3, y + 3, 14, 14);
    }
  }
}
