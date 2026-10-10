// Static world art in the sticker style: flat fills, a white outline band and a soft
// navy shadow offset down-right. Static things draw the band as geometry (cheap);
// only characters use the live outline filter.
import { Container, Graphics, Text } from 'pixi.js';
import { BUILDINGS, DRIVEWAYS, LOTS, SLIDE, SWINGS, SWING_BAR, SWING_SEAT, TREES, WORLD, ROADS_X, ROADS_Y, ROAD_W, SIDEWALK, type Building } from './map';

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
  for (const r of DRIVEWAYS) g.rect(r.x, r.y, r.w, r.d).fill(KERB);
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
  // door and windows on the front wall, sized against Nico (~132 px): a door a bit
  // taller than him, a row of windows per storey
  const winC = '#CFE6F7', frame = b.trim ?? '#FFFFFF';
  const doorW = 66, doorH = Math.min(165, b.h - 40);
  const doorX = b.x + b.w / 2 - doorW / 2;
  const n = Math.max(1, Math.floor((b.w - 80) / 130));
  const rows = b.h > 200 ? 2 : 1, rowH = (b.h - 20) / rows;
  for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) {
    const cx = b.x + (b.w / (n + 1)) * (i + 1), wy = front + 26 + r * rowH;
    const byDoor = Math.abs(cx - (doorX + doorW / 2)) < 80 && r === rows - 1;
    if (byDoor || b.bays?.some(x => Math.abs(cx - x) < 120) && r === rows - 1) continue;
    g.roundRect(cx - 34, wy, 68, 52, 6).fill(frame).roundRect(cx - 28, wy + 6, 56, 40, 4).fill(winC)
     .rect(cx - 1.5, wy + 6, 3, 40).fill(frame);
  }
  g.roundRect(doorX, b.y + b.d - doorH, doorW, doorH, 8).fill(shade(b.wall, 0.62))
   .circle(doorX + doorW - 14, b.y + b.d - doorH / 2, 4).fill(shade(b.wall, 0.4));
  for (const x of b.bays ?? []) {   // open vehicle bays, dark inside
    g.roundRect(x - 78, front + 30, 156, b.h - 30, 6).fill(frame).roundRect(x - 70, front + 38, 140, b.h - 38, 4).fill('#2C3440');
  }
  c.addChild(g);
  if (b.label) {
    const t = new Text({ text: b.label, style: { fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '800', fontSize: 30, fill: '#2B3F55', letterSpacing: 1.5 } });
    t.anchor.set(0.5);
    const sign = new Graphics().roundRect(-t.width / 2 - 16, -22, t.width + 32, 44, 10).fill(b.trim ?? '#FFFFFF');
    sign.position.set(b.x + b.w / 2, front - 6);
    t.position.copyFrom(sign.position);
    c.addChild(sign, t);
  }
  c.zIndex = b.y + b.d;
  return c;
}

/** A tree about twice Nico's height. (x, y) is the foot of the trunk. */
export function drawTree(x: number, y: number): Container {
  const g = new Graphics();
  const R = 62, TW = 30, TH = 90, CY = y - TH - R * 0.55;   // canopy radius, trunk, canopy centre
  g.circle(x + SH.x, CY + 4 + SH.y, R + 4).fill({ color: NAVY, alpha: SH.a });
  g.circle(x, CY, R + BAND).fill('#FFFFFF').roundRect(x - TW / 2 - BAND, y - TH, TW + 2 * BAND, TH + BAND, 12).fill('#FFFFFF');
  g.roundRect(x - TW / 2, y - TH, TW, TH, 10).fill('#8A5A3B');
  g.circle(x, CY, R).fill('#5FAF6A').circle(x - 18, CY - 18, R * 0.55).fill('#7CC383').circle(x + 22, CY + 14, R * 0.35).fill('#55A260');
  const c = new Container(); c.addChild(g); c.zIndex = y;
  return c;
}

/** The slide and the swing frame (not solid), plus the swing seats. The seats hang from
 * the bar and are separate layer items drawn just in front of the frame, so a swing can
 * move and Nico can sit between the frame and his seat's chains. */
export function drawPlayground(): { items: Container[]; seats: Container[] } {
  // each piece gets its own white band and shadow (not one box round the whole thing),
  // so the grass shows through the gaps when Nico walks behind it
  const sticker = (g: Graphics, draw: (g: Graphics) => Graphics, fill: string) => {
    draw(g).stroke({ width: BAND * 2, color: '#FFFFFF', join: 'round' });
    draw(g).fill(fill);
  };
  const { x: sx, y: sy, w: tw, h: th, top, len } = SLIDE;
  const tower = (g: Graphics) => g.roundRect(sx, sy - th, tw, th, 8);
  const chute = (g: Graphics) => g.poly([sx + tw, sy - top - 4, sx + len, sy - 22, sx + len, sy, sx + tw, sy - top + 30]);
  const slideShadow = new Graphics(); chute(tower(slideShadow)).fill({ color: NAVY, alpha: SH.a }); slideShadow.position.set(SH.x, SH.y);
  const slide = new Graphics();
  sticker(slide, chute, '#5FAFA5');
  slide.poly([sx + tw, sy - top - 4, sx + len, sy - 22, sx + len, sy - 14, sx + tw, sy - top + 6]).fill('#7CC6BC');
  sticker(slide, tower, '#F9A826');
  for (let y = sy - th + 16; y < sy - 8; y += 26) slide.rect(sx + 9, y, tw - 18, 8).fill('#FFE29A');   // ladder rungs
  slide.roundRect(sx - 4, sy - top - 8, tw + 8, 12, 5).fill('#D9822B');                                // platform lip

  const { x: wx, y: wy, w: ww, h: wh } = SWINGS;
  const frame = (g: Graphics) => g.roundRect(wx, wy - wh, ww, 16, 8).roundRect(wx + 6, wy - wh + 8, 12, wh - 8, 4).roundRect(wx + ww - 18, wy - wh + 8, 12, wh - 8, 4);
  const swingShadow = new Graphics(); frame(swingShadow).fill({ color: NAVY, alpha: SH.a }); swingShadow.position.set(SH.x, SH.y);
  const swings = new Graphics();
  sticker(swings, frame, '#D77B72');
  const seats = SWINGS.seats.map(ox => {
    // drawn hanging from the bar, origin at the bar: scale.y swings it toward the camera
    const g = new Graphics();
    const l = SWING_SEAT - SWING_BAR;
    g.rect(-24, 0, 3, l).fill('#34495E').rect(21, 0, 3, l).fill('#34495E')
     .roundRect(-27, l - 5, 54, 11, 4).fill('#3E8F8A');
    const c = new Container(); c.addChild(g);
    c.position.set(wx + ox, SWING_BAR); c.zIndex = wy + 2;
    return c;
  });
  const a = new Container(); a.addChild(slideShadow, slide); a.zIndex = sy;
  const b = new Container(); b.addChild(swingShadow, swings); b.zIndex = wy;
  return { items: [a, b, ...seats], seats };
}

export function drawWorld(layer: Container): { seats: Container[] } {
  for (const b of BUILDINGS) layer.addChild(drawBuilding(b));
  for (const [x, y] of TREES) layer.addChild(drawTree(x, y));
  const pg = drawPlayground();
  for (const p of pg.items) layer.addChild(p);
  return { seats: pg.seats };
}
