// Fishing on screen (fish.ts has the rules): the end of the pier on the left with Nico and his rod, the sea in
// cross-section (fish swimming about down there), the line out to the red-and-white bobber, a tension meter while
// you reel, and one big button that does what you need: hold to cast, tap on a bite, hold to reel.
import { Fishing, FISHING, SPECIES, type Species } from './fish';
import { drawCatch } from './fishArt';
import { audio } from './sound';

export interface FishHost { onCatch(s: Species, size: number): { isNew: boolean; record: boolean }; opened(on: boolean): void }
const LW = 640, LH = 420, SEA = 150, X0 = 170, SPAN = 430;
function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e;
}

export class FishGame {
  readonly el: HTMLElement;
  game = new Fishing();
  private canvas: HTMLCanvasElement; private btn: HTMLButtonElement; private msg: HTMLElement; private countEl: HTMLElement; private panel: HTMLElement;
  private raf = 0; private last = 0; private k = 1; private t = 0; private off: (() => void)[] = []; private caught = 0; private keyDown = false;
  private swimmers = SPECIES.filter(s => !s.kind).map((s, i) => ({ s, x: 120 + i * 90, y: 210 + (i * 47) % 170, v: (i % 2 ? 1 : -1) * (14 + i * 3) }));
  private splash: { x: number; t: number }[] = [];

  constructor(private host: FishHost) {
    this.el = el('div', 'peel fishing'); this.el.id = 'fishing'; this.el.hidden = true;
    const top = el('div', 'pl-top'); this.msg = el('div', 'fish-msg', 'Hold the button to wind up, let go to cast!'); this.countEl = el('div', 'pl-count', '🎣 0'); top.append(this.msg, this.countEl);
    this.canvas = el('canvas', 'pl-board'); this.panel = el('div', 'pl-panel'); this.panel.hidden = true;
    const wrap = el('div', 'pl-wrap'); wrap.append(this.canvas, this.panel);
    this.btn = el('button', 'bob-dunk fish-btn', 'HOLD TO CAST'); this.btn.type = 'button';
    const row = el('div', 'bob-row'); row.append(wrap, this.btn);
    const close = el('button', 'pl-close', '✕'); close.type = 'button'; close.setAttribute('aria-label', 'Stop fishing');
    this.el.append(top, row, close); document.body.append(this.el);
    close.addEventListener('click', () => this.close());
    const down = (e: Event) => { e.preventDefault(); this.handle(this.game.press()); };
    const up = () => this.handle(this.game.release());
    this.btn.addEventListener('pointerdown', down);
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) this.btn.addEventListener(ev, up);
    this.canvas.addEventListener('pointerdown', down);
    for (const ev of ['pointerup', 'pointercancel']) this.canvas.addEventListener(ev, up);
    this.el.addEventListener('contextmenu', e => e.preventDefault());
  }
  get isOpen() { return !this.el.hidden; }
  open() {
    if (this.isOpen) return;
    this.el.hidden = false; this.host.opened(true); this.game = new Fishing(); this.panel.hidden = true; this.layout();
    const onResize = () => this.layout();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (e.type === 'keydown') this.close(); e.stopPropagation(); return; }
      if (e.key !== ' ' && e.key !== 'Enter') return;
      e.preventDefault(); e.stopPropagation();
      if (e.type === 'keydown' && !this.keyDown) { this.keyDown = true; this.handle(this.game.press()); } else if (e.type === 'keyup') { this.keyDown = false; this.handle(this.game.release()); }
    };
    window.addEventListener('resize', onResize); window.addEventListener('keydown', onKey, true); window.addEventListener('keyup', onKey, true);
    this.off = [() => window.removeEventListener('resize', onResize), () => window.removeEventListener('keydown', onKey, true), () => window.removeEventListener('keyup', onKey, true)];
    this.last = performance.now();
    const loop = (now: number) => { this.raf = requestAnimationFrame(loop); this.frame(Math.min(1 / 20, (now - this.last) / 1000)); this.last = now; };
    this.raf = requestAnimationFrame(loop);
  }
  close() { if (!this.isOpen) return; cancelAnimationFrame(this.raf); for (const f of this.off) f(); this.off = []; this.el.hidden = true; this.host.opened(false); }
  snapshot() { const g = this.game; return { open: this.isOpen, phase: g.phase, dist: g.dist, line: g.line, tension: g.tension, running: g.running, fish: g.fish?.id ?? null, size: g.size, why: g.why, caught: this.caught }; }
  biteNow() { this.game.biteNow(); }
  /** (tests: land whatever's on the line) */
  landNow() { if (this.game.phase === 'fight') { this.game.line = 0.001; this.game.tension = 0; } }
  private say(t: string) { this.msg.textContent = t; }
  private handle(ev: string[]) {
    for (const e of ev) {
      if (e === 'windup') this.say('Winding up... let go to cast!');
      if (e === 'cast') { this.say('Whoosh!'); audio.noise(0.3, 0.08, 3000, 0, 'highpass'); }
      if (e === 'early') { this.say('Too soon! You scared it off. Wait for the big plunge...'); audio.tone('sine', 300, 200, 0.15, 0.05); }
      if (e === 'hooked') { this.say('Hooked! Hold to reel. Let go when it runs!'); audio.tone('square', 440, 880, 0.12, 0.06); this.panel.hidden = true; }
    }
    if (this.game.phase === 'ready') this.panel.hidden = true;
  }
  private layout() {
    const W = window.innerWidth, H = window.innerHeight, k = Math.max(0.5, Math.min((W - 260) / LW, (H - 200) / LH)), dpr = Math.min(2, window.devicePixelRatio || 1);
    this.k = k * dpr; this.canvas.width = Math.floor(LW * this.k); this.canvas.height = Math.floor(LH * this.k);
    this.canvas.style.width = `${Math.floor(LW * k)}px`; this.canvas.style.height = `${Math.floor(LH * k)}px`;
  }
  private frame(dt: number) {
    this.t += dt; const g = this.game;
    for (const e of g.update(dt)) {
      if (e === 'splash') { this.say('Now wait... (little twitches are just nibbles)'); this.splash.push({ x: X0 + g.dist * SPAN, t: 0 }); audio.noise(0.2, 0.1, 1200); }
      if (e === 'nibble') audio.tone('sine', 900, 700, 0.05, 0.03);
      if (e === 'bite') { this.say('BITE! TAP NOW!'); audio.tone('square', 700, 1100, 0.12, 0.07); }
      if (e === 'stole') this.say('Too slow! It stole your bait. Cast again.');
      if (e === 'run') { this.say('It\'s running! Let go!'); audio.noise(0.4, 0.12, 900); }
      if (e === 'snap') { this.say('SNAP! The line broke. Let go when it runs!'); audio.tone('sawtooth', 600, 100, 0.3, 0.06); }
      if (e === 'away') this.say('It got away! Keep reeling (just not when it runs).');
      if (e === 'caught') this.landed();
    }
    const label = { ready: 'HOLD TO CAST', charging: 'LET GO!', flying: '...', waiting: g.bob >= 1 ? 'TAP!' : 'WAIT...', fight: g.running ? 'LET GO!' : 'HOLD TO REEL', caught: 'CAST AGAIN', lost: 'CAST AGAIN' }[g.phase];
    if (this.btn.textContent !== label) this.btn.textContent = label;
    this.btn.classList.toggle('hot', g.phase === 'waiting' && g.bob >= 1 || g.phase === 'fight' && g.running);
    this.countEl.textContent = `🎣 ${this.caught}`;
    for (const sw of this.swimmers) { sw.x += sw.v * dt; if (sw.x < 150 || sw.x > LW - 30) sw.v = -sw.v; }
    for (const s of this.splash) s.t += dt; this.splash = this.splash.filter(s => s.t < 1);
    this.draw();
  }
  private landed() {
    const g = this.game, s = g.fish!, r = this.host.onCatch(s, g.size); this.caught++;
    audio.tone('triangle', 523, 1047, 0.2, 0.07);
    this.say(s.kind === 'bottle' ? 'A message in a bottle! It says: “Whoever finds this: you\'re awesome.”' : s.kind === 'boot' ? 'An old boot. Smelly! Into the bin with it.' : `You caught ${s.id === 'golden' ? 'THE GOLDEN FISH!' : `a ${s.name.toLowerCase()}!`}`);
    this.panel.replaceChildren(el('h2', '', s.name), el('p', '', `${s.kind === 'boot' || s.kind === 'bottle' ? '' : `${g.size} cm`}${r.isNew ? ' · New! It\'s in your sticker book.' : r.record ? ' · Your biggest yet!' : ''}${s.worth ? ` · +$${s.worth}` : ''}`));
    const b = el('button', 'pl-btn', 'Cast again'); b.type = 'button'; b.addEventListener('click', () => { this.panel.hidden = true; this.game.phase = 'ready'; }); this.panel.append(b);
    this.panel.hidden = false;
  }
  private draw() {
    const c = this.canvas.getContext('2d')!, g = this.game, t = this.t;
    c.setTransform(this.k, 0, 0, this.k, 0, 0);
    // sky, sun, sea, seabed
    let gr = c.createLinearGradient(0, 0, 0, SEA); gr.addColorStop(0, '#9FD3F2'); gr.addColorStop(1, '#E3F4FB'); c.fillStyle = gr; c.fillRect(0, 0, LW, SEA);
    c.fillStyle = '#FFE29A'; c.beginPath(); c.arc(560, 46, 26, 0, Math.PI * 2); c.fill();
    gr = c.createLinearGradient(0, SEA, 0, LH); gr.addColorStop(0, '#4FB3E0'); gr.addColorStop(1, '#1B4F8A'); c.fillStyle = gr; c.fillRect(0, SEA, LW, LH - SEA);
    c.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(220 + i * 90, SEA); c.lineTo(180 + i * 90 + Math.sin(t + i) * 10, LH); c.lineTo(205 + i * 90 + Math.sin(t + i) * 10, LH); c.lineTo(240 + i * 90, SEA); c.fill(); }
    c.fillStyle = '#E8D19A'; c.beginPath(); c.moveTo(0, LH); c.quadraticCurveTo(320, LH - 40, LW, LH - 18); c.lineTo(LW, LH); c.fill();
    c.fillStyle = '#3E8F5A'; for (const x of [260, 420, 560]) { c.beginPath(); c.moveTo(x, LH - 22); c.quadraticCurveTo(x - 10 + Math.sin(t * 1.5 + x) * 6, LH - 60, x + 4, LH - 90); c.quadraticCurveTo(x + 8, LH - 50, x + 8, LH - 22); c.fill(); }
    // the fish about (not the one on the line)
    c.globalAlpha = 0.45; for (const sw of this.swimmers) drawCatch(c, sw.s, sw.x, sw.y, 46, sw.v < 0, t); c.globalAlpha = 1;
    // waves along the top
    c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 3; c.beginPath(); for (let x = 0; x <= LW; x += 8) c.lineTo(x, SEA + Math.sin(x * 0.05 + t * 2) * 2.5); c.stroke();
    // the pier: planks and posts down into the water
    c.fillStyle = '#6B4430'; for (const x of [16, 66, 116]) c.fillRect(x, 140, 10, LH - 140);
    c.fillStyle = '#C49A6C'; c.fillRect(0, 126, 140, 16); c.fillStyle = '#8A6A48'; c.fillRect(0, 140, 140, 4);
    // Nico on the end of the pier
    const nx = 100, ny = 126, pull = g.phase === 'charging' ? g.power : 0, reeling = g.phase === 'fight' && g.holding;
    c.fillStyle = '#2B4A7A'; c.fillRect(nx - 9, ny - 34, 8, 34); c.fillRect(nx + 1, ny - 34, 8, 34);                        // legs
    c.fillStyle = '#3E5F4A'; c.beginPath(); c.roundRect(nx - 13, ny - 74, 26, 42, 8); c.fill();                            // shirt
    c.strokeStyle = '#F28C38'; c.lineWidth = 1.5; for (const y of [-64, -52, -42]) { c.beginPath(); c.moveTo(nx - 13, ny + y); c.lineTo(nx + 13, ny + y); c.stroke(); }
    c.fillStyle = '#EFC4A2'; c.beginPath(); c.arc(nx + 2, ny - 90, 15, 0, Math.PI * 2); c.fill();                           // head
    c.fillStyle = '#4A3428'; c.beginPath(); c.arc(nx, ny - 94, 15, Math.PI * 0.95, Math.PI * 2.1); c.fill(); c.fillRect(nx - 16, ny - 96, 7, 22);   // hair
    c.fillStyle = '#1E2733'; c.beginPath(); c.arc(nx + 9, ny - 90, 2, 0, Math.PI * 2); c.fill();
    // the rod: drawn back while winding up, bent while reeling
    const hx = nx + 10, hy = ny - 58, ang = -0.9 - pull * 1.2 + (reeling ? 0.25 + Math.sin(t * 20) * 0.03 : 0), L = 78;
    const tx = hx + Math.cos(ang) * L, ty = hy + Math.sin(ang) * L;
    c.strokeStyle = '#2B3F55'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(hx, hy); c.quadraticCurveTo(hx + Math.cos(ang) * L * 0.6, hy + Math.sin(ang) * L * 0.6 + (g.phase === 'fight' ? 10 : 0), tx, ty); c.stroke();
    c.fillStyle = '#EFC4A2'; c.beginPath(); c.arc(hx, hy, 6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#9AA6B2'; c.beginPath(); c.arc(hx + 2, hy + 6, 5, 0, Math.PI * 2); c.fill();   // the reel
    if (g.phase === 'charging') {   // how far: a power bar
      c.fillStyle = 'rgba(43,63,85,.35)'; c.fillRect(20, 20, 140, 16); c.fillStyle = g.power > 0.85 ? '#E5484D' : g.power > 0.5 ? '#F9C846' : '#3BB273'; c.fillRect(20, 20, 140 * g.power, 16);
      c.strokeStyle = '#FFFFFF'; c.lineWidth = 2; c.strokeRect(20, 20, 140, 16);
    }
    // the line and the bobber (or the fish on the end)
    if (g.phase === 'waiting' || g.phase === 'flying') {
      const bx = X0 + g.dist * SPAN, by = g.phase === 'flying' ? SEA - 60 : SEA + g.bob * 12 + Math.sin(t * 3) * 1.5;
      c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo((tx + bx) / 2, Math.max(ty, by) + 20, bx, by - 6); c.stroke();
      if (g.phase === 'waiting') {
        if (g.bob > 0) { c.strokeStyle = `rgba(255,255,255,${0.4 + 0.4 * Math.sin(t * 20)})`; c.lineWidth = 2; for (const r of [14, 24]) { c.beginPath(); c.ellipse(bx, SEA + 2, r * (g.bob >= 1 ? 1.5 : 1), 4, 0, 0, Math.PI * 2); c.stroke(); } }
        c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(bx, by, 8, 0, Math.PI); c.fill(); c.fillStyle = '#E5484D'; c.beginPath(); c.arc(bx, by, 8, Math.PI, Math.PI * 2); c.fill(); c.fillRect(bx - 1, by - 14, 2, 8);
      }
    }
    if (g.phase === 'fight' || g.phase === 'caught') {
      const fx = X0 + g.line * SPAN + (g.running ? Math.sin(t * 30) * 4 : 0), fy = g.phase === 'caught' ? SEA - 70 : SEA + 50 + (g.fish!.kind === 'crab' || g.fish!.id === 'flounder' ? 150 : 40 + (g.fish!.fight * 40));
      c.strokeStyle = g.tension > 0.75 ? '#E5484D' : 'rgba(255,255,255,.95)'; c.lineWidth = 1.5 + g.tension * 1.5; c.beginPath(); c.moveTo(tx, ty); c.lineTo(fx, fy); c.stroke();
      drawCatch(c, g.fish!, fx, fy, g.phase === 'caught' ? 70 : 60, g.phase !== 'caught', t);
      if (g.running && g.phase === 'fight') { c.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(fx + 30 + i * 8, fy - 10 - ((t * 60 + i * 13) % 40), 2.5, 0, Math.PI * 2); c.fill(); } }
    }
    for (const s of this.splash) { c.strokeStyle = `rgba(255,255,255,${1 - s.t})`; c.lineWidth = 3; c.beginPath(); c.ellipse(s.x, SEA, 10 + s.t * 40, 4 + s.t * 6, 0, 0, Math.PI * 2); c.stroke(); }
    // the tension meter while there's a fish on
    if (g.phase === 'fight') {
      const mx = LW - 34, my = 30, mh = 200;
      c.fillStyle = 'rgba(43,63,85,.35)'; c.beginPath(); c.roundRect(mx, my, 18, mh, 9); c.fill();
      c.fillStyle = g.tension > 0.75 ? '#E5484D' : g.tension > 0.45 ? '#F9C846' : '#3BB273'; c.beginPath(); c.roundRect(mx, my + mh * (1 - g.tension), 18, mh * g.tension, 9); c.fill();
      c.strokeStyle = '#FFFFFF'; c.lineWidth = 2; c.beginPath(); c.roundRect(mx, my, 18, mh, 9); c.stroke();
      c.fillStyle = '#FFFFFF'; c.font = '800 12px system-ui'; c.textAlign = 'center'; c.fillText('LINE', mx + 9, my + mh + 16);
    }
    void FISHING;
  }
}
