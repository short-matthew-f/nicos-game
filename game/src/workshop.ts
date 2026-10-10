// The workshop screens (v2): the storage auction, opening a unit, building the toy car by
// dragging parts onto the blueprint, the ramp test, and the quick repeat build. Plain DOM +
// inline SVG over the game (the world is paused behind it, like the cards). The rules live
// in business.ts; this file is the hands-on part. See docs/UX_NOTES.md for the feel rules.
import {
  item, lineup, guess, worth, sellPrice, buyUnit, sellOne, use, has, unlocks, CAR_RECIPE, RAMP,
  type Biz, type Unit, type Skill,
} from './business';
import { sfx } from './sound';

export interface WorkHost {
  biz: Biz;
  money(): number;
  setMoney(n: number): void;           // shows it and saves
  save(): void;
  toast(msg: string): void;
  opened(on: boolean): void;           // pause the world while a screen is up
  skill(s: Skill): void;               // a new skill was earned
  wanted(): string | null;             // an item someone asked Nico to find
}

const SVG = 'http://www.w3.org/2000/svg';
const h = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') => {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e;
};
const s = (tag: string, attrs: Record<string, string | number> = {}) => {
  const e = document.createElementNS(SVG, tag); for (const k in attrs) e.setAttribute(k, String(attrs[k])); return e;
};
const emoji = (id: string) => item(id).label.split(' ')[0];
const name = (id: string) => item(id).label.split(' ').slice(1).join(' ');
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

// ---- the toy car's blueprint (top-down, nose to the right) and its parts
export interface Slot { id: string; kind: string; x: number; y: number; needs: string[] }   // needs: slots that must be filled first
export const SLOTS: Slot[] = [
  { id: 'axle0', kind: 'axle', x: 235, y: 150, needs: [] },
  { id: 'axle1', kind: 'axle', x: 365, y: 150, needs: [] },
  { id: 'wheel0', kind: 'wheel', x: 235, y: 62, needs: ['axle0'] },
  { id: 'wheel1', kind: 'wheel', x: 235, y: 238, needs: ['axle0'] },
  { id: 'wheel2', kind: 'wheel', x: 365, y: 62, needs: ['axle1'] },
  { id: 'wheel3', kind: 'wheel', x: 365, y: 238, needs: ['axle1'] },
  { id: 'body', kind: 'body', x: 300, y: 150, needs: ['axle0', 'axle1'] },
];
export const SNAP = { at: 80, keep: 100 };   // snaps within `at` of a slot, and stays snapped until `keep` (no flicker)
const LIFT = 46;                              // a picked-up part rides this far above the finger, so it isn't hidden

function partArt(kind: string): SVGGElement {
  const g = s('g') as SVGGElement;
  if (kind === 'axle') {
    g.append(s('rect', { x: -6, y: -92, width: 12, height: 184, rx: 6, fill: '#9AA6B2', stroke: '#2B3F55', 'stroke-width': 3 }));
  } else if (kind === 'wheel') {
    g.append(s('rect', { x: -26, y: -15, width: 52, height: 30, rx: 10, fill: '#2C3E52', stroke: '#1B2733', 'stroke-width': 3 }),
      s('rect', { x: -12, y: -6, width: 24, height: 12, rx: 4, fill: '#C9D3DC' }));
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
  lastRun: { height: number; passed: boolean } | null = null;
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

  // ------------------------------------------------------------ the auction
  auction() {
    const b = this.host.biz, ap = b.skills.includes('appraiser');
    const units = lineup(b.seed, b.flips === 0, this.host.wanted());
    this.show('auction', 'Storage unit auction', ap ? '🔍 Appraiser: your guesses are spot on.'
      : units.length === 1 ? 'Just one unit up today: a good one to start with. More next time! The guess is what the stuff inside might sell for.'
      : 'Peek through the doors. The price is on the tag; the guess is what the stuff inside might sell for.');
    for (const u of units) {
      const card = h('div', 'lot'); card.dataset.unit = u.name;
      const door = h('div', 'door'); door.append(h('span', 'peek', [...u.peek.map(emoji), '❓'].join(' ')));
      const [lo, hi] = guess(u, ap || !!u.starter);   // the starter's guess is a close one: no scary low end on the first buy
      card.append(door, h('div', 'uname', `Unit ${u.name} · ${u.size}`), h('div', 'guess', `Worth about $${lo}–$${hi}`));
      if (u.starter) card.append(h('div', 'tag', '⭐ Good first buy'));
      const want = this.host.wanted();
      if (want && u.contents.some(c => c.id === want)) { card.append(h('div', 'tag', `⭐ There's ${item(want).label} inside!`)); card.dataset.wanted = '1'; }
      const buy = h('button', 'primary', `Buy $${u.price}`); buy.type = 'button'; buy.dataset.buy = u.name;
      const short = u.price - this.host.money();
      if (short > 0) { buy.disabled = true; buy.textContent = `$${u.price} (need $${short} more)`; }
      // two taps to spend money: the first one asks
      let armed = -Infinity;
      buy.addEventListener('click', () => {
        if (performance.now() - armed > 3000) { armed = performance.now(); buy.textContent = `Tap again: buy for $${u.price}`; buy.classList.add('sure'); sfx.tap(); return; }
        if (!buyUnit(b, u, this.host.money())) return;
        this.host.setMoney(this.host.money() - u.price);
        this.openUnit(u);
      });
      card.append(buy);
      this.stage.append(card);
    }
    this.button('Not today', () => this.close());
  }

  // ------------------------------------------------------------ opening a unit
  /** Everything's already Nico's (buyUnit); here he sees it and picks what to sell. */
  async openUnit(u: Unit) {
    const b = this.host.biz, ap = b.skills.includes('appraiser');
    this.show('unit', `Unit ${u.name}: it's yours!`, 'Tap the boxes to open them.');
    const door = h('div', 'rolldoor'); this.stage.append(door);
    const grid = h('div', 'finds'); this.stage.append(grid);
    sfx.door();
    requestAnimationFrame(() => door.classList.add('up'));
    const want = this.host.wanted();
    const sell: boolean[] = u.contents.map(c => item(c.id).kind === 'find' && c.id !== want);   // finds sell; parts and wanted things are kept (can change)
    const open: boolean[] = u.contents.map(() => false);
    const tiles: HTMLElement[] = [];
    const total = () => u.contents.reduce((t, c, i) => t + (sell[i] && open[i] ? sellPrice(c.value, ap) : 0), 0);
    const done = this.button('Open them all', () => openAll());
    const refresh = () => {
      const n = open.filter(Boolean).length, all = n === u.contents.length;
      const ns = sell.filter((x, i) => x && open[i]).length, nk = n - ns;
      done.textContent = all ? (ns ? `Sell ${ns} for $${total()}${nk ? ` · keep ${nk}` : ''}` : `Keep all ${nk}`) : 'Open them all';
      done.className = all ? 'primary' : '';
      this.sub.textContent = all ? `Worth $${worth(u)} in all (you paid $${u.price}). Tap a find to switch between Sell and Keep.` : 'Tap the boxes to open them.';
    };
    const reveal = async (i: number) => {
      if (open[i] || this.screen !== 'unit') return;
      open[i] = true;
      const c = u.contents[i], rare = c.value >= 10, t = tiles[i];
      t.classList.add('opening'); sfx.pop();
      await wait(rare ? 380 : 140);
      if (this.screen !== 'unit') return;
      if (rare) sfx.sparkle();
      t.classList.remove('box', 'opening'); t.classList.add('open'); if (rare) t.classList.add('rare');
      t.replaceChildren(h('div', 'big', emoji(c.id)), h('div', 'nm', name(c.id)), h('div', 'val', `$${sellPrice(c.value, ap)}`), h('div', 'choice'));
      choice(i); refresh();
    };
    const choice = (i: number) => {
      const t = tiles[i], el = t.querySelector('.choice')!;
      el.textContent = sell[i] ? '💰 Sell' : u.contents[i].id === want ? '⭐ Keep: wanted!' : (item(u.contents[i].id).kind === 'part' ? '🔧 Keep (part)' : '🏠 Keep');
      t.classList.toggle('keep', !sell[i]);
    };
    u.contents.forEach((c, i) => {
      const t = h('button', 'find box'); t.type = 'button'; t.dataset.find = String(i); t.dataset.id = c.id;
      t.append(h('div', 'big', '📦'));
      t.addEventListener('click', () => {
        if (!open[i]) { void reveal(i); return; }
        sell[i] = !sell[i]; sfx.tap(); choice(i); refresh();
      });
      tiles.push(t); grid.append(t);
    });
    const openAll = async () => {
      if (open.every(Boolean)) return finish();
      for (let i = 0; i < open.length; i++) if (!open[i]) {   // quick, but one at a time
        if (this.screen !== 'unit') return;   // left halfway: stop
        await reveal(i); await wait(110);
      }
    };
    const finish = () => {
      let got = 0, n = 0;
      u.contents.forEach((c, i) => { if (sell[i] && open[i]) { got += sellOne(b, c.id, c.value); n++; } });
      if (got) { this.host.setMoney(this.host.money() + got); sfx.cash(n); }
      const profit = got - u.price;
      this.host.toast(got ? `Sold ${n} thing${n === 1 ? '' : 's'} for $${got}${profit > 0 ? ` (that's $${profit} more than you paid!)` : ''}` : 'All kept: they\'re on the shelf in your garage.');
      const skills = unlocks(b);   // (before close, which saves)
      this.close();
      for (const sk of skills) this.host.skill(sk);
    };
    done.addEventListener('click', () => { if (open.every(Boolean)) finish(); });
    await wait(650);
    refresh();
  }

  // ------------------------------------------------------------ the blueprint (shared by both builds)
  private blueprint(): { svg: SVGSVGElement; layers: Record<string, SVGGElement>; slots: Map<string, SVGGElement> } {
    const svg = s('svg', { viewBox: '0 0 600 400', class: 'blueprint' }) as SVGSVGElement;
    svg.append(s('rect', { x: 0, y: 0, width: 600, height: 300, rx: 18, fill: '#E8F1FA' }));
    for (let x = 30; x < 600; x += 30) svg.append(s('line', { x1: x, y1: 0, x2: x, y2: 300, stroke: '#D3E2F0', 'stroke-width': 1 }));
    for (let y = 30; y < 300; y += 30) svg.append(s('line', { x1: 0, y1: y, x2: 600, y2: y, stroke: '#D3E2F0', 'stroke-width': 1 }));
    svg.append(s('rect', { x: 0, y: 300, width: 600, height: 100, rx: 18, fill: '#F6E7CF' }));   // the tray
    const slotLayer = s('g') as SVGGElement; svg.append(slotLayer);
    const layers: Record<string, SVGGElement> = {};
    for (const k of ['axle', 'wheel', 'body', 'tray', 'held']) { layers[k] = s('g') as SVGGElement; svg.append(layers[k]); }
    const slots = new Map<string, SVGGElement>();
    for (const sl of SLOTS) { const g = slotArt(sl.kind); g.classList.add('slot'); g.dataset.slot = sl.id; at(g, sl.x, sl.y); slotLayer.append(g); slots.set(sl.id, g); }
    return { svg, layers, slots };
  }

  // ------------------------------------------------------------ the first build: drag the parts on
  build() {
    this.show('build', 'Build the toy car', 'Drag the parts onto the plan. Axles first, then wheels, then the body.');
    this.filled = new Set();
    const { svg, layers, slots } = this.blueprint();
    this.stage.append(svg);
    const ready = (sl: Slot) => !this.filled.has(sl.id) && sl.needs.every(n => this.filled.has(n));
    const glow = () => { for (const sl of SLOTS) slots.get(sl.id)!.classList.toggle('ready', ready(sl)); };
    const test = this.button('Test it on the ramp →', () => this.ramp(), 'primary'); test.disabled = true;
    // the tray: one of each part the recipe needs, laid out along the bottom
    const tray: { kind: string; x: number; y: number; sc: number }[] = [
      { kind: 'axle', x: 50, y: 350, sc: 0.45 }, { kind: 'axle', x: 90, y: 350, sc: 0.45 },
      { kind: 'wheel', x: 160, y: 335, sc: 0.8 }, { kind: 'wheel', x: 160, y: 368, sc: 0.8 }, { kind: 'wheel', x: 220, y: 335, sc: 0.8 }, { kind: 'wheel', x: 220, y: 368, sc: 0.8 },
      { kind: 'body', x: 360, y: 350, sc: 0.62 },
    ];
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
        if (this.filled.size === SLOTS.length) { test.disabled = false; this.sub.textContent = 'All together! Now let\'s see if it rolls.'; sfx.cheer(); }
        return;
      }
      // not on a slot: say why if it was close to one, and slide back to the tray
      const [x, y0] = toSvg(e), y = y0 - LIFT;
      const near = SLOTS.find(q => !this.filled.has(q.id) && Math.hypot(q.x - x, q.y - y) < SNAP.at);
      if (near && near.kind !== t.kind) this.sub.textContent = `That spot is for ${near.kind === 'body' ? 'the body' : `a ${near.kind}`}.`;
      else if (near && near.kind === t.kind) this.sub.textContent = t.kind === 'wheel' ? 'Wheels go on the end of an axle: put the axles in first.' : 'The body goes on last, on top of both axles.';
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
      this.button('Done', () => { this.prototypeDone(); }, 'primary');
    };
  }
  /** The first car passed: use up the parts, remember the design, one car to sell. */
  private prototypeDone() {
    const b = this.host.biz;
    if (!b.designs.includes('car') && use(b, CAR_RECIPE)) { b.designs.push('car'); b.stock.car = (b.stock.car ?? 0) + 1; }
    this.host.save();
    this.host.toast('🚗 Toy car made! Take it to the Toy Shop to sell it.');
    this.close();
  }

  // ------------------------------------------------------------ repeat builds: three taps
  quick() {
    const b = this.host.biz;
    if (!has(b, CAR_RECIPE)) return;
    this.show('quick', 'Build a toy car', 'You know how now: three quick steps.');
    const { svg, layers, slots } = this.blueprint();
    this.stage.append(svg);
    const steps: [string, string][] = [['Fit the axles', 'axle'], ['Pop on the wheels', 'wheel'], ['Snap on the body', 'body']];
    let i = 0;
    const btn = this.button(steps[0][0], () => {
      if (i >= steps.length) return;
      const kind = steps[i][1];
      for (const sl of SLOTS) if (sl.kind === kind) {
        const g = partArt(kind); g.classList.add('part', 'placed', 'drop'); at(g, sl.x, sl.y - 40, 1); layers[kind].append(g);
        requestAnimationFrame(() => requestAnimationFrame(() => at(g, sl.x, sl.y, 1)));
        slots.get(sl.id)!.classList.add('done');
      }
      sfx.snap(); i++;
      if (i < steps.length) { btn.textContent = steps[i][0]; return; }
      use(b, CAR_RECIPE); b.stock.car = (b.stock.car ?? 0) + 1; this.host.save(); sfx.cheer();
      this.sub.textContent = `Another toy car! You have ${b.stock.car} ready to sell.`;
      btn.textContent = 'Done'; btn.onclick = () => this.close();
    }, 'primary');
    btn.dataset.step = '1';
  }
}
