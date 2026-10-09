// Static world art in the sticker style: flat fills, a white outline band and a soft
// navy shadow offset down-right. Static things draw the band as geometry (cheap);
// only characters use the live outline filter.
import { Container, Graphics, Text } from 'pixi.js';
import { BUILDINGS, LOTS, TREES, WORLD, ROADS_X, ROADS_Y, ROAD_W, SIDEWALK, type Building } from './map';

export const NAVY = 0x2B3F55;
const BAND = 7, SH = { x: 6, y: 10, a: 0.18 };
const GRASS = '#B9DA9C', WALK = '#E4E8ED', ROAD = '#5F6D7C', PAINT = '#F4F6F8', KERB = '#CDD3DA';

/** Shadow + white band for a rounded-rect silhouette. */
function stickerRect(g: Graphics, x: number, y: number, w: number, h: number, r: number) {
  g.roundRect(x + SH.x, y + SH.y, w, h, r).fill({ color: NAVY, alpha: SH.a });
  g.roundRect(x - BAND, y - BAND, w + 2 * BAND, h + 2 * BAND, r + BAND).fill('#FFFFFF');
}

export function drawGround(): Graphics {
  const g = new Graphics();
  g.rect(0, 0, WORLD.w, WORLD.h).fill(GRASS);
  for (const l of LOTS) g.roundRect(l.x, l.y, l.w, l.d, 18).fill(l.fill);
  const half = ROAD_W / 2;
  // sidewalks, then roads on top
  for (const y of ROADS_Y) g.rect(0, y - half - SIDEWALK, WORLD.w, ROAD_W + 2 * SIDEWALK).fill(WALK);
  for (const x of ROADS_X) g.rect(x - half - SIDEWALK, 0, ROAD_W + 2 * SIDEWALK, WORLD.h).fill(WALK);
  for (const y of ROADS_Y) g.rect(0, y - half - 4, WORLD.w, 4).fill(KERB).rect(0, y + half, WORLD.w, 4).fill(KERB);
  for (const x of ROADS_X) g.rect(x - half - 4, 0, 4, WORLD.h).fill(KERB).rect(x + half, 0, 4, WORLD.h).fill(KERB);
  for (const y of ROADS_Y) g.rect(0, y - half, WORLD.w, ROAD_W).fill(ROAD);
  for (const x of ROADS_X) g.rect(x - half, 0, ROAD_W, WORLD.h).fill(ROAD);
  // dashed centre lines, skipping intersections
  const nearX = (x: number) => ROADS_X.some(rx => Math.abs(x - rx) < half + 30);
  const nearY = (y: number) => ROADS_Y.some(ry => Math.abs(y - ry) < half + 30);
  for (const y of ROADS_Y) for (let x = 0; x < WORLD.w; x += 70) if (!nearX(x) && !nearX(x + 40)) g.roundRect(x, y - 3, 40, 6, 3).fill(PAINT);
  for (const x of ROADS_X) for (let y = 0; y < WORLD.h; y += 70) if (!nearY(y) && !nearY(y + 40)) g.roundRect(x - 3, y, 6, 40, 3).fill(PAINT);
  // crosswalks on every side of each intersection
  for (const x of ROADS_X) for (const y of ROADS_Y) {
    for (let i = -half + 12; i < half - 12; i += 26) {
      g.rect(x + i, y - half - 34, 14, 28).fill(PAINT).rect(x + i, y + half + 6, 14, 28).fill(PAINT);
      g.rect(x - half - 34, y + i, 28, 14).fill(PAINT).rect(x + half + 6, y + i, 28, 14).fill(PAINT);
    }
  }
  return g;
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, '0')).join('');
}

export function drawBuilding(b: Building): Container {
  const c = new Container();
  const g = new Graphics();
  const top = b.y - b.h, front = b.y + b.d - b.h;
  stickerRect(g, b.x, top, b.w, b.d + b.h, 10);
  g.roundRect(b.x, top, b.w, b.d + b.h, 10).fill(b.wall);          // wall colour under everything
  g.roundRect(b.x, top, b.w, b.d, 10).fill(b.roof);                 // roof
  g.rect(b.x, front - 10, b.w, 10).fill(shade(b.roof, 0.78));       // eave
  if (b.kind === 'house') g.rect(b.x + 12, top + b.d / 2 - 3, b.w - 24, 6).fill(shade(b.roof, 0.85));  // ridge
  // windows and door on the front wall
  const winC = '#CFE6F7', frame = b.trim ?? '#FFFFFF';
  const doorW = 34, doorH = Math.min(58, b.h - 22);
  const doorX = b.x + b.w / 2 - doorW / 2;
  const n = Math.max(1, Math.floor((b.w - 60) / 90));
  for (let i = 0; i < n; i++) {
    const cx = b.x + (b.w / (n + 1)) * (i + 1);
    if (Math.abs(cx - (doorX + doorW / 2)) < 50) continue;
    g.roundRect(cx - 22, front + 18, 44, 30, 5).fill(frame).roundRect(cx - 18, front + 22, 36, 22, 3).fill(winC);
  }
  g.roundRect(doorX, b.y + b.d - doorH, doorW, doorH, 6).fill(shade(b.wall, 0.62));
  c.addChild(g);
  if (b.label) {
    const t = new Text({ text: b.label, style: { fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '800', fontSize: 20, fill: '#2B3F55', letterSpacing: 1 } });
    t.anchor.set(0.5);
    const sign = new Graphics().roundRect(-t.width / 2 - 12, -15, t.width + 24, 30, 8).fill(b.trim ?? '#FFFFFF');
    sign.position.set(b.x + b.w / 2, front - 4);
    t.position.copyFrom(sign.position);
    c.addChild(sign, t);
  }
  c.zIndex = b.y + b.d;
  return c;
}

export function drawTree(x: number, y: number): Container {
  const g = new Graphics();
  const R = 34;
  g.circle(x + SH.x, y - 54 + SH.y, R + 4).fill({ color: NAVY, alpha: SH.a });
  g.circle(x, y - 58, R + BAND).fill('#FFFFFF').roundRect(x - 9 - BAND, y - 40, 18 + 2 * BAND, 40 + BAND, 9).fill('#FFFFFF');
  g.roundRect(x - 9, y - 40, 18, 40, 7).fill('#8A5A3B');
  g.circle(x, y - 58, R).fill('#5FAF6A').circle(x - 10, y - 68, R * 0.55).fill('#7CC383');
  const c = new Container(); c.addChild(g); c.zIndex = y;
  return c;
}

/** Playground equipment on the sand lot: a slide and a swing set (not solid in v0). */
export function drawPlayground(): Container[] {
  const lot = LOTS.find(l => l.id === 'playground')!;
  const slide = new Graphics();
  const sx = lot.x + 70, sy = lot.y + 120;
  stickerRect(slide, sx, sy - 110, 150, 110, 8);
  slide.roundRect(sx, sy - 110, 46, 110, 6).fill('#F9A826')                 // tower
       .rect(sx + 6, sy - 100, 34, 6).fill('#FFE29A').rect(sx + 6, sy - 80, 34, 6).fill('#FFE29A')
       .poly([sx + 46, sy - 96, sx + 150, sy - 14, sx + 150, sy, sx + 46, sy - 74]).fill('#5FAFA5');
  const swings = new Graphics();
  const wx = lot.x + 260, wy = lot.y + 130;
  stickerRect(swings, wx, wy - 110, 130, 110, 8);
  swings.roundRect(wx, wy - 110, 130, 12, 6).fill('#D77B72')
        .rect(wx + 4, wy - 104, 8, 104).fill('#D77B72').rect(wx + 118, wy - 104, 8, 104).fill('#D77B72');
  for (const ox of [36, 86]) swings.rect(wx + ox, wy - 98, 2, 60).fill('#34495E').rect(wx + ox + 14, wy - 98, 2, 60).fill('#34495E')
                                   .roundRect(wx + ox - 4, wy - 40, 24, 8, 3).fill('#3E8F8A');
  const a = new Container(); a.addChild(slide); a.zIndex = sy;
  const b = new Container(); b.addChild(swings); b.zIndex = wy;
  return [a, b];
}

export function drawWorld(layer: Container): void {
  for (const b of BUILDINGS) layer.addChild(drawBuilding(b));
  for (const [x, y] of TREES) layer.addChild(drawTree(x, y));
  for (const p of drawPlayground()) layer.addChild(p);
}
