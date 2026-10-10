// A small map in the corner so the town is easy to find your way round: roads, lots and
// buildings drawn once, plus live dots for Nico, his car, friends and the fire truck.
import { Container, Graphics, Text } from 'pixi.js';
import { WORLD, ROADS_X, ROADS_Y, ROAD_W, BUILDINGS, LOTS } from './world/map';

export interface Dot { x: number; y: number; color: string; r?: number; ring?: boolean }

export class Minimap {
  readonly view = new Container();
  private dots = new Graphics();
  readonly w: number; readonly h: number; private s: number;

  constructor(width = 170) {
    this.s = width / WORLD.w; this.w = width; this.h = WORLD.h * this.s;
    const s = this.s, g = new Graphics();
    g.roundRect(-6, -6, this.w + 12, this.h + 12, 12).fill({ color: '#FFFFFF', alpha: 0.92 });
    g.roundRect(0, 0, this.w, this.h, 8).fill('#B9DA9C');
    for (const l of LOTS) g.rect(l.x * s, l.y * s, l.w * s, l.d * s).fill(l.fill);
    for (const y of ROADS_Y) g.rect(0, (y - ROAD_W / 2) * s, this.w, ROAD_W * s).fill('#7D8A98');
    for (const x of ROADS_X) g.rect((x - ROAD_W / 2) * s, 0, ROAD_W * s, this.h).fill('#7D8A98');
    for (const b of BUILDINGS) g.roundRect(b.x * s, b.y * s, b.w * s, b.d * s, 2).fill(b.roof);
    this.view.addChild(g);
    // a few labels for the places you'll look for
    for (const [id, label] of [['burger', '🍔'], ['fire', '🚒'], ['school', '🏫'], ['hospital', '🏥'], ['home', '🏠'], ['toys', '🧸']] as const) {
      const b = BUILDINGS.find(b => b.id === id); if (!b) continue;
      const t = new Text({ text: label, style: { fontSize: 13 } });
      t.anchor.set(0.5); t.position.set((b.x + b.w / 2) * s, (b.y + b.d / 2) * s);
      this.view.addChild(t);
    }
    this.view.addChild(this.dots);
  }

  update(dots: Dot[]) {
    const g = this.dots.clear(), s = this.s;
    for (const d of dots) {
      if (d.ring) g.circle(d.x * s, d.y * s, (d.r ?? 4) + 2).fill('#FFFFFF');
      g.circle(d.x * s, d.y * s, d.r ?? 4).fill(d.color);
    }
  }
}
