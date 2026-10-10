// Day and night (Nico, 2026-10-10): the sun goes down, the street lamps glow, windows light up, the
// moon comes out, and the forest gets a little spooky (eyes in the dark, fog, an owl). A day is
// DAY.length seconds of play. The clock is data (a number 0..1, saved); the look is drawn over the
// world: a multiply tint for the dark, and additive glows for the lights.
import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { WORLD, PROPS, BUILDINGS, PINES, POOL, type Building } from './map';
import { shoreY, SAND_W } from './zones';
import { windowSpots } from './draw';

/** length: seconds in a whole day. The clock goes 0..1: sunrise at 0, sunset from `dusk`, full
 * dark from `night`, dawn from `dawn`. (About 7 minutes of day and 3 of night.) */
export const DAY = { length: 720, dusk: 0.6, night: 0.7, dawn: 0.92, start: 0.08 };
const smooth = (a: number) => a * a * (3 - 2 * a);
/** How dark it is: 0 in the day, 1 at night. */
export function darkness(u: number): number {
  u = ((u % 1) + 1) % 1;
  if (u < DAY.dusk) return 0;
  if (u < DAY.night) return smooth((u - DAY.dusk) / (DAY.night - DAY.dusk));
  if (u < DAY.dawn) return 1;
  return 1 - smooth((u - DAY.dawn) / (1 - DAY.dawn));
}
/** The warm sunset (and sunrise) glow: 0..1, strongest halfway into the dark. */
export function glow(u: number): number { const d = darkness(u); return d > 0 && d < 1 ? Math.sin(Math.PI * d) : 0; }
export const isNight = (u: number) => darkness(u) > 0.5;
const mix = (a: number, b: number, k: number) => {
  const ch = (c: number, s: number) => (c >> s) & 255;
  return [16, 8, 0].reduce((t, s) => t | (Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * k) << s), 0);
};
/** The colour the world is multiplied by: white in the day, warm at sunset, moonlit blue at night. */
export function tint(u: number): number {
  const d = darkness(u), g = glow(u);
  return mix(mix(0xFFFFFF, 0x4C5C9E, d), 0xFFB27A, g * 0.45);
}
/** Is (x, y) in the forest? (Where the pines are: north-east, above the meadow by the beach.) */
export const inForest = (x: number, y: number) => x > 4990 && y < shoreY(x) - SAND_W - 380;

// ---- the art
let glowTex: Texture | null = null;
/** A soft round light: white in the middle, fading to nothing. */
function glowTexture(): Texture {
  if (glowTex) return glowTex;
  if (typeof document === 'undefined') return Texture.WHITE;   // (unit tests: no canvas)
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d')!, gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  return (glowTex = Texture.from(c));
}
export function light(x: number, y: number, rx: number, ry: number, color: number, alpha = 1): Sprite {
  const s = new Sprite(glowTexture()); s.anchor.set(0.5); s.position.set(x, y);
  s.width = rx * 2; s.height = ry * 2; s.tint = color; s.alpha = alpha; s.blendMode = 'add'; s.cullable = true;
  return s;
}
const LAMP = 0xFFD98A, WINDOW = 0xFFC864;

export class Night {
  /** The dark (multiplied over the world) and the lights (added on top). Add `view` above everything. */
  readonly view = new Container();
  readonly moon = new Container();       // screen space: put it over the world, under the buttons
  private shade = new Graphics();
  private woods = new Graphics();
  private lights = new Container();
  private flicker: { s: Sprite; base: number; t: number }[] = [];
  private eyes: { g: Graphics; x: number; y: number; t: number }[] = [];
  private fog: { g: Container; vx: number }[] = [];
  private me = light(0, 0, 150, 110, 0xFFE6B8, 0.4);   // a soft light round Nico, so he's easy to see in the dark
  private beam = new Graphics();
  private fireflies: { s: Sprite; x: number; y: number; t: number }[] = [];
  private beams: Sprite[] = [];
  /** 0..1 how dark it is now (for sounds, cars' headlights...). */
  dark = 0;

  constructor(extra: Building[] = []) {
    this.shade.rect(0, 0, WORLD.w, WORLD.h).fill(0xFFFFFF); this.shade.blendMode = 'multiply';
    // the forest is darker than the town
    // (four layers, each a little further in, so the edge fades instead of stopping dead)
    for (let k = 0; k < 4; k++) {
      const x0 = 4990 - 120 + k * 80, xs = Array.from({ length: 40 }, (_, i) => x0 + i * (WORLD.w - x0) / 39);
      this.woods.poly([x0, -50, WORLD.w, -50, ...xs.slice().reverse().flatMap(x => [x, Math.max(0, shoreY(x) - SAND_W - 300 - k * 80)])]).fill({ color: 0xA2AACE, alpha: 0.6 });
    }
    this.woods.blendMode = 'multiply';
    this.view.addChild(this.shade, this.woods, this.lights); this.lights.addChild(this.me); this.me.cullable = false;
    // street lamps: a glow round the bulb and a pool of light on the ground
    for (const p of PROPS) if (p.kind === 'lamp') {
      this.lights.addChild(light(p.x, p.y + 10, 150, 70, LAMP, 0.55), light(p.x, p.y - 126, 60, 60, LAMP, 0.9));
    }
    // lit windows (most of them; the same ones every night)
    let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (const b of [...BUILDINGS, ...extra]) for (const [cx, wy] of windowSpots(b)) {
      if (rnd() < 0.25) continue;
      const g = new Graphics().roundRect(cx - 28, wy + 6, 56, 40, 4).fill(WINDOW); g.blendMode = 'add'; g.alpha = 0.75;
      this.lights.addChild(g, light(cx, wy + 26, 70, 50, WINDOW, 0.35));
    }
    // the campfire, the lighthouse lamp and its turning beam, the pool's underwater lights
    for (const p of PROPS) {
      if (p.kind === 'campfire') { const s = light(p.x, p.y - 10, 190, 150, 0xFF9A3C, 0.8); this.lights.addChild(s); this.flicker.push({ s, base: 0.8, t: 0 }); }
      if (p.kind === 'lighthouse') {
        this.lights.addChild(light(p.x, p.y - 355, 90, 90, 0xFFF2B0, 1));
        this.beam.poly([0, -8, 900, -110, 900, 110, 0, 8]).fill({ color: 0xFFF2B0, alpha: 0.22 }); this.beam.blendMode = 'add';
        this.beam.position.set(p.x, p.y - 355); this.lights.addChild(this.beam);
      }
    }
    const pool = new Graphics().rect(POOL.x + 10, POOL.y + 10, POOL.w - 20, POOL.d - 20).fill(0x2FB8E8); pool.blendMode = 'add'; pool.alpha = 0.35;
    this.lights.addChild(pool);
    // the spooky forest: eyes between the trees (gone if you come close), fog drifting through
    PINES.filter((_, i) => i % 9 === 4).slice(0, 14).forEach(([x, y], i) => {
      const g = new Graphics();
      for (const dx of [-7, 7]) g.ellipse(dx, 0, 4, 3).fill(i % 3 ? 0xE8F27A : 0xFFB03A);
      g.position.set(x + 24, y - 30); g.blendMode = 'add'; this.lights.addChild(g);
      this.eyes.push({ g, x: x + 24, y: y - 30, t: rnd() * 10 });
    });
    for (let i = 0; i < 9; i++) {
      const g = new Container();
      for (let k = 0; k < 4; k++) { const f = new Sprite(glowTexture()); f.anchor.set(0.5); f.width = 520; f.height = 170; f.tint = 0xDDE4F5; f.position.set((k - 1.5) * 160, (rnd() - 0.5) * 60); g.addChild(f); }
      g.position.set(5100 + rnd() * 2900, 200 + rnd() * 2600); this.view.addChild(g);
      this.fog.push({ g, vx: 10 + rnd() * 14 });
    }
    // fireflies round the campground meadow
    for (let i = 0; i < 26; i++) {
      const x = 5700 + rnd() * 1300, y = 2000 + rnd() * 900, s = light(x, y, 9, 9, 0xD8FF6A, 1);
      this.lights.addChild(s); this.fireflies.push({ s, x, y, t: rnd() * 20 });
    }
    // the moon: a glowing disc with a few craters
    const halo = new Sprite(glowTexture()); halo.anchor.set(0.5); halo.width = halo.height = 220; halo.tint = 0xCFE0FF; halo.alpha = 0.55;
    const disc = new Graphics().circle(0, 0, 38).fill(0xF4F1DE).circle(-12, -8, 8).fill(0xE2DDC0).circle(10, 12, 6).fill(0xE2DDC0).circle(14, -14, 4).fill(0xE2DDC0);
    this.moon.addChild(halo, disc);
  }

  /** Headlights: two soft beams ahead of each car (x, y, heading), in the lights so the dark doesn't dim them. */
  headlights(cars: [number, number, number][], len: number, wid: number) {
    while (this.beams.length < cars.length * 2) { const b = light(0, 0, 150, 44, 0xFFF0B8, 0.5); b.cullable = false; this.lights.addChild(b); this.beams.push(b); }
    this.beams.forEach((b, i) => {
      const c = cars[i >> 1]; b.visible = !!c && this.view.visible; if (!c) return;
      const [x, y, h] = c, side = (i & 1 ? 1 : -1) * wid * 0.3, ahead = len / 2 + 130;
      b.position.set(x + Math.cos(h) * ahead - Math.sin(h) * side, y + Math.sin(h) * ahead + Math.cos(h) * side); b.rotation = h;
    });
  }
  /** u: the clock (0..1). at: where Nico is (eyes hide when he comes close). screen: for the moon. */
  update(u: number, dt: number, at: [number, number], screen: { w: number; h: number }) {
    const d = (this.dark = darkness(u));
    this.view.visible = d > 0.001;
    this.moon.visible = d > 0.05;
    if (!this.view.visible) return;
    this.shade.tint = tint(u);
    this.woods.alpha = d;
    this.lights.alpha = Math.min(1, d * 1.4);
    for (const f of this.flicker) { f.t += dt; f.s.alpha = f.base * (0.85 + 0.15 * Math.sin(f.t * 13) * Math.sin(f.t * 7.3)); }
    this.beam.rotation += dt * 0.7;
    for (const e of this.eyes) {
      e.t += dt;
      const near = Math.hypot(at[0] - e.x, at[1] - e.y) < 320, blink = (e.t % 4.3) < 0.15;
      e.g.alpha += ((near ? 0 : 1) - e.g.alpha) * Math.min(1, dt * 4);
      e.g.scale.y = blink ? 0.1 : 1;
    }
    this.me.position.set(at[0], at[1] - 50); this.me.alpha = 0.4 + 0.25 * this.woods.alpha * (inForest(at[0], at[1]) ? 1 : 0);
    for (const f of this.fog) { f.g.x += f.vx * dt; if (f.g.x > WORLD.w + 300) f.g.x = 4900; f.g.alpha = 0.3 * d; }
    for (const f of this.fireflies) {
      f.t += dt; f.s.position.set(f.x + Math.sin(f.t * 0.7) * 40, f.y + Math.sin(f.t * 1.1) * 25);
      f.s.alpha = Math.max(0, Math.sin(f.t * 2.2));
    }
    // the moon rises on the left at dusk, crosses the top of the screen, and sets at dawn
    const k = ((u - DAY.dusk + 1) % 1) / ((1 - DAY.dusk) + 0.02);
    this.moon.position.set(screen.w * (0.36 + 0.5 * k), 150 + 40 * Math.cos(Math.PI * k) ** 2);
    this.moon.alpha = d;
  }
}
