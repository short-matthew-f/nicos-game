// Operating with Dr. Poppop on screen (surgery.ts has the rules). Steady hands: the patient on the table, the
// opening with its red rim (like the board game), silver tweezers on your finger, BZZT if you touch the side.
// X-ray detective: the patient standing in front of the X-ray screen; drag the scanner over them to see inside.
import { Steady, XRay, CASES, STEADY, XRAY, type Case } from './surgery';
import { audio } from './sound';

export interface SurgeryHost { steadyDone(c: Case, stars: number): void; xrayDone(found: number, score: number): void; opened(on: boolean): void }
const LW = 640, LH = 420;
function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e;
}
const buzz = () => { audio.tone('sawtooth', 120, 110, 0.35, 0.09); audio.tone('square', 240, 230, 0.35, 0.04); };

export class SurgeryGame {
  readonly el: HTMLElement;
  steady: Steady | null = null; xray: XRay | null = null;
  private canvas: HTMLCanvasElement; private sayEl: HTMLElement; private countEl: HTMLElement; private panel: HTMLElement;
  private raf = 0; private k = 1; private t = 0; private last = 0; private off: (() => void)[] = []; private flash = 0; private scan: [number, number] | null = null;

  constructor(private host: SurgeryHost) {
    this.el = el('div', 'peel surgery'); this.el.id = 'surgery'; this.el.hidden = true;
    const top = el('div', 'pl-top'); this.sayEl = el('div', 'fish-msg', ''); this.countEl = el('div', 'pl-count', ''); top.append(this.sayEl, this.countEl);
    this.canvas = el('canvas', 'pl-board'); this.panel = el('div', 'pl-panel'); this.panel.hidden = true;
    const wrap = el('div', 'pl-wrap'); wrap.append(this.canvas, this.panel);
    const close = el('button', 'pl-close', '✕'); close.type = 'button'; close.setAttribute('aria-label', 'Stop');
    this.el.append(top, wrap, close); document.body.append(this.el);
    close.addEventListener('click', () => this.close());
    const at = (e: PointerEvent): [number, number] => { const r = this.canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * LW, (e.clientY - r.top) / r.height * LH]; };
    this.canvas.addEventListener('pointerdown', e => { e.preventDefault(); this.canvas.setPointerCapture?.(e.pointerId); const p = at(e); this.down(...p); });
    this.canvas.addEventListener('pointermove', e => { const p = at(e); this.moveTo(...p); });
    for (const ev of ['pointerup', 'pointercancel']) this.canvas.addEventListener(ev, () => { this.steady?.up(); });
  }
  get isOpen() { return !this.el.hidden; }
  openSteady(c: Case) { this.steady = new Steady(c); this.xray = null; this.open(); this.say(`${c.title}. Put the tweezers in (the green circle), steady now... don't touch the sides!`); }
  openXray() { this.xray = new XRay(); this.steady = null; this.open(); this.sayRound(); }
  private open() {
    this.panel.hidden = true; this.flash = 0; this.scan = null;
    if (!this.isOpen) {
      this.el.hidden = false; this.host.opened(true); this.layout();
      const onResize = () => this.layout(), onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (e.type === 'keydown') this.close(); e.stopPropagation(); } };
      window.addEventListener('resize', onResize); window.addEventListener('keydown', onKey, true);
      this.off = [() => window.removeEventListener('resize', onResize), () => window.removeEventListener('keydown', onKey, true)];
      this.last = performance.now();
      const loop = (now: number) => { this.raf = requestAnimationFrame(loop); const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.frame(dt); };
      this.raf = requestAnimationFrame(loop);
    }
  }
  close() { if (!this.isOpen) return; cancelAnimationFrame(this.raf); for (const f of this.off) f(); this.off = []; this.el.hidden = true; this.host.opened(false); }
  snapshot() { return { open: this.isOpen, steady: this.steady ? { phase: this.steady.phase, buzzes: this.steady.buzzes, carrying: this.steady.carrying, tip: this.steady.tip, path: this.steady.path } : null, xray: this.xray ? { phase: this.xray.phase, round: this.xray.round, found: this.xray.found, at: this.xray.at, thing: this.xray.thing.id } : null }; }
  /** Where a point on the table is on the screen (for tests). */
  screenAt(x: number, y: number) { const r = this.canvas.getBoundingClientRect(); return { x: r.left + x / LW * r.width, y: r.top + y / LH * r.height }; }
  private say(t: string) { this.sayEl.textContent = `Dr. Poppop: “${t}”`; }
  private sayRound() { const x = this.xray!; this.say(`${x.who} swallowed something! Sweep the scanner over and tap it. Find ${x.thing.name}!`); }
  private down(x: number, y: number) {
    if (this.steady) { const ev = this.steady.down(x, y); if (ev.includes('pickup')) audio.tone('triangle', 660, 660, 0.05, 0.04); }
    if (this.xray) { this.scan = [x, y]; const ev = this.xray.tap(x, y); if (ev.includes('found')) { audio.tone('triangle', 523, 1047, 0.2, 0.06); this.say(pick(['There it is! Nothing to worry about.', 'Found it! It\'ll be out in no time.', 'Good eye, kiddo!'])); } }
  }
  private moveTo(x: number, y: number) {
    if (this.xray) this.scan = [x, y];
    if (!this.steady) return;
    for (const e of this.steady.move(x, y)) {
      if (e === 'buzz') { buzz(); this.flash = 0.4; this.say(this.steady.buzzes < STEADY.buzzes ? `BZZT! Easy... pick the tweezers up where they are and try again. (${STEADY.buzzes - this.steady.buzzes} left)` : 'BZZT!'); }
      if (e === 'grab') { audio.tone('square', 880, 1320, 0.1, 0.05); this.say('Got it! Now back out the way you came, slowly...'); }
      if (e === 'done') { audio.tone('triangle', 523, 1047, 0.25, 0.07); this.finishSteady(true); }
      if (e === 'fail') this.finishSteady(false);
    }
  }
  private finishSteady(ok: boolean) {
    const s = this.steady!, c = s.c, i = CASES.indexOf(c);
    if (ok) this.host.steadyDone(c, s.stars);
    this.say(ok ? pick(['Beautiful work, Dr. Nico!', 'Steady as a rock. You\'ve got surgeon\'s hands!', 'Perfect. Every patient goes home smiling.']) : 'Let me help with that one. Try again?');
    const btns: [string, () => void][] = ok && i + 1 < CASES.length ? [[`Next: ${CASES[i + 1].title}`, () => this.openSteady(CASES[i + 1])], ['Done', () => this.close()]] : [[ok ? 'Done' : 'Try again', () => (ok ? this.close() : this.openSteady(c))], ...(ok ? [] : [['Done', () => this.close()] as [string, () => void]])];
    this.showPanel(ok ? `${'⭐'.repeat(s.stars)} All better!` : 'BZZT!', ok ? `${c.title}: out it comes!` : 'Three buzzes. Dr. Poppop takes over this time.', btns);
  }
  private showPanel(title: string, text: string, buttons: [string, () => void][]) {
    this.panel.replaceChildren(el('h2', '', title), el('p', '', text));
    for (const [label, fn] of buttons) { const b = el('button', 'pl-btn', label); b.type = 'button'; b.addEventListener('click', fn); this.panel.append(b); }
    this.panel.hidden = false;
  }
  private layout() {
    const W = window.innerWidth, H = window.innerHeight, k = Math.max(0.5, Math.min((W - 40) / LW, (H - 200) / LH)), dpr = Math.min(2, window.devicePixelRatio || 1);
    this.k = k * dpr; this.canvas.width = Math.floor(LW * this.k); this.canvas.height = Math.floor(LH * this.k);
    this.canvas.style.width = `${Math.floor(LW * k)}px`; this.canvas.style.height = `${Math.floor(LH * k)}px`;
  }
  private frame(dt: number) {
    this.t += dt; this.flash = Math.max(0, this.flash - dt);
    const x = this.xray;
    if (x) for (const e of x.update(dt)) {
      if (e === 'timeout') this.say(`Time! It was ${x.thing.name}, right there. Next patient...`);
      if (e === 'next') this.sayRound();
      if (e === 'done') { this.host.xrayDone(x.found, x.score); this.say(x.found >= 4 ? 'X-ray expert! You\'ve got the eyes of a hawk.' : 'Good work, Dr. Nico!'); this.showPanel('X-rays done!', `You found ${x.found} of ${XRAY.rounds}. Score ${x.score}.`, [['Again', () => this.openXray()], ['Done', () => this.close()]]); }
    }
    this.countEl.textContent = x ? `🩻 ${x.found}/${XRAY.rounds}` : this.steady ? `❤️ ${STEADY.buzzes - this.steady.buzzes}` : '';
    const c = this.canvas.getContext('2d')!;
    c.setTransform(this.k, 0, 0, this.k, 0, 0);
    if (this.steady) this.drawSteady(c, this.steady); else if (x) this.drawXray(c, x);
  }
  private drawSteady(c: CanvasRenderingContext2D, s: Steady) {
    c.fillStyle = '#4FA88A'; c.fillRect(0, 0, LW, LH);   // the green drape
    c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 2; for (let i = 0; i < LW; i += 24) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, LH); c.stroke(); }
    // the patient
    const b = s.c.body, skin = b === 'hand' ? '#7A4A2E' : b === 'arm' ? '#A86F4B' : b === 'teddy' ? '#C48A55' : '#9AA6B2';
    c.fillStyle = skin;
    if (b === 'teddy') { c.beginPath(); c.ellipse(320, 230, 270, 175, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#E9C7A0'; c.beginPath(); c.ellipse(320, 250, 170, 110, 0, 0, Math.PI * 2); c.fill(); }
    else if (b === 'robot') { c.beginPath(); c.roundRect(40, 50, 560, 330, 30); c.fill(); c.fillStyle = '#C9D3DC'; for (const [x, y] of [[70, 80], [570, 80], [70, 350], [570, 350]]) { c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.fill(); } }
    else if (b === 'hand') { c.beginPath(); c.roundRect(30, 120, 420, 260, 80); c.fill(); for (let i = 0; i < 4; i++) { c.beginPath(); c.roundRect(430, 110 + i * 62, 190, 52, 26); c.fill(); } }
    else { c.beginPath(); c.roundRect(20, 90, 600, 260, 130); c.fill(); }
    // the opening: red rim, pale inside (like the board game)
    const line = (w: number, col: string) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); s.path.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); };
    line(s.c.width + 10, this.flash > 0 ? '#FF2A2A' : '#C8282D'); line(s.c.width, '#FFF1EA'); line(s.c.width - 14, 'rgba(232,150,140,.25)');
    const [sx, sy] = s.path[0], [ex, ey] = s.end;
    c.strokeStyle = '#3BB273'; c.lineWidth = 4; c.setLineDash([6, 5]); c.beginPath(); c.arc(sx, sy, STEADY.home, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    if (!s.carrying && s.phase !== 'done') this.thing(c, s.c.thing, ex, ey);
    // the tweezers
    const [tx, ty] = s.tip, wob = s.holding ? 0 : 2;
    c.strokeStyle = '#E9EEF3'; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(tx - 4 - wob, ty - 2); c.lineTo(tx + 60, ty - 70); c.moveTo(tx + 4 + wob, ty + 2); c.lineTo(tx + 70, ty - 60); c.stroke();
    c.strokeStyle = '#8E96A3'; c.lineWidth = 2; c.beginPath(); c.moveTo(tx + 60, ty - 70); c.lineTo(tx + 70, ty - 60); c.stroke();
    if (s.carrying) this.thing(c, s.c.thing, tx, ty);
    if (this.flash > 0) { c.fillStyle = `rgba(255,40,40,${this.flash * 0.5})`; c.fillRect(0, 0, LW, LH); c.fillStyle = '#FFFFFF'; c.font = '900 64px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('BZZT!', LW / 2, LH / 2); }
  }
  private thing(c: CanvasRenderingContext2D, t: string, x: number, y: number) {
    if (t === 'splinter') { c.strokeStyle = '#8A5A3B'; c.lineWidth = 4; c.beginPath(); c.moveTo(x - 10, y + 4); c.lineTo(x + 10, y - 4); c.stroke(); }
    else if (t === 'marble') { c.fillStyle = '#5B8FD6'; c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.fill(); c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(x - 3, y - 3, 3, 0, Math.PI * 2); c.fill(); }
    else if (t === 'key') { c.strokeStyle = '#F9C846'; c.lineWidth = 3.5; c.beginPath(); c.arc(x - 6, y, 5, 0, Math.PI * 2); c.moveTo(x - 1, y); c.lineTo(x + 12, y); c.moveTo(x + 8, y); c.lineTo(x + 8, y + 5); c.stroke(); }
    else { c.fillStyle = '#1E2733'; c.beginPath(); c.moveTo(x - 8, y - 2); c.lineTo(x + 8, y); c.lineTo(x - 8, y + 2); c.fill(); }
  }
  private drawXray(c: CanvasRenderingContext2D, x: XRay) {
    c.fillStyle = '#1B2333'; c.fillRect(0, 0, LW, LH);
    const teddy = x.who === 'Teddy', skin = teddy ? '#C48A55' : '#E8B48E', shirt = teddy ? '#C48A55' : ['#5B8FD6', '#E5484D', '#3BB273', '#F9A826'][x.round % 4];
    const body = (cc: CanvasRenderingContext2D, fill: boolean) => {
      cc.beginPath(); cc.arc(320, 95, 52, 0, Math.PI * 2); if (fill) { cc.fillStyle = skin; cc.fill(); } else cc.stroke();
      if (teddy) { for (const s of [-1, 1]) { cc.beginPath(); cc.arc(320 + s * 42, 52, 18, 0, Math.PI * 2); if (fill) cc.fill(); else cc.stroke(); } }
      cc.beginPath(); cc.roundRect(205, 150, 230, 250, 60); if (fill) { cc.fillStyle = shirt; cc.fill(); } else cc.stroke();
      for (const s of [-1, 1]) { cc.beginPath(); cc.roundRect(s < 0 ? 150 : 440, 165, 50, 190, 25); if (fill) { cc.fillStyle = shirt; cc.fill(); } else cc.stroke(); }
    };
    body(c, true);
    c.fillStyle = '#FFFFFF'; c.font = '800 16px system-ui'; c.textAlign = 'center'; c.fillText(x.who, 320, 30);
    // the scanner: inside it, the X-ray
    const [sx, sy] = this.scan ?? [-200, -200], R = 78;
    c.save(); c.beginPath(); c.arc(sx, sy, R, 0, Math.PI * 2); c.clip();
    c.fillStyle = '#0E2238'; c.fillRect(0, 0, LW, LH);
    c.strokeStyle = 'rgba(160,200,255,.35)'; c.lineWidth = 3; body(c, false);
    c.strokeStyle = 'rgba(225,240,255,.9)'; c.fillStyle = 'rgba(225,240,255,.85)'; c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.arc(320, 92, 40, 0, Math.PI * 2); c.stroke();   // skull
    for (let i = 0; i < 9; i++) { c.beginPath(); c.roundRect(311, 160 + i * 22, 18, 15, 4); c.fill(); }   // spine
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { c.beginPath(); c.moveTo(320 + s * 10, 175 + i * 20); c.quadraticCurveTo(320 + s * 95, 165 + i * 22, 320 + s * 80, 205 + i * 20); c.stroke(); }   // ribs
    c.beginPath(); c.ellipse(320, 375, 70, 22, 0, Math.PI, Math.PI * 2); c.stroke();   // hips
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(320 + s * 145, 180); c.lineTo(320 + s * 145, 340); c.stroke(); }   // arms
    if (x.phase !== 'done') this.xthing(c, x.thing.id, ...x.at);
    c.restore();
    c.strokeStyle = '#4FE3C1'; c.lineWidth = 4; c.beginPath(); c.arc(sx, sy, R, 0, Math.PI * 2); c.stroke();
    if (x.phase === 'found' || x.phase === 'missed') { c.strokeStyle = x.phase === 'found' ? '#3BB273' : '#F9C846'; c.lineWidth = 5; c.beginPath(); c.arc(x.at[0], x.at[1], 32, 0, Math.PI * 2); c.stroke(); this.xthing(c, x.thing.id, ...x.at); }
    // the clock
    c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(20, LH - 24, 600, 10); c.fillStyle = x.time < 5 ? '#E5484D' : '#4FE3C1'; c.fillRect(20, LH - 24, 600 * x.time / XRAY.time, 10);
  }
  private xthing(c: CanvasRenderingContext2D, id: string, x: number, y: number) {
    c.fillStyle = '#FFFFFF'; c.strokeStyle = '#FFFFFF'; c.lineWidth = 3;
    if (id === 'coin') { c.beginPath(); c.arc(x, y, 13, 0, Math.PI * 2); c.fill(); }
    else if (id === 'brick') { c.fillRect(x - 14, y - 8, 28, 16); for (const d of [-8, 0, 8]) c.fillRect(x + d - 3, y - 13, 6, 5); }
    else if (id === 'marble') { c.beginPath(); c.arc(x, y, 10, 0, Math.PI * 2); c.fill(); }
    else if (id === 'dino') { c.beginPath(); c.ellipse(x, y, 13, 7, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(x + 10, y - 2); c.lineTo(x + 16, y - 14); c.stroke(); c.beginPath(); c.arc(x + 17, y - 16, 4, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(x - 12, y); c.lineTo(x - 22, y + 4); c.stroke(); }
    else if (id === 'key') { c.beginPath(); c.arc(x - 8, y, 6, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.moveTo(x - 2, y); c.lineTo(x + 16, y); c.moveTo(x + 11, y); c.lineTo(x + 11, y + 6); c.stroke(); }
    else if (id === 'car') { c.fillRect(x - 15, y - 5, 30, 10); c.fillRect(x - 8, y - 11, 14, 7); c.beginPath(); c.arc(x - 9, y + 7, 4, 0, Math.PI * 2); c.arc(x + 9, y + 7, 4, 0, Math.PI * 2); c.fill(); }
    else if (id === 'button') { c.beginPath(); c.arc(x, y, 11, 0, Math.PI * 2); c.stroke(); for (const [a, b] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) { c.beginPath(); c.arc(x + a, y + b, 1.6, 0, Math.PI * 2); c.fill(); } }
    else { c.beginPath(); c.moveTo(x - 10, y + 8); c.lineTo(x - 10, y - 8); c.arc(x - 6, y - 8, 4, Math.PI, 0); c.lineTo(x - 2, y + 4); c.arc(x + 2, y + 4, 4, Math.PI, 0, true); c.lineTo(x + 6, y - 10); c.stroke(); }
  }
}
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
