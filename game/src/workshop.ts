// The workshop screens (v2): building the toy car (and later products) by
// dragging parts onto the blueprint, the ramp test, and the quick repeat build. Plain DOM +
// inline SVG over the game (the world is paused behind it, like the cards). The rules live
// in business.ts; this file is the hands-on part. See docs/UX_NOTES.md for the feel rules.
import {
  item, use, has, product, runProgram, RAMP, ROBOT_LEVEL, type Move,
  type Biz, type Skill,
} from './business';
import { sfx } from './sound';
import { PLANS, type Slot } from './plans';
export { PLANS };

export interface WorkHost {
  biz: Biz;
  money(): number;
  setMoney(n: number): void;           // shows it and saves
  save(): void;
  toast(msg: string): void;
  opened(on: boolean): void;           // pause the world while a screen is up
  skill(s: Skill): void;               // a new skill was earned
}

const SVG = 'http://www.w3.org/2000/svg';
const h = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') => {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e;
};
const s = (tag: string, attrs: Record<string, string | number> = {}) => {
  const e = document.createElementNS(SVG, tag); for (const k in attrs) e.setAttribute(k, String(attrs[k])); return e;
};
const name = (id: string) => item(id).label.split(' ').slice(1).join(' ');
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

export const SNAP = { at: 80, keep: 100 };   // snaps within `at` of a slot, and stays snapped until `keep` (no flicker)
const LIFT = 46;                              // a picked-up part rides this far above the finger, so it isn't hidden

function partArt(kind: string): SVGGElement {
  const g = s('g') as SVGGElement;
  if (kind === 'axle') {
    g.append(s('rect', { x: -6, y: -92, width: 12, height: 184, rx: 6, fill: '#9AA6B2', stroke: '#2B3F55', 'stroke-width': 3 }));
  } else if (kind === 'wheel') {
    g.append(s('rect', { x: -26, y: -15, width: 52, height: 30, rx: 10, fill: '#2C3E52', stroke: '#1B2733', 'stroke-width': 3 }),
      s('rect', { x: -12, y: -6, width: 24, height: 12, rx: 4, fill: '#C9D3DC' }));
  } else if (kind === 'tin') {
    g.append(s('line', { x1: 0, y1: -85, x2: 0, y2: -115, stroke: '#2B3F55', 'stroke-width': 4 }),                         // antenna
      s('rect', { x: -75, y: -85, width: 150, height: 170, rx: 24, fill: '#A9B8C6', stroke: '#2B3F55', 'stroke-width': 4 }),
      s('circle', { cx: -30, cy: -40, r: 16, fill: '#FFFFFF', stroke: '#2B3F55', 'stroke-width': 3 }), s('circle', { cx: -30, cy: -40, r: 6, fill: '#2B3F55' }),
      s('circle', { cx: 30, cy: -40, r: 16, fill: '#FFFFFF', stroke: '#2B3F55', 'stroke-width': 3 }), s('circle', { cx: 30, cy: -40, r: 6, fill: '#2B3F55' }),
      s('rect', { x: -26, y: -8, width: 52, height: 10, rx: 4, fill: '#2B3F55' }));                                         // mouth
  } else if (kind === 'gear') {
    for (let a = 0; a < 360; a += 45) { const t = s('rect', { x: -6, y: -30, width: 12, height: 12, rx: 2, fill: '#F2B632', stroke: '#2B3F55', 'stroke-width': 2 }); t.setAttribute('transform', `rotate(${a})`); g.append(t); }
    g.append(s('circle', { cx: 0, cy: 0, r: 22, fill: '#F2B632', stroke: '#2B3F55', 'stroke-width': 3 }), s('circle', { cx: 0, cy: 0, r: 7, fill: '#2B3F55' }));
  } else if (kind === 'battery') {
    g.append(s('rect', { x: -38, y: -17, width: 76, height: 34, rx: 6, fill: '#3BB273', stroke: '#2B3F55', 'stroke-width': 3 }),
      s('rect', { x: 38, y: -7, width: 8, height: 14, rx: 2, fill: '#2B3F55' }), s('rect', { x: -30, y: -17, width: 20, height: 34, fill: '#2B3F55', opacity: 0.25 }));
  } else if (kind === 'bulb') {
    g.append(s('circle', { cx: 0, cy: -6, r: 17, fill: '#FFE066', stroke: '#2B3F55', 'stroke-width': 3 }), s('rect', { x: -9, y: 9, width: 18, height: 12, rx: 3, fill: '#9AA6B2', stroke: '#2B3F55', 'stroke-width': 2 }));
  } else {
    g.append(s('rect', { x: -105, y: -62, width: 210, height: 124, rx: 30, fill: '#E0453A', stroke: '#2B3F55', 'stroke-width': 4 }),
      s('rect', { x: -40, y: -42, width: 78, height: 84, rx: 16, fill: '#F7D9A8', stroke: '#2B3F55', 'stroke-width': 3 }),   // the seat
      s('rect', { x: 46, y: -40, width: 18, height: 80, rx: 6, fill: '#BFE3F5', stroke: '#2B3F55', 'stroke-width': 3 }),     // windscreen
      s('rect', { x: -98, y: -8, width: 196, height: 16, fill: '#FFFFFF', opacity: 0.9 }));                                  // stripe
  }
  return g;
}
function slotArt(kind: string): SVGGElement {
  const g = partArt(kind);
  for (const e of Array.from(g.children)) { e.setAttribute('fill', 'none'); e.setAttribute('stroke', '#5B8DB8'); e.setAttribute('stroke-dasharray', '8 6'); e.setAttribute('stroke-width', '3'); }
  return g;
}
const at = (g: SVGGraphicsElement, x: number, y: number, sc = 1) => { g.style.transform = `translate(${x}px, ${y}px) scale(${sc})`; };

export class Workshop {
  readonly el: HTMLElement;
  private title: HTMLElement; private sub: HTMLElement; private stage: HTMLElement; private actions: HTMLElement;
  /** what's showing (for tests): 'auction' | 'unit' | 'build' | 'quick' | 'ramp' | null */
  screen: string | null = null;
  /** for tests: the build's filled slots, the ramp's last result */
  filled = new Set<string>();
  lastRun: { height: number; passed: boolean; moves?: string } | null = null;
  private cleanup: (() => void) | null = null;   // window listeners of the screen that's up

  constructor(private host: WorkHost) {
    this.el = h('div', 'modal work'); this.el.id = 'work'; this.el.hidden = true;
    const panel = h('div', 'panel'); panel.setAttribute('role', 'dialog');
    const top = h('div', 'top');
    this.title = h('h2'); const close = h('button', 'close', '✕'); close.type = 'button'; close.setAttribute('aria-label', 'Leave');
    close.addEventListener('click', () => this.close());
    top.append(this.title, close);
    this.sub = h('p', 'sub'); this.stage = h('div', 'stage'); this.actions = h('div', 'row actions');
    panel.append(top, this.sub, this.stage, this.actions);
    this.el.append(panel);
    document.body.append(this.el);
  }

  private show(screen: string, title: string, sub: string) {
    this.cleanup?.(); this.cleanup = null;
    this.screen = screen; this.title.textContent = title; this.sub.textContent = sub;
    this.stage.replaceChildren(); this.actions.replaceChildren(); this.stage.className = `stage ${screen}`;
    if (this.el.hidden) { this.el.hidden = false; this.host.opened(true); }
  }
  close() {
    if (this.el.hidden) return;
    this.cleanup?.(); this.cleanup = null;
    this.el.hidden = true; this.screen = null; this.stage.replaceChildren(); this.host.opened(false); this.host.save();
  }
  private button(label: string, onClick: () => void, cls = '') {
    const b = h('button', cls, label); b.type = 'button'; b.addEventListener('click', onClick); this.actions.append(b); return b;
  }

  // ------------------------------------------------------------ the blueprint (shared by both builds)
  private blueprint(pid: string): { svg: SVGSVGElement; layers: Record<string, SVGGElement>; slots: Map<string, SVGGElement> } {
    const plan = PLANS[pid];
    const svg = s('svg', { viewBox: '0 0 600 400', class: 'blueprint' }) as SVGSVGElement;
    svg.append(s('rect', { x: 0, y: 0, width: 600, height: 300, rx: 18, fill: '#E8F1FA' }));
    for (let x = 30; x < 600; x += 30) svg.append(s('line', { x1: x, y1: 0, x2: x, y2: 300, stroke: '#D3E2F0', 'stroke-width': 1 }));
    for (let y = 30; y < 300; y += 30) svg.append(s('line', { x1: 0, y1: y, x2: 600, y2: y, stroke: '#D3E2F0', 'stroke-width': 1 }));
    svg.append(s('rect', { x: 0, y: 300, width: 600, height: 100, rx: 18, fill: '#F6E7CF' }));   // the tray
    const slotLayer = s('g') as SVGGElement; svg.append(slotLayer);
    const layers: Record<string, SVGGElement> = {};
    for (const k of [...new Set(plan.slots.map(q => q.kind)), 'tray', 'held']) { layers[k] = s('g') as SVGGElement; svg.append(layers[k]); }   // (drawn in slot order)
    const slots = new Map<string, SVGGElement>();
    for (const sl of plan.slots) { const g = slotArt(sl.kind); g.classList.add('slot'); g.dataset.slot = sl.id; at(g, sl.x, sl.y); slotLayer.append(g); slots.set(sl.id, g); }
    return { svg, layers, slots };
  }

  // ------------------------------------------------------------ the first build: drag the parts on
  build(pid = 'car') {
    const pr = product(pid), plan = PLANS[pid], SLOTS = plan.slots;
    this.show('build', `Build the ${pr.name}`, plan.hint);
    this.filled = new Set();
    const { svg, layers, slots } = this.blueprint(pid);
    this.stage.append(svg);
    const ready = (sl: Slot) => !this.filled.has(sl.id) && sl.needs.every(n => this.filled.has(n));
    const glow = () => { for (const sl of SLOTS) slots.get(sl.id)!.classList.toggle('ready', ready(sl)); };
    const test = this.button(pr.test === 'ramp' ? 'Test it on the ramp →' : 'Test it: program it! →', () => (pr.test === 'ramp' ? this.ramp() : this.program()), 'primary'); test.disabled = true;
    // the tray: one of each part the recipe needs, laid out along the bottom
    const tray = plan.tray;
    const toSvg = (e: PointerEvent) => { const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM()!.inverse()); return [p.x, p.y]; };
    // one drag at a time; move/up are heard on the window (pointer capture on SVG groups
    // isn't reliable in Safari), and dropped when the screen closes
    let drag: { id: number; g: SVGGElement; t: typeof tray[number]; snapped: Slot | null } | null = null;
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      e.preventDefault();
      const [x, y0] = toSvg(e), y = y0 - LIFT, kind = drag.t.kind;
      // stay snapped until well clear; otherwise snap to the nearest free slot of this kind
      if (drag.snapped && Math.hypot(drag.snapped.x - x, drag.snapped.y - y) > SNAP.keep) drag.snapped = null;
      if (!drag.snapped) {
        let best: Slot | null = null, bd = SNAP.at;
        for (const sl of SLOTS) if (sl.kind === kind && ready(sl)) { const d = Math.hypot(sl.x - x, sl.y - y); if (d < bd) { bd = d; best = sl; } }
        drag.snapped = best;
      }
      if (drag.snapped) at(drag.g, drag.snapped.x, drag.snapped.y, 1.06); else at(drag.g, x, y, 1.06);
    };
    const drop = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const { g, t } = drag, sl = drag.snapped; drag = null; g.classList.remove('held');
      for (const el of slots.values()) el.classList.remove('want');
      if (sl) {
        this.filled.add(sl.id); g.classList.add('placed'); layers[t.kind].append(g); at(g, sl.x, sl.y, 1);
        slots.get(sl.id)!.classList.add('done'); sfx.snap(); glow();
        if (this.filled.size === SLOTS.length) { test.disabled = false; this.sub.textContent = pr.test === 'ramp' ? 'All together! Now let\'s see if it rolls.' : 'All together! Now let\'s see if it works.'; sfx.cheer(); }
        return;
      }
      // not on a slot: say why if it was close to one, and slide back to the tray
      const [x, y0] = toSvg(e), y = y0 - LIFT;
      const near = SLOTS.find(q => !this.filled.has(q.id) && Math.hypot(q.x - x, q.y - y) < SNAP.at);
      if (near && near.kind !== t.kind) this.sub.textContent = `That spot is for ${/^[aeiou]/.test(name(near.kind).toLowerCase()) ? 'an' : 'a'} ${name(near.kind).toLowerCase()}.`;
      else if (near && near.kind === t.kind && plan.why[t.kind]) this.sub.textContent = plan.why[t.kind];
      g.classList.add('back'); sfx.boing();
      layers.tray.append(g); at(g, t.x, t.y, t.sc);
      setTimeout(() => g.classList.remove('back'), 260);
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', drop);
    window.addEventListener('pointercancel', drop);
    this.cleanup = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', drop); window.removeEventListener('pointercancel', drop); };
    for (const t of tray) {
      const g = partArt(t.kind); g.classList.add('part'); g.dataset.part = t.kind; at(g, t.x, t.y, t.sc); layers.tray.append(g);
      g.addEventListener('pointerdown', e => {
        if (drag || g.classList.contains('placed')) return;
        e.preventDefault();
        drag = { id: e.pointerId, g, t, snapped: null };
        layers.held.append(g); g.classList.add('held'); sfx.lift();
        for (const sl of SLOTS) slots.get(sl.id)!.classList.toggle('want', sl.kind === t.kind && ready(sl));
        const [x, y] = toSvg(e); at(g, x, y - LIFT, 1.06);
      });
    }
    glow();
  }

  // ------------------------------------------------------------ the ramp test
  ramp() {
    this.show('ramp', 'Ramp test', 'Pick a ramp and let go. Can your car roll past the flag?');
    const svg = s('svg', { viewBox: '0 50 600 250', class: 'rampview' }) as SVGSVGElement;
    svg.append(s('rect', { x: 0, y: 0, width: 600, height: 300, rx: 18, fill: '#E8F1FA' }), s('rect', { x: 0, y: 250, width: 600, height: 50, fill: '#C9B48A' }));
    const ramp = s('polygon', { fill: '#D9A066', stroke: '#2B3F55', 'stroke-width': 3 }); svg.append(ramp);
    const FLAG = 470, flag = s('g') as SVGGElement;
    flag.append(s('line', { x1: FLAG, y1: 250, x2: FLAG, y2: 170, stroke: '#2B3F55', 'stroke-width': 4 }), s('polygon', { points: `${FLAG},172 ${FLAG + 44},186 ${FLAG},200`, fill: '#F9A826', stroke: '#2B3F55', 'stroke-width': 3 }),
      s('line', { x1: FLAG, y1: 250, x2: FLAG, y2: 300, stroke: '#2B3F55', 'stroke-width': 3, 'stroke-dasharray': '6 5' }));
    flag.classList.add('flag'); svg.append(flag);
    const car = s('g') as SVGGElement, carIn = s('g') as SVGGElement;   // wobble the inside: the outside's transform is its position
    car.append(carIn);
    carIn.append(s('rect', { x: -34, y: -26, width: 68, height: 20, rx: 8, fill: '#E0453A', stroke: '#2B3F55', 'stroke-width': 3 }),
      s('rect', { x: -10, y: -38, width: 26, height: 14, rx: 5, fill: '#F7D9A8', stroke: '#2B3F55', 'stroke-width': 3 }),
      s('circle', { cx: -20, cy: -9, r: 9, fill: '#2C3E52' }), s('circle', { cx: 20, cy: -9, r: 9, fill: '#2C3E52' }));
    svg.append(car);
    this.stage.append(svg);
    let height = RAMP.pass, busy = false;
    const top = (hh: number) => 250 - 45 * hh - 15;
    const draw = () => {
      ramp.setAttribute('points', `10,250 10,${top(height)} 40,${top(height)} 210,250`);
      car.setAttribute('transform', `translate(30, ${top(height)}) rotate(${Math.atan2(250 - top(height), 170) * 180 / Math.PI})`);
    };
    draw();
    const picks = h('div', 'picks');
    const labels = ['Low', 'Medium', 'High'];
    const pickBtns = RAMP.heights.map((hh, i) => {
      const b = h('button', hh === height ? 'on' : '', labels[i] ?? `${hh}`); b.type = 'button'; b.dataset.height = String(hh);
      b.addEventListener('click', () => { if (busy) return; height = hh; for (const x of pickBtns) x.classList.toggle('on', x === b); sfx.tap(); draw(); });
      picks.append(b); return b;
    });
    this.actions.append(picks);
    const go = this.button('Let go!', () => run(), 'primary'); go.dataset.go = '1';
    const run = async () => {
      if (busy) return; busy = true; go.disabled = true;
      draw(); sfx.roll();
      // down the ramp, then along the floor, slowing: how far depends on the height
      const t0 = top(height), stopX = 300 + 105 * height;   // h1: 405 (short of the flag), h2: 510, h3: 615 -> stops at the wall
      const end = Math.min(560, stopX), passed = height >= RAMP.pass;
      const T1 = 700, T2 = 1300, start = performance.now();
      await new Promise<void>(res => {
        const step = (now: number) => {
          const t = now - start;
          let x: number, y: number, a: number;
          if (t < T1) { const k = (t / T1) ** 2; x = 30 + 170 * k; y = t0 + (250 - t0) * k; a = Math.atan2(250 - t0, 170) * 180 / Math.PI; }
          else { const k = Math.min(1, (t - T1) / T2), e = 1 - (1 - k) ** 2; x = 200 + (end - 200) * e; y = 250; a = 0; }
          car.setAttribute('transform', `translate(${x}, ${y}) rotate(${a})`);
          if (t < T1 + T2) requestAnimationFrame(step); else res();
        };
        requestAnimationFrame(step);
      });
      this.lastRun = { height, passed };
      if (!passed) {
        sfx.boing(); carIn.classList.add('wobble'); setTimeout(() => carIn.classList.remove('wobble'), 600);
        this.sub.textContent = 'So close! It ran out of speed before the flag. Try a higher ramp.';
        busy = false; go.disabled = false; go.textContent = 'Try again';
        return;
      }
      flag.classList.add('wave'); sfx.cheer();
      this.sub.textContent = 'It works! 🎉 Your toy car design is finished. Now you can build them quickly.';
      this.actions.replaceChildren();
      this.button('Done', () => { this.prototypeDone('car'); }, 'primary');
    };
  }
  /** The first one passed its test: use up the parts, remember the design, one to sell. */
  private prototypeDone(pid: string) {
    const b = this.host.biz, pr = product(pid);
    if (!b.designs.includes(pid) && use(b, pr.recipe)) { b.designs.push(pid); b.stock[pid] = (b.stock[pid] ?? 0) + 1; }
    this.host.save();
    this.host.toast(`${pr.emoji} ${pr.name[0].toUpperCase()}${pr.name.slice(1)} made! Take it to the Toy Shop to sell it.`);
    this.close();
  }

  // ------------------------------------------------------------ the robot's test: program it to the star
  program() {
    const lv = ROBOT_LEVEL, C = 80, ox = (600 - lv.cols * C) / 2, oy = 10;
    this.show('program', 'Program the robot', `Tap arrows to plan its walk (up to ${lv.maxMoves} steps), then Go! Get it to the ⭐ without bumping a box.`);
    const svg = s('svg', { viewBox: `0 0 600 ${lv.rows * C + 20}`, class: 'gridview' }) as SVGSVGElement;
    for (let y = 0; y < lv.rows; y++) for (let x = 0; x < lv.cols; x++)
      svg.append(s('rect', { x: ox + x * C + 2, y: oy + y * C + 2, width: C - 4, height: C - 4, rx: 10, fill: (x + y) % 2 ? '#E8F1FA' : '#DCE9F5' }));
    for (const [bx, by] of lv.boxes) svg.append(s('rect', { x: ox + bx * C + 10, y: oy + by * C + 10, width: C - 20, height: C - 20, rx: 6, fill: '#D9A066', stroke: '#2B3F55', 'stroke-width': 3 }));
    const star = s('text', { x: ox + lv.star[0] * C + C / 2, y: oy + lv.star[1] * C + C / 2 + 16, 'text-anchor': 'middle', 'font-size': 44 }); star.textContent = '⭐'; svg.append(star);
    const bot = s('g') as SVGGElement, wob = s('g') as SVGGElement, botIn = partArt('tin');   // (wobble the middle layer: the outer one's transform is its position)
    botIn.setAttribute('transform', 'scale(0.36)'); wob.append(botIn); bot.append(wob); svg.append(bot);
    bot.classList.add('bot');
    const put = (x: number, y: number) => at(bot, ox + x * C + C / 2, oy + y * C + C / 2 + 4);
    put(...lv.start);
    this.stage.append(svg);
    const strip = h('div', 'strip'); this.stage.append(strip);
    const moves: Move[] = [], ARROW: Record<Move, string> = { U: '⬆️', D: '⬇️', L: '⬅️', R: '➡️' };
    let busy = false;
    const show = () => { strip.textContent = moves.length ? moves.map(m => ARROW[m]).join(' ') : 'Your program: (empty)'; go.disabled = !moves.length || busy; };
    const pad = h('div', 'pad');
    for (const m of ['L', 'U', 'D', 'R'] as Move[]) {
      const b = h('button', '', ARROW[m]); b.type = 'button'; b.dataset.move = m;
      b.addEventListener('click', () => { if (busy || moves.length >= lv.maxMoves) return; moves.push(m); sfx.tap(); show(); });
      pad.append(b);
    }
    const back = h('button', '', '⌫'); back.type = 'button'; back.dataset.move = 'back';
    back.addEventListener('click', () => { if (busy) return; moves.pop(); sfx.tap(); show(); });
    pad.append(back);
    this.actions.append(pad);
    const go = this.button('Go!', () => run(), 'primary'); go.dataset.go = '1';
    const run = async () => {
      if (busy || !moves.length) return; busy = true; show();
      put(...lv.start); await wait(200);
      const res = runProgram(moves, lv);
      for (const [x, y] of res.path.slice(1)) { put(x, y); sfx.lift(); await wait(330); }
      this.lastRun = { height: moves.length, passed: res.result === 'star', moves: moves.join('') } as typeof this.lastRun;
      if (res.result === 'star') {
        sfx.cheer(); star.classList.add('wave');
        this.sub.textContent = 'It made it! 🎉 Your toy robot design is finished. Now you can build them quickly.';
        this.actions.replaceChildren();
        this.button('Done', () => this.prototypeDone('robot'), 'primary');
        return;
      }
      if (res.result === 'bump') {
        wob.classList.add('bonk'); sfx.boing();
        setTimeout(() => wob.classList.remove('bonk'), 500);
        this.sub.textContent = 'Bonk! It walked into a box (or the edge). Change the program with ⌫ and try again.';
      } else { sfx.boing(); this.sub.textContent = 'It stopped before the star. Add some more steps and try again.'; }
      busy = false; show(); go.textContent = 'Try again';
    };
    show();
  }

  // ------------------------------------------------------------ repeat builds: three taps
  quick(pid = 'car') {
    const b = this.host.biz, pr = product(pid), plan = PLANS[pid];
    if (!has(b, pr.recipe)) return;
    const steps = plan.steps;
    this.show('quick', `Build a ${pr.name}`, `You know how now: ${steps.length} quick steps.`);
    const { svg, layers, slots } = this.blueprint(pid);
    this.stage.append(svg);
    let i = 0;
    const btn = this.button(steps[0][0], () => {
      if (i >= steps.length) return;
      const kind = steps[i][1];
      for (const sl of plan.slots) if (sl.kind === kind) {
        const g = partArt(kind); g.classList.add('part', 'placed', 'drop'); at(g, sl.x, sl.y - 40, 1); layers[kind].append(g);
        requestAnimationFrame(() => requestAnimationFrame(() => at(g, sl.x, sl.y, 1)));
        slots.get(sl.id)!.classList.add('done');
      }
      sfx.snap(); i++;
      if (i < steps.length) { btn.textContent = steps[i][0]; return; }
      use(b, pr.recipe); b.stock[pid] = (b.stock[pid] ?? 0) + 1; this.host.save(); sfx.cheer();
      this.sub.textContent = `Another ${pr.name}! You have ${b.stock[pid]} ready to sell.`;
      btn.textContent = 'Done'; btn.onclick = () => this.close();
    }, 'primary');
    btn.dataset.step = '1';
  }
}
