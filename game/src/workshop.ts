// The workshop screens (v2): building the toy car (and later products) by
// dragging parts onto the blueprint, the ramp test, and the quick repeat build. Plain DOM +
// inline SVG over the game (the world is paused behind it, like the cards). The rules live
// in business.ts; this file is the hands-on part. See docs/UX_NOTES.md for the feel rules.
import {
  item, use, has, product, runProgram, RAMP, ROBOT_LEVEL, type Move,
  type Biz, type Skill,
} from './business';
import { sfx, audio } from './sound';
import { PLANS, type Slot } from './plans';
import { design, make, cantMake, pieceValue, bonusOf, type Piece } from './jewelry';
import { SHELL_KINDS } from './world/beach';
import { recipe, cantBake, bake, doneness, priceFor, BAKE, type Doneness } from './bakery';
import { BELTS, MOVES, CLASS, combo, check, callTime, nextBelt, type Move as KMove } from './karate';
export { PLANS };

export interface WorkHost {
  biz: Biz;
  money(): number;
  setMoney(n: number): void;           // shows it and saves
  save(): void;
  toast(msg: string): void;
  opened(on: boolean): void;           // pause the world while a screen is up
  skill(s: Skill): void;               // a new skill was earned
  made?(p: Piece): void;               // a piece of jewelry was hung on the shop's shelves
  baked?(): void;                      // a tray came out of the bakery's oven (into the display case)
  made2?(what: string, data?: string): void;   // something made with the grandparents (pizzelle, a birdhouse, a sign, a star, a painting)
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
/** A shell on the twine, centred on (0, 0): a star, a sand dollar, a spiral, or a ridged fan (scallop, clam, cowrie). */
function shellGlyph(kind: string, color: string): SVGGElement {
  const g = s('g') as SVGGElement, line = { stroke: '#2B3F55', 'stroke-width': 3 };
  if (kind === 'starfish') {
    const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 11 : 27; return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`; }).join(' ');
    g.append(s('polygon', { points: pts, fill: color, ...line, 'stroke-linejoin': 'round' }), s('circle', { cx: 0, cy: 0, r: 4, fill: '#F9C846' }));
  } else if (kind === 'sanddollar') {
    g.append(s('circle', { cx: 0, cy: 0, r: 23, fill: color, ...line }));
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; g.append(s('ellipse', { cx: Math.cos(a) * 10, cy: Math.sin(a) * 10, rx: 3, ry: 5, fill: '#C9B98E', transform: `rotate(${a * 180 / Math.PI + 90} ${Math.cos(a) * 10} ${Math.sin(a) * 10})` })); }
  } else if (kind === 'spiral') {
    g.append(s('ellipse', { cx: 0, cy: 0, rx: 17, ry: 25, fill: color, ...line }),
      s('path', { d: 'M-12,8 L12,2 M-12,-4 L12,-10 M-8,-15 L8,-19', stroke: '#C79A62', 'stroke-width': 3, fill: 'none' }));
  } else {
    g.append(s('path', { d: 'M0,22 L-25,-4 A26,26 0 0 1 25,-4 Z', fill: color, ...line, 'stroke-linejoin': 'round' }));
    for (const a of [-40, -20, 0, 20, 40]) { const r = a * Math.PI / 180; g.append(s('line', { x1: 0, y1: 18, x2: Math.sin(r) * 22, y2: -6 - Math.cos(r) * 14, stroke: '#2B3F55', 'stroke-width': 1.5, opacity: 0.45 })); }
  }
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

  // ------------------------------------------------------------ Bibs and Bobs: string shells onto twine
  /** for tests: the shells strung so far */
  strung: string[] = [];
  jewelry(id: string) {
    const b = this.host.biz, d = design(id);
    if (cantMake(b, id)) return;
    this.show('jewelry', `Make a ${d.name}`, `Tap your shells to string ${d.beads} onto the twine. Tap one on the twine to take it off. Matching sets and patterns sell for more!`);
    this.strung = [];
    const svg = s('svg', { viewBox: '0 0 600 250', class: 'blueprint' }) as SVGSVGElement;
    svg.append(s('rect', { x: 0, y: 0, width: 600, height: 250, rx: 18, fill: '#FFF4DA' }));
    const spot = (i: number): [number, number] => { const u = (i + 0.5) / d.beads; return [50 + u * 500, 40 + Math.sin(Math.PI * u) * 150]; };
    const path = Array.from({ length: 41 }, (_, k) => { const u = k / 40; return `${k ? 'L' : 'M'}${(30 + u * 540).toFixed(1)},${(40 + Math.sin(Math.PI * ((30 + u * 540 - 50) / 500)) * 150).toFixed(1)}`; }).join(' ');
    svg.append(s('path', { d: path, fill: 'none', stroke: '#C9A46A', 'stroke-width': 5, 'stroke-linecap': 'round' }));
    const beads = s('g') as SVGGElement; svg.append(beads);
    const col = (k: string) => SHELL_KINDS.find(q => q.id === k)?.color ?? '#FFFFFF';
    this.stage.append(svg);
    const strip = h('div', 'strip'); this.stage.append(strip);
    const picks = h('div', 'picks shells'); this.stage.append(picks);
    const left = (k: string) => (b.shells[k] ?? 0) - this.strung.filter(q => q === k).length;
    const tie = this.button('🧵 Tie it off', () => finish(), 'primary'); tie.dataset.tie = '1';
    const redo = this.button('Start over', () => { this.strung = []; draw(); }); redo.dataset.redo = '1';
    const draw = () => {
      beads.replaceChildren();
      for (let i = 0; i < d.beads; i++) {
        const [x, y] = spot(i), k = this.strung[i];
        const c = k ? shellGlyph(k, col(k)) : s('circle', { cx: 0, cy: 0, r: 18, fill: 'none', stroke: '#5B8DB8', 'stroke-width': 3, 'stroke-dasharray': '6 5' }) as SVGGraphicsElement;
        at(c, x, y);
        if (k) { c.classList.add('bead'); c.dataset.bead = String(i); c.addEventListener('click', () => { this.strung.splice(i, 1); sfx.tap(); draw(); }); }
        beads.append(c);
      }
      const bonus = bonusOf(this.strung), full = this.strung.length === d.beads;
      strip.textContent = this.strung.length ? `Worth $${pieceValue(d, this.strung)}${bonus && full ? ` · ${bonus.label} +$${bonus.amount}!` : ''}  (${this.strung.length}/${d.beads})` : `0/${d.beads} shells`;
      picks.replaceChildren();
      for (const k of SHELL_KINDS) {
        if (!(b.shells[k.id] > 0)) continue;
        const bt = h('button'); bt.type = 'button'; bt.dataset.shell = k.id; bt.disabled = full || left(k.id) <= 0;
        bt.innerHTML = `<span class="dot" style="background:${k.color}"></span>${k.label} ×${left(k.id)}`;
        bt.addEventListener('click', () => { if (this.strung.length >= d.beads || left(k.id) <= 0) return; this.strung.push(k.id); sfx.snap(); draw(); });
        picks.append(bt);
      }
      tie.disabled = !full;
    };
    const finish = () => {
      const p = make(b, id, this.strung);
      if (!p) return;
      this.host.save(); sfx.cheer(); this.host.made?.(p);
      this.sub.textContent = `${d.emoji} A ${d.name}! It's on the shelves for $${p.price}.`;
      picks.replaceChildren(); this.actions.replaceChildren();
      const again = this.button('Make another', () => this.jewelry(id)); again.dataset.again = '1'; again.disabled = !!cantMake(b, id);
      this.button('Done', () => this.close(), 'primary').dataset.done = '1';
    };
    draw();
  }

  // ------------------------------------------------------------ the bakery: into the bowl, stir, bake
  /** for tests: the bake in progress (what's gone in, stirs, oven seconds) and how the last one came out */
  baking: { added: string[]; stirs: number; oven: number; result: Doneness | null } = { added: [], stirs: 0, oven: 0, result: null };
  bake(id: string) {
    const b = this.host.biz, r = recipe(id);
    if (cantBake(b, id)) return;
    const need = Object.entries(r.needs).flatMap(([k, n]) => Array(n).fill(k) as string[]);
    const EMOJI: Record<string, string> = { flour: '🌾', sugar: '🍬', butter: '🧈', egg: '🥚', chocolate: '🍫' };
    this.baking = { added: [], stirs: 0, oven: 0, result: null };
    this.show('bake', `Bake ${r.name}`, 'Tap each ingredient to put it in the bowl.');
    const svg = s('svg', { viewBox: '0 0 600 260', class: 'blueprint' }) as SVGSVGElement;
    svg.append(s('rect', { x: 0, y: 0, width: 600, height: 260, rx: 18, fill: '#FFF4DA' }));
    const bowl = s('g') as SVGGElement; at(bowl, 300, 150);
    const mix = s('ellipse', { cx: 0, cy: -10, rx: 0, ry: 0, fill: '#F2E2B6' });
    bowl.append(s('path', { d: 'M-130,-30 Q-120,90 0,95 Q120,90 130,-30 Z', fill: '#7FD1E8', stroke: '#2B3F55', 'stroke-width': 5 }), mix,
      s('ellipse', { cx: 0, cy: -30, rx: 130, ry: 26, fill: 'none', stroke: '#2B3F55', 'stroke-width': 5 }));
    const bits = s('g') as SVGGElement; bowl.append(bits);
    svg.append(bowl); this.stage.append(svg);
    const strip = h('div', 'strip'); this.stage.append(strip);
    const pad = h('div', 'picks shells'); this.stage.append(pad);
    const left = () => need.filter((k, i) => need.slice(0, i + 1).filter(q => q === k).length > this.baking.added.filter(q => q === k).length);
    const COL: Record<string, string> = { flour: '#FFFFFF', sugar: '#F7C8D0', butter: '#F9E39A', egg: '#F9C846', chocolate: '#5A3A22' };
    // 1. into the bowl
    const drawAdd = () => {
      const l = left();
      strip.textContent = l.length ? `Still to go in: ${l.map(k => EMOJI[k]).join(' ')}` : 'All in! Now stir it up.';
      pad.replaceChildren();
      for (const k of [...new Set(need)]) {
        const bt = h('button'); bt.type = 'button'; bt.dataset.ing = k; bt.disabled = !l.includes(k);
        bt.innerHTML = `<span style="font-size:28px">${EMOJI[k]}</span> ${k}`;
        bt.addEventListener('click', () => {
          if (!left().includes(k)) return;
          this.baking.added.push(k); sfx.pop();
          const n = this.baking.added.length; mix.setAttribute('rx', String(30 + n * 14)); mix.setAttribute('ry', String(8 + n * 3));
          for (let i = 0; i < 5; i++) bits.append(s('circle', { cx: (Math.random() - 0.5) * 140, cy: -10 + (Math.random() - 0.5) * 30, r: 6, fill: COL[k], stroke: '#2B3F55', 'stroke-width': 1.5 }));
          drawAdd(); if (!left().length) stirStep();
        });
        pad.append(bt);
      }
    };
    // 2. stir
    const STIRS = 6;
    const stirStep = () => {
      this.sub.textContent = `Stir it ${STIRS} times!`; pad.replaceChildren();
      const st = this.button('🥄 Stir!', () => {
        this.baking.stirs++; sfx.tap(); bits.style.transform = `rotate(${this.baking.stirs * 60}deg)`; bits.style.transition = 'transform .25s';
        bits.style.opacity = String(1 - this.baking.stirs / STIRS); mix.setAttribute('fill', this.baking.stirs >= STIRS / 2 ? '#E9C98A' : '#F2E2B6');
        strip.textContent = `Stir! ${this.baking.stirs}/${STIRS}`;
        if (this.baking.stirs >= STIRS) { st.remove(); ovenStep(); }
      }, 'primary'); st.dataset.stir = '1';
      strip.textContent = `Stir! 0/${STIRS}`;
    };
    // 3. the oven: take it out when it's golden
    const ovenStep = () => {
      this.sub.textContent = `Into the oven! Take it out when it's golden (the gold part of the bar).`;
      bowl.remove(); strip.textContent = '🔥 Baking... watch the needle!';
      const oven = s('g') as SVGGElement; at(oven, 300, 120);
      const tray = s('rect', { x: -150, y: 10, width: 300, height: 34, rx: 8, fill: '#F2E2B6', stroke: '#2B3F55', 'stroke-width': 4 });
      oven.append(s('rect', { x: -200, y: -95, width: 400, height: 200, rx: 18, fill: '#9AA6B2', stroke: '#2B3F55', 'stroke-width': 5 }),
        s('rect', { x: -175, y: -65, width: 350, height: 145, rx: 12, fill: '#F28C38' }), tray);
      for (let i = 0; i < r.makes; i++) oven.append(s('circle', { cx: -110 + i * (220 / Math.max(1, r.makes - 1)), cy: 4, r: 16, fill: '#F2E2B6', stroke: '#2B3F55', 'stroke-width': 3, class: 'dough' }));
      svg.append(oven);
      const MAX = r.oven + 2.5, W = 500;
      const bar = s('g') as SVGGElement; at(bar, 50, 238);
      const x = (t: number) => W * t / MAX;
      bar.append(s('rect', { x: 0, y: -12, width: W, height: 24, rx: 12, fill: '#E9EEF3', stroke: '#2B3F55', 'stroke-width': 3 }),
        s('rect', { x: x(r.oven - BAKE.ok), y: -12, width: x(2 * BAKE.ok), height: 24, fill: '#F9E39A' }),
        s('rect', { x: x(r.oven - BAKE.golden), y: -12, width: x(2 * BAKE.golden), height: 24, fill: '#F9C846' }));
      const needle = s('rect', { x: -3, y: -20, width: 6, height: 40, rx: 3, fill: '#E5484D' }); bar.append(needle);
      svg.append(bar);
      const t0 = performance.now(); let done = false;
      const shade = (t: number) => { const k = Math.min(1, t / r.oven), burnt = Math.max(0, (t - r.oven - BAKE.ok) / 1.5);
        return burnt > 0 ? `rgb(${Math.round(201 - 120 * Math.min(1, burnt))},${Math.round(135 - 90 * Math.min(1, burnt))},${Math.round(74 - 40 * Math.min(1, burnt))})` : `rgb(${Math.round(242 - 41 * k)},${Math.round(226 - 91 * k)},${Math.round(182 - 108 * k)})`; };
      const tick = () => {
        if (done || this.screen !== 'bake') return;
        const t = (performance.now() - t0) / 1000; this.baking.oven = t;
        at(needle as unknown as SVGGraphicsElement, x(Math.min(t, MAX)), 0);
        for (const d of Array.from(oven.querySelectorAll('.dough'))) d.setAttribute('fill', shade(t));
        if (t >= MAX) { out(); return; }
        requestAnimationFrame(tick);
      };
      const out = () => {
        if (done) return; done = true;
        const d = doneness(r, this.baking.oven), got = bake(b, id, d);
        if (!got) { this.close(); return; }
        this.baking.result = d; this.host.save(); this.host.baked?.();
        if (d === 'golden') sfx.cheer(); else if (d === 'ok') sfx.sparkle(); else sfx.boing();
        const say = { golden: 'Perfectly golden!', ok: 'Nicely baked.', doughy: 'A bit doughy in the middle...', burnt: 'Oops, a little burnt!' }[d];
        this.sub.textContent = `${r.emoji} ${say} ${got.length} ${r.name} in the display case at $${priceFor(r, d)} each.`;
        this.actions.replaceChildren();
        const again = this.button('Bake again', () => this.bake(id)); again.dataset.again = '1'; again.disabled = !!cantBake(b, id);
        this.button('Done', () => this.close(), 'primary').dataset.done = '1';
      };
      const take = this.button('🧤 Take it out!', out, 'primary'); take.dataset.take = '1';
      sfx.door(); requestAnimationFrame(tick);
    };
    drawAdd();
  }

  // ------------------------------------------------------------ with the grandparents
  /** for tests: how the last thing with the grandparents went */
  last2: { what: string; ok: boolean } | null = null;
  private finish2(what: string, msg: string, data?: string) {
    this.last2 = { what, ok: true }; this.host.made2?.(what, data); this.host.save(); sfx.cheer();
    this.sub.textContent = msg; this.actions.replaceChildren();
    this.button('Done', () => this.close(), 'primary').dataset.done = '1';
  }
  /** Karate class with Mr. Master Krantz: watch the combination, then do it back. Three clean ones earn the next belt. */
  karate() {
    const b = this.host.biz, toward = nextBelt(b.belt), belt = BELTS[toward], first = b.belt < 0;
    this.show('karate', 'Tang Soo Do class', first ? 'Mr. Master Krantz: "Welcome! Bow in. Watch me, then copy me, in the same order."' : `Mr. Master Krantz: "Three clean combinations, and you earn your ${belt.name} belt!"`);
    const svg = s('svg', { viewBox: '0 0 600 250', class: 'blueprint' }) as SVGSVGElement;
    svg.append(s('rect', { x: 0, y: 0, width: 600, height: 250, rx: 18, fill: '#E9DDB8' }));
    for (let x = 0; x < 600; x += 100) svg.append(s('rect', { x: x + 2, y: 2, width: 96, height: 246, rx: 6, fill: 'none', stroke: '#CDBF93', 'stroke-width': 3 }));   // tatami mats
    const big = s('g') as SVGGElement; at(big, 300, 112); svg.append(big);
    const slots = s('g') as SVGGElement; svg.append(slots);
    const beltBar = s('rect', { x: 230, y: 214, width: 140, height: 18, rx: 5, fill: belt.color, stroke: '#2B3F55', 'stroke-width': 2 });
    svg.append(beltBar);
    this.stage.append(svg);
    const strip = h('div', 'strip'); this.stage.append(strip);
    let round = 0, want: KMove[] = [], done: KMove[] = [], turn = false, timers: number[] = [];
    const later = (ms: number, f: () => void) => { timers.push(window.setTimeout(() => { if (this.screen === 'karate') f(); }, ms)); };
    this.cleanup = () => { for (const t of timers) clearTimeout(t); timers = []; };
    const icon = (m: KMove, k = 1) => {
      const g = s('g') as SVGGElement, mv = MOVES.find(q => q.id === m)!;
      g.append(s('circle', { cx: 0, cy: 0, r: 52 * k, fill: mv.color, stroke: '#FFFFFF', 'stroke-width': 6 * k }));
      const p = (d: string, fill = '#FFFFFF') => g.append(s('path', { d, fill, stroke: '#2B3F55', 'stroke-width': 3 * k, 'stroke-linejoin': 'round', transform: `scale(${k})` }));
      if (m === 'punch') { p('M-26,-18 h40 a12,12 0 0 1 12,12 v20 a12,12 0 0 1 -12,12 h-40 a10,10 0 0 1 -10,-10 v-24 a10,10 0 0 1 10,-10 z'); p('M-12,-18 v10 M2,-18 v10', 'none'); }
      else if (m === 'kick') p('M-30,-30 l20,0 l8,28 l30,4 a8,8 0 0 1 0,16 l-40,-2 a8,8 0 0 1 -7,-6 z');
      else if (m === 'block') p('M-34,8 l58,-34 a8,8 0 0 1 10,14 l-58,34 a8,8 0 0 1 -10,-14 z');
      else { p('M0,-36 l8,22 l24,-6 l-14,20 l20,14 l-24,2 l2,24 l-16,-18 l-16,18 l2,-24 l-24,-2 l20,-14 l-14,-20 l24,6 z', '#FFF4C2'); g.append(s('text', { x: 0, y: 9 * k, 'text-anchor': 'middle', 'font-size': 26 * k, 'font-weight': 900, fill: '#2B3F55' }, )); (g.lastChild as SVGTextElement).textContent = '!'; }
      return g;
    };
    const showSlots = () => {
      slots.replaceChildren();
      const n = want.length, gap = Math.min(64, 520 / n), x0 = 300 - gap * (n - 1) / 2;
      want.forEach((m, i) => {
        const g = s('g') as SVGGElement; at(g, x0 + i * gap, 30);
        if (i < done.length) g.append(icon(m, 0.32));
        else g.append(s('circle', { cx: 0, cy: 0, r: 15, fill: '#FFFFFF', opacity: 0.7, stroke: '#2B3F55', 'stroke-width': 2, 'stroke-dasharray': '4 4' }));
        slots.append(g);
      });
    };
    let slow = false;
    const demo = () => {
      turn = false; done = []; showSlots(); setButtons(false);
      strip.textContent = `Watch Mr. Master Krantz... (${round + 1}/${CLASS.rounds})`;
      const t = callTime(toward) * 1000 * (slow ? 1.35 : 1);   // (after a miss, Mr. Master Krantz shows it again more slowly)
      want.forEach((m, i) => later(500 + i * t, () => {
        big.replaceChildren(icon(m)); call(m); strip.textContent = MOVES.find(q => q.id === m)!.call;
        later(t * 0.7, () => big.replaceChildren());
      }));
      later(500 + want.length * t + 200, () => { turn = true; setButtons(true); strip.textContent = 'Your turn! Same moves, same order.'; });
    };
    const call = (m: KMove) => {   // a little sound for each move
      if (m === 'punch') { audio.noise(0.06, 0.35, 1600); audio.tone('square', 220, 150, 0.06, 0.04); }
      else if (m === 'kick') { audio.noise(0.12, 0.3, 900); audio.tone('sine', 300, 120, 0.12, 0.08); }
      else if (m === 'block') { audio.noise(0.05, 0.3, 3000); audio.tone('triangle', 500, 400, 0.06, 0.05); }
      else { audio.tone('sawtooth', 520, 700, 0.18, 0.06); audio.tone('square', 780, 1040, 0.14, 0.04, 0.05); }
    };
    const start = () => { want = combo(toward); slow = false; demo(); };
    const press = (m: KMove) => {
      if (!turn) return;
      done.push(m); call(m); big.replaceChildren(icon(m, 0.8)); showSlots();
      const r = check(want, done);
      if (r === 'miss') {
        turn = false; setButtons(false); sfx.boing(); slow = true; strip.textContent = 'Mr. Master Krantz: "Not quite. Watch again, slowly!"';
        later(1100, demo);
      } else if (r === 'done') {
        turn = false; setButtons(false); round++; sfx.sparkle(); strip.textContent = `Mr. Master Krantz: "Good!" (${round}/${CLASS.rounds})`;
        if (round >= CLASS.rounds) { later(600, () => this.finish2('belt', `Mr. Master Krantz ties on your ${belt.name} belt. ${first ? 'Welcome to the dojo! ' : ''}You bow. Kamsahamnida! 🥋`, belt.id)); return; }
        later(1100, start);
      }
    };
    const btns = MOVES.map(m => { const bt = this.button(m.id === 'kiai' ? 'Kihap!' : m.name, () => press(m.id)); bt.dataset.move = m.id; bt.style.background = m.color; bt.style.color = '#fff'; return bt; });
    const setButtons = (on: boolean) => { for (const bt of btns) bt.disabled = !on; };
    setButtons(false);   // (until Mr. Master Krantz has shown the first combination)
    // (the low belts don't use the kiai yet)
    if (toward < 2) btns[3].hidden = true;
    later(600, start);
    this.karateWant = () => [...want];
  }
  /** For tests: the combination being called. */
  karateWant: () => KMove[] = () => [];
  /** Nonna's pizzelle: batter on the iron, close the lid, open it when it stops steaming (golden). */
  pizzelle() {
    this.show('pizzelle', 'Pizzelle with Nonna', 'Nonna: "A spoon of batter in the middle, close the iron, and open it when the steam stops!"');
    const svg = s('svg', { viewBox: '0 0 600 260', class: 'blueprint' }) as SVGSVGElement;
    svg.append(s('rect', { x: 0, y: 0, width: 600, height: 260, rx: 18, fill: '#FFF4DA' }));
    const iron = s('g') as SVGGElement; at(iron, 300, 140);
    const plate = s('circle', { cx: 0, cy: 0, r: 90, fill: '#5B6472', stroke: '#2B3F55', 'stroke-width': 5 });
    const batter = s('circle', { cx: 0, cy: 0, r: 0, fill: '#F2E2B6' });
    const lid = s('ellipse', { cx: 0, cy: -10, rx: 96, ry: 0, fill: '#3E4A5A', stroke: '#2B3F55', 'stroke-width': 5 });
    const steam = s('g') as SVGGElement;
    iron.append(plate, batter, s('rect', { x: 90, y: -8, width: 120, height: 16, rx: 8, fill: '#2B3F55' }), lid, steam);
    svg.append(iron); this.stage.append(svg);
    const strip = h('div', 'strip'); this.stage.append(strip); strip.textContent = 'Step 1: the batter';
    let made = 0, closedAt = 0, timer = 0;
    const GOLD = 2.4;
    const pour = this.button('🥄 Batter on the iron', () => {
      batter.setAttribute('r', '62'); sfx.pop(); pour.disabled = true; close.disabled = false; strip.textContent = 'Step 2: close the iron';
    }, 'primary'); pour.dataset.pour = '1';
    const close = this.button('⬇️ Close the iron', () => {
      lid.setAttribute('ry', '88'); sfx.snap(); close.disabled = true; open.disabled = false; closedAt = performance.now(); strip.textContent = 'Sizzle... open it when the steam stops!';
      const puff = () => {
        if (this.screen !== 'pizzelle' || !closedAt) return;
        const t = (performance.now() - closedAt) / 1000;
        if (t < GOLD - 0.3) { const c = s('circle', { cx: (Math.random() - 0.5) * 120, cy: -60, r: 12, fill: '#FFFFFF', opacity: 0.8 }); steam.append(c); setTimeout(() => c.remove(), 500); }
        timer = window.setTimeout(puff, 150);
      };
      puff();
    }); close.disabled = true; close.dataset.close = '1';
    const open = this.button('⬆️ Open it!', () => {
      const t = (performance.now() - closedAt) / 1000; closedAt = 0; clearTimeout(timer); lid.setAttribute('ry', '0');
      const ok = t >= GOLD - 0.6 && t <= GOLD + 1.4;
      batter.setAttribute('fill', t < GOLD - 0.6 ? '#F7EBCB' : t > GOLD + 1.4 ? '#8A5A3B' : '#E3B061');
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; iron.append(s('circle', { cx: Math.cos(a) * 34, cy: Math.sin(a) * 34, r: 9, fill: 'none', stroke: '#C9874A', 'stroke-width': 2 })); }
      open.disabled = true;
      if (ok) { made++; sfx.sparkle(); }
      else sfx.boing();
      strip.textContent = ok ? `A perfect pizzelle! (${made}/3)` : t < GOLD ? 'Too soon: still pale. Nonna: "Patience!"' : 'A little dark. Nonna: "Still delicious!"';
      if (made >= 3) { this.finish2('pizzelle', 'Nonna: "Bravo! Now you know my pizzelle. Bake them in your bakery!" 🧇 You learned Nonna\'s pizzelle.'); return; }
      setTimeout(() => { if (this.screen !== 'pizzelle') return; batter.setAttribute('r', '0'); batter.setAttribute('fill', '#F2E2B6'); pour.disabled = false; strip.textContent = `Another! (${made}/3 perfect)`; }, 900);
    }); open.disabled = true; open.dataset.open = '1';
  }
  /** Poppop's birdhouse: tap each nail to hammer it in (three taps a nail). */
  birdhouse() {
    this.show('birdhouse', 'A birdhouse with Poppop', 'Poppop: "Hold it steady, I\'ll hold the board. Tap each nail to hammer it in!"');
    const svg = s('svg', { viewBox: '0 0 600 280', class: 'blueprint' }) as SVGSVGElement;
    svg.append(s('rect', { x: 0, y: 0, width: 600, height: 280, rx: 18, fill: '#FFF4DA' }),
      s('path', { d: 'M180,120 L300,40 L420,120 Z', fill: '#B9895A', stroke: '#2B3F55', 'stroke-width': 4 }),
      s('rect', { x: 200, y: 120, width: 200, height: 140, fill: '#D9A066', stroke: '#2B3F55', 'stroke-width': 4 }),
      s('circle', { cx: 300, cy: 170, r: 24, fill: '#5A3A22' }), s('rect', { x: 290, y: 205, width: 20, height: 6, fill: '#8A5A3B' }));
    const spots = [[215, 135], [385, 135], [215, 245], [385, 245], [250, 92], [350, 92]];
    let done = 0;
    spots.forEach(([x, y], i) => {
      const g = s('g') as SVGGElement; at(g, x, y); g.dataset.nail = String(i); g.style.cursor = 'pointer';
      const head = s('rect', { x: -7, y: -30, width: 14, height: 6, rx: 2, fill: '#9AA6B2', stroke: '#2B3F55', 'stroke-width': 2 }), shaft = s('rect', { x: -2, y: -24, width: 4, height: 24, fill: '#9AA6B2' });
      g.append(s('circle', { cx: 0, cy: -14, r: 26, fill: 'transparent' }), shaft, head); svg.append(g);
      let hits = 0;
      g.addEventListener('click', () => {
        if (hits >= 3) return; hits++; sfx.snap(); audio.noise(0.06, 0.4, 1800);
        const down = hits * 8; head.setAttribute('y', String(-30 + down)); shaft.setAttribute('height', String(Math.max(0, 24 - down)));
        if (hits === 3) { done++; if (done === spots.length) this.finish2('birdhouse', 'Poppop: "Look at that! A real birdhouse." 🐦 It\'s up in your garden, by your house.'); }
      });
    });
    this.stage.append(svg);
  }
  /** The CNC router: pick a design, and watch it carve the sign. */
  cnc() {
    this.show('cnc', 'The CNC router', 'Poppop: "Pick a design, and the machine carves it into the wood all by itself!"');
    const designs: [string, string][] = [['⭐ A star', 'M300,40 L330,120 L415,120 L346,170 L372,250 L300,200 L228,250 L254,170 L185,120 L270,120 Z'],
      ['❤️ A heart', 'M300,250 C180,170 190,70 260,70 C285,70 300,90 300,110 C300,90 315,70 340,70 C410,70 420,170 300,250 Z'],
      ['🚀 A rocket', 'M300,40 C340,80 345,150 330,210 L270,210 C255,150 260,80 300,40 Z M270,180 L235,240 L270,215 Z M330,180 L365,240 L330,215 Z']];
    designs.forEach(([label, d]) => {
      const b = this.button(label, () => {
        this.actions.replaceChildren(); this.stage.replaceChildren();
        const svg = s('svg', { viewBox: '0 0 600 290', class: 'blueprint' }) as SVGSVGElement;
        svg.append(s('rect', { x: 0, y: 0, width: 600, height: 290, rx: 18, fill: '#2C3440' }), s('rect', { x: 150, y: 20, width: 300, height: 250, rx: 10, fill: '#D9A066' }));
        const cut = s('path', { d, fill: 'none', stroke: '#8A5A3B', 'stroke-width': 9, 'stroke-linejoin': 'round' }) as SVGPathElement;
        const bit = s('circle', { r: 9, fill: '#C9D3DC', stroke: '#FFFFFF', 'stroke-width': 3 });
        svg.append(cut, bit); this.stage.append(svg);
        const L = cut.getTotalLength?.() || 800; cut.style.strokeDasharray = `${L}`; cut.style.strokeDashoffset = `${L}`;
        const t0 = performance.now(), T = 3500; sfx.roll();
        const step = () => {
          if (this.screen !== 'cnc') return;
          const k = Math.min(1, (performance.now() - t0) / T); cut.style.strokeDashoffset = `${L * (1 - k)}`;
          const p = cut.getPointAtLength?.(L * k); if (p) { bit.setAttribute('cx', String(p.x)); bit.setAttribute('cy', String(p.y)); }
          if (k < 1) requestAnimationFrame(step); else this.finish2('sign', `Poppop: "Beautiful work." Your carved ${label.split(' ').slice(1).join(' ')} sign is on the wall at home.`, label.split(' ')[0]);
        };
        requestAnimationFrame(step);
      });
      b.dataset.design = label.split(' ')[0];
    });
  }
  /** The plasma cutter: hold the button to cut round the star; sparks fly. */
  plasma() {
    this.show('plasma', 'The plasma cutter', 'Poppop: "Safety glasses on! Hold the button to cut the metal, all the way round."');
    const svg = s('svg', { viewBox: '0 0 600 290', class: 'blueprint' }) as SVGSVGElement;
    svg.append(s('rect', { x: 0, y: 0, width: 600, height: 290, rx: 18, fill: '#2C3440' }), s('rect', { x: 150, y: 20, width: 300, height: 250, rx: 6, fill: '#9AA6B2' }));
    const d = 'M300,40 L330,120 L415,120 L346,170 L372,250 L300,200 L228,250 L254,170 L185,120 L270,120 Z';
    svg.append(s('path', { d, fill: 'none', stroke: '#5B6472', 'stroke-width': 3, 'stroke-dasharray': '8 6' }));
    const cut = s('path', { d, fill: 'none', stroke: '#FFB03A', 'stroke-width': 5 }) as SVGPathElement;
    const torch = s('circle', { r: 8, fill: '#FFFFFF' }), sparks = s('g') as SVGGElement;
    svg.append(cut, torch, sparks); this.stage.append(svg);
    const strip = h('div', 'strip'); this.stage.append(strip); strip.textContent = 'Hold to cut: 0%';
    const L = cut.getTotalLength?.() || 900; cut.style.strokeDasharray = `${L}`; cut.style.strokeDashoffset = `${L}`;
    let k = 0, holding = false, last = 0;
    const hold = this.button('⚡ Hold to cut', () => {}, 'primary'); hold.dataset.cut = '1';
    const tick = (now: number) => {
      if (this.screen !== 'plasma') return;
      const dt = last ? (now - last) / 1000 : 0; last = now;
      if (holding && k < 1) {
        k = Math.min(1, k + dt / 4); cut.style.strokeDashoffset = `${L * (1 - k)}`;
        const p = cut.getPointAtLength?.(L * k);
        if (p) { torch.setAttribute('cx', String(p.x)); torch.setAttribute('cy', String(p.y));
          for (let i = 0; i < 2; i++) { const sp = s('circle', { cx: p.x, cy: p.y, r: 2.5, fill: '#FFE066' }); sparks.append(sp); const a = Math.random() * Math.PI * 2, v = 30 + Math.random() * 40;
            sp.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${Math.cos(a) * v}px, ${Math.sin(a) * v + 20}px)`, opacity: 0 }], { duration: 400 }); setTimeout(() => sp.remove(), 400); } }
        strip.textContent = `Hold to cut: ${Math.round(k * 100)}%`;
        if (k >= 1) { holding = false; this.finish2('metalstar', 'Poppop: "Now THAT is a star." ⭐ Your metal star is up on the wall at home.'); return; }
      }
      requestAnimationFrame(tick);
    };
    const on = (e: Event) => { e.preventDefault(); holding = true; audio.noise(0.3, 0.15, 5000); }, off = () => { holding = false; };
    hold.addEventListener('pointerdown', on); hold.addEventListener('pointerup', off); hold.addEventListener('pointerleave', off);
    requestAnimationFrame(tick);
  }
  /** Yia-Yia's easel: finger-paint on a canvas, then hang it up. */
  paint() {
    this.show('paint', 'Paint with Yia-Yia', 'Yia-Yia: "Pick a colour and paint with your finger. Anything you like!"');
    const cv = document.createElement('canvas'); cv.width = 600; cv.height = 400; cv.className = 'canvas';
    cv.style.cssText = 'width:100%;max-height:calc(100vh - 300px);aspect-ratio:3/2;background:#FFFFFF;border-radius:12px;touch-action:none;display:block;box-shadow:0 0 0 4px #E9DCC7';
    const c = cv.getContext('2d')!; c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, 600, 400); c.lineCap = c.lineJoin = 'round';
    this.stage.append(cv);
    const pal = h('div', 'picks shells'); this.stage.append(pal);
    let color = '#E5484D', size = 14, down = false, lx = 0, ly = 0, strokes = 0;
    for (const col of ['#E5484D', '#F28C38', '#F9C846', '#3BB273', '#2F7FD8', '#7B5BA6', '#8A5A3B', '#2B3F55', '#FFFFFF']) {
      const b = h('button'); b.type = 'button'; b.dataset.color = col; b.innerHTML = `<span class="dot" style="background:${col}"></span>`;
      b.addEventListener('click', () => { color = col; for (const q of Array.from(pal.children)) q.classList.toggle('on', q === b); }); pal.append(b);
    }
    for (const [label, sz] of [['thin', 6], ['thick', 14], ['huge', 34]] as [string, number][]) { const b = h('button', '', label); b.type = 'button'; b.addEventListener('click', () => { size = sz; }); pal.append(b); }
    (pal.children[0] as HTMLElement).classList.add('on');
    const xy = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * 600 / r.width, (e.clientY - r.top) * 400 / r.height]; };
    cv.addEventListener('pointerdown', e => { down = true; [lx, ly] = xy(e); c.fillStyle = color; c.beginPath(); c.arc(lx, ly, size / 2, 0, Math.PI * 2); c.fill(); strokes++; });
    const move = (e: PointerEvent) => { if (!down) return; const [x, y] = xy(e); c.strokeStyle = color; c.lineWidth = size; c.beginPath(); c.moveTo(lx, ly); c.lineTo(x, y); c.stroke(); lx = x; ly = y; };
    const up = () => { down = false; };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    this.cleanup = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    this.button('🧽 Start over', () => { c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, 600, 400); strokes = 0; }).dataset.clear = '1';
    this.button('🖼️ Hang it up!', () => {
      if (!strokes) { this.sub.textContent = 'Yia-Yia: "Paint something first, my darling!"'; return; }
      const small = document.createElement('canvas'); small.width = 240; small.height = 160; small.getContext('2d')!.drawImage(cv, 0, 0, 240, 160);
      this.cleanup?.(); this.cleanup = null; cv.style.pointerEvents = 'none'; pal.remove();
      this.finish2('painting', 'Yia-Yia: "Magnifico! It goes on the wall." 🖼️ Your painting is hanging in the studio (and at home).', small.toDataURL('image/jpeg', 0.8));
    }, 'primary').dataset.hang = '1';
  }
}
