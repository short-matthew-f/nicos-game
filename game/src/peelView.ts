// The potato peeling board on screen (peel.ts has the rules): a wooden board, the potato in the middle, Yarosh's
// pot on the side. Drag a finger across the potato and the skin comes off in strips (curls of peel fly off); tap an
// eye to dig it out. A clock along the top, how many are in the pot, and Yarosh cheering you on.
import { Shift, PEEL, outline, progress, type Spud } from './peel';
import { audio } from './sound';

export interface PeelHost { best(): number; setBest(n: number): void; pay(n: number): void; opened(on: boolean): void }
const LW = 600, LH = 420, CX = 250, CY = 215, POT: [number, number] = [520, 300];
const CHEER = ['Nice strip!', 'Look at you go!', 'That\'s a clean one!', 'Faster than me!', 'Potato master!', 'Into the pot!'];
function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e;
}

export class PeelGame {
  readonly el: HTMLElement;
  shift: Shift | null = null;
  private canvas: HTMLCanvasElement; private skin: HTMLCanvasElement | null = null; private skinOf: Spud | null = null;
  private clock: HTMLElement; private countEl: HTMLElement; private sayEl: HTMLElement; private panel: HTMLElement;
  private raf = 0; private last = 0; private t = 0; private k = 1; private down: [number, number] | null = null;
  private curls: { x: number; y: number; vx: number; vy: number; a: number; va: number; t: number; c: string }[] = [];
  private flying: { s: Spud; t: number } | null = null; private scrape = 0; private paid = false;

  constructor(private host: PeelHost) {
    this.el = el('div', 'peel'); this.el.id = 'peel'; this.el.hidden = true;
    const top = el('div', 'pl-top'); this.clock = el('div', 'pl-clock'); this.clock.append(el('i'));
    this.countEl = el('div', 'pl-count', '🥔 0'); top.append(this.clock, this.countEl);
    this.canvas = el('canvas', 'pl-board');
    this.sayEl = el('div', 'pl-say', 'Yarosh: “Drag to peel. Tap the eyes to dig them out!”');
    this.panel = el('div', 'pl-panel');
    const close = el('button', 'pl-close', '✕'); close.type = 'button'; close.setAttribute('aria-label', 'Stop peeling');
    const wrap = el('div', 'pl-wrap'); wrap.append(this.canvas, this.panel);
    this.el.append(top, wrap, this.sayEl, close);
    document.body.append(this.el);
    close.addEventListener('click', () => this.close());
    this.canvas.addEventListener('pointerdown', e => { e.preventDefault(); this.canvas.setPointerCapture?.(e.pointerId); const p = this.local(e); this.down = p; this.tapAt(p); });
    this.canvas.addEventListener('pointermove', e => { if (!this.down) return; const p = this.local(e); this.strokeTo(p); });
    for (const ev of ['pointerup', 'pointercancel']) this.canvas.addEventListener(ev, () => { this.down = null; });
    this.el.addEventListener('contextmenu', e => e.preventDefault());
  }
  get isOpen() { return !this.el.hidden; }
  open() {
    if (this.isOpen) return;
    this.el.hidden = false; this.host.opened(true); this.shift = null; this.layout();
    this.showPanel('Help Yarosh peel!', `Drag across the potato to peel it. Tap the dark eyes to dig them out. Peel as many as you can in ${PEEL.time} seconds: Yarosh pays $${PEEL.pay} a potato.`, [['Start peeling!', () => this.start()]]);
    const onResize = () => this.layout(); window.addEventListener('resize', onResize);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { this.close(); e.stopPropagation(); } };
    window.addEventListener('keydown', onKey, true);
    this.off = [() => window.removeEventListener('resize', onResize), () => window.removeEventListener('keydown', onKey, true)];
    this.last = performance.now();
    const loop = (now: number) => { this.raf = requestAnimationFrame(loop); this.frame(Math.min(1 / 20, (now - this.last) / 1000)); this.last = now; };
    this.raf = requestAnimationFrame(loop);
  }
  private off: (() => void)[] = [];
  close() {
    if (!this.isOpen) return;
    if (this.shift && !this.paid) this.finish(false);
    cancelAnimationFrame(this.raf); for (const f of this.off) f(); this.off = [];
    this.el.hidden = true; this.host.opened(false);
  }
  start() {
    this.shift = new Shift(); this.paid = false; this.curls = []; this.flying = null; this.panel.hidden = true;
    this.say('Go go go!'); [392, 523, 659].forEach((f, i) => audio.tone('triangle', f, f, 0.1, 0.06, i * 0.09));
  }
  snapshot() {
    const s = this.shift;
    return { open: this.isOpen, playing: !!s && !s.over, over: !!s?.over, done: s?.done ?? 0, time: s?.time ?? null, progress: s ? progress(s.spud) : 0,
      eyes: s ? s.spud.eyes.filter(e => !e.dug).map(e => [e.x, e.y]) : [], rx: s?.spud.rx ?? 0, ry: s?.spud.ry ?? 0, best: this.host.best() };
  }
  /** Where on the screen a point on the potato is (for tests). */
  screenAt(x: number, y: number) { const r = this.canvas.getBoundingClientRect(); return { x: r.left + (CX + x) / LW * r.width, y: r.top + (CY + y) / LH * r.height }; }
  private finish(show = true) {
    const s = this.shift!; this.paid = true;
    const n = s.done, best = this.host.best();
    if (n > best) this.host.setBest(n);
    if (n > 0) this.host.pay(n * PEEL.pay);
    if (show) this.showPanel(n ? `${n} potato${n === 1 ? '' : 'es'}!` : 'Time\'s up!', n ? `Yarosh: “${n >= 6 ? 'You\'re hired. Seriously.' : n >= 3 ? 'Great peeling!' : 'Not bad at all!'}” He pays you $${n * PEEL.pay}.${n > best && best > 0 ? ' A new record!' : ''}` : 'Yarosh: “Peeling\'s harder than it looks, right? Try again!”',
      [['Peel again', () => this.start()], ['Done', () => this.close()]]);
  }
  private showPanel(title: string, text: string, buttons: [string, () => void][]) {
    this.panel.replaceChildren(el('h2', '', title), el('p', '', text));
    for (const [label, fn] of buttons) { const b = el('button', 'pl-btn', label); b.type = 'button'; b.addEventListener('click', fn); this.panel.append(b); }
    this.panel.hidden = false;
  }
  private say(text: string) { this.sayEl.textContent = `Yarosh: “${text}”`; }
  private local(e: PointerEvent): [number, number] { const r = this.canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * LW - CX, (e.clientY - r.top) / r.height * LH - CY]; }
  private tapAt([x, y]: [number, number]) {
    const s = this.shift; if (!s || s.over) return;
    const eye = s.tap(x, y);
    if (eye) { audio.tone('square', 700, 1200, 0.06, 0.05); for (let i = 0; i < 5; i++) this.curl(eye.x, eye.y, '#5A3A22'); }
  }
  private strokeTo(p: [number, number]) {
    const s = this.shift, a = this.down!; this.down = p;
    if (!s || s.over) return;
    const n = s.stroke(a[0], a[1], p[0], p[1]);
    if (n > 0) {
      this.cut(a, p);
      if (Math.random() < Math.min(0.9, n / 6)) this.curl(p[0], p[1], '#B9824A');
      if (this.scrape <= 0) { audio.noise(0.06, 0.05, 2600, 0, 'highpass'); this.scrape = 0.07; }
    }
  }
  private curl(x: number, y: number, c: string) {
    this.curls.push({ x, y, vx: (Math.random() - 0.5) * 260, vy: -120 - Math.random() * 160, a: Math.random() * 6, va: (Math.random() - 0.5) * 16, t: 0, c });
  }
  /** Take the skin off the drawing along the stroke (the rules keep the exact count). */
  private cut(a: [number, number], b: [number, number]) {
    if (!this.skin) return; const c = this.skin.getContext('2d')!, R = 2;
    c.save(); c.setTransform(R, 0, 0, R, LW / 2 * R, LH / 2 * R); c.globalCompositeOperation = 'destination-out'; c.lineCap = 'round'; c.lineWidth = PEEL.blade * 2;
    c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0] + 0.01, b[1]); c.stroke(); c.restore();
  }
  /** The skin, drawn once per potato: brown and speckled, the shape of the potato. */
  private makeSkin(s: Spud) {
    const R = 2, cv = document.createElement('canvas'); cv.width = LW * R; cv.height = LH * R;
    const c = cv.getContext('2d')!; c.setTransform(R, 0, 0, R, LW / 2 * R, LH / 2 * R);
    this.path(c, s); c.fillStyle = s.tint < 0.25 ? '#B5624A' : '#B9824A'; c.fill();   // (now and then a red potato)
    c.save(); this.path(c, s); c.clip();
    const g = c.createRadialGradient(-s.rx * 0.3, -s.ry * 0.4, 10, 0, 0, s.rx * 1.1); g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(1, 'rgba(0,0,0,.18)'); c.fillStyle = g; c.fillRect(-s.rx * 1.3, -s.ry * 1.3, s.rx * 2.6, s.ry * 2.6);
    let seed = s.rx * 13; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 70; i++) { c.fillStyle = 'rgba(90,58,34,.35)'; c.beginPath(); c.ellipse((rnd() * 2 - 1) * s.rx, (rnd() * 2 - 1) * s.ry, 1.5 + rnd() * 2.5, 1 + rnd() * 1.5, rnd() * 3, 0, Math.PI * 2); c.fill(); }
    c.restore();
    this.skin = cv; this.skinOf = s;
  }
  private path(c: CanvasRenderingContext2D, s: Spud) { const o = outline(s); c.beginPath(); o.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); }
  private layout() {
    const W = window.innerWidth, H = window.innerHeight;
    const k = Math.max(0.5, Math.min((W - 40) / LW, (H - 200) / LH)), dpr = Math.min(2, window.devicePixelRatio || 1);
    this.k = k * dpr; this.canvas.width = Math.floor(LW * this.k); this.canvas.height = Math.floor(LH * this.k);
    this.canvas.style.width = `${Math.floor(LW * k)}px`; this.canvas.style.height = `${Math.floor(LH * k)}px`;
  }
  private frame(dt: number) {
    this.t += dt; this.scrape -= dt;
    const s = this.shift;
    if (s && !s.over) for (const e of s.update(dt)) {
      if (e === 'peeled') { this.flying = { s: s.spud, t: 0 }; this.say(CHEER[Math.floor(Math.random() * CHEER.length)]); [784, 988, 1319].forEach((f, i) => audio.tone('triangle', f, f, 0.1, 0.06, i * 0.06)); }
      if (e === 'time') { audio.tone('square', 660, 330, 0.5, 0.06); this.finish(); }
    }
    if (s && !s.over && s.wait <= 0 && progress(s.spud) >= PEEL.done && s.spud.eyes.some(q => !q.dug)) this.sayEl.textContent = 'Yarosh: “Now dig out the eyes! Tap them!”';
    this.clock.style.setProperty('--left', `${s ? s.time / PEEL.time : 1}`);
    this.clock.classList.toggle('low', !!s && s.time < 10);
    this.countEl.textContent = `🥔 ${s?.done ?? 0}`;
    for (const q of this.curls) { q.t += dt; q.vy += 700 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.a += q.va * dt; }
    this.curls = this.curls.filter(q => q.t < 1.1);
    if (this.flying) { this.flying.t += dt; if (this.flying.t > PEEL.next) this.flying = null; }
    this.draw();
  }
  private draw() {
    const c = this.canvas.getContext('2d')!, s = this.shift;
    c.setTransform(this.k, 0, 0, this.k, 0, 0);
    // the board
    c.fillStyle = '#D9A066'; c.fillRect(0, 0, LW, LH);
    c.strokeStyle = 'rgba(138,90,59,.25)'; c.lineWidth = 3; for (let y = 18; y < LH; y += 26) { c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(LW * 0.3, y + 6, LW * 0.6, y - 6, LW, y + 2); c.stroke(); }
    // the pot (and how many are in it)
    const [px, py] = POT;
    c.fillStyle = 'rgba(43,63,85,.25)'; c.beginPath(); c.ellipse(px + 6, py + 78, 74, 16, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#5B6472'; c.fillRect(px - 66, py - 10, 132, 86); c.fillStyle = '#8E96A3'; c.beginPath(); c.ellipse(px, py - 10, 66, 20, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#7FB8D9'; c.beginPath(); c.ellipse(px, py - 8, 56, 14, 0, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < Math.min(s?.done ?? 0, 12); i++) { c.fillStyle = '#F6E7B0'; c.beginPath(); c.ellipse(px - 34 + (i % 4) * 22, py - 10 - Math.floor(i / 4) * 4, 12, 8, 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#2C3440'; c.fillRect(px - 82, py + 4, 18, 8); c.fillRect(px + 64, py + 4, 18, 8);
    if (!s) return;
    // the one flying into the pot
    if (this.flying) {
      const f = this.flying, u = Math.min(1, f.t / PEEL.next), x = CX + (px - CX) * u, y = CY + (py - 30 - CY) * u - Math.sin(u * Math.PI) * 120, k = 1 - 0.75 * u;
      c.save(); c.translate(x, y); c.scale(k, k); this.path(c, f.s); c.fillStyle = '#F6E7B0'; c.fill(); c.restore();
    }
    if (s.wait <= 0) {
      const sp = s.spud;
      if (this.skinOf !== sp) this.makeSkin(sp);
      c.save(); c.translate(CX, CY);
      c.fillStyle = 'rgba(43,63,85,.22)'; c.beginPath(); c.ellipse(8, sp.ry * 0.95, sp.rx * 0.9, 16, 0, 0, Math.PI * 2); c.fill();
      this.path(c, sp); c.fillStyle = '#F6E7B0'; c.fill(); c.lineWidth = 4; c.strokeStyle = '#FFFFFF'; c.stroke();   // the clean potato underneath
      c.restore();
      c.drawImage(this.skin!, CX - LW / 2, CY - LH / 2, LW, LH);
      c.save(); c.translate(CX, CY);
      const hint = progress(sp) >= PEEL.done;
      for (const e of sp.eyes) {
        if (e.dug) { c.fillStyle = '#E3CF8E'; c.beginPath(); c.ellipse(e.x, e.y, 6, 4, 0, 0, Math.PI * 2); c.fill(); continue; }
        if (hint) { c.strokeStyle = `rgba(229,72,77,${0.5 + 0.5 * Math.sin(this.t * 8)})`; c.lineWidth = 3; c.beginPath(); c.arc(e.x, e.y, 16, 0, Math.PI * 2); c.stroke(); }
        c.fillStyle = '#4A2E1A'; c.beginPath(); c.ellipse(e.x, e.y, 7, 5, 0.4, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#7A5236'; c.beginPath(); c.ellipse(e.x - 1, e.y - 1, 3, 2, 0.4, 0, Math.PI * 2); c.fill();
      }
      c.restore();
      // how clean it is
      const pr = Math.min(1, progress(sp) / PEEL.done);
      c.fillStyle = 'rgba(43,63,85,.35)'; c.fillRect(CX - 100, LH - 30, 200, 12); c.fillStyle = pr >= 1 ? '#3BB273' : '#F9C846'; c.fillRect(CX - 100, LH - 30, 200 * pr, 12);
    }
    // the curls of peel
    for (const q of this.curls) {
      c.save(); c.translate(CX + q.x, CY + q.y); c.rotate(q.a); c.globalAlpha = 1 - q.t / 1.1;
      c.strokeStyle = q.c; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, 7, 0, Math.PI * 1.4); c.stroke(); c.restore();
    }
  }
}
