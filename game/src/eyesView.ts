// Eye exams on screen (eyes.ts has the rules): the big lens machine with two round windows onto the eye chart, "1" and
// "2": tap the clearer. Then the patient reads the chart back, and then picks of frames, tried on their face.
import { Exam, EXAM, FRAMES, patientsToday, type Frame } from './eyes';
import { audio } from './sound';

export interface EyesHost { scores(): Record<string, number>; fitted(who: string, frame: number, stars: number): void; opened(on: boolean): void }
const LW = 640, LH = 420;
const LOOK: Record<string, { skin: string; hair: string }> = {
  maya: { skin: '#C68B62', hair: '#2A1E18' }, leo: { skin: '#8D5A3B', hair: '#1E1612' }, mrskim: { skin: '#F1C6A6', hair: '#C9C9C9' },
  sam: { skin: '#F3CFB3', hair: '#C46A2C' }, ava: { skin: '#A86F4B', hair: '#3B2618' }, mrbrooks: { skin: '#7A4A2E', hair: '#1A1411' },
};
const CHART = ['E', 'F P', 'T O Z', 'L P E D', 'P E C F D'];
function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e;
}
/** Text as seen through a lens: blurrier the further off it is. */
function blurText(c: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, blur: number) {
  c.font = `900 ${size}px ui-monospace, Menlo, monospace`; c.textAlign = 'center'; c.textBaseline = 'middle';
  if (blur < 0.12) { c.globalAlpha = 1; c.fillText(text, x, y); return; }
  const r = Math.min(14, blur * 4.2), n = 12;
  c.globalAlpha = 0.16; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; c.fillText(text, x + Math.cos(a) * r, y + Math.sin(a) * r); }
  c.globalAlpha = Math.max(0.12, 0.5 - blur * 0.12); c.fillText(text, x, y); c.globalAlpha = 1;
}
function chart(c: CanvasRenderingContext2D, cx: number, cy: number, blur: number, k = 1) {
  CHART.forEach((line, i) => { c.fillStyle = '#1E2733'; blurText(c, line, cx, cy - 70 * k + i * 36 * k, (40 - i * 6) * k, blur); });
}
/** A face (for the frames), with a pair of frames on it. */
export function faceWith(c: CanvasRenderingContext2D, x: number, y: number, r: number, who: string, f: Frame | null) {
  const l = LOOK[who] ?? LOOK.maya;
  c.fillStyle = l.hair; c.beginPath(); c.arc(x, y - r * 0.15, r * 1.08, Math.PI, 0); c.fill();
  c.fillStyle = l.skin; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = l.hair; c.beginPath(); c.ellipse(x, y - r * 0.72, r * 0.95, r * 0.42, 0, Math.PI, 0); c.fill();
  c.fillStyle = '#1E2733'; for (const s of [-1, 1]) { c.beginPath(); c.arc(x + s * r * 0.36, y, r * 0.1, 0, Math.PI * 2); c.fill(); }
  c.strokeStyle = '#B5624A'; c.lineWidth = r * 0.08; c.lineCap = 'round'; c.beginPath(); c.arc(x, y + r * 0.3, r * 0.28, 0.2, Math.PI - 0.2); c.stroke();
  if (!f) return;
  c.strokeStyle = f.color; c.lineWidth = r * 0.1; c.fillStyle = 'rgba(220,234,245,.25)';
  for (const s of [-1, 1]) {
    const lx = x + s * r * 0.36, rx = r * 0.3, ry = r * 0.24; c.beginPath();
    if (f.shape === 'round') c.ellipse(lx, y, rx, ry * 1.1, 0, 0, Math.PI * 2);
    else if (f.shape === 'cat') { c.moveTo(lx - s * rx, y - ry * 0.3); c.lineTo(lx - s * rx * 0.2, y - ry); c.lineTo(lx + s * rx * 1.1, y - ry * 1.3); c.lineTo(lx + s * rx * 0.8, y + ry * 0.7); c.lineTo(lx - s * rx * 0.6, y + ry * 0.8); c.closePath(); }
    else c.roundRect(lx - rx, y - ry, rx * 2, ry * 2, f.shape === 'soft' ? ry * 0.9 : r * 0.05);
    c.fill(); c.stroke();
  }
  c.beginPath(); c.moveTo(x - r * 0.06, y - r * 0.02); c.lineTo(x + r * 0.06, y - r * 0.02); c.stroke();
}

export class EyesGame {
  readonly el: HTMLElement;
  private canvas: HTMLCanvasElement; private sayEl: HTMLElement; private countEl: HTMLElement; private panel: HTMLElement;
  private raf = 0; private k = 1; private t = 0; private off: (() => void)[] = []; private last = 0;
  phase: 'exam' | 'read' | 'frames' | 'done' = 'exam'; patients: { who: string; name: string }[] = []; i = 0; exam: Exam | null = null; chosen = -1; private readT = 0; seen = 0;

  constructor(private host: EyesHost) {
    this.el = el('div', 'peel eyes'); this.el.id = 'eyes'; this.el.hidden = true;
    const top = el('div', 'pl-top'); this.sayEl = el('div', 'fish-msg', ''); this.countEl = el('div', 'pl-count', '👓 0'); top.append(this.sayEl, this.countEl);
    this.canvas = el('canvas', 'pl-board'); this.panel = el('div', 'pl-panel'); this.panel.hidden = true;
    const wrap = el('div', 'pl-wrap'); wrap.append(this.canvas, this.panel);
    const close = el('button', 'pl-close', '✕'); close.type = 'button'; close.setAttribute('aria-label', 'Stop');
    this.el.append(top, wrap, close); document.body.append(this.el);
    close.addEventListener('click', () => this.close());
    this.canvas.addEventListener('pointerdown', e => { e.preventDefault(); const r = this.canvas.getBoundingClientRect(); this.tap((e.clientX - r.left) / r.width * LW, (e.clientY - r.top) / r.height * LH); });
  }
  get isOpen() { return !this.el.hidden; }
  open() {
    if (this.isOpen) return;
    this.el.hidden = false; this.host.opened(true); this.layout(); this.seen = 0;
    this.patients = patientsToday(this.host.scores()); this.i = -1; this.next();
    const onResize = () => this.layout(), onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (e.type === 'keydown') this.close(); e.stopPropagation(); } if (e.key === '1' || e.key === '2') { e.stopPropagation(); if (e.type === 'keydown') this.pick(+e.key as 1 | 2); } };
    window.addEventListener('resize', onResize); window.addEventListener('keydown', onKey, true);
    this.off = [() => window.removeEventListener('resize', onResize), () => window.removeEventListener('keydown', onKey, true)];
    this.last = performance.now();
    const loop = (now: number) => { this.raf = requestAnimationFrame(loop); this.t += Math.min(0.05, (now - this.last) / 1000); this.last = now; this.frame(); };
    this.raf = requestAnimationFrame(loop);
  }
  close() { if (!this.isOpen) return; cancelAnimationFrame(this.raf); for (const f of this.off) f(); this.off = []; this.el.hidden = true; this.host.opened(false); }
  snapshot() { return { open: this.isOpen, phase: this.phase, patient: this.patients[this.i]?.who ?? null, picks: this.exam?.picks ?? 0, better: this.exam?.better ?? null, stars: this.exam?.done ? this.exam.stars : null, seen: this.seen }; }
  private get p() { return this.patients[this.i]; }
  private say(t: string) { this.sayEl.textContent = `Dr. Nonna: “${t}”`; }
  private next() {
    this.i++; this.panel.hidden = true;
    if (this.i >= this.patients.length) { this.phase = 'done'; this.say('That\'s everyone! Grazie, Dr. Nico. You have a good eye.'); this.showPanel('All done!', `You helped ${this.seen} patient${this.seen === 1 ? '' : 's'} today.`, [['Done', () => this.close()]]); return; }
    this.exam = new Exam(Exam.random()); this.phase = 'exam'; this.chosen = -1;
    this.say(`${this.p.name}, sit, sit. Nico: better one... or two? Tap the clearer one.`);
  }
  /** Pick lens 1 or 2. */
  pick(which: 1 | 2) {
    if (this.phase !== 'exam' || !this.exam) return;
    this.exam.pick(which); audio.tone('triangle', which === 1 ? 520 : 660, which === 1 ? 520 : 660, 0.08, 0.05);
    if (this.exam.done) { this.phase = 'read'; this.readT = 0; this.say(`Now ${this.p.name}, read me the chart.`); }
    else this.say(['And now... one, or two?', 'Good. One... or two?', 'Nearly there. One... or two?'][this.exam.picks - 1] ?? 'One... or two?');
  }
  pickFrame(i: number) {
    if (this.phase !== 'frames') return;
    this.chosen = i; this.host.fitted(this.p.who, i, this.exam!.stars); this.seen++; audio.tone('triangle', 784, 1047, 0.15, 0.06);
    this.say(`Bellissimo! ${this.p.name} loves the ${FRAMES[i].name.toLowerCase()} glasses.`);
    this.showPanel(`${this.p.name}'s new glasses!`, `${'⭐'.repeat(this.exam!.stars)} ${this.exam!.stars === 3 ? 'A perfect prescription.' : this.exam!.stars === 2 ? 'Very close!' : 'Hmm, a bit blurry. Dr. Nonna fixes it up.'} Look out for them round town!`, [[this.i + 1 < this.patients.length ? 'Next patient' : 'Finish', () => this.next()]]);
  }
  private tap(x: number, y: number) {
    if (this.phase === 'exam') { if (Math.hypot(x - 180, y - 215) < 130) this.pick(1); else if (Math.hypot(x - 460, y - 215) < 130) this.pick(2); }
    else if (this.phase === 'read' && this.readT > 1.2) { this.phase = 'frames'; this.say(`Now the fun part. Which frames for ${this.p.name}?`); }
    else if (this.phase === 'frames') { const col = Math.floor((x - 20) / 200), row = Math.floor((y - 50) / 180); if (col >= 0 && col < 3 && row >= 0 && row < 2) this.pickFrame(row * 3 + col); }
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
  private frame() {
    this.countEl.textContent = `👓 ${this.seen}`;
    const c = this.canvas.getContext('2d')!, e = this.exam;
    c.setTransform(this.k, 0, 0, this.k, 0, 0);
    c.fillStyle = '#EAF3FB'; c.fillRect(0, 0, LW, LH);
    if (!e || !this.p) return;
    c.fillStyle = '#2B3F55'; c.font = '800 18px system-ui'; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText(`Patient: ${this.p.name}`, 20, 30);
    if (this.phase === 'exam') {
      // the lens machine: two round windows, the chart through each
      c.fillStyle = '#3E4A5A'; c.beginPath(); c.roundRect(40, 70, 560, 290, 140); c.fill(); c.fillStyle = '#5B6472'; c.beginPath(); c.roundRect(290, 40, 60, 60, 12); c.fill();
      for (const [n, cx] of [[1, 180], [2, 460]] as const) {
        const lens = n === 1 ? e.lens1 : e.lens2;
        c.save(); c.beginPath(); c.arc(cx, 215, 120, 0, Math.PI * 2); c.fillStyle = '#FFFFFF'; c.fill(); c.clip(); chart(c, cx, 215, e.blur(lens)); c.restore();
        c.strokeStyle = '#1E2733'; c.lineWidth = 12; c.beginPath(); c.arc(cx, 215, 124, 0, Math.PI * 2); c.stroke();
        c.fillStyle = '#F9C846'; c.beginPath(); c.arc(cx, 365, 26, 0, Math.PI * 2); c.fill(); c.fillStyle = '#1E2733'; c.font = '900 30px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), cx, 366);
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + this.t * 0.2 * (n === 1 ? 1 : -1); c.fillStyle = '#9AA6B2'; c.beginPath(); c.arc(cx + Math.cos(a) * 140, 215 + Math.sin(a) * 140, 5, 0, Math.PI * 2); c.fill(); }
      }
      for (let i = 0; i < EXAM.picks; i++) { c.fillStyle = i < e.picks ? '#3BB273' : '#C9D3DC'; c.beginPath(); c.arc(LW / 2 - 36 + i * 24, 400, 7, 0, Math.PI * 2); c.fill(); }
    } else if (this.phase === 'read') {
      this.readT += 1 / 60;
      c.fillStyle = '#FFFFFF'; c.beginPath(); c.roundRect(170, 50, 300, 300, 16); c.fill(); chart(c, 320, 205, e.blur(e.mid), 1.15);
      const said = e.stars === 3 ? 'E... F P... T O Z... L P E D!' : e.stars === 2 ? 'E... F P... T O Z... L... B? E D?' : 'E... um... B? O? ...it\'s all fuzzy!';
      const shown = said.slice(0, Math.floor(this.readT * 14));
      c.fillStyle = '#2B3F55'; c.font = '800 22px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(`${this.p.name}: “${shown}”`, 320, 385);
      if (this.readT > 1.2 && Math.floor(this.t * 2) % 2) { c.font = '700 15px system-ui'; c.fillStyle = '#5B6472'; c.fillText('(tap to pick frames)', 320, 30); }
    } else if (this.phase === 'frames' || this.phase === 'done') {
      FRAMES.forEach((f, i) => {
        const x = 120 + (i % 3) * 200, y = 140 + Math.floor(i / 3) * 180;
        c.fillStyle = this.chosen === i ? '#FFF1A8' : '#FFFFFF'; c.beginPath(); c.roundRect(x - 90, y - 85, 180, 165, 14); c.fill();
        faceWith(c, x, y - 10, 46, this.p.who, f);
        c.fillStyle = '#2B3F55'; c.font = '800 15px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(f.name, x, y + 62);
      });
    }
  }
}
