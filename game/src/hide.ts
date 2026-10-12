// Hide-and-seek with Primo round the playground and the park (the user, 2026-10-12: "Build on all three of those
// games"). Two ways round:
//  - you seek: close your eyes and count to ten (no peeking!) while Primo hides: behind Burger Barn, behind a tree, the
//    slide, the swings, the fountain, crouched behind a bench or down in the flowers. Then find him: he giggles now and
//    then, and you can tell when you're getting warmer.
//  - you hide: Primo counts with his eyes shut while you pick a hiding spot. Then he goes looking, checking the spots
//    one by one. Out in the open, he'll see you straight away. Last the whole minute and you win.
// Pure: main.ts runs it (Primo's moves, the screen, the hints).
export interface HideSpot { id: string; name: string; x: number; y: number; crouch?: boolean }
export const SPOTS: HideSpot[] = [
  { id: 'burger', name: 'behind Burger Barn', x: 1645, y: 1396 },
  { id: 'tree', name: 'behind the big tree', x: 1905, y: 1296 },
  { id: 'slide', name: 'behind the slide', x: 2045, y: 1456, crouch: true },
  { id: 'swings', name: 'behind the swings', x: 2590, y: 1474 },
  { id: 'fountain', name: 'behind the fountain', x: 2700, y: 1792, crouch: true },
  { id: 'bench', name: 'behind the bench', x: 2380, y: 2016, crouch: true },
  { id: 'flowers', name: 'down in the flowers', x: 2620, y: 2036, crouch: true },
];
export const HIDE = { count: 10, seek: 90, found: 110, giggle: [7, 11] as [number, number], speed: 160, look: 1.4, sees: 170, atSpot: 80, hide: 60, start: [2300, 1610] as [number, number] };
export type Kind = 'seek' | 'hide';
export type Result = 'found' | 'gaveup' | 'caught' | 'safe';
export const warmth = (d: number) => (d < 260 ? 'hot' : d < 600 ? 'warm' : 'cold');

export class HideSeek {
  phase: 'count' | 'play' | 'done' = 'count'; count = HIDE.count; time = 0; result: Result | null = null;
  spot: HideSpot | null = null;   // where Primo is hiding (you seek)
  primo: { x: number; y: number; vx: number; vy: number; looking: number }; order: HideSpot[] = []; checking: HideSpot | null = null; checked: string[] = [];
  private giggleIn: number;
  constructor(readonly kind: Kind, private rnd: () => number = Math.random, spotIndex?: number) {
    const [x, y] = HIDE.start; this.primo = { x, y, vx: 0, vy: 0, looking: 0 };
    if (kind === 'seek') this.spot = SPOTS[spotIndex ?? Math.floor(this.rnd() * SPOTS.length)];
    else { this.order = [...SPOTS]; for (let i = this.order.length - 1; i > 0; i--) { const j = Math.floor(this.rnd() * (i + 1)); [this.order[i], this.order[j]] = [this.order[j], this.order[i]]; } }
    this.giggleIn = this.gap();
  }
  private gap() { const [a, b] = HIDE.giggle; return a + this.rnd() * (b - a); }
  /** Is Nico tucked into a hiding spot (and which)? */
  static spotAt(x: number, y: number) { return SPOTS.find(s => Math.hypot(s.x - x, s.y - y) < HIDE.atSpot) ?? null; }
  update(dt: number, nx: number, ny: number): string[] {
    const ev: string[] = []; const p = this.primo; p.vx = p.vy = 0;
    if (this.phase === 'done') return ev;
    if (this.phase === 'count') {
      const before = Math.ceil(this.count); this.count -= dt;
      if (Math.ceil(this.count) !== before && this.count > 0) ev.push('tick');
      if (this.count <= 0) { this.phase = 'play'; ev.push('go'); if (this.spot) { p.x = this.spot.x; p.y = this.spot.y; } }
      return ev;
    }
    this.time += dt;
    if (this.kind === 'seek') {
      const s = this.spot!;
      if (Math.hypot(nx - s.x, ny - s.y) < HIDE.found) { this.end('found', ev); return ev; }
      if ((this.giggleIn -= dt) <= 0) { this.giggleIn = this.gap(); ev.push('giggle'); }
      if (this.time >= HIDE.seek) this.end('gaveup', ev);
      return ev;
    }
    // Primo seeks: out in the open, he sees you; in a spot, only when he checks that one
    const hidden = HideSeek.spotAt(nx, ny);
    if (!hidden && Math.hypot(nx - p.x, ny - p.y) < HIDE.sees) { this.end('caught', ev); return ev; }
    if (p.looking > 0) {
      p.looking -= dt;
      if (p.looking <= 0) { if (this.checking && hidden?.id === this.checking.id) { this.end('caught', ev); return ev; } this.checked.push(this.checking!.id); this.checking = null; ev.push('notHere'); }
    } else {
      if (!this.checking) { this.checking = this.order.find(s => !this.checked.includes(s.id)) ?? null; if (!this.checking) { this.end('safe', ev); return ev; } }
      const s = this.checking, dx = s.x - p.x, dy = s.y - p.y, d = Math.hypot(dx, dy), step = HIDE.speed * dt;
      if (d <= step) { p.x = s.x; p.y = s.y; p.looking = HIDE.look; ev.push('peek'); }
      else { p.x += dx / d * step; p.y += dy / d * step; p.vx = dx / d * HIDE.speed; p.vy = dy / d * HIDE.speed; }
    }
    if (this.time >= HIDE.hide) this.end('safe', ev);
    return ev;
  }
  private end(r: Result, ev: string[]) { this.phase = 'done'; this.result = r; ev.push(r); }
  get won() { return this.result === 'found' || this.result === 'safe'; }
}
