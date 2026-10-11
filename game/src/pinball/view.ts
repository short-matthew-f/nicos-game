// Nico's City Pinball on screen (the user, 2026-10-10: "a real working pinball game... when you walk up
// to it you can push play, and a pinball sized screen pops up complete with buttons for left and right
// flippers and a load ball"). A tall cabinet: the dot-matrix score display on top, the playfield under
// glass, big arcade buttons either side (flippers) and a plunger button you hold to pull back. Keys
// too: left/right arrows (or Z and /) flip, space launches. Drawn with a 2D canvas; the playfield art
// is drawn once and kept, the moving parts every frame.
import { Game, RULES } from './rules';
import { T, SEGS, BUMPERS, SLINGS, LANE_POSTS, LANES, TARGETS, SAUCER, SPINNER, ARCH, type V } from './table';
import { tipOf, type FlipperState } from './physics';
import { audio } from '../sound';

export interface PinballHost { high(): number; setHigh(n: number): void; opened(on: boolean): void }

const DMD_H = 118;   // the score display's height, in table units (it's the table's width across)
const AMBER = '#FF9A2E';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e;
}

export class Pinball {
  readonly el: HTMLElement;
  game: Game;
  private cab: HTMLElement; private dmd: HTMLCanvasElement; private table: HTMLCanvasElement; private start: HTMLButtonElement;
  private launchBtn: HTMLButtonElement;
  private art: HTMLCanvasElement | null = null;   // the playfield, drawn once per size
  private scale = 1; private dpr = 1;
  private raf = 0; private last = 0;
  private pull = -1;           // how far the plunger's pulled back (0..1), -1: not held
  private pullT = 0;
  private dmdCache = { key: '', canvas: null as HTMLCanvasElement | null };
  private keys = new Set<string>();
  private off: (() => void)[] = [];
  private t = 0;
  private pops: { x: number; y: number; text: string; t: number; color: string }[] = [];   // "+100"s floating up from what was hit

  constructor(private host: PinballHost) {
    this.game = new Game(host.high());
    this.el = el('div', 'pinball'); this.el.id = 'pinball'; this.el.hidden = true;
    this.cab = el('div', 'pb-cab');
    this.dmd = el('canvas', 'pb-dmd'); this.table = el('canvas', 'pb-table');
    this.start = el('button', 'pb-start', 'PLAY'); this.start.type = 'button';
    const glass = el('div', 'pb-glass'); glass.append(this.table, this.start);
    this.cab.append(this.dmd, glass);
    const mk = (cls: string, label: string, aria: string) => { const b = el('button', `pb-btn ${cls}`); b.type = 'button'; b.innerHTML = label; b.setAttribute('aria-label', aria); return b; };
    const left = mk('pb-flip pb-left', '<span>◀</span>', 'Left flipper'), right = mk('pb-flip pb-right', '<span>▶</span>', 'Right flipper');
    this.launchBtn = mk('pb-launch', '<span>LAUNCH</span><small>hold to pull</small>', 'Launch the ball');
    const close = mk('pb-close', '✕', 'Stop playing');
    const lcol = el('div', 'pb-col pb-lcol'), rcol = el('div', 'pb-col pb-rcol');
    lcol.append(left); rcol.append(this.launchBtn, right);
    this.el.append(lcol, this.cab, rcol, close);
    document.body.append(this.el);

    const hold = (b: HTMLElement, down: () => void, up: () => void) => {
      b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); b.classList.add('on'); down(); });
      const end = () => { if (!b.classList.contains('on')) return; b.classList.remove('on'); up(); };
      for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, end);
    };
    hold(left, () => this.flip('L', true), () => this.flip('L', false));
    hold(right, () => this.flip('R', true), () => this.flip('R', false));
    hold(this.launchBtn, () => this.pullStart(), () => this.pullRelease());
    // touching the glass works too: the left half flips left, the right half right
    const sides = new Map<number, 'L' | 'R'>();
    this.table.addEventListener('pointerdown', e => {
      e.preventDefault(); const r = this.table.getBoundingClientRect(), s = e.clientX < r.left + r.width / 2 ? 'L' : 'R';
      this.table.setPointerCapture?.(e.pointerId); sides.set(e.pointerId, s); this.flip(s, true);
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) this.table.addEventListener(ev, e => {
      const s = sides.get((e as PointerEvent).pointerId); if (!s) return; sides.delete((e as PointerEvent).pointerId);
      if (![...sides.values()].includes(s)) this.flip(s, false);
    });
    this.start.addEventListener('click', () => this.play());
    close.addEventListener('click', () => this.close());
    this.el.addEventListener('contextmenu', e => e.preventDefault());
  }

  get isOpen() { return !this.el.hidden; }

  open() {
    if (this.isOpen) return;
    this.el.hidden = false; this.host.opened(true);
    this.game = new Game(this.host.high());
    this.layout(); this.showStart();
    const onKey = (e: KeyboardEvent) => this.key(e, e.type === 'keydown');
    const onResize = () => this.layout();
    window.addEventListener('keydown', onKey, true); window.addEventListener('keyup', onKey, true); window.addEventListener('resize', onResize);
    this.off = [() => window.removeEventListener('keydown', onKey, true), () => window.removeEventListener('keyup', onKey, true), () => window.removeEventListener('resize', onResize)];
    this.last = performance.now();
    const loop = (now: number) => { this.raf = requestAnimationFrame(loop); this.frame(Math.min(1 / 30, (now - this.last) / 1000)); this.last = now; };
    this.raf = requestAnimationFrame(loop);
    sfx.coin();
  }
  close() {
    if (!this.isOpen) return;
    cancelAnimationFrame(this.raf); for (const f of this.off) f(); this.off = [];
    this.saveHigh(); this.el.hidden = true; this.host.opened(false);
  }
  /** Start a game (the PLAY button). */
  play() {
    this.game.start(); this.start.hidden = true; sfx.start();
  }
  private showStart() {
    this.start.hidden = false;
    this.start.textContent = this.game.over ? 'PLAY AGAIN' : 'PLAY';
  }
  private saveHigh() { if (this.game.high > this.host.high()) this.host.setHigh(this.game.high); }

  flip(side: 'L' | 'R', down: boolean) {
    const s = this.game.table.flippers.find(f => f.f.side === side)!;
    if (down && !s.pressed && this.game.started && !this.game.over) sfx.flipper(side);
    this.game.flip(side, down);
  }
  private pullStart() { if (this.pull < 0) { this.pull = 0; this.pullT = 0; } }
  private pullRelease() {
    if (this.pull < 0) return;
    const power = this.pullT < 0.18 ? 0.25 + Math.random() * 0.55 : this.pull;   // (a quick tap: a good launch, never quite the same twice)
    this.pull = -1;
    if (!this.game.started || this.game.over) return;
    this.game.launch(power);
  }
  private key(e: KeyboardEvent, down: boolean) {
    if (!this.isOpen) return;
    const k = e.key, c = e.code;
    const L = k === 'ArrowLeft' || k === 'z' || k === 'Z' || c === 'ShiftLeft', R = k === 'ArrowRight' || k === '/' || k === 'm' || k === 'M' || c === 'ShiftRight';
    const P = k === ' ' || k === 'ArrowDown' || k === 'Enter';
    if (k === 'Escape' && down) { this.close(); e.stopPropagation(); return; }
    if (!L && !R && !P) return;
    e.preventDefault(); e.stopPropagation();
    const id = L ? 'L' : R ? 'R' : 'P';
    if (down && this.keys.has(id)) return;   // (key repeat)
    if (down) this.keys.add(id); else this.keys.delete(id);
    if (P && (!this.game.started || this.game.over)) { if (!down) this.play(); return; }
    if (L || R) this.flip(L ? 'L' : 'R', down);
    else if (down) this.pullStart(); else this.pullRelease();
  }

  /** Size the cabinet to the screen: as big as fits, buttons beside it (or under it, standing up). */
  private layout() {
    const W = window.innerWidth, H = window.innerHeight, tall = H > W * 1.1;
    this.el.classList.toggle('tall', tall);
    const aspect = (T.h + DMD_H) / T.w;   // height / width of the whole cabinet face
    const availH = H - (tall ? 200 : 28), availW = W - (tall ? 24 : 2 * 150 + 40);
    const w = Math.max(220, Math.min(availW, availH / aspect - 14));
    this.scale = w / T.w; this.dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const [c, h] of [[this.dmd, DMD_H], [this.table, T.h]] as const) {
      c.style.width = `${w}px`; c.style.height = `${h * this.scale}px`;
      c.width = Math.round(w * this.dpr); c.height = Math.round(h * this.scale * this.dpr);
    }
    this.art = null; this.dmdCache.key = '';
  }

  private frame(dt: number) {
    this.t += dt;
    if (this.pull >= 0) { this.pullT += dt; this.pull = Math.min(1, this.pullT / 0.9); }
    const g = this.game, wasOver = g.over;
    g.update(dt);
    for (const h of g.events.splice(0)) { sfx.hit(h); this.pop(h); }
    for (const p of this.pops) p.t += dt; this.pops = this.pops.filter(p => p.t < 0.9);
    if (g.over && !wasOver) { this.saveHigh(); sfx.over(); setTimeout(() => this.showStart(), 1200); }
    this.draw(); this.drawDmd();
  }

  private pop(h: import('./physics').Hit) {
    const at = (x: number, y: number, n: number, color = '#FFFFFF') => this.pops.push({ x, y, text: `+${n.toLocaleString()}`, t: 0, color });
    if (h.kind === 'bumper') { const b = BUMPERS.find(q => q.id === h.id)!; at(b.c[0], b.c[1] - 40, 100); }
    else if (h.kind === 'target') at(TARGETS[h.i].x + 40, TARGETS[h.i].y, 750, '#F9A826');
    else if (h.kind === 'lane') at((LANE_POSTS[h.i] + LANE_POSTS[h.i + 1]) / 2, 230, 500, '#F9C846');
    else if (h.kind === 'saucer') at(SAUCER.c[0] + 30, SAUCER.c[1] - 30, 1500, '#FFE29A');
  }

  // ------------------------------------------------------------------ drawing
  private ctx(c: HTMLCanvasElement) { const x = c.getContext('2d')!; x.setTransform(this.scale * this.dpr, 0, 0, this.scale * this.dpr, 0, 0); return x; }

  private playfieldPath(x: CanvasRenderingContext2D) {
    x.beginPath(); x.moveTo(24, T.h); x.lineTo(24, 290);
    x.arc(300, 290, 276, Math.PI, 2 * Math.PI); x.lineTo(576, T.h); x.closePath();
  }
  /** The playfield art under the glass: drawn once per size. */
  private drawArt(): HTMLCanvasElement {
    const c = document.createElement('canvas'); c.width = this.table.width; c.height = this.table.height;
    const x = this.ctx(c);
    // the cabinet's wooden sides
    const wood = x.createLinearGradient(0, 0, T.w, 0); wood.addColorStop(0, '#5A3420'); wood.addColorStop(0.5, '#7A4A2C'); wood.addColorStop(1, '#5A3420');
    x.fillStyle = wood; x.fillRect(0, 0, T.w, T.h);
    // the playfield: night over Nico's city
    this.playfieldPath(x);
    const sky = x.createLinearGradient(0, 0, 0, T.h); sky.addColorStop(0, '#13204F'); sky.addColorStop(0.55, '#24347A'); sky.addColorStop(1, '#3A2468');
    x.fillStyle = sky; x.fill();
    x.save(); this.playfieldPath(x); x.clip();
    let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.5})`; x.beginPath(); x.arc(30 + rnd() * 540, 30 + rnd() * 560, rnd() * 1.8 + 0.4, 0, 7); x.fill(); }
    x.fillStyle = '#F4F1DE'; x.beginPath(); x.arc(470, 230, 26, 0, 7); x.fill(); x.fillStyle = '#24347A'; x.beginPath(); x.arc(482, 222, 24, 0, 7); x.fill();   // a crescent moon
    // the skyline (the buildings of Nico's city), dark against the sky
    const sky2: [number, number, number, string][] = [[30, 70, 120, '#1A2558'], [96, 60, 170, '#1E2B63'], [150, 50, 95, '#1A2558'], [196, 70, 140, '#22306B'], [262, 46, 200, '#1A2558'], [304, 64, 120, '#1E2B63'], [364, 58, 160, '#22306B'], [418, 66, 110, '#1A2558'], [480, 56, 150, '#1E2B63']];
    for (const [bx, bw, bh, col] of sky2) {
      x.fillStyle = col; x.fillRect(bx, 760 - bh, bw, bh + 300);
      x.fillStyle = 'rgba(249,200,70,0.35)';
      for (let wy = 760 - bh + 14; wy < 740; wy += 22) for (let wx = bx + 8; wx < bx + bw - 10; wx += 16) if (rnd() < 0.45) x.fillRect(wx, wy, 7, 9);
    }
    // the title, painted on the playfield
    x.save(); x.translate(278, 640); x.font = '900 46px system-ui, -apple-system, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 10; x.strokeStyle = 'rgba(14,20,50,0.85)'; x.strokeText("NICO'S CITY", 0, 0);
    x.fillStyle = '#F9C846'; x.fillText("NICO'S CITY", 0, 0);
    x.font = '900 18px system-ui, -apple-system, sans-serif'; x.fillStyle = '#7FD1E8'; x.fillText('P I N B A L L', 0, 34); x.restore();
    // the plunger lane
    x.fillStyle = '#0E1636'; x.fillRect(532, T.lane.top, 44, T.h);
    x.fillStyle = 'rgba(249,200,70,0.5)'; for (let y = 640; y < 980; y += 56) { x.beginPath(); x.moveTo(554, y); x.lineTo(546, y + 18); x.lineTo(562, y + 18); x.closePath(); x.fill(); }
    // unlit inserts (the dynamic layer lights them)
    for (const ins of this.inserts()) this.insert(x, ins, false);
    // the saucer: a hole with a gold rim, and its sign
    x.fillStyle = '#C9A13B'; x.beginPath(); x.arc(SAUCER.c[0], SAUCER.c[1], SAUCER.r + 6, 0, 7); x.fill();
    const hole = x.createRadialGradient(SAUCER.c[0] - 4, SAUCER.c[1] - 4, 2, SAUCER.c[0], SAUCER.c[1], SAUCER.r + 2); hole.addColorStop(0, '#000'); hole.addColorStop(1, '#2A1A10');
    x.fillStyle = hole; x.beginPath(); x.arc(SAUCER.c[0], SAUCER.c[1], SAUCER.r + 2, 0, 7); x.fill();
    this.label(x, 'BURGER BARN', SAUCER.c[0], SAUCER.c[1] + 34, 11, '#FFE29A');
    // the lane guides' letters
    LANES.letters.forEach((l, i) => this.label(x, l, (LANE_POSTS[i] + LANE_POSTS[i + 1]) / 2, 96, 16, '#FFFFFF'));
    this.label(x, 'SPIN', 501, 470, 11, '#7FD1E8');
    x.restore();
    // chrome: every wall (the gate is drawn moving, the slingshots as plastics)
    for (const s of SEGS) if (s.kind === 'wall' || s.kind === 'post') this.rail(x, s.a, s.b, s.r);
    this.rail(x, [532, T.lane.top], [532, T.lane.top], 5);
    // the slingshots: white plastic triangles with a lit middle
    for (const tri of [SLINGS.L, SLINGS.R]) {
      x.fillStyle = '#F4F1EA'; x.beginPath(); x.moveTo(...tri[0]); x.lineTo(...tri[1]); x.lineTo(...tri[2]); x.closePath(); x.fill();
      const m: V = [(tri[0][0] + tri[1][0] + tri[2][0]) / 3, (tri[0][1] + tri[1][1] + tri[2][1]) / 3];
      x.fillStyle = '#5FAFA5'; x.beginPath(); for (const [i, p] of tri.entries()) { const q: V = [m[0] + (p[0] - m[0]) * 0.55, m[1] + (p[1] - m[1]) * 0.55]; if (i) x.lineTo(...q); else x.moveTo(...q); } x.closePath(); x.fill();
    }
    // the bumpers' bases
    for (const b of BUMPERS) { x.fillStyle = '#1A1A2E'; x.beginPath(); x.arc(b.c[0] + 3, b.c[1] + 5, b.r + 4, 0, 7); x.fill(); x.fillStyle = '#E8E8EE'; x.beginPath(); x.arc(b.c[0], b.c[1], b.r + 2, 0, 7); x.fill(); }
    // the apron over the bottom, where balls drain away underneath
    x.fillStyle = '#C8463D'; x.beginPath(); x.moveTo(24, 1004); x.lineTo(232, 1004); x.quadraticCurveTo(278, 990, 324, 1004); x.lineTo(532, 1004); x.lineTo(532, T.h); x.lineTo(24, T.h); x.closePath(); x.fill();
    x.fillStyle = '#A93A32'; x.fillRect(24, 1004, 508, 4);
    this.label(x, "NICO'S CITY", 120, 1034, 15, '#FFE29A'); this.label(x, `${RULES.balls} BALLS`, 436, 1034, 13, '#FFE29A');
    return c;
  }
  private rail(x: CanvasRenderingContext2D, a: V, b: V, r: number) {
    x.lineCap = 'round';
    x.strokeStyle = '#3A4256'; x.lineWidth = r * 2 + 3; x.beginPath(); x.moveTo(...a); x.lineTo(...b); x.stroke();
    x.strokeStyle = '#C9D2DE'; x.lineWidth = r * 2; x.beginPath(); x.moveTo(...a); x.lineTo(...b); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,0.8)'; x.lineWidth = Math.max(1, r * 0.6); x.beginPath(); x.moveTo(a[0] - 1, a[1] - 1); x.lineTo(b[0] - 1, b[1] - 1); x.stroke();
  }
  private label(x: CanvasRenderingContext2D, text: string, cx: number, cy: number, size: number, color: string) {
    x.font = `900 ${size}px system-ui, -apple-system, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 3; x.strokeStyle = 'rgba(10,14,40,0.9)'; x.strokeText(text, cx, cy); x.fillStyle = color; x.fillText(text, cx, cy);
  }
  /** The light-up inserts on the playfield: where, what shape, what colour, and whether lit now. */
  private inserts(): { id: string; x: number; y: number; shape: 'dot' | 'arrow' | 'pill'; color: string; text?: string; rot?: number; on?: () => boolean }[] {
    const g = this.game, blink = (hz: number) => Math.floor(this.t * hz) % 2 === 0;
    return [
      ...[0, 1, 2, 3].map(i => ({ id: `lane${i}`, x: (LANE_POSTS[i] + LANE_POSTS[i + 1]) / 2, y: 200, shape: 'dot' as const, color: '#F9C846', on: () => g.lanes[i] || (g.flash[`lane${i}`] ?? 0) > 0 && blink(10) })),
      ...[2, 3, 4, 5].map((m, i) => ({ id: `x${m}`, x: 200 + i * 52, y: 735, shape: 'pill' as const, color: '#7FD1E8', text: `${m}X`, on: () => g.mult >= m })),
      { id: 'lock', x: SAUCER.c[0] + 40, y: SAUCER.c[1] + 62, shape: 'arrow', color: '#E5484D', text: 'LOCK', rot: -2.2, on: () => g.lockLit && blink(3) },
      { id: 'multi', x: 278, y: 560, shape: 'pill', color: '#F06A8A', text: 'MULTIBALL', on: () => g.multiball || (g.flash.multiball ?? 0) > 0 && blink(6) },
      { id: 'spin', x: 501, y: 600, shape: 'arrow', color: '#3BB273', rot: -Math.PI / 2, on: () => this.game.table.spinner.w !== 0 && Math.abs(this.game.table.spinner.w) > 3 },
      { id: 'targets', x: 90, y: 600, shape: 'arrow', color: '#F9A826', rot: -2.6, on: () => !g.lockLit && blink(1.5) && g.started && !g.over },
      { id: 'again', x: 278, y: 850, shape: 'pill', color: '#F9C846', text: 'SHOOT AGAIN', on: () => (g.save > 0 && g.started && !g.over) && (g.save > 2 || blink(6)) },
    ];
  }
  private insert(x: CanvasRenderingContext2D, ins: ReturnType<Pinball['inserts']>[number], lit: boolean) {
    x.save(); x.translate(ins.x, ins.y); if (ins.rot) x.rotate(ins.rot);
    const fill = lit ? ins.color : 'rgba(255,255,255,0.13)';
    if (lit) { x.shadowColor = ins.color; x.shadowBlur = 16; }
    x.fillStyle = fill; x.strokeStyle = lit ? '#FFFFFF' : 'rgba(255,255,255,0.25)'; x.lineWidth = 1.5;
    x.beginPath();
    if (ins.shape === 'dot') x.arc(0, 0, 10, 0, 7);
    else if (ins.shape === 'arrow') { x.moveTo(22, 0); x.lineTo(-6, -15); x.lineTo(-6, 15); x.closePath(); }
    else { const w = Math.max(44, (ins.text?.length ?? 2) * 9 + 14); x.roundRect(-w / 2, -11, w, 22, 11); }
    x.fill(); x.stroke(); x.shadowBlur = 0;
    if (ins.text && ins.shape === 'pill') { x.rotate(0); x.font = '900 12px system-ui, -apple-system, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = lit ? '#1A1A2E' : 'rgba(255,255,255,0.45)'; x.fillText(ins.text, 0, 1); }
    x.restore();
  }

  private draw() {
    const g = this.game, tb = g.table, x = this.ctx(this.table);
    if (!this.art) this.art = this.drawArt();
    x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(this.art, 0, 0); x.setTransform(this.scale * this.dpr, 0, 0, this.scale * this.dpr, 0, 0);
    for (const ins of this.inserts()) if (ins.on?.()) this.insert(x, ins, true);
    // slingshot rubbers (they jump when they kick)
    for (const [k, tri] of [['L', SLINGS.L], ['R', SLINGS.R]] as const) {
      const hit = (g.flash[`sling${k}`] ?? 0) > 0, a = tri[0], c = tri[2];
      const nx = c[1] - a[1], ny = -(c[0] - a[0]), l = Math.hypot(nx, ny), o = hit ? 5 : 0, s = k === 'L' ? 1 : -1;
      x.strokeStyle = hit ? '#FF6B5E' : '#D9342B'; x.lineWidth = 6; x.lineCap = 'round';
      x.beginPath(); x.moveTo(a[0], a[1]); x.quadraticCurveTo((a[0] + c[0]) / 2 + s * nx / l * o, (a[1] + c[1]) / 2 + s * ny / l * o, c[0], c[1]); x.stroke();
      if (hit) { x.fillStyle = 'rgba(255,255,255,0.5)'; x.beginPath(); x.moveTo(...tri[0]); x.lineTo(...tri[1]); x.lineTo(...tri[2]); x.closePath(); x.fill(); }
    }
    // drop targets
    TARGETS.forEach((t, i) => {
      if (tb.targets[i]) {
        x.fillStyle = (g.flash[`target${i}`] ?? 0) > 0 ? '#FFFFFF' : '#F9A826'; x.strokeStyle = '#7A3E10'; x.lineWidth = 2;
        x.beginPath(); x.roundRect(t.x - 6, t.y - t.half, 12, t.half * 2, 3); x.fill(); x.stroke();
        x.fillStyle = '#7A3E10'; x.font = '900 11px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(['F', 'I', 'R'][i], t.x, t.y);
      } else { x.fillStyle = '#0A0E26'; x.fillRect(t.x - 6, t.y - t.half, 12, t.half * 2); }
    });
    // bumpers: coloured caps with a white star; they flash when hit
    for (const b of BUMPERS) {
      const hit = (g.flash[b.id] ?? 0) > 0, [cx, cy] = b.c;
      if (hit) { x.fillStyle = 'rgba(255,240,180,0.35)'; x.beginPath(); x.arc(cx, cy, b.r + 18, 0, 7); x.fill(); }
      const cap = x.createRadialGradient(cx - 8, cy - 10, 3, cx, cy, b.r);
      cap.addColorStop(0, '#FFFFFF'); cap.addColorStop(0.25, hit ? '#FFFFFF' : b.color); cap.addColorStop(1, hit ? b.color : shade(b.color));
      x.fillStyle = cap; x.beginPath(); x.arc(cx, cy, b.r - 4, 0, 7); x.fill();
      x.fillStyle = '#FFFFFF'; star(x, cx, cy, 11, 5);
      x.strokeStyle = hit ? '#FFFFFF' : 'rgba(255,255,255,0.6)'; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, b.r - 4, 0, 7); x.stroke();
    }
    // the spinner: a plate turning on a wire
    const sw = Math.abs(Math.cos(tb.spinner.angle));
    x.strokeStyle = '#C9D2DE'; x.lineWidth = 2; x.beginPath(); x.moveTo(SPINNER.x0 + 4, SPINNER.y); x.lineTo(SPINNER.x1 - 4, SPINNER.y); x.stroke();
    x.fillStyle = '#E6EAEE'; x.fillRect(SPINNER.x0 + 8, SPINNER.y - 9 * sw, SPINNER.x1 - SPINNER.x0 - 16, 18 * sw);
    // the one-way gate at the top of the lane
    x.strokeStyle = '#C9D2DE'; x.lineWidth = 4; x.lineCap = 'round'; x.beginPath(); x.moveTo(532, T.lane.top); x.lineTo(576, 292); x.stroke();
    // the plunger: a red knob on a spring, pulled back while the button's held
    const pull = this.pull > 0 ? this.pull * 22 : 0, py = T.plunger.y + pull;
    x.strokeStyle = '#9AA3AE'; x.lineWidth = 3; x.beginPath(); for (let k = 0; k < 7; k++) { const yy = py + 6 + k * ((T.h - py - 6) / 7); x.moveTo(546, yy); x.lineTo(562, yy + 4); } x.stroke();
    x.fillStyle = '#D9342B'; x.beginPath(); x.roundRect(543, py - 2, 22, 12, 4); x.fill();
    // balls: a shadow, then shiny steel (under the apron once they're past it)
    x.save(); x.beginPath(); x.rect(0, 0, T.w, 1004); x.rect(532, 1004, 44, 60); x.clip();
    for (const b0 of tb.balls) {
      const b = b0.inLane && b0.vy === 0 && b0.y > T.plunger.y - T.ball - 1 ? { ...b0, y: b0.y + pull } : b0;   // (sitting on the plunger: down it goes as it's pulled)
      x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.ellipse(b.x + 4, b.y + 6, T.ball, T.ball * 0.8, 0, 0, 7); x.fill();
      const st = x.createRadialGradient(b.x - 4, b.y - 5, 1, b.x, b.y, T.ball);
      st.addColorStop(0, '#FFFFFF'); st.addColorStop(0.35, '#D9DEE6'); st.addColorStop(1, '#5E6878');
      x.fillStyle = st; x.beginPath(); x.arc(b.x, b.y, T.ball, 0, 7); x.fill();
    }
    x.restore();
    // flippers: white bats with red rubbers
    for (const s of tb.flippers) this.flipper(x, s);
    // points floating up from what was hit
    x.font = '900 22px system-ui, -apple-system, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 4;
    for (const p of this.pops) {
      const k = p.t / 0.9; x.globalAlpha = 1 - k * k; const y = p.y - 50 * k;
      x.strokeStyle = 'rgba(10,14,40,0.9)'; x.strokeText(p.text, p.x, y); x.fillStyle = p.color; x.fillText(p.text, p.x, y);
    }
    x.globalAlpha = 1;
    // the glass: a soft sheen
    const sheen = x.createLinearGradient(0, 0, T.w, T.h); sheen.addColorStop(0, 'rgba(255,255,255,0.07)'); sheen.addColorStop(0.4, 'rgba(255,255,255,0)'); sheen.addColorStop(1, 'rgba(255,255,255,0.04)');
    x.fillStyle = sheen; x.fillRect(0, 0, T.w, T.h);
  }
  private flipper(x: CanvasRenderingContext2D, s: FlipperState) {
    const [px, py] = s.f.pivot, [tx, ty] = tipOf(s), a = s.angle, r0 = s.f.r0, r1 = s.f.r1;
    const nx = -Math.sin(a), ny = Math.cos(a);
    const outline = (pad: number) => {
      x.beginPath();
      x.moveTo(px + nx * (r0 + pad), py + ny * (r0 + pad)); x.lineTo(tx + nx * (r1 + pad), ty + ny * (r1 + pad));
      x.arc(tx, ty, r1 + pad, a + Math.PI / 2, a - Math.PI / 2, true);
      x.lineTo(px - nx * (r0 + pad), py - ny * (r0 + pad));
      x.arc(px, py, r0 + pad, a - Math.PI / 2, a + Math.PI / 2, true); x.closePath();
    };
    x.fillStyle = 'rgba(0,0,0,0.3)'; x.save(); x.translate(3, 5); outline(0); x.fill(); x.restore();
    outline(0); x.fillStyle = '#D9342B'; x.fill();
    outline(-3); x.fillStyle = '#FFFFFF'; x.fill();
    x.fillStyle = '#9AA3AE'; x.beginPath(); x.arc(px, py, 4, 0, 7); x.fill();
  }

  /** The dot-matrix display: amber dots on black. */
  private drawDmd() {
    const g = this.game, msg = g.message;
    const attract: [string, string][] = [["NICO'S CITY", 'PRESS PLAY'], ['HIGH SCORE', g.high.toLocaleString()], ['LIGHT N-I-C-O', 'FOR A BIGGER BONUS'], ['FLIPPERS MOVE', 'THE LIT LANES'], ['HIT F-I-R', 'THEN BURGER BARN = MULTIBALL']];
    const lines: [string, string] = !g.started || (g.over && !msg) ? attract[Math.floor(this.t / 2.6) % attract.length]
      : msg ? [msg, msg === 'GAME OVER' ? g.score.toLocaleString() : ''] : [g.score.toLocaleString(), `BALL ${Math.min(g.ball, RULES.balls)}${g.extra ? ' +' + g.extra : ''}   HIGH ${Math.max(g.high, g.score).toLocaleString()}`];
    const key = lines.join('|') + `|${this.dmd.width}`;
    if (key !== this.dmdCache.key) {
      this.dmdCache.key = key;
      // the words, small; then each lit pixel becomes a dot
      const cols = 128, rows = 32, K = 4, src = document.createElement('canvas'); src.width = cols * K; src.height = rows * K;
      const s = src.getContext('2d')!; s.fillStyle = '#000'; s.fillRect(0, 0, src.width, src.height); s.fillStyle = '#FFF'; s.textAlign = 'center'; s.textBaseline = 'middle';
      const big = (lines[1] ? 17 : 24) * K, font = (n: number) => `900 ${n}px Arial, Helvetica, sans-serif`;
      s.font = font(big); fit(s, lines[0], (cols - 6) * K, big); s.fillText(lines[0], cols * K / 2, (lines[1] ? 10.5 : 16.5) * K);
      if (lines[1]) { s.font = font(9 * K); fit(s, lines[1], (cols - 6) * K, 9 * K); s.fillText(lines[1], cols * K / 2, 26 * K); }
      const raw = s.getImageData(0, 0, src.width, src.height).data, px = new Uint8Array(cols * rows * 4);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        let sum = 0; for (let v = 0; v < K; v++) for (let u = 0; u < K; u++) sum += raw[((j * K + v) * src.width + i * K + u) * 4];
        px[(j * cols + i) * 4] = sum / (K * K);
      }
      const out = document.createElement('canvas'); out.width = this.dmd.width; out.height = this.dmd.height;
      const o = out.getContext('2d')!, cw = out.width / cols, ch = out.height / rows, r = Math.min(cw, ch) * 0.36;
      o.fillStyle = '#0B0604'; o.fillRect(0, 0, out.width, out.height);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const v = px[(j * cols + i) * 4];
        o.fillStyle = v > 95 ? AMBER : '#2A1606';
        o.beginPath(); o.arc((i + 0.5) * cw, (j + 0.5) * ch, v > 95 ? r * 1.1 : r * 0.8, 0, 7); o.fill();
      }
      this.dmdCache.canvas = out;
    }
    const x = this.dmd.getContext('2d')!; x.setTransform(1, 0, 0, 1, 0, 0);
    x.drawImage(this.dmdCache.canvas!, 0, 0);
  }

  /** For tests. */
  snapshot() {
    const g = this.game;
    return { open: this.isOpen, started: g.started, over: g.over, score: g.score, ball: g.ball, high: g.high, balls: g.table.balls.map(b => ({ x: b.x, y: b.y, inLane: b.inLane })),
      flippers: g.table.flippers.map(f => f.angle), message: g.message, messages: g.messages.map(m => m.text), mult: g.mult, lanes: g.lanes, pull: this.pull };
  }
}

function fit(s: CanvasRenderingContext2D, text: string, w: number, size: number) {
  while (size > 6 && s.measureText(text).width > w) { size--; s.font = s.font.replace(/\d+px/, `${size}px`); }
}
function shade(hex: string) {
  const n = parseInt(hex.slice(1), 16), f = (v: number) => Math.round(v * 0.55);
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
function star(x: CanvasRenderingContext2D, cx: number, cy: number, r: number, n: number) {
  x.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * 0.45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  x.closePath(); x.fill();
}
void ARCH;

// ------------------------------------------------------------------ sounds (made up on the spot, like the game's others)
const sfx = {
  flipper: (side: 'L' | 'R') => { audio.noise(0.05, 0.35, 2600); audio.tone('square', side === 'L' ? 180 : 200, 90, 0.05, 0.05); },
  start: () => [392, 523, 659, 784, 1047].forEach((f, i) => audio.tone('square', f, f, 0.12, 0.05, i * 0.08)),
  coin: () => { audio.tone('square', 988, 988, 0.08, 0.06); audio.tone('square', 1319, 1319, 0.22, 0.06, 0.08); },
  over: () => [523, 440, 349, 262].forEach((f, i) => audio.tone('triangle', f, f * 0.98, 0.3, 0.1, i * 0.22)),
  hit(h: import('./physics').Hit) {
    switch (h.kind) {
      case 'bumper': audio.tone('square', 660, 330, 0.09, 0.07); audio.noise(0.05, 0.2, 3000); break;
      case 'sling': audio.noise(0.06, 0.3, 1800); audio.tone('sawtooth', 300, 150, 0.06, 0.05); break;
      case 'lane': audio.tone('triangle', 1175, 1175, 0.12, 0.08); audio.tone('triangle', 1568, 1568, 0.16, 0.07, 0.08); break;
      case 'target': audio.noise(0.08, 0.4, 700); audio.tone('square', 220, 110, 0.08, 0.06); break;
      case 'spin': for (let i = 0; i < Math.min(6, h.n); i++) audio.tone('square', 1800, 1800, 0.015, 0.03, i * 0.05); break;
      case 'saucer': audio.tone('sine', 300, 80, 0.4, 0.15); break;
      case 'eject': audio.noise(0.12, 0.4, 1200); audio.tone('square', 200, 500, 0.1, 0.06); break;
      case 'launch': audio.noise(0.25, 0.35, 900 + h.power * 1500); break;
      case 'drain': audio.tone('triangle', 330, 110, 0.5, 0.1); break;
      case 'wall': if (h.speed > 900) audio.noise(0.03, Math.min(0.25, h.speed / 6000), 2200); break;
      case 'flipper': break;
    }
  },
};
