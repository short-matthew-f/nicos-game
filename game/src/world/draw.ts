// Static world art in the sticker style: flat fills, a white outline band and a soft
// navy shadow offset down-right. Static things draw the band as geometry (cheap);
// only characters use the live outline filter.
import { Container, Graphics, Text } from 'pixi.js';
import { BUILDINGS, DRIVEWAYS, LOTS, SLIDE, SWINGS, SWING_BAR, SWING_SEAT, POND, FIELD, GOALS, GOAL_MOUTH, PROPS, type Prop, TREES, WORLD, ROADS_X, ROADS_Y, ROAD_W, SIDEWALK, ROAD_SEGS, roadRect, PINES, LAKE, POOL, PIER, type Building } from './map';
import { sandPolygon, waterPolygon, SHORE, shoreY } from './zones';

export const NAVY = 0x2B3F55;
/** The white sticker edge round everything in the world (px). Characters match it (person.ts OUTLINE). */
export const BAND = 3;
const SH = { x: 6, y: 10, a: 0.18 };
const GRASS = '#B9DA9C', WALK = '#E4E8ED', ROAD = '#5F6D7C', PAINT = '#F4F6F8', KERB = '#CDD3DA';

/** Shadow + white band for a rounded-rect silhouette. */
function stickerRect(g: Graphics, x: number, y: number, w: number, h: number, r: number) {
  g.roundRect(x + SH.x, y + SH.y, w, h, r).fill({ color: NAVY, alpha: SH.a });
  g.roundRect(x - BAND, y - BAND, w + 2 * BAND, h + 2 * BAND, r + BAND).fill('#FFFFFF');
}

export function drawGround(): Graphics {
  const g = new Graphics();
  g.rect(0, 0, WORLD.w, WORLD.h).fill(GRASS);
  // a scatter of lighter and darker grass tufts so the lawns aren't flat
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 900; i++) {
    const x = rnd() * WORLD.w, y = rnd() * WORLD.h, c = rnd() < 0.5 ? '#AFD392' : '#C6E3AA';
    g.ellipse(x, y, 10 + rnd() * 14, 4 + rnd() * 4).fill(c);
  }
  // the beach and the ocean: sand, a pale wet strip at the water's edge, foam, then the sea
  g.poly(sandPolygon()).fill('#F2DFA7');
  g.poly(waterPolygon()).fill('#62B6D9');
  g.poly(SHORE.flatMap(([x, y]) => [x, y + 26]).concat([...SHORE].reverse().flatMap(([x, y]) => [x, y + 140]))).fill('#7CC6E6');
  for (let i = 0; i + 1 < SHORE.length; i++) g.moveTo(SHORE[i][0], SHORE[i][1] + 6).lineTo(SHORE[i + 1][0], SHORE[i + 1][1] + 6);
  g.stroke({ width: 10, color: '#FFFFFF', alpha: 0.75, cap: 'round' });
  for (let i = 0; i < 400; i++) { const x = rnd() * WORLD.w, y = rnd() * WORLD.h; if (y > shoreY(x) + 180) g.roundRect(x, y, 40 + rnd() * 50, 5, 3).fill({ color: '#FFFFFF', alpha: 0.2 }); }   // little waves out at sea
  for (const l of LOTS) g.roundRect(l.x, l.y, l.w, l.d, 18).fill(l.fill);
  // the farm's crop rows, the forest lake, the pool and the pier
  { const c = LOTS.find(l => l.id === 'crops')!; for (let y = c.y + 20; y < c.y + c.d - 10; y += 34) g.roundRect(c.x + 16, y, c.w - 32, 14, 7).fill('#6E9A43'); }
  g.ellipse(LAKE.x + LAKE.w / 2, LAKE.y + LAKE.d / 2, LAKE.w / 2 + 14, LAKE.d / 2 + 14).fill('#C9B98E');
  g.ellipse(LAKE.x + LAKE.w / 2, LAKE.y + LAKE.d / 2, LAKE.w / 2, LAKE.d / 2).fill('#5AA9C9');
  g.ellipse(LAKE.x + LAKE.w / 2 - 90, LAKE.y + LAKE.d / 2 - 50, LAKE.w / 4, LAKE.d / 7).fill({ color: '#FFFFFF', alpha: 0.22 });
  g.roundRect(POOL.x - 18, POOL.y - 18, POOL.w + 36, POOL.d + 36, 22).fill('#FFFFFF');
  g.roundRect(POOL.x, POOL.y, POOL.w, POOL.d, 14).fill('#4FC3E8');
  for (let i = 1; i < 5; i++) g.rect(POOL.x + 10, POOL.y + i * POOL.d / 5 - 2, POOL.w - 20, 4).fill({ color: '#FFFFFF', alpha: 0.5 });   // lane ropes
  g.ellipse(POOL.x + POOL.w * 0.3, POOL.y + POOL.d * 0.3, POOL.w * 0.18, POOL.d * 0.08).fill({ color: '#FFFFFF', alpha: 0.3 });
  g.rect(PIER.x - 8, PIER.y - 40, PIER.w + 16, PIER.d + 40).fill('#8A6A48');
  for (let y = PIER.y - 36; y < PIER.y + PIER.d; y += 22) g.rect(PIER.x - 4, y, PIER.w + 8, 16).fill('#C49A6C');
  // soccer field markings
  const F = FIELD, lw = 5;
  g.roundRect(F.x + 14, F.y + 14, F.w - 28, F.d - 28, 6).stroke({ width: lw, color: '#F4F6F8' });
  g.rect(F.x + F.w / 2 - lw / 2, F.y + 14, lw, F.d - 28).fill('#F4F6F8');
  g.circle(F.x + F.w / 2, F.y + F.d / 2, 62).stroke({ width: lw, color: '#F4F6F8' });
  for (const gl of GOALS) g.rect(gl.side < 0 ? F.x + 14 : F.x + F.w - 14 - 150, F.y + F.d / 2 - 110, 150, 220).stroke({ width: lw, color: '#F4F6F8' });
  for (let i = 0; i < 7; i++) g.rect(F.x + 14 + i * (F.w - 28) / 7, F.y + 14, (F.w - 28) / 14, F.d - 28).fill({ color: '#FFFFFF', alpha: 0.06 });   // mown stripes
  // the pond: a sandy edge, water, a lighter shimmer
  g.ellipse(POND.x + POND.w / 2, POND.y + POND.d / 2, POND.w / 2 + 12, POND.d / 2 + 12).fill('#E3D3A6');
  g.ellipse(POND.x + POND.w / 2, POND.y + POND.d / 2, POND.w / 2, POND.d / 2).fill('#6FB7D8');
  g.ellipse(POND.x + POND.w / 2 - 40, POND.y + POND.d / 2 - 30, POND.w / 4, POND.d / 6).fill({ color: '#FFFFFF', alpha: 0.25 });
  for (const [dx, dy] of [[-150, 60], [140, -70], [100, 70]]) g.ellipse(POND.x + POND.w / 2 + dx, POND.y + POND.d / 2 + dy, 22, 12).fill('#5FAF6A');   // lily pads
  for (const r of DRIVEWAYS) g.rect(r.x, r.y, r.w, r.d).fill(KERB);
  const half = ROAD_W / 2;
  // sidewalks, then roads on top (each road runs only as far as it goes: ROAD_SEGS)
  for (const r of ROAD_SEGS) { const w = roadRect(r, SIDEWALK); g.roundRect(w.x, w.y, w.w, w.d, 12).fill(WALK); }
  for (const r of ROAD_SEGS) { const k = roadRect(r, 4); g.roundRect(k.x, k.y, k.w, k.d, 8).fill(KERB); }
  for (const r of ROAD_SEGS) { const rd = roadRect(r); g.roundRect(rd.x, rd.y, rd.w, rd.d, 6).fill(ROAD); }
  // dashed centre lines, skipping intersections
  const nearX = (x: number) => ROADS_X.some(rx => Math.abs(x - rx) < half + 30);
  const nearY = (y: number) => ROADS_Y.some(ry => Math.abs(y - ry) < half + 30);
  for (const r of ROAD_SEGS) {
    if (r.axis === 'h') { for (let x = r.from; x < r.to - 60; x += 70) if (!nearX(x) && !nearX(x + 40)) g.roundRect(x, r.at - 3, 40, 6, 3).fill(PAINT); }
    else for (let y = r.from; y < r.to - 60; y += 70) if (!nearY(y) && !nearY(y + 40)) g.roundRect(r.at - 3, y, 6, 40, 3).fill(PAINT);
  }
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

/** Where a building's front windows are: each one's centre x and top y (the glass is 56 x 40, from
 * (cx - 28, wy + 6)). The night lights them up (night.ts). */
export function windowSpots(b: Building): [number, number][] {
  if (b.id === 'storage' || b.id === 'garage') return [];
  const front = b.y + b.d - b.h, doorW = 66, doorX = b.x + b.w / 2 - doorW / 2;
  const n = Math.max(1, Math.floor((b.w - 80) / 130)), rows = b.h > 200 ? 2 : 1, rowH = (b.h - 20) / rows;
  const out: [number, number][] = [];
  for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) {
    const cx = b.x + (b.w / (n + 1)) * (i + 1), wy = front + 26 + r * rowH;
    const byDoor = Math.abs(cx - (doorX + doorW / 2)) < 80 && r === rows - 1;
    if (byDoor || b.bays?.some(x => Math.abs(cx - x) < 120) && r === rows - 1) continue;
    out.push([cx, wy]);
  }
  return out;
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
  if (b.id === 'storage') rollUpDoors(g, b, front);
  else if (b.id === 'garage') {   // one big roll-up door for the car
    const w = b.w * 0.62, x = b.x + (b.w - w) / 2, y = front + 34, h = b.h - 34;
    g.roundRect(x - 6, y - 6, w + 12, h + 6, 6).fill('#FFFFFF').roundRect(x, y, w, h, 4).fill('#B8C3CF');
    for (let k = y + 14; k < y + h - 4; k += 16) g.rect(x, k, w, 3).fill('#9AA3B0');
  }
  else for (const [cx, wy] of windowSpots(b)) {
    g.roundRect(cx - 34, wy, 68, 52, 6).fill(frame).roundRect(cx - 28, wy + 6, 56, 40, 4).fill(winC)
     .rect(cx - 1.5, wy + 6, 3, 40).fill(frame);
  }
  if (b.id !== 'garage') g.roundRect(doorX, b.y + b.d - doorH, doorW, doorH, 8).fill(shade(b.wall, 0.62))
   .circle(doorX + doorW - 14, b.y + b.d - doorH / 2, 4).fill(shade(b.wall, 0.4));
  for (const x of b.bays ?? []) {   // open vehicle bays, dark inside
    g.roundRect(x - 78, front + 30, 156, b.h - 30, 6).fill(frame).roundRect(x - 70, front + 38, 140, b.h - 38, 4).fill('#2C3440');
  }
  c.addChild(g);
  const deco = roofDeco(b);
  if (deco) c.addChild(deco);
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
/** Storage units: a row of numbered roll-up doors along the front. */
function rollUpDoors(g: Graphics, b: Building, front: number) {
  const n = Math.floor((b.w - 40) / 120), w = (b.w - 40) / n;
  for (let i = 0; i < n; i++) {
    const x = b.x + 20 + i * w + 8, y = front + 30, h = b.h - 30;
    if (Math.abs(x + (w - 16) / 2 - (b.x + b.w / 2)) < 50) continue;   // the office door
    g.roundRect(x, y, w - 16, h, 4).fill('#F4F6F8').roundRect(x + 4, y + 4, w - 24, h - 4, 3).fill('#F28C38');
    for (let k = y + 16; k < y + h - 4; k += 14) g.rect(x + 4, k, w - 24, 3).fill('#D9732A');
    g.roundRect(x + (w - 16) / 2 - 16, y + 10, 32, 22, 4).fill('#FFFFFF');
  }
}

/** Landmarks on the roofs so places are easy to spot from a distance. Drawn in roof space:
 * the roof's top-left is (b.x, b.y - b.h), its size b.w x b.d. */
function roofDeco(b: Building): Container | null {
  const g = new Graphics(), cx = b.x + b.w / 2, top = b.y - b.h, cy = top + b.d * 0.42;
  const W = '#FFFFFF';
  switch (b.id) {
    case 'burger': {   // a giant burger
      g.ellipse(cx, cy + 34, 92, 22).fill({ color: NAVY, alpha: 0.18 });
      g.roundRect(cx - 86, cy - 48, 172, 104, 50).fill(W);
      g.ellipse(cx, cy - 12, 78, 36).fill('#E3A12F').ellipse(cx, cy - 20, 70, 24).fill('#F0B84C');      // top bun
      for (const [dx, dy] of [[-30, -32], [0, -38], [28, -30], [-12, -24], [16, -22]]) g.ellipse(cx + dx, cy + dy, 5, 3).fill('#FFF1C6');   // seeds
      g.poly([cx - 80, cy + 6, cx - 60, cy + 18, cx - 40, cy + 6, cx - 20, cy + 18, cx, cy + 6, cx + 20, cy + 18, cx + 40, cy + 6, cx + 60, cy + 18, cx + 80, cy + 6, cx + 80, cy + 2, cx - 80, cy + 2]).fill('#6FBF5A');   // lettuce
      g.roundRect(cx - 76, cy + 12, 152, 18, 9).fill('#8A4B2A');                                        // patty
      g.roundRect(cx - 74, cy + 30, 148, 18, 9).fill('#E3A12F');                                        // bottom bun
      break;
    }
    case 'icecream': {   // a giant cone
      g.roundRect(cx - 52, cy - 86, 104, 160, 40).fill(W);
      g.poly([cx - 34, cy - 10, cx, cy + 66, cx + 34, cy - 10]).fill('#E3A857');
      for (let k = 0; k < 4; k++) g.rect(cx - 26 + k * 16, cy - 8, 2, 40 - k * 6).fill('#C98A3E');
      g.circle(cx, cy - 26, 30).fill('#FFB3C7').circle(cx - 14, cy - 50, 22).fill('#B8F0D8').circle(cx + 14, cy - 50, 22).fill('#FFF1C6')
       .circle(cx + 2, cy - 74, 8).fill('#E5484D');                                                     // cherry
      break;
    }
    case 'toys': {   // a teddy bear
      g.circle(cx, cy - 6, 52).fill(W).circle(cx - 32, cy - 44, 20).fill(W).circle(cx + 32, cy - 44, 20).fill(W);
      g.circle(cx - 32, cy - 44, 14).fill('#B07A4A').circle(cx + 32, cy - 44, 14).fill('#B07A4A').circle(cx, cy - 6, 44).fill('#C48A55')
       .ellipse(cx, cy + 8, 18, 13).fill('#E9C7A0').circle(cx, cy + 2, 5).fill(NAVY).circle(cx - 15, cy - 16, 4).fill(NAVY).circle(cx + 15, cy - 16, 4).fill(NAVY)
       .rect(cx - 22, cy + 30, 44, 10).fill('#E5484D');
      break;
    }
    case 'parts': {   // a gear
      const r = 40;
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.roundRect(cx + Math.cos(a) * r - 12, cy + Math.sin(a) * r * 0.8 - 12, 24, 24, 4).fill(W); }
      g.ellipse(cx, cy, r + 6, (r + 6) * 0.8).fill(W);
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.roundRect(cx + Math.cos(a) * r - 8, cy + Math.sin(a) * r * 0.8 - 8, 16, 16, 3).fill('#9AA3B0'); }
      g.ellipse(cx, cy, r, r * 0.8).fill('#9AA3B0').ellipse(cx, cy, 14, 11).fill('#34495E');
      break;
    }
    case 'school': {   // a flagpole with a waving flag
      const px = b.x + b.w - 70, py = top + b.d * 0.6;
      g.rect(px - 3, py - 140, 6, 140).fill(W).rect(px - 1.5, py - 138, 3, 138).fill('#9AA3B0');
      g.poly([px, py - 136, px + 64, py - 124, px + 58, py - 108, px, py - 96]).fill(W).poly([px + 2, py - 132, px + 58, py - 122, px + 53, py - 110, px + 2, py - 100]).fill('#E5484D');
      g.circle(px, py - 140, 6).fill('#F9C846');
      break;
    }
    case 'hospital':   // a big red cross
      g.circle(cx, cy, 52).fill(W).circle(cx, cy, 46).fill('#FFFFFF').roundRect(cx - 12, cy - 34, 24, 68, 4).fill('#E5484D').roundRect(cx - 34, cy - 12, 68, 24, 4).fill('#E5484D');
      break;
    case 'fire': {   // the alarm bell
      g.roundRect(cx - 40, cy - 58, 80, 76, 14).fill(W).roundRect(cx - 34, cy - 52, 68, 64, 10).fill('#8C2F2B');
      g.poly([cx - 20, cy - 4, cx - 14, cy - 40, cx + 14, cy - 40, cx + 20, cy - 4]).fill('#F9C846').circle(cx, cy, 6).fill('#E3A12F');
      break;
    }
    default:
      if (b.kind !== 'house') return null;
      // a chimney toward one end of the roof
      g.roundRect(b.x + b.w * 0.72 - 6, top + 8 - 6, 46, 64, 6).fill(W).roundRect(b.x + b.w * 0.72, top + 8, 34, 52, 4).fill('#B5654F')
       .rect(b.x + b.w * 0.72 - 2, top + 8, 38, 10).fill('#8A4B3A');
  }
  const c = new Container(); c.addChild(g);
  return c;
}

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

/** A forest pine, a bit taller than the town's trees. (x, y) is the foot of the trunk. */
export function drawPine(x: number, y: number, shade = 0): Container {
  const g = new Graphics();
  const H = 250, W = 150, base = y - 40, c1 = ['#3E8E5A', '#358052', '#4A9A63'][shade % 3];
  g.ellipse(x + SH.x + 6, y + 4, 60, 16).fill({ color: NAVY, alpha: SH.a });
  const tri = (w: number, top: number, bot: number) => [x - w / 2, bot, x, top, x + w / 2, bot];
  g.roundRect(x - 12 - BAND, base - 6, 24 + 2 * BAND, 46 + BAND, 6).fill('#FFFFFF');
  for (const [w, t, b] of [[W, base - H * 0.55, base], [W * 0.8, base - H * 0.8, base - H * 0.35], [W * 0.55, base - H, base - H * 0.62]] as const)
    g.poly(tri(w + BAND * 3, t - BAND * 2, b + BAND)).fill('#FFFFFF');
  g.roundRect(x - 12, base - 6, 24, 46, 5).fill('#7A5236');
  for (const [w, t, b] of [[W, base - H * 0.55, base], [W * 0.8, base - H * 0.8, base - H * 0.35], [W * 0.55, base - H, base - H * 0.62]] as const)
    g.poly(tri(w, t, b)).fill(c1);
  g.poly([x - 10, base - H * 0.95, x, base - H, x + 16, base - H * 0.7]).fill({ color: '#FFFFFF', alpha: 0.12 });
  const c = new Container(); c.addChild(g); c.zIndex = y;
  return c;
}

/** The slide and the swing frame (not solid), plus the swing seats. The seats hang from
 * the bar and are separate layer items drawn just in front of the frame, so a swing can
 * move and Nico can sit between the frame and his seat's chains. */
export interface Seat { set(chain: number): void }   // a swing seat: 1 = hanging still

export function drawPlayground(): { items: Container[]; seats: Seat[] } {
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
  // Each seat hangs from the bar (origin at the bar; scale.y swings it toward the camera).
  // The plank draws just behind a sitting Nico and the chains just in front of him, so he
  // sits on it rather than having it across his lap.
  const l = SWING_SEAT - SWING_BAR;
  const seatParts = SWINGS.seats.map(ox => {
    const plank = new Container(), chains = new Container();
    plank.addChild(new Graphics().roundRect(-44, l - 6, 88, 13, 5).fill('#3E8F8A'));   // wider than Nico, so it shows at his hips
    chains.addChild(new Graphics().rect(-34, 0, 3, l).fill('#34495E').rect(31, 0, 3, l).fill('#34495E'));   // at his hands
    for (const c of [plank, chains]) c.position.set(wx + ox, SWING_BAR);
    plank.zIndex = wy + 0.5; chains.zIndex = wy + 2;
    return { plank, chains };
  });
  const seats: Seat[] = seatParts.map(({ plank, chains }) => ({ set: (k: number) => { plank.scale.y = chains.scale.y = k; } }));
  const a = new Container(); a.addChild(slideShadow, slide); a.zIndex = sy;
  const b = new Container(); b.addChild(swingShadow, swings); b.zIndex = wy;
  return { items: [a, b, ...seatParts.flatMap(p => [p.plank, p.chains])], seats };
}

/** Street furniture and bits of life (data in map.ts PROPS). (x, y) is where it meets the ground. */
export function drawProp(p: Prop): Container {
  const c = new Container(), g = new Graphics();
  const { x, y } = p;
  const sh = (w: number, h: number, oy = 0) => g.ellipse(x + SH.x, y + oy + 3, w, h).fill({ color: NAVY, alpha: SH.a });
  switch (p.kind) {
    case 'lamp':
      sh(14, 5);
      g.roundRect(x - 5 - BAND / 2, y - 120, 10 + BAND, 122, 5).fill('#FFFFFF').roundRect(x - 5, y - 118, 10, 118, 4).fill('#34495E');
      g.roundRect(x - 18, y - 138, 36, 24, 10).fill('#FFFFFF').roundRect(x - 14, y - 134, 28, 18, 8).fill('#34495E')
       .roundRect(x - 10, y - 122, 20, 8, 3).fill('#FFE9A8');
      break;
    case 'hydrant':
      sh(14, 5);
      g.roundRect(x - 13, y - 44, 26, 46, 10).fill('#FFFFFF').roundRect(x - 9, y - 40, 18, 40, 7).fill('#E5484D')
       .roundRect(x - 13, y - 30, 26, 8, 4).fill('#C2353A').circle(x, y - 42, 6).fill('#C2353A');
      break;
    case 'mailbox':
      sh(12, 4);
      g.rect(x - 3, y - 50, 6, 50).fill('#8A5A3B');
      g.roundRect(x - 18, y - 76, 36, 30, 12).fill('#FFFFFF').roundRect(x - 14, y - 72, 28, 22, 10).fill('#5B8FD6').rect(x + 10, y - 82, 4, 14).fill('#E5484D');
      break;
    case 'bench':
      sh(48, 8);
      g.roundRect(x - 50, y - 52, 100, 46, 8).fill('#FFFFFF');
      g.roundRect(x - 44, y - 48, 88, 12, 4).fill('#B07A4A').roundRect(x - 44, y - 30, 88, 12, 4).fill('#C48A55')
       .rect(x - 40, y - 18, 6, 18).fill('#34495E').rect(x + 34, y - 18, 6, 18).fill('#34495E');
      break;
    case 'bush':
      sh(30, 8);
      g.circle(x - 16, y - 22, 24).fill('#FFFFFF').circle(x + 14, y - 24, 26).fill('#FFFFFF');
      g.circle(x - 16, y - 22, 18).fill('#4E9A5B').circle(x + 14, y - 24, 20).fill('#5FAF6A').circle(x + 4, y - 34, 10).fill('#7CC383');
      break;
    case 'flowers':
      for (let i = 0; i < 9; i++) {
        const fx = x - 50 + (i % 5) * 25 + (i > 4 ? 12 : 0), fy = y - 8 - (i > 4 ? 16 : 0);
        g.rect(fx - 1, fy, 2, 10).fill('#4E9A5B').circle(fx, fy, 7).fill(p.color ?? '#F06A8A').circle(fx, fy, 2.5).fill('#FFE29A');
      }
      break;
    case 'table':
      sh(32, 7);
      g.rect(x - 2, y - 74, 4, 70).fill('#34495E');
      g.roundRect(x - 34, y - 34, 68, 14, 5).fill('#FFFFFF').roundRect(x - 30, y - 32, 60, 10, 4).fill('#C48A55');
      g.poly([x - 46, y - 74, x, y - 104, x + 46, y - 74]).fill('#FFFFFF').poly([x - 40, y - 76, x, y - 100, x + 40, y - 76]).fill(p.color ?? '#D9534F');
      g.poly([x - 13, y - 76, x, y - 100, x + 13, y - 76]).fill('#FFFFFF');
      break;
    case 'fountain':
      sh(74, 14);
      g.ellipse(x, y - 14, 76, 26).fill('#FFFFFF').ellipse(x, y - 14, 68, 20).fill('#B8C3CF').ellipse(x, y - 18, 58, 14).fill('#7CC6E6');
      g.roundRect(x - 10, y - 70, 20, 56, 6).fill('#FFFFFF').roundRect(x - 6, y - 66, 12, 52, 5).fill('#B8C3CF');
      g.ellipse(x, y - 70, 30, 9).fill('#FFFFFF').ellipse(x, y - 70, 24, 6).fill('#7CC6E6');
      g.circle(x, y - 84, 8).fill({ color: '#CFEFFF', alpha: 0.9 }).circle(x - 14, y - 76, 5).fill({ color: '#CFEFFF', alpha: 0.8 }).circle(x + 14, y - 76, 5).fill({ color: '#CFEFFF', alpha: 0.8 });
      break;
    case 'cart':
      sh(52, 9);
      g.roundRect(x - 56, y - 74, 112, 64, 12).fill('#FFFFFF').roundRect(x - 50, y - 68, 100, 52, 9).fill('#FFD6E0')
       .rect(x - 50, y - 46, 100, 8).fill('#7FD1C1');
      g.circle(x - 30, y - 8, 12).fill('#FFFFFF').circle(x - 30, y - 8, 8).fill('#34495E').circle(x + 30, y - 8, 12).fill('#FFFFFF').circle(x + 30, y - 8, 8).fill('#34495E');
      g.rect(x - 2, y - 130, 4, 60).fill('#34495E');
      g.poly([x - 60, y - 120, x, y - 150, x + 60, y - 120]).fill('#FFFFFF').poly([x - 54, y - 122, x, y - 146, x + 54, y - 122]).fill('#F06A8A');
      g.poly([x - 18, y - 122, x, y - 146, x + 18, y - 122]).fill('#FFFFFF');
      g.poly([x + 22, y - 82, x + 30, y - 60, x + 38, y - 82]).fill('#E3A857').circle(x + 30, y - 86, 9).fill('#B8F0D8');   // a cone on top
      break;
    case 'cone':
      sh(14, 4);
      g.poly([x - 16, y, x, y - 40, x + 16, y]).fill('#FFFFFF').poly([x - 11, y - 3, x, y - 35, x + 11, y - 3]).fill('#F28C38')
       .rect(x - 7, y - 20, 14, 5).fill('#FFFFFF');
      break;
    case 'busstop':
      // a shelter: glass back, a roof, a bench, and the bus sign on a pole
      sh(64, 9);
      g.roundRect(x - 66, y - 118, 132, 122, 10).fill('#FFFFFF');
      g.roundRect(x - 60, y - 112, 120, 104, 6).fill({ color: '#CFE6F7', alpha: 0.85 }).rect(x - 60, y - 112, 120, 12).fill('#34495E');
      g.rect(x - 58, y - 100, 4, 100).fill('#34495E').rect(x + 54, y - 100, 4, 100).fill('#34495E');
      g.roundRect(x - 44, y - 34, 88, 12, 4).fill('#C48A55').rect(x - 40, y - 22, 5, 22).fill('#34495E').rect(x + 35, y - 22, 5, 22).fill('#34495E');
      g.rect(x + 70, y - 130, 5, 132).fill('#34495E').circle(x + 72, y - 136, 16).fill('#FFFFFF').circle(x + 72, y - 136, 12).fill('#F7C21B')
       .roundRect(x + 64, y - 140, 16, 9, 2).fill('#2B3F55');
      break;
    case 'umbrella': {
      const col = p.color ?? '#E5484D';
      sh(40, 10, 0);
      g.rect(x - 2, y - 110, 4, 112).fill('#FFFFFF').rect(x - 1, y - 108, 2, 108).fill('#8A6A48');
      g.ellipse(x, y - 110, 74, 26).fill('#FFFFFF').ellipse(x, y - 110, 70, 22).fill(col);
      for (const dx of [-35, 0, 35]) g.ellipse(x + dx, y - 108, 10, 16).fill({ color: '#FFFFFF', alpha: 0.5 });
      break;
    }
    case 'towel': g.roundRect(x - 50, y - 20, 100, 40, 6).fill('#FFFFFF').roundRect(x - 47, y - 17, 94, 34, 5).fill(p.color ?? '#5B8FD6')
      .rect(x - 47, y - 6, 94, 8).fill({ color: '#FFFFFF', alpha: 0.6 }); break;
    case 'sandcastle':
      sh(46, 9);
      g.roundRect(x - 48, y - 40, 96, 42, 4).fill('#FFFFFF').roundRect(x - 44, y - 36, 88, 36, 3).fill('#E8C77A');
      for (const dx of [-36, 0, 36]) g.roundRect(x + dx - 13, y - 66, 26, 32, 3).fill('#FFFFFF').roundRect(x + dx - 10, y - 63, 20, 28, 2).fill('#DDBA6A');
      g.rect(x - 1, y - 92, 2, 28).fill('#2B3F55').poly([x + 1, y - 92, x + 18, y - 86, x + 1, y - 80]).fill('#E5484D'); break;
    case 'lifeguard':
      sh(44, 10);
      g.rect(x - 34, y - 110, 6, 112).fill('#FFFFFF').rect(x + 28, y - 110, 6, 112).fill('#FFFFFF');
      g.rect(x - 33, y - 108, 4, 108).fill('#F0F0F0').rect(x + 29, y - 108, 4, 108).fill('#F0F0F0');
      g.roundRect(x - 40, y - 140, 80, 36, 6).fill('#FFFFFF').roundRect(x - 36, y - 136, 72, 28, 5).fill('#E5484D');
      g.roundRect(x - 30, y - 186, 60, 46, 8).fill('#FFFFFF').roundRect(x - 26, y - 182, 52, 38, 6).fill('#F9C846');
      for (let k = y - 90; k < y; k += 22) g.rect(x - 30, k, 60, 5).fill('#FFFFFF'); break;
    case 'palm': {
      sh(50, 12, 0);
      const top = y - 210;
      g.moveTo(x, y).quadraticCurveTo(x + 30, y - 100, x + 10, top).stroke({ width: 26, color: '#FFFFFF', cap: 'round' });
      g.moveTo(x, y).quadraticCurveTo(x + 30, y - 100, x + 10, top).stroke({ width: 18, color: '#B48A5A', cap: 'round' });
      for (const a of [-2.6, -1.9, -1.2, -0.5, 0.2]) {
        const ex = x + 10 + Math.cos(a) * 90, ey = top + Math.sin(a) * 50 + 30;
        g.moveTo(x + 10, top).quadraticCurveTo((x + 10 + ex) / 2, top - 40, ex, ey).stroke({ width: 24, color: '#FFFFFF', cap: 'round' });
        g.moveTo(x + 10, top).quadraticCurveTo((x + 10 + ex) / 2, top - 40, ex, ey).stroke({ width: 16, color: '#3E9B57', cap: 'round' });
      }
      g.circle(x + 4, top + 6, 9).fill('#7A5236').circle(x + 18, top + 8, 9).fill('#7A5236'); break;
    }
    case 'lighthouse':
      sh(70, 16);
      g.poly([x - 56, y, x - 34, y - 300, x + 34, y - 300, x + 56, y]).fill('#FFFFFF');
      g.poly([x - 52, y - 2, x - 31, y - 296, x + 31, y - 296, x + 52, y - 2]).fill('#F4F6F8');
      for (const [a, b] of [[30, 90], [150, 210]]) g.poly([x - 52 + a * 0.07, y - a, x - 52 + b * 0.07, y - b, x + 52 - b * 0.07, y - b, x + 52 - a * 0.07, y - a]).fill('#E5484D');
      g.roundRect(x - 46, y - 330, 92, 34, 6).fill('#FFFFFF').roundRect(x - 42, y - 326, 84, 26, 4).fill('#2B3F55');
      g.roundRect(x - 30, y - 382, 60, 54, 10).fill('#FFFFFF').roundRect(x - 26, y - 378, 52, 46, 8).fill('#FFE066');
      g.poly([x - 38, y - 380, x, y - 420, x + 38, y - 380]).fill('#E5484D');
      g.roundRect(x - 14, y - 60, 28, 60, 8).fill('#2B3F55'); break;
    case 'waterslide': {
      // a tall tower with a ladder, and a twisting blue chute down to the pool
      sh(60, 12);
      g.roundRect(x - 50, y - 300, 100, 302, 10).fill('#FFFFFF').roundRect(x - 44, y - 294, 88, 294, 8).fill('#F9A826');
      for (let k = y - 280; k < y - 10; k += 28) g.rect(x - 30, k, 60, 8).fill('#FFE29A');
      g.roundRect(x - 56, y - 316, 112, 24, 8).fill('#FFFFFF').roundRect(x - 52, y - 312, 104, 16, 6).fill('#D9822B');
      g.moveTo(x + 40, y - 300).bezierCurveTo(x + 260, y - 300, x + 40, y - 150, x + 230, y + 50).stroke({ width: 44, color: '#FFFFFF', cap: 'round' });
      g.moveTo(x + 40, y - 300).bezierCurveTo(x + 260, y - 300, x + 40, y - 150, x + 230, y + 50).stroke({ width: 34, color: '#2F7FD8', cap: 'round' });
      g.moveTo(x + 40, y - 300).bezierCurveTo(x + 260, y - 300, x + 40, y - 150, x + 230, y + 50).stroke({ width: 10, color: '#7CC6E6', cap: 'round' });
      break;
    }
    case 'lounge':
      sh(26, 8);
      g.roundRect(x - 24, y - 70, 48, 72, 8).fill('#FFFFFF').roundRect(x - 20, y - 66, 40, 64, 6).fill('#F7F7F2');
      g.roundRect(x - 20, y - 66, 40, 22, 6).fill('#7FD1E8'); for (let k = y - 40; k < y - 4; k += 9) g.rect(x - 20, k, 40, 3).fill('#7FD1E8'); break;
    case 'hay':
      sh(36, 9);
      g.roundRect(x - 36, y - 46, 72, 48, 10).fill('#FFFFFF').roundRect(x - 32, y - 42, 64, 40, 8).fill('#E8C35A');
      g.rect(x - 32, y - 30, 64, 4).fill('#C9A23E').rect(x - 32, y - 16, 64, 4).fill('#C9A23E'); break;
    case 'fence': {
      const L = p.len ?? 100;
      g.rect(x, y - 34, L, 6).fill('#FFFFFF').rect(x, y - 18, L, 6).fill('#FFFFFF');
      g.rect(x, y - 33, L, 4).fill('#B9895A').rect(x, y - 17, L, 4).fill('#B9895A');
      for (let k = x; k <= x + L; k += 70) g.roundRect(k - 5, y - 44, 10, 46, 3).fill('#FFFFFF').roundRect(k - 3, y - 42, 6, 42, 2).fill('#8A5A3B');
      break;
    }
    case 'fencev': {   // a fence running down the screen: posts one above another, rails between
      const L = p.len ?? 100;
      for (let k = y; k <= y + L; k += 70) g.roundRect(x - 5, k - 44, 10, 46, 3).fill('#FFFFFF').roundRect(x - 3, k - 42, 6, 42, 2).fill('#8A5A3B');
      g.rect(x - 3, y - 34, 6, L).fill('#FFFFFF').rect(x - 2, y - 33, 4, L - 2).fill('#B9895A');
      break;
    }
    case 'tent': {
      const col = p.color ?? '#F9A826';
      sh(72, 14);
      g.poly([x - 76, y + 2, x, y - 120, x + 76, y + 2]).fill('#FFFFFF').poly([x - 70, y - 2, x, y - 112, x + 70, y - 2]).fill(col);
      g.poly([x - 22, y - 2, x, y - 60, x + 22, y - 2]).fill('#2B3F55').poly([x, y - 112, x + 70, y - 2, x + 40, y - 2]).fill({ color: '#000000', alpha: 0.12 }); break;
    }
    case 'campfire':
      sh(34, 8);
      g.ellipse(x, y - 6, 34, 14).fill('#FFFFFF').ellipse(x, y - 6, 30, 11).fill('#8E8E8E');
      g.roundRect(x - 26, y - 16, 52, 10, 4).fill('#7A5236').roundRect(x - 20, y - 22, 40, 10, 4).fill('#5E3E28');
      g.poly([x - 18, y - 16, x - 6, y - 58, x + 4, y - 30, x + 12, y - 66, x + 20, y - 16]).fill('#F28C38');
      g.poly([x - 9, y - 16, x - 2, y - 40, x + 5, y - 26, x + 10, y - 44, x + 13, y - 16]).fill('#FFD45C'); break;
    case 'log':
      sh(46, 8);
      g.roundRect(x - 48, y - 30, 96, 32, 14).fill('#FFFFFF').roundRect(x - 44, y - 26, 88, 24, 11).fill('#8A5A3B');
      g.ellipse(x + 38, y - 14, 8, 11).fill('#C9A27A'); break;
    case 'rock':
      sh(42, 10);
      g.ellipse(x, y - 22, 44, 28).fill('#FFFFFF').ellipse(x, y - 22, 40, 24).fill('#9AA3AD').ellipse(x - 10, y - 30, 18, 9).fill('#B8C0C8'); break;
    case 'parked': break;   // drawn as a car sprite by the caller
  }
  c.addChild(g); c.zIndex = y;
  return c;
}

/** A goal: two posts, a crossbar and a net, mouth facing the middle of the field. */
export function drawGoal(gx: number, gy: number, side: number): Container {
  const g = new Graphics(), half = GOAL_MOUTH / 2, depth = 46 * side;
  // net (behind), then the frame
  const net = [gx, gy - half - 78, gx + depth, gy - half - 40, gx + depth, gy + half, gx, gy + half];
  g.poly(net).fill({ color: '#FFFFFF', alpha: 0.45 });
  for (let i = 1; i < 8; i++) g.rect(gx + (depth < 0 ? depth : 0), gy - half - 70 + i * ((GOAL_MOUTH + 70) / 8), Math.abs(depth), 2).fill({ color: '#FFFFFF', alpha: 0.8 });
  for (let i = 1; i < 4; i++) g.rect(gx + depth * i / 4 - 1, gy - half - 70 + 10 * i, 2, GOAL_MOUTH + 60 - 10 * i).fill({ color: '#FFFFFF', alpha: 0.8 });
  g.poly(net).stroke({ width: 3, color: '#FFFFFF' });
  g.roundRect(gx - 7, gy - half - 78, 14, 84, 6).fill('#FFFFFF').roundRect(gx - 7, gy + half - 78, 14, 84, 6).fill('#FFFFFF')
   .roundRect(gx - 7, gy - half - 78, 14, GOAL_MOUTH + 10, 6).fill('#FFFFFF');
  g.roundRect(gx - 4, gy - half - 75, 8, 78, 4).fill('#E9EEF3').roundRect(gx - 4, gy + half - 75, 8, 78, 4).fill('#E9EEF3')
   .roundRect(gx - 4, gy - half - 75, 8, GOAL_MOUTH + 4, 4).fill('#E9EEF3');
  const c = new Container(); c.addChild(g); c.zIndex = gy + half;
  return c;
}

export function drawWorld(layer: Container): { seats: Seat[] } {
  for (const b of BUILDINGS) layer.addChild(drawBuilding(b));
  for (const p of PROPS) if (p.kind !== 'parked') layer.addChild(drawProp(p));
  for (const gl of GOALS) layer.addChild(drawGoal(gl.x, gl.y, gl.side));
  for (const [x, y] of TREES) layer.addChild(drawTree(x, y));
  PINES.forEach(([x, y], i) => layer.addChild(drawPine(x, y, i)));
  const pg = drawPlayground();
  for (const p of pg.items) layer.addChild(p);
  return { seats: pg.seats };
}
