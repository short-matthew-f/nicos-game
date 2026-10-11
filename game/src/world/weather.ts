// Weather and seasons (from the "what next" list: rain with puddles and umbrellas, snow in winter,
// holiday lights on the houses). The seasons turn every few in-game days; each has its own chance
// of rain (or, in winter, snow), in spells of a couple of minutes. The sky falls in screen space
// (drops, flakes, leaves), the ground gets puddles or a blanket of snow, and in winter the houses
// put up strings of coloured lights that glow after dark. The rules are pure and tested; the class
// draws them.
import { Container, Graphics } from 'pixi.js';
import { BUILDINGS, ROAD_SEGS, ROAD_W, SIDEWALK, WORLD, type Building } from './map';
import { light } from './night';

export type Sky = 'clear' | 'rain' | 'snow';
export const SEASONS = ['spring', 'summer', 'fall', 'winter'] as const;
export type Season = typeof SEASONS[number];
/** days: in-game days per season (a day is 12 minutes); start: the day a new game starts on (summer). */
export const SEASON = { days: 3, start: 3 };
export const seasonOf = (day: number): Season => SEASONS[Math.floor(day / SEASON.days) % SEASONS.length];
/** How often the sky turns: each spell lasts lo..hi seconds; the chance a spell is wet, by season. */
export const WEATHER = { spell: [80, 200] as [number, number], wet: { spring: 0.4, summer: 0.18, fall: 0.4, winter: 0.55 } as Record<Season, number> };
/** The next spell's sky. */
export function nextSky(season: Season, r: () => number = Math.random): Sky {
  if (r() >= WEATHER.wet[season]) return 'clear';
  return season === 'winter' ? 'snow' : 'rain';
}

const PUDDLES: [number, number, number][] = (() => {   // spots by the roads where water collects (x, y, size)
  let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const out: [number, number, number][] = [];
  for (const r of ROAD_SEGS) for (let t = 200; t < r.to - 100; t += 260 + rnd() * 300) {
    const side = rnd() < 0.5 ? -1 : 1, off = side * (ROAD_W / 2 + SIDEWALK / 2) + (rnd() - 0.5) * 20, along = r.from + t;
    out.push(r.axis === 'h' ? [along, r.at + off, 22 + rnd() * 18] : [r.at + off, along, 22 + rnd() * 18]);
  }
  return out;
})();
/** Is there a puddle at (x, y)? (Only matters while the ground is wet.) */
export const puddleAt = (x: number, y: number) => PUDDLES.some(([px, py, s]) => Math.abs(x - px) < s * 1.6 && Math.abs(y - py) < s * 0.7);

const COLORS = [0xFF5A5A, 0xFFD45C, 0x5BD16A, 0x4DA3FF, 0xF06AE0];

export class Weather {
  /** Screen space: put it over the world (and the night), under the buttons. */
  readonly sky = new Container();
  /** World space, just above the ground: puddles and snow cover. */
  readonly ground = new Container();
  /** World space, in the sorted layer: the holiday lights on the houses. */
  readonly decor: Container[] = [];
  /** World space, over the night: the lights' glow after dark. */
  readonly glow = new Container();
  kind: Sky = 'clear';
  rain = 0; snow = 0;         // how hard it's raining / snowing now (0..1, eased)
  wet = 0; cover = 0;         // how wet the ground is, how much snow has settled (0..1)
  season: Season = 'summer';
  private hold = false;       // (tests: the sky stays as set)
  private next = 60;          // s till the sky might turn
  private drops: { x: number; y: number; v: number; l: number }[] = [];
  private flakes: { x: number; y: number; v: number; r: number; t: number }[] = [];
  private splashes: { x: number; y: number; t: number }[] = [];
  private g = new Graphics(); private tintG = new Graphics();
  private puddles = new Graphics(); private snowG = new Graphics();
  private lightsOn = false;

  constructor(houses: Building[] = BUILDINGS.filter(b => b.kind === 'house')) {
    this.sky.addChild(this.tintG, this.g);
    for (const [x, y, s] of PUDDLES) this.puddles.ellipse(x, y, s * 1.6, s * 0.7).fill({ color: 0x6E8AA8, alpha: 0.55 }).ellipse(x - s * 0.4, y - s * 0.15, s * 0.6, s * 0.18).fill({ color: 0xFFFFFF, alpha: 0.35 });
    this.snowG.rect(0, 0, WORLD.w, WORLD.h).fill(0xFFFFFF);
    this.puddles.alpha = 0; this.snowG.alpha = 0;
    this.ground.addChild(this.puddles, this.snowG);
    // holiday lights along every house's eaves (and a wreath on the door)
    houses.forEach((b, bi) => {
      const c = new Container(), g = new Graphics(), front = b.y + b.d - b.h;
      g.moveTo(b.x + 6, front - 6);
      for (let x = b.x + 6; x <= b.x + b.w - 6; x += 24) g.quadraticCurveTo(x + 12, front + 4, x + 24, front - 6);
      g.stroke({ width: 2, color: 0x2B3F55 });
      for (let x = b.x + 18, i = bi; x < b.x + b.w - 6; x += 24, i++) {
        const col = COLORS[i % COLORS.length];
        g.ellipse(x, front + 1, 5, 7).fill(0xFFFFFF).ellipse(x, front + 1, 3.5, 5.5).fill(col);
        const s = light(x, front + 1, 26, 26, col, 0.8); this.glow.addChild(s);
      }
      const dx = b.x + b.w / 2, dy = b.y + b.d - Math.min(165, b.h - 40) + 28;
      g.circle(dx, dy, 17).fill(0xFFFFFF).circle(dx, dy, 14).fill(0x2E7D4F).circle(dx, dy, 7).fill(0xFFFFFF).circle(dx, dy, 5).fill(0xF4F1EA)
       .circle(dx - 8, dy - 6, 2.5).fill(0xE5484D).circle(dx + 9, dy + 2, 2.5).fill(0xE5484D).poly([dx - 4, dy + 12, dx, dy + 6, dx + 4, dy + 12]).fill(0xE5484D);
      c.addChild(g); c.zIndex = b.y + b.d + 1; c.visible = false; this.decor.push(c);
    });
    this.glow.visible = false;
  }

  /** Tests and the debug page: set the sky (held until set again unless `hold` is false). */
  set(kind: Sky, hold = true) { this.kind = kind; this.hold = hold; this.next = WEATHER.spell[0]; }

  /** `screen`: the view's size; `cam`: where the screen's top-left is in the world, and the zoom; `dark`: 0..1. */
  update(dt: number, season: Season, screen: { w: number; h: number }, dark: number) {
    if (season !== this.season) { this.season = season; if (!this.hold) this.next = Math.min(this.next, 5); }
    if (!this.hold && (this.next -= dt) <= 0) {
      this.next = WEATHER.spell[0] + Math.random() * (WEATHER.spell[1] - WEATHER.spell[0]);
      this.kind = nextSky(season);
    }
    if (this.kind === 'snow' && season !== 'winter' && !this.hold) this.kind = 'rain';
    const ease = (v: number, to: number, rate: number) => v + (to - v) * Math.min(1, dt * rate);
    this.rain = ease(this.rain, this.kind === 'rain' ? 1 : 0, 0.5);
    this.snow = ease(this.snow, this.kind === 'snow' ? 1 : 0, 0.4);
    this.wet = Math.max(0, Math.min(1, this.wet + (this.rain > 0.3 ? dt / 25 : -dt / 90)));
    this.cover = Math.max(0, Math.min(1, this.cover + (this.snow > 0.3 ? dt / 40 : season === 'winter' ? -dt / 600 : -dt / 60)));
    this.puddles.alpha = this.wet; this.snowG.alpha = this.cover * 0.62;
    // the lights go up for winter
    const on = season === 'winter';
    if (on !== this.lightsOn) { this.lightsOn = on; for (const c of this.decor) c.visible = on; }
    this.glow.visible = on && dark > 0.05; this.glow.alpha = Math.min(1, dark * 1.4);
    this.draw(dt, screen);
  }

  private draw(dt: number, screen: { w: number; h: number }) {
    const g = this.g; g.clear(); this.tintG.clear();
    const { w, h } = screen;
    if (this.rain > 0.02) this.tintG.rect(0, 0, w, h).fill({ color: 0x47566E, alpha: 0.16 * this.rain });
    if (this.snow > 0.02) this.tintG.rect(0, 0, w, h).fill({ color: 0xDCE6F2, alpha: 0.12 * this.snow });
    // rain: slanting streaks, and little splashes where they land
    const nDrops = Math.round(240 * this.rain);
    while (this.drops.length < nDrops) this.drops.push({ x: Math.random() * (w + 200), y: Math.random() * h, v: 900 + Math.random() * 500, l: 14 + Math.random() * 14 });
    this.drops.length = nDrops;
    for (const d of this.drops) {
      d.y += d.v * dt; d.x -= d.v * 0.18 * dt;
      if (d.y > h) { if (Math.random() < 0.3) this.splashes.push({ x: d.x, y: Math.random() * h, t: 0 }); d.y = -20; d.x = Math.random() * (w + 200); }
      g.moveTo(d.x, d.y).lineTo(d.x + d.l * 0.18, d.y - d.l);
    }
    if (nDrops) g.stroke({ width: 1.6, color: 0xDDEBFF, alpha: 0.6 });
    for (const s of this.splashes) { s.t += dt; g.ellipse(s.x, s.y, 3 + s.t * 30, 1 + s.t * 10).stroke({ width: 1.2, color: 0xE8F2FF, alpha: Math.max(0, 0.6 - s.t * 2.4) }); }
    this.splashes = this.splashes.filter(s => s.t < 0.25);
    // snow: soft flakes drifting down, swaying; leaves in the fall
    const leaves = this.season === 'fall' && this.kind !== 'rain' ? 0.25 : 0;
    const nFlakes = Math.round(170 * this.snow + 40 * leaves);
    while (this.flakes.length < nFlakes) this.flakes.push({ x: Math.random() * w, y: Math.random() * h, v: 40 + Math.random() * 60, r: 1.8 + Math.random() * 2.6, t: Math.random() * 10 });
    this.flakes.length = nFlakes;
    for (const f of this.flakes) {
      f.t += dt; f.y += f.v * dt; f.x += Math.sin(f.t * 1.3) * 20 * dt;
      if (f.y > h + 10) { f.y = -10; f.x = Math.random() * w; }
      if (this.snow > 0.05) g.circle(f.x, f.y, f.r).fill({ color: 0xFFFFFF, alpha: 0.9 * Math.min(1, this.snow * 1.5) });
      else g.ellipse(f.x, f.y, f.r * 2.2, f.r * 1.2).fill({ color: [0xE3853A, 0xD9542B, 0xF2B33D][Math.floor(f.t * 7) % 3 === 0 ? 0 : Math.floor(f.r) % 3], alpha: 0.85 });
    }
  }
}

/** An umbrella to hold up in the rain (its origin at the holder's feet; `tall`: how tall they are, ~132 for Nico). */
export function umbrellaArt(color: number, tall = 132): Graphics {
  const g = new Graphics(), top = -tall - 34, r = 64;
  g.moveTo(14, top + 4).lineTo(14, -tall * 0.48).stroke({ width: 7, color: 0xFFFFFF, cap: 'round' }).moveTo(14, top + 4).lineTo(14, -tall * 0.48).stroke({ width: 3, color: 0x2B3F55, cap: 'round' });
  const dome = (rr: number) => { g.moveTo(-rr, top + 18); for (let i = 1; i <= 24; i++) { const a = Math.PI + Math.PI * i / 24; g.lineTo(Math.cos(a) * rr, top + 18 + Math.sin(a) * rr); } g.closePath(); };
  dome(r + 4); g.fill(0xFFFFFF);
  dome(r); g.fill(color);
  for (const k of [-0.5, 0, 0.5]) g.moveTo(0, top + 18 - r).quadraticCurveTo(k * r * 0.7, top, k * r * 1.1, top + 18).stroke({ width: 2, color: 0x000000, alpha: 0.18 });
  g.circle(0, top + 18 - r - 4, 4).fill(0x2B3F55);
  return g;
}
