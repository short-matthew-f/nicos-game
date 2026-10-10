// Static world art in the sticker style: flat fills, a white outline band and a soft
// navy shadow offset down-right. Static things draw the band as geometry (cheap);
// only characters use the live outline filter.
import { Container, Graphics, Text } from 'pixi.js';
import { BUILDINGS, DRIVEWAYS, LOTS, SLIDE, SWINGS, SWING_BAR, SWING_SEAT, POND, FIELD, GOALS, GOAL_MOUTH, PROPS, type Prop, TREES, WORLD, ROADS_X, ROADS_Y, ROAD_W, SIDEWALK, type Building } from './map';

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
  // a scatter of lighter and darker grass tufts so the lawns aren't flat
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 900; i++) {
    const x = rnd() * WORLD.w, y = rnd() * WORLD.h, c = rnd() < 0.5 ? '#AFD392' : '#C6E3AA';
    g.ellipse(x, y, 10 + rnd() * 14, 4 + rnd() * 4).fill(c);
  }
  for (const l of LOTS) g.roundRect(l.x, l.y, l.w, l.d, 18).fill(l.fill);
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
      g.roundRect(x - 5 - BAND / 2, y - 150, 10 + BAND, 152, 5).fill('#FFFFFF').roundRect(x - 5, y - 148, 10, 148, 4).fill('#34495E');
      g.roundRect(x - 18, y - 168, 36, 24, 10).fill('#FFFFFF').roundRect(x - 14, y - 164, 28, 18, 8).fill('#34495E')
       .roundRect(x - 10, y - 152, 20, 8, 3).fill('#FFE9A8');
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
  const pg = drawPlayground();
  for (const p of pg.items) layer.addChild(p);
  return { seats: pg.seats };
}
