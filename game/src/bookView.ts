// The sticker book on screen: a page per collection, tabs along the top, each sticker drawn from the
// game's own art (the host turns an Art into a picture), empty slots as dashed outlines that tell you
// where to look. A full page has a reward to collect. Data and rules: book.ts.
import { PAGES, filled, complete, claimed, claim, totals, type Art, type Page } from './book';
import type { Biz } from './business';

export interface BookHost { biz: Biz; art(a: Art): string; pay(n: number): void; prize?(page: string): void; opened(on: boolean): void; save(): void }

const h = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };

export class BookView {
  readonly el: HTMLElement;
  page = 0;
  private panel: HTMLElement; private hint!: HTMLElement;

  constructor(private host: BookHost) {
    this.el = h('div', 'modal book'); this.el.id = 'book'; this.el.hidden = true;
    this.panel = h('div', 'book-panel'); this.panel.setAttribute('role', 'dialog');
    this.el.append(this.panel); document.body.append(this.el);
    this.el.addEventListener('click', e => { if (e.target === this.el) this.close(); });
  }
  get isOpen() { return !this.el.hidden; }
  open(page?: string) {
    if (page) this.page = Math.max(0, PAGES.findIndex(p => p.id === page));
    else { const i = PAGES.findIndex(p => complete(this.host.biz, p) && !claimed(this.host.biz, p)); if (i >= 0) this.page = i; }   // (a reward waiting: open there)
    if (this.el.hidden) { this.el.hidden = false; this.host.opened(true); }
    this.draw();
  }
  close() { if (this.el.hidden) return; this.el.hidden = true; this.host.opened(false); }

  private draw() {
    const b = this.host.biz, p: Page = PAGES[this.page], t = totals(b);
    const top = h('div', 'book-top'), title = h('h2', '', "Nico's Sticker Book"), count = h('span', 'book-count', `${t.got} / ${t.all} stickers`);
    const close = h('button', 'close', '✕'); close.type = 'button'; close.setAttribute('aria-label', 'Close'); close.onclick = () => this.close();
    top.append(title, count, close);
    const tabs = h('div', 'book-tabs');
    PAGES.forEach((q, i) => {
      const tb = h('button', `book-tab${i === this.page ? ' on' : ''}${complete(b, q) ? ' full' : ''}`); tb.type = 'button'; tb.dataset.page = q.id;
      tb.append(h('span', '', q.title), h('small', '', complete(b, q) ? (claimed(b, q) ? '✓' : '$!') : `${filled(b, q)}/${q.entries.length}`));
      tb.onclick = () => { this.page = i; this.draw(); };
      tabs.append(tb);
    });
    const page = h('div', 'book-page');
    const head = h('h3', '', p.title); head.append(h('small', '', `  ${filled(b, p)} of ${p.entries.length}`));
    const grid = h('div', 'book-grid');
    this.hint = h('p', 'book-hint', 'Tap an empty space to see where to look.');
    for (const e of p.entries) {
      const n = e.has(b), s = h('button', `sticker ${n ? 'has' : 'empty'}`); s.type = 'button'; s.dataset.id = e.id;
      if (n) {
        const img = h('img'); img.src = this.host.art(e.art); img.alt = e.label; s.append(img);
        if (p.id === 'animals') s.append(h('span', 'stars', '★'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n))));
      } else s.append(h('span', 'q', '?'));
      s.append(h('span', 'name', n ? e.label : '???'));
      s.onclick = () => { this.hint.textContent = n ? `${e.label}: got it!${p.id === 'animals' && n < 3 ? ' (a better photo gets more stars)' : ''}` : `${e.hint}`; };
      grid.append(s);
    }
    const foot = h('div', 'book-foot');
    if (complete(b, p) && !claimed(b, p)) {
      const c = h('button', 'primary', `Page complete! Collect $${p.reward}${p.prize ? ` and ${p.prize}` : ''}`); c.type = 'button'; c.dataset.claim = p.id;
      c.onclick = () => { const n = claim(b, p.id); if (n) { this.host.pay(n); if (p.prize) this.host.prize?.(p.id); this.host.save(); } this.draw(); };
      foot.append(c);
    } else foot.append(h('span', 'book-reward', claimed(b, p) ? `Page complete ✓ (you collected $${p.reward}${p.prize ? ` and ${p.prize}` : ''})` : `Fill this page: $${p.reward}${p.prize ? ` + ${p.prize}` : ''}`));
    const prev = h('button', 'book-nav', '◀'), next = h('button', 'book-nav', '▶'); prev.type = next.type = 'button';
    prev.onclick = () => { this.page = (this.page + PAGES.length - 1) % PAGES.length; this.draw(); };
    next.onclick = () => { this.page = (this.page + 1) % PAGES.length; this.draw(); };
    foot.prepend(prev); foot.append(next);
    page.append(head, grid, this.hint, foot);
    this.panel.replaceChildren(top, tabs, page);
  }
}
