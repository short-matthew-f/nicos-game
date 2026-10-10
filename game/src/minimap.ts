// A small map in the corner so the town is easy to find your way round: roads, lots and
// buildings drawn once, plus live dots for Nico, his car, friends and the fire truck.
import { Container, Graphics, Text } from 'pixi.js';
import { WORLD, ROAD_SEGS, roadRect, BUILDINGS, LOTS, PINES, LAKE, POOL, PIER, SHED, SHOP } from './world/map';
import { sandPolygon, waterPolygon, ZONE_LABELS } from './world/zones';

export interface Dot { x: number; y: number; color: string; r?: number; ring?: boolean }

export class Minimap {
  readonly view = new Container();
  private dots = new Graphics();
  readonly w: number; readonly h: number; private s: number;

  constructor(width = 170, labels = false) {
    this.s = width / WORLD.w; this.w = width; this.h = WORLD.h * this.s;
    const s = this.s, g = new Graphics();
    g.roundRect(-6, -6, this.w + 12, this.h + 12, 12).fill({ color: '#FFFFFF', alpha: 0.92 });
    g.roundRect(0, 0, this.w, this.h, 8).fill('#B9DA9C');
    g.poly(sandPolygon().map(v => v * s)).fill('#F2DFA7');
    g.poly(waterPolygon().map(v => v * s)).fill('#62B6D9');
    for (const [x, y] of PINES) g.circle(x * s, y * s, Math.max(1.5, 90 * s)).fill('#4F9A63');   // the forest
    g.ellipse((LAKE.x + LAKE.w / 2) * s, (LAKE.y + LAKE.d / 2) * s, LAKE.w / 2 * s, LAKE.d / 2 * s).fill('#5AA9C9');
    for (const l of LOTS) g.rect(l.x * s, l.y * s, l.w * s, l.d * s).fill(l.fill);
    g.rect(POOL.x * s, POOL.y * s, POOL.w * s, POOL.d * s).fill('#4FC3E8');
    g.rect(PIER.x * s, PIER.y * s, PIER.w * s, PIER.d * s).fill('#C49A6C');
    for (const r of ROAD_SEGS) { const rd = roadRect(r); g.rect(rd.x * s, rd.y * s, rd.w * s, rd.d * s).fill('#7D8A98'); }
    for (const b of [...BUILDINGS, SHED, SHOP]) g.roundRect(b.x * s, b.y * s, b.w * s, b.d * s, 2).fill(b.roof);   // (the shed and the beach shop too, bought or not: places to head for)
    this.view.addChild(g);
    // a few labels for the places you'll look for
    for (const [id, label] of [['burger', '🍔'], ['fire', '🚒'], ['school', '🏫'], ['hospital', '🏥'], ['home', '🏠'], ['toys', '🧸'], ['icecream', '🍦'], ['parts', '🔧'], ['storage', '📦'], ['barn', '🐄'], ['poolhouse', '🏊'], ['cabin', '🌲'], ['bibs', '🐚']] as const) {
      const b = [...BUILDINGS, SHOP].find(b => b.id === id); if (!b) continue;
      const t = new Text({ text: label, style: { fontSize: 13 } });
      t.anchor.set(0.5); t.position.set((b.x + b.w / 2) * s, (b.y + b.d / 2) * s);
      this.view.addChild(t);
    }
    // the big map names every place
    if (labels) for (const b of [...BUILDINGS, SHED, SHOP]) if (b.label) {
      const t = new Text({ text: b.label, style: { fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '800', fontSize: 13, fill: '#2B3F55', stroke: { color: '#FFFFFF', width: 4 } } });
      t.anchor.set(0.5, 0); t.position.set((b.x + b.w / 2) * s, (b.y + b.d) * s + 4);
      this.view.addChild(t);
    }
    if (labels) for (const [name, x, y] of ZONE_LABELS) {
      const t = new Text({ text: name, style: { fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '800', fontSize: 12, fill: '#2B3F55', stroke: { color: '#FFFFFF', width: 3 } } });
      t.anchor.set(0.5); t.position.set(x * s, y * s);
      this.view.addChild(t);
    }
    if (labels) for (const l of LOTS) if (['playground', 'park', 'field'].includes(l.id)) {
      const t = new Text({ text: { playground: 'PLAYGROUND', park: 'PARK', field: 'SOCCER FIELD' }[l.id]!, style: { fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '700', fontSize: 11, fill: '#3E6B35' } });
      t.anchor.set(0.5); t.position.set((l.x + l.w / 2) * s, (l.y + l.d / 2) * s);
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
