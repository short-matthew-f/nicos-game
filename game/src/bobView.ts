// Bobbing for Bakers on screen (bob.ts has the rules): a big wooden washtub seen from above, baked potatoes bobbing in
// it (plain, wrapped in foil, the odd golden one), and the back of Nico's head over the water. Drag to move your head,
// tap a potato to go for it, or hit DUNK. Arrows and space on a keyboard.
import { Bobbing, BOB, height, type Spud } from './bob';
import { audio } from './sound';

export interface BobHost { best(): number; setBest(n: number): void; prize(score: number): void; opened(on: boolean): void }
const LW = 600, LH = 440, CX = 300, CY = 236, SQ = 0.8;   // the tub's centre on the screen, and how flat it looks (seen at an angle)
const HAIR = '#4A3428';
function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e;
}
const CHEER = { catch: ['Got one!', 'Nice chomp!', 'Yes!'], gold: ['THE GOLDEN BAKER!', 'Golden! Five points!'], miss: ['Blub blub!', 'Just water!', 'Too slow, it sank!'] };
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export class BobGame {
  readonly el: HTMLElement;
  game: Bobbing | null = null;
  private canvas: HTMLCanvasElement; private clock: HTMLElement; private countEl: HTMLElement; private sayEl: HTMLElement; private panel: HTMLElement; private dunkBtn: HTMLButtonElement;
  private raf = 0; private last = 0; private k = 1; private off: (() => void)[] = []; private keys = new Set<string>();
  private down: { x: number; y: number; t: number; moved: boolean } | null = null; private queued = false;
  private drops: { x: number; y: number; vx: number; vy: number; t: number }[] = []; private rings: { x: number; y: number; t: number; c: string }[] = [];

  constructor(private host: BobHost) {
    this.el = el('div', 'peel bob'); this.el.id = 'bob'; this.el.hidden = true;
    const top = el('div', 'pl-top'); this.clock = el('div', 'pl-clock'); this.clock.append(el('i'));
    this.countEl = el('div', 'pl-count', '🥔 0'); top.append(this.clock, this.countEl);
    this.canvas = el('canvas', 'pl-board');
    this.panel = el('div', 'pl-panel');
    this.dunkBtn = el('button', 'bob-dunk', 'DUNK!'); this.dunkBtn.type = 'button';
    const wrap = el('div', 'pl-wrap'); wrap.append(this.canvas, this.panel);
    const row = el('div', 'bob-row'); row.append(wrap, this.dunkBtn);
    this.sayEl = el('div', 'pl-say', 'Yarosh: “Hands behind your back! Dunk when one bobs up!”');
    const close = el('button', 'pl-close', '✕'); close.type = 'button'; close.setAttribute('aria-label', 'Stop');
    this.el.append(top, row, this.sayEl, close);
    document.body.append(this.el);
    close.addEventListener('click', () => this.close());
    this.dunkBtn.addEventListener('pointerdown', e => { e.preventDefault(); this.dunk(); });
    this.canvas.addEventListener('pointerdown', e => { e.preventDefault(); this.canvas.setPointerCapture?.(e.pointerId); const p = this.local(e); this.down = { ...p, t: performance.now(), moved: false }; this.game?.aimAt(p.x, p.y); });
    this.canvas.addEventListener('pointermove', e => { if (!this.down) return; const p = this.local(e); if (Math.hypot(p.x - this.down.x, p.y - this.down.y) > 12) this.down.moved = true; this.game?.aimAt(p.x, p.y); });
    for (const ev of ['pointerup', 'pointercancel']) this.canvas.addEventListener(ev, () => { if (this.down && !this.down.moved && performance.now() - this.down.t < 350) this.queued = true; this.down = null; });   // (a tap: go for it)
    this.el.addEventListener('contextmenu', e => e.preventDefault());
  }
  get isOpen() { return !this.el.hidden; }
  open() {
    if (this.isOpen) return;
    this.el.hidden = false; this.host.opened(true); this.game = null; this.layout();
    this.showPanel('Bobbing for Bakers!', `Baked potatoes are bobbing in the tub. Move your head over one (drag, or tap it) and DUNK when it bobs up to the top. Foil ones are worth 2, golden ones 5! ${BOB.time} seconds.`, [['Ready, set, bob!', () => this.start()]]);
    const onResize = () => this.layout();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (e.type === 'keydown') this.close(); e.stopPropagation(); return; }
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (e.type === 'keydown' && !e.repeat) { if (this.game && !this.game.over) this.dunk(); } return; }
      if (e.key.startsWith('Arrow')) { e.preventDefault(); e.stopPropagation(); if (e.type === 'keydown') this.keys.add(e.key); else this.keys.delete(e.key); }
    };
    window.addEventListener('resize', onResize); window.addEventListener('keydown', onKey, true); window.addEventListener('keyup', onKey, true);
    this.off = [() => window.removeEventListener('resize', onResize), () => window.removeEventListener('keydown', onKey, true), () => window.removeEventListener('keyup', onKey, true)];
    this.last = performance.now();
    const loop = (now: number) => { this.raf = requestAnimationFrame(loop); this.frame(Math.min(1 / 20, (now - this.last) / 1000)); this.last = now; };
    this.raf = requestAnimationFrame(loop);
  }
  close() {
    if (!this.isOpen) return;
    if (this.game && !this.game.over) this.finish(false);
    cancelAnimationFrame(this.raf); for (const f of this.off) f(); this.off = []; this.keys.clear();
    this.el.hidden = true; this.host.opened(false);
  }
  start() { this.game = new Bobbing(); this.panel.hidden = true; this.drops = []; this.rings = []; this.say('Go!'); [392, 523, 659].forEach((f, i) => audio.tone('triangle', f, f, 0.1, 0.06, i * 0.09)); }
  dunk() { if (this.game?.dunk()) { audio.tone('sine', 300, 120, 0.25, 0.08); } }
  snapshot() {
    const g = this.game;
    return { open: this.isOpen, playing: !!g && !g.over, over: !!g?.over, score: g?.score ?? 0, caught: g?.caught ?? 0, misses: g?.misses ?? 0, time: g?.time ?? null, t: g?.t ?? 0,
      head: g ? { ...g.head } : null, spuds: g ? g.spuds.map(s => ({ x: s.x, y: s.y, h: height(s, g.t), sp: s.sp, ph: s.ph, kind: s.kind, gone: s.gone })) : [], best: this.host.best() };
  }
  /** Where a point in the tub is on the screen (for tests). */
  screenAt(x: number, y: number) { const r = this.canvas.getBoundingClientRect(); return { x: r.left + (CX + x) / LW * r.width, y: r.top + (CY + y * SQ) / LH * r.height }; }
  private finish(show = true) {
    const g = this.game!, n = g.score, best = this.host.best();
    if (n > best) this.host.setBest(n);
    this.host.prize(n);
    if (show) this.showPanel(`${n} point${n === 1 ? '' : 's'}!`, `${g.caught} baker${g.caught === 1 ? '' : 's'} caught. ${n >= 8 ? 'Yarosh: “Champion! Have a loaded baker on the house!”' : n >= 3 ? 'Yarosh: “Not bad! Your face is soaked, though.”' : 'Yarosh: “They\'re slippery, right? Go again!”'}${n > best && best > 0 ? ' A new record!' : ''}`,
      [['Bob again', () => this.start()], ['Done', () => this.close()]]);
  }
  private showPanel(title: string, text: string, buttons: [string, () => void][]) {
    this.panel.replaceChildren(el('h2', '', title), el('p', '', text));
    for (const [label, fn] of buttons) { const b = el('button', 'pl-btn', label); b.type = 'button'; b.addEventListener('click', fn); this.panel.append(b); }
    this.panel.hidden = false;
  }
  private say(t: string) { this.sayEl.textContent = `Yarosh: “${t}”`; }
  private local(e: PointerEvent) { const r = this.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * LW - CX, y: ((e.clientY - r.top) / r.height * LH - CY) / SQ }; }
  private layout() {
    const W = window.innerWidth, H = window.innerHeight, k = Math.max(0.5, Math.min((W - 260) / LW, (H - 200) / LH)), dpr = Math.min(2, window.devicePixelRatio || 1);
    this.k = k * dpr; this.canvas.width = Math.floor(LW * this.k); this.canvas.height = Math.floor(LH * this.k);
    this.canvas.style.width = `${Math.floor(LW * k)}px`; this.canvas.style.height = `${Math.floor(LH * k)}px`;
  }
  private frame(dt: number) {
    const g = this.game;
    if (g && !g.over) {
      const kx = (this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('ArrowLeft') ? 1 : 0), ky = (this.keys.has('ArrowDown') ? 1 : 0) - (this.keys.has('ArrowUp') ? 1 : 0);
      if (kx || ky) g.aimAt(g.head.x + kx * 40, g.head.y + ky * 40);
      if (this.queued && Math.hypot(g.aim.x - g.head.x, g.aim.y - g.head.y) < 8) { this.queued = false; this.dunk(); }
      for (const e of g.update(dt)) {
        if (e === 'catch' || e === 'gold') { this.say(pick(CHEER[e])); this.splash(g.head.x, g.head.y, 14); audio.tone('square', 523, 784, 0.1, 0.06); if (e === 'gold') [784, 988, 1319].forEach((f, i) => audio.tone('triangle', f, f, 0.12, 0.06, i * 0.07)); }
        if (e === 'miss') { this.say(pick(CHEER.miss)); this.splash(g.head.x, g.head.y, 8); audio.noise(0.3, 0.12, 900); }
        if (e === 'time') { audio.tone('square', 660, 330, 0.5, 0.06); this.finish(); }
      }
    }
    for (const d of this.drops) { d.t += dt; d.vy += 600 * dt; d.x += d.vx * dt; d.y += d.vy * dt; } this.drops = this.drops.filter(d => d.t < 0.8);
    for (const r of this.rings) r.t += dt; this.rings = this.rings.filter(r => r.t < 1.2);
    if (g) for (const s of g.spuds) { const h = height(s, g.t), h0 = height(s, g.t - dt); if (s.gone <= 0 && (h > 0) !== (h0 > 0)) this.rings.push({ x: s.x, y: s.y, t: 0, c: '#FFFFFF' }); }
    this.clock.style.setProperty('--left', `${g ? g.time / BOB.time : 1}`); this.clock.classList.toggle('low', !!g && g.time < 8);
    this.countEl.textContent = `🥔 ${g?.score ?? 0}`;
    this.draw();
  }
  private splash(x: number, y: number, n: number) {
    const sx = CX + x, sy = CY + y * SQ;
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 160; this.drops.push({ x: sx, y: sy, vx: Math.cos(a) * v, vy: -120 - Math.random() * 180, t: 0 }); }
    this.rings.push({ x, y, t: 0, c: '#FFFFFF' });
  }
  private draw() {
    const c = this.canvas.getContext('2d')!, g = this.game, t = g?.t ?? performance.now() / 1000, R = BOB.r;
    c.setTransform(this.k, 0, 0, this.k, 0, 0);
    // the floor of the shop (checked tiles), the tub's shadow
    for (let j = 0; j < LH / 40; j++) for (let i = 0; i < LW / 40; i++) { c.fillStyle = (i + j) % 2 ? '#FFFFFF' : '#F2D9A0'; c.fillRect(i * 40, j * 40, 40, 40); }
    c.fillStyle = 'rgba(43,63,85,.22)'; c.beginPath(); c.ellipse(CX + 10, CY + R * SQ + 22, R + 30, 30, 0, 0, Math.PI * 2); c.fill();
    // the tub: wooden staves, metal hoops, its rim
    c.save(); c.translate(CX, CY); c.scale(1, SQ);
    c.fillStyle = '#8A5A3B'; c.beginPath(); c.arc(0, 26 / SQ, R + 26, 0, Math.PI * 2); c.fill();                // the side, seen below the rim
    c.fillStyle = '#B07A4A'; c.beginPath(); c.arc(0, 0, R + 26, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#6B4430'; c.lineWidth = 2; for (let a = 0; a < 40; a++) { const q = a / 40 * Math.PI * 2; c.beginPath(); c.moveTo(Math.cos(q) * R, Math.sin(q) * R); c.lineTo(Math.cos(q) * (R + 26), Math.sin(q) * (R + 26)); c.stroke(); }
    c.strokeStyle = '#9AA6B2'; c.lineWidth = 7; c.beginPath(); c.arc(0, 0, R + 18, 0, Math.PI * 2); c.stroke();
    // the water
    const wg = c.createRadialGradient(-50, -60, 20, 0, 0, R); wg.addColorStop(0, '#7FD3F0'); wg.addColorStop(1, '#2E8FC4');
    c.fillStyle = wg; c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 2;
    for (let i = 0; i < 14; i++) { const a = i * 2.3 + t * 0.3, d = 40 + (i * 37) % (R - 60); c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, 14 + (i % 3) * 6, 0.2, 1.4); c.stroke(); }
    c.restore();
    const at = (x: number, y: number): [number, number] => [CX + x, CY + y * SQ];
    // the bakers, under the surface first, then the ones bobbed up
    if (g) {
      const order = g.spuds.filter(s => s.gone <= 0).map(s => ({ s, h: height(s, t) })).sort((a, b) => a.h - b.h);
      for (const { s, h } of order) this.spud(c, s, ...at(s.x, s.y), h);
    }
    for (const r of this.rings) { const [x, y] = at(r.x, r.y); c.strokeStyle = `rgba(255,255,255,${0.7 * (1 - r.t / 1.2)})`; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y, 10 + r.t * 40, (10 + r.t * 40) * SQ, 0, 0, Math.PI * 2); c.stroke(); }
    // Nico's head, seen from above and behind: lower and smaller as he dunks
    if (g) {
      const d = g.dunking ? Math.sin(Math.min(1, g.dunkT / BOB.dunk) * Math.PI) : 0, [hx, hy] = at(g.head.x, g.head.y);
      c.fillStyle = 'rgba(14,40,70,.25)'; c.beginPath(); c.ellipse(hx + 6, hy + 8, 30 - d * 6, 22 - d * 4, 0, 0, Math.PI * 2); c.fill();   // his shadow on the water
      if (!g.dunking) { c.strokeStyle = 'rgba(255,255,255,.7)'; c.setLineDash([6, 6]); c.lineWidth = 2; c.beginPath(); c.ellipse(hx, hy, BOB.reach, BOB.reach * SQ, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]); }
      const s = 1 - d * 0.28, lift = 70 - d * 60;
      c.save(); c.translate(hx, hy - lift); c.scale(s, s);
      c.fillStyle = '#E8B48E'; c.beginPath(); c.ellipse(-30, 6, 6, 9, 0, 0, Math.PI * 2); c.ellipse(30, 6, 6, 9, 0, 0, Math.PI * 2); c.fill();   // ears
      c.fillStyle = HAIR; c.beginPath(); c.ellipse(0, 0, 31, 34, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#6B4D3A'; c.lineWidth = 2.5; for (const a of [-0.9, -0.4, 0.1, 0.6]) { c.beginPath(); c.moveTo(0, -30); c.quadraticCurveTo(Math.sin(a) * 30, 0, Math.sin(a) * 26, 26); c.stroke(); }
      c.fillStyle = HAIR; c.beginPath(); c.ellipse(0, 36, 6, 16, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#F28C38'; c.fillRect(-6, 22, 12, 6);   // his ponytail and its tie
      c.restore();
    }
    for (const dr of this.drops) { c.fillStyle = `rgba(200,240,255,${1 - dr.t / 0.8})`; c.beginPath(); c.arc(dr.x, dr.y, 3.5, 0, Math.PI * 2); c.fill(); }   // (in screen units)
  }
  private spud(c: CanvasRenderingContext2D, s: Spud, x: number, y: number, h: number) {
    const k = 0.78 + 0.22 * Math.max(-1, h), under = h < 0;
    c.save(); c.translate(x, y); c.scale(k, k); c.globalAlpha = under ? 0.45 + 0.4 * (1 + h) : 1;
    c.fillStyle = 'rgba(14,40,70,.2)'; c.beginPath(); c.ellipse(4, 6, 28, 15, 0, 0, Math.PI * 2); c.fill();
    if (s.kind === 'plain') {
      c.fillStyle = '#A8703F'; c.beginPath(); c.ellipse(0, 0, 27, 17, 0.3, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#FFF1C6'; c.beginPath(); c.ellipse(0, -2, 12, 6, 0.3, 0, Math.PI * 2); c.fill();   // split open, steaming
      c.fillStyle = '#F9E04A'; c.fillRect(-3, -6, 7, 5);
    } else {
      const shine = s.kind === 'gold' ? ['#F9C846', '#FFF1A8', '#C9951F'] : ['#C9D3DC', '#FFFFFF', '#8E96A3'];
      c.fillStyle = shine[0]; c.beginPath(); c.ellipse(0, 0, 27, 17, 0.3, 0, Math.PI * 2); c.fill();
      c.strokeStyle = shine[2]; c.lineWidth = 1.5; for (const [a, b] of [[-14, -4], [-2, 6], [10, -6]]) { c.beginPath(); c.moveTo(a, b); c.lineTo(a + 8, b - 5); c.lineTo(a + 14, b + 2); c.stroke(); }
      c.fillStyle = shine[1]; c.beginPath(); c.ellipse(-8, -6, 8, 3, 0.3, 0, Math.PI * 2); c.fill();
      if (s.kind === 'gold' && !under) { c.fillStyle = '#FFFFFF'; for (const [a, b] of [[-26, -18], [24, -14]]) { c.fillRect(a - 1, b - 5, 2, 10); c.fillRect(a - 5, b - 1, 10, 2); } }
    }
    if (under) { c.globalAlpha = 0.35 * Math.min(1, -h * 2); c.fillStyle = '#2E8FC4'; c.beginPath(); c.ellipse(0, 0, 30, 20, 0.3, 0, Math.PI * 2); c.fill(); }
    c.restore();
  }
}
