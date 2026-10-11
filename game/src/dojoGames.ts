// The dojo's games on screen (spar.ts: sparring; rhythm.ts: pad rhythm). They're played right there on the mats with
// the real people: this module runs the rules, plays the music, and puts up the overlay (health bars, the clock, the
// note track, big buttons for little thumbs; keys on a keyboard), and tells main.ts how everyone should stand.
import { Spar, RIVALS, ATTACKS, type Rival, type Input, type Fighter } from './spar';
import { Rhythm, SONGS, WINDOW, LEAD, songLength, type Song, type Note, type Judge } from './rhythm';
import { MOVES, type Actor, type ActorPose, type DojoEvent, type Move } from './dojo';
import { audio } from './sound';

export interface GamesHost {
  opened(on: boolean): void;
  best(id: string): number; setBest(id: string, n: number): void;
  won(kind: 'spar' | 'rhythm', id: string, info: { first: boolean; grade?: string }): void;
  burst(x: number, y: number, big?: boolean): void; shake(n: number): void;
}

const h = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
const ease = (a: Move, b: Move, k: number): Move => ({ fa: a.fa + (b.fa - a.fa) * k, ba: a.ba + (b.ba - a.ba) * k, fl: a.fl + (b.fl - a.fl) * k, bl: a.bl + (b.bl - a.bl) * k, bow: (a.bow ?? 0) + ((b.bow ?? 0) - (a.bow ?? 0)) * k, crouch: (a.crouch ?? 0) + ((b.crouch ?? 0) - (a.crouch ?? 0)) * k });
const POSE: Record<string, Move> = {
  guard: MOVES.guard, block: { fa: -120, ba: -104, fl: -12, bl: 16, bow: 4 }, hit: { fa: -26, ba: -12, fl: 12, bl: 26, bow: -20 },
  win: { fa: -168, ba: 12, fl: 0, bl: 0 }, lost: MOVES.bow, jab: MOVES.jab, kick: MOVES.roundhouse, spin: MOVES.sideKick,
};

export class DojoGames {
  readonly el: HTMLElement;
  spar: Spar | null = null; rhythm: Rhythm | null = null;
  private keys = new Set<string>(); private pressed = new Set<string>();
  private top: HTMLElement; private pad: HTMLElement; private msg: HTMLElement; private result: HTMLElement;
  private t0 = 0; private strike: { type: Note; t: number } | null = null; private holderHit = 0;
  private noteEls = new Map<object, HTMLElement>(); private judgeEl: HTMLElement | null = null; private judgeT = 0;
  private walk = 0; private off: (() => void)[] = [];
  /** For tests: the last result. */
  last: { kind: string; win?: boolean; grade?: string; score?: number } | null = null;

  constructor(private host: GamesHost) {
    this.el = h('div', 'dg'); this.el.hidden = true;
    this.top = h('div', 'dg-top'); this.pad = h('div', 'dg-pad'); this.msg = h('div', 'dg-msg'); this.result = h('div', 'dg-result'); this.result.hidden = true;
    const quit = h('button', 'dg-quit', '✕'); quit.type = 'button'; quit.setAttribute('aria-label', 'Stop'); quit.onclick = () => this.stop();
    this.el.append(this.top, this.msg, this.pad, this.result, quit);
    document.body.append(this.el);
  }
  get active() { return !!(this.spar || this.rhythm); }
  get showing() { return !this.el.hidden; }
  private now() { return audio.ctx ? audio.ctx.currentTime : performance.now() / 1000; }

  private open() {
    this.el.hidden = false; this.result.hidden = true; this.host.opened(true); this.last = null;
    const key = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase(); if (k === 'escape') { this.stop(); return; }
      const map: Record<string, string> = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', j: 'punch', z: 'punch', f: 'punch', k: 'kick', x: 'kick', l: 'block', c: 'block', arrowdown: 'block', ' ': 'kihap', enter: 'kihap' };
      const id = map[k]; if (!id) return;
      e.preventDefault(); e.stopPropagation();
      if (e.type === 'keydown') { if (!this.keys.has(id)) this.press(id); this.keys.add(id); } else this.keys.delete(id);
    };
    window.addEventListener('keydown', key, true); window.addEventListener('keyup', key, true);
    this.off = [() => window.removeEventListener('keydown', key, true), () => window.removeEventListener('keyup', key, true)];
  }
  stop() {
    if (!this.active && this.el.hidden) return;
    for (const f of this.off) f(); this.off = [];
    this.spar = null; this.rhythm = null; this.el.hidden = true; this.keys.clear(); this.pressed.clear();
    for (const e of this.noteEls.values()) e.remove(); this.noteEls.clear();
    this.host.opened(false);
  }
  /** A button or key going down. */
  private press(id: string) { this.pressed.add(id); if (this.rhythm) this.rhythmPress(id); }
  private button(label: string, id: string, cls: string, hold = false) {
    const b = h('button', `dg-btn ${cls}`); b.type = 'button'; b.innerHTML = label; b.dataset.k = id;
    b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); b.classList.add('on'); this.keys.add(id); this.press(id); });
    const up = () => { b.classList.remove('on'); this.keys.delete(id); };
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, up);
    void hold; return b;
  }
  private say(text: string, s = 1.4) { this.msg.textContent = text; this.msg.classList.remove('pop'); void this.msg.offsetWidth; this.msg.classList.add('pop'); this.msgT = s; }
  private msgT = 0;

  // ------------------------------------------------------------------ sparring
  startSpar(r: Rival) {
    this.stop(); this.open(); this.spar = new Spar(r);
    this.top.className = 'dg-top spar';
    this.top.innerHTML = `<div class="dg-fighter"><b>NICO</b><div class="bar"><i class="hp" data-hp="nico"></i></div><div class="meter"><i data-meter="nico"></i><span>KIHAP</span></div></div>
      <div class="dg-clock" data-clock>60</div>
      <div class="dg-fighter right"><b>${r.name.toUpperCase()}</b><div class="bar"><i class="hp" data-hp="rival"></i></div><div class="meter"><i data-meter="rival"></i></div></div>`;
    this.pad.className = 'dg-pad spar';
    const l = h('div', 'dg-col'), rr = h('div', 'dg-col');
    l.append(this.button('◀', 'left', 'move'), this.button('▶', 'right', 'move'));
    rr.append(this.button('<span>PUNCH</span>', 'punch', 'punch'), this.button('<span>KICK</span>', 'kick', 'kick'), this.button('<span>BLOCK</span>', 'block', 'block'), this.button('<span>KIHAP!</span><small>spin kick</small>', 'kihap', 'kihap'));
    this.pad.replaceChildren(l, rr);
    this.say(`Bow! ${r.lines.start}`, 2);
  }
  private sparFrame(dt: number, poses: Map<Actor, ActorPose>, events: DojoEvent[]) {
    const s = this.spar!, r = s.who;
    const inp: Input = { left: this.keys.has('left'), right: this.keys.has('right'), block: this.keys.has('block'), punch: this.pressed.has('punch'), kick: this.pressed.has('kick'), spin: this.pressed.has('kihap') };
    this.pressed.clear();
    for (const e of s.update(dt, inp)) {
      if (e.kind === 'start') { this.say('FIGHT!', 1); audio.tone('square', 523, 523, 0.12, 0.08); audio.tone('square', 784, 784, 0.2, 0.08, 0.12); }
      if (e.kind === 'hit') {
        audio.noise(0.08, e.attack === 'spin' ? 0.8 : 0.5, 2000); audio.tone('sine', e.attack === 'spin' ? 120 : 200, 60, 0.12, 0.25);
        this.host.burst(e.x!, 520, e.attack === 'spin'); this.host.shake(e.attack === 'spin' ? 0.5 : e.attack === 'kick' ? 0.25 : 0.12);
        if (e.by === 'nico' && Math.random() < 0.3) events.push({ kind: 'say', actor: r.who as Actor, text: r.lines.hit[Math.floor(Math.random() * r.lines.hit.length)] });
        if (e.attack === 'spin') events.push({ kind: 'kihap', actor: e.by === 'nico' ? 'nico' : r.who as Actor, text: 'Kihap!' });
      }
      if (e.kind === 'blocked') { audio.noise(0.05, 0.3, 5000); audio.tone('triangle', 900, 700, 0.06, 0.05); }
      if (e.kind === 'combo' && e.by === 'nico') this.say(`${e.n} HIT COMBO!`, 0.9);
      if (e.kind === 'say') events.push({ kind: 'say', actor: r.who as Actor, text: e.text! });
      if (e.kind === 'time') this.say('TIME!', 1.2);
      if (e.kind === 'ko') {
        const win = e.by === 'nico', first = win && !this.host.best(`spar:${r.who}`);
        if (win) this.host.setBest(`spar:${r.who}`, 1);
        this.last = { kind: 'spar', win };
        this.say(win ? 'NICO WINS!' : `${r.name.toUpperCase()} WINS!`, 2.5);
        events.push({ kind: 'say', actor: r.who as Actor, text: win ? r.lines.lose : r.lines.win });
        audio.tone('triangle', win ? 523 : 392, win ? 1047 : 330, 0.5, 0.1);
        if (win) this.host.won('spar', r.who, { first });
        setTimeout(() => this.showResult(win ? 'You win!' : 'Good match!', win ? `You beat ${r.name}!` : `${r.name} got you this time.`, () => this.startSpar(r)), 1800);
      }
    }
    // the bars and the clock
    const set = (sel: string, v: number) => { const e = this.top.querySelector(sel) as HTMLElement | null; if (e) e.style.width = `${Math.max(0, v)}%`; };
    set('[data-hp=nico]', s.nico.hp); set('[data-hp=rival]', s.rival.hp); set('[data-meter=nico]', s.nico.meter); set('[data-meter=rival]', s.rival.meter);
    const clock = this.top.querySelector('[data-clock]'); if (clock) clock.textContent = String(Math.ceil(s.time));
    this.pad.querySelector('.kihap')?.classList.toggle('ready', s.nico.meter >= 100);
    // how they stand
    this.walk += dt;
    poses.set('nico', this.fighterPose(s.nico, 600));
    poses.set(r.who as Actor, this.fighterPose(s.rival, 600));
  }
  private fighterPose(f: Fighter, y: number): ActorPose {
    let m: Move = POSE.guard, face = f.face;
    const intro = this.spar?.intro ?? 0;
    if (intro > 0) return { x: f.x, y, face, move: intro > 1.3 ? MOVES.stand : intro > 0.6 ? MOVES.bow : POSE.guard, walking: false, side: true };   // (bow to each other, then fighting stance)
    if (f.state === 'walk') m = { ...POSE.guard, fl: -14 + Math.sin(this.walk * 14) * 14, bl: 14 - Math.sin(this.walk * 14) * 14 };
    if (f.state === 'block') m = POSE.block;
    if (f.state === 'hit') m = POSE.hit;
    if (f.state === 'won') m = f.t < 0.9 ? POSE.win : MOVES.bow;
    if (f.state === 'lost') m = f.t < 0.6 ? POSE.hit : MOVES.bow;
    if (f.state === 'attack' && f.attack) {
      const A = ATTACKS[f.attack], strike = POSE[f.attack];
      if (f.t < A.start) { m = ease(POSE.guard, strike, f.t / A.start); if (f.attack === 'spin' && f.t < A.start * 0.6) face = (-face) as 1 | -1; }   // (turning for the spinning kick)
      else if (f.t < A.start + A.active + A.recover * 0.4) m = strike;
      else m = ease(strike, POSE.guard, (f.t - A.start - A.active - A.recover * 0.4) / (A.recover * 0.6));
      // a lunge into it (and back): the strike carries them in close
      const total = A.start + A.active + A.recover, k = Math.sin(Math.PI * Math.min(1, f.t / total));
      return { x: f.x + f.face * k * (f.attack === 'jab' ? 26 : 34), y, face, move: m, walking: false, side: true };
    }
    return { x: f.x, y, face, move: m, walking: false, side: true };
  }

  // ------------------------------------------------------------------ pad rhythm
  startRhythm(song: Song) {
    this.stop(); this.open(); this.rhythm = new Rhythm(song);
    this.top.className = 'dg-top rhythm';
    this.top.innerHTML = `<div class="dg-song"><b>${song.name}</b><span data-score>0</span><span data-combo></span></div><div class="dg-track"><div class="dg-line"></div><div class="dg-notes" data-notes></div></div>`;
    this.pad.className = 'dg-pad rhythm';
    const rr = h('div', 'dg-col wide');
    rr.append(this.button('<span>PUNCH</span><small>F / J</small>', 'punch', 'punch'), this.button('<span>KICK</span><small>D / K</small>', 'kick', 'kick'), this.button('<span>KIHAP!</span><small>space</small>', 'kihap', 'kihap ready'));
    this.pad.replaceChildren(rr);
    this.t0 = this.now() + 0.15;
    this.playSong(song, this.t0);
    this.say('Ready...', LEAD - 0.4);
  }
  /** The music: drums on every beat, a bass line, a chime on each kihap. Scheduled ahead on the audio clock. */
  private playSong(song: Song, t0: number) {
    const c = audio.ctx; if (!c) return;
    const e8 = 60 / song.bpm / 2, start = t0 - c.currentTime, n = song.chart.length;
    const bass = [110, 110, 131, 98, 110, 147, 131, 98];
    for (let i = -8; i < n; i++) {   // (a bar of count-in first: sticks on the beat)
      const at = start + LEAD + i * e8; if (at < 0) continue;
      if (i < 0) { if (i % 2 === 0) audio.noise(0.04, 0.25, 6000, at, 'highpass'); continue; }
      audio.noise(0.03, 0.08, 7000, at, 'highpass');                                     // hats
      if (i % 4 === 0) audio.tone('sine', 150, 45, 0.16, 0.32, at);                       // kick drum
      if (i % 8 === 4) audio.noise(0.13, 0.28, 1900, at);                                 // snare
      if (i % 2 === 0) audio.tone('triangle', bass[(i / 2) % 8 | 0], bass[(i / 2) % 8 | 0], 0.22, 0.09, at);
      if (song.chart[i] === 'H') audio.tone('triangle', 1319, 1319, 0.3, 0.05, at);
    }
  }
  private rhythmPress(id: string) {
    const r = this.rhythm!, t = this.now() - this.t0;
    const type: Note | null = id === 'punch' ? 'P' : id === 'kick' ? 'K' : id === 'kihap' ? 'H' : null;
    if (!type) return;
    this.strike = { type, t: 0 };
    const res = r.press(type, t);
    if (res) {
      this.holderHit = 0.2; this.judge(res.judge);
      audio.noise(0.06, res.judge === 'perfect' ? 0.5 : 0.35, 2200); audio.tone('sine', 190, 70, 0.08, 0.18);
      this.host.burst(this.padX, 520, res.judge === 'perfect');
      if (type === 'H') this.kihapNow = true;
      this.noteEls.get(res.note)?.classList.add('gone');
    } else audio.noise(0.04, 0.12, 900);   // (a whoosh at the air)
  }
  private padX = 590; private kihapNow = false;
  private judge(j: Judge) {
    this.judgeEl?.remove();
    const e = h('div', `dg-judge ${j}`, j === 'perfect' ? 'PERFECT!' : j === 'great' ? 'GREAT!' : j === 'ok' ? 'OK' : 'MISS');
    this.top.querySelector('.dg-track')?.append(e); this.judgeEl = e; this.judgeT = 0.6;
  }
  private rhythmFrame(dt: number, poses: Map<Actor, ActorPose>, events: DojoEvent[]) {
    const r = this.rhythm!, t = this.now() - this.t0, song = r.song;
    for (const n of r.update(t)) { this.judge('miss'); this.noteEls.get(n)?.classList.add('missed'); }
    // the track: notes slide from the right to the line
    const track = this.top.querySelector('[data-notes]') as HTMLElement | null;
    if (track) {
      const w = track.clientWidth, px = 340;   // px per second
      for (const n of r.notes) {
        const x = 60 + (n.t - t) * px;
        let e = this.noteEls.get(n);
        if (x > w + 60 || (n.judged && t - n.t > 0.5)) { if (e && n.judged) { e.remove(); this.noteEls.delete(n); } continue; }
        if (!e) { e = h('div', `dg-note ${n.type}`, n.type === 'P' ? '👊' : n.type === 'K' ? '🦶' : '💥'); track.append(e); this.noteEls.set(n, e); }
        e.style.transform = `translateX(${x}px)`;
      }
    }
    const sc = this.top.querySelector('[data-score]'), cb = this.top.querySelector('[data-combo]');
    if (sc) sc.textContent = r.score.toLocaleString();
    if (cb) cb.textContent = r.combo >= 5 ? `${r.combo} combo!` : '';
    if (this.judgeEl && (this.judgeT -= dt) <= 0) { this.judgeEl.remove(); this.judgeEl = null; }
    if (this.kihapNow) { this.kihapNow = false; events.push({ kind: 'kihap', actor: 'nico', text: 'Kihap!' }); }
    // Nico at the pads, the holder bracing
    let m: Move = MOVES.guard;
    if (this.strike) { this.strike.t += dt; const sm = this.strike.type === 'P' ? MOVES.jab : this.strike.type === 'K' ? MOVES.roundhouse : MOVES.sideKick; m = this.strike.t < 0.16 ? sm : ease(sm, MOVES.guard, Math.min(1, (this.strike.t - 0.16) / 0.12)); if (this.strike.t > 0.3) this.strike = null; }
    poses.set('nico', { x: 500, y: 600, face: 1, move: m, walking: false, side: true });
    this.holderHit -= dt;
    poses.set(song.holder as Actor, { x: 600, y: 600, face: -1, move: this.holderHit > 0 ? MOVES.recoil : MOVES.holdPad, walking: false, side: true, pad: true });
    if (r.done) {
      const best = this.host.best(`rhythm:${song.id}`), nb = r.score > best;
      if (nb) this.host.setBest(`rhythm:${song.id}`, r.score);
      this.last = { kind: 'rhythm', grade: r.grade, score: r.score };
      this.host.won('rhythm', song.id, { first: !best, grade: r.grade });
      const self = this.rhythm; this.rhythm = null;
      this.showResult(`Grade ${self!.grade}`, `${self!.score.toLocaleString()} points${nb ? ' · NEW BEST!' : ''} · best combo ${self!.best} · ${self!.counts.perfect} perfect, ${self!.counts.great} great, ${self!.counts.miss} missed`, () => this.startRhythm(song));
    }
  }
  private showResult(title: string, sub: string, again: () => void) {
    this.result.hidden = false;
    this.result.innerHTML = `<h2>${title}</h2><p>${sub}</p>`;
    const row = h('div', 'row'), a = h('button', 'primary', 'Again!'), d = h('button', '', 'Done'); a.type = d.type = 'button'; a.dataset.again = '1'; d.dataset.done = '1';
    a.onclick = again; d.onclick = () => this.stop(); row.append(a, d); this.result.append(row);
  }

  /** Every frame while a game's on: everyone's pose, and things to say. */
  frame(dt: number): { poses: Map<Actor, ActorPose>; events: DojoEvent[] } {
    const poses = new Map<Actor, ActorPose>(), events: DojoEvent[] = [];
    if (this.msgT > 0 && (this.msgT -= dt) <= 0) this.msg.classList.remove('pop');
    if (this.spar) this.sparFrame(dt, poses, events);
    else if (this.rhythm) this.rhythmFrame(dt, poses, events);
    this.pressed.clear();
    return { poses, events };
  }
  /** Who's playing (for main.ts: everyone else stands back and watches). */
  get cast(): Actor[] { return this.spar ? ['nico', this.spar.who.who as Actor] : this.rhythm ? ['nico', this.rhythm.song.holder as Actor] : []; }
}
export { RIVALS, SONGS, WINDOW, songLength };
