// Inside buildings (Nico: "buildings should have insides"). A room is data: its size, the
// back wall, a counter with someone working behind it, tables, and the way out. Walking in
// through a door swaps the town for the room (the town keeps going, unseen). First: Burger
// Barn, where you order at the counter, carry your tray to a table and eat.
import { Container, Graphics, Text } from 'pixi.js';
import { NAVY, BAND } from './draw';
import type { Rect } from './map';
import { WALLPAPERS, RUGS } from '../decor';

export interface Room {
  id: string;                         // the building it's inside
  w: number; h: number;
  wall: string; wallTrim: string; floor: [string, string];
  counter: Rect; worker: { who: string; x: number; y: number };
  order: [number, number];            // where you stand to order
  tables: [number, number][];         // table centres; you sit just below each
  enter: [number, number];            // where you appear, just inside the door
  door: [number, number];             // stand here to leave
  menuTitle: string;
}

export const ROOMS: Record<string, Room> = {
  burger: {
    id: 'burger', w: 1300, h: 900, wall: '#C8463D', wallTrim: '#FFFFFF', floor: ['#F4E9D8', '#E9D9BF'],
    counter: { x: 400, y: 400, w: 500, d: 70 }, worker: { who: 'cook', x: 650, y: 392 },   // (low enough that the cook doesn't hide the menu board)
    order: [650, 540], tables: [[300, 700], [650, 740], [1000, 700]],
    enter: [650, 810], door: [650, 850], menuTitle: 'BURGER BARN',
  },
};
export const WALL_H = 210;   // the back wall's depth: you can't walk into it
export const SEAT = 70;      // how far below a table's centre the 'sit' spot is
export const TABLE_TOP = 62;   // how high a tabletop is (px above the floor)
export const STOOL_SEAT = 43;  // ...and a stool's seat
export const STOOL = 90;     // the stools, either side of a table: you sit on the left one, facing it

/** What you bump into inside a room. */
export function roomSolids(r: Room): Rect[] {
  return [
    { x: 0, y: 0, w: r.w, d: WALL_H },
    { x: r.counter.x, y: r.counter.y - 10, w: r.counter.w, d: r.counter.d + 10 },
    ...r.tables.map(([x, y]) => ({ x: x - 62, y: y - 26, w: 124, d: 40 })),
  ];
}

/** Draw a room: floor, back wall with the menu board, counter (in front of the worker), tables. */
export function drawRoom(r: Room, menu: { label: string; price: number }[]): { view: Container; layer: Container } {
  const view = new Container(), floor = new Graphics(), layer = new Container(); layer.sortableChildren = true;
  // a dark surround, so a small room doesn't float in nothing
  floor.rect(-3000, -3000, r.w + 6000, r.h + 6000).fill('#2B2320');
  for (let y = WALL_H; y < r.h; y += 80) for (let x = 0; x < r.w; x += 80) floor.rect(x, y, 80, 80).fill(((x + y) / 80) % 2 ? r.floor[0] : r.floor[1]);
  floor.rect(0, 0, r.w, WALL_H).fill(r.wall).rect(0, WALL_H - 14, r.w, 14).fill(r.wallTrim);
  for (let x = 40; x < r.w; x += 120) floor.rect(x, 20, 6, WALL_H - 40).fill({ color: '#000000', alpha: 0.06 });   // wall boards
  floor.rect(0, WALL_H, 26, r.h - WALL_H).fill('#8E3029').rect(r.w - 26, WALL_H, 26, r.h - WALL_H).fill('#8E3029');   // side walls
  floor.roundRect(r.door[0] - 90, r.h - 40, 180, 40, 8).fill('#7A5236');   // door mat
  // the menu board
  const bx = r.w / 2 - 230, by = 26, bw = 460, bh = 150;
  floor.roundRect(bx - BAND - 4, by - BAND - 4, bw + 2 * BAND + 8, bh + 2 * BAND + 8, 12).fill('#FFFFFF').roundRect(bx, by, bw, bh, 10).fill('#2B3F55');
  view.addChild(floor);
  const t = new Text({ text: r.menuTitle, style: { fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '900', fontSize: 26, fill: '#F9C846' } });
  t.anchor.set(0.5, 0); t.position.set(r.w / 2, by + 10); view.addChild(t);
  menu.forEach((m, i) => {
    const line = new Text({ text: `${m.label}   $${m.price}`, style: { fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '700', fontSize: 22, fill: '#FFFFFF' } });
    line.anchor.set(0.5, 0); line.position.set(r.w / 2, by + 48 + i * 30); view.addChild(line);
  });
  // a drinks machine and a plant against the back wall
  const deco = new Graphics()
    .roundRect(120 - BAND, 70 - BAND, 120 + 2 * BAND, 150 + BAND, 10).fill('#FFFFFF').roundRect(120, 70, 120, 150, 8).fill('#D9534F')
    .roundRect(135, 90, 90, 40, 6).fill('#BFE3F5').roundRect(150, 150, 24, 40, 4).fill('#2B3F55').roundRect(186, 150, 24, 40, 4).fill('#2B3F55')
    .roundRect(r.w - 190, 150, 70, 60, 8).fill('#B9895A').circle(r.w - 155, 120, 44).fill('#5FAF6A').circle(r.w - 175, 100, 24).fill('#7CC383');
  deco.zIndex = WALL_H; layer.addChild(deco);
  // the counter: a top and a front, drawn in front of whoever's behind it
  const c = r.counter, counter = new Graphics();
  counter.ellipse(c.x + c.w / 2 + 8, c.y + c.d + 6, c.w / 2 + 10, 14).fill({ color: NAVY, alpha: 0.18 });
  counter.roundRect(c.x - BAND, c.y - 40 - BAND, c.w + 2 * BAND, c.d + 40 + 2 * BAND, 10).fill('#FFFFFF');
  counter.roundRect(c.x, c.y - 40, c.w, 34, 8).fill('#E8D7B5').roundRect(c.x, c.y - 8, c.w, c.d + 8, 8).fill('#C8463D');
  for (let x = c.x + 30; x < c.x + c.w - 20; x += 60) counter.rect(x, c.y + 4, 30, c.d - 16).fill({ color: '#FFFFFF', alpha: 0.25 });
  counter.roundRect(c.x + c.w - 120, c.y - 70, 70, 40, 6).fill('#2B3F55').roundRect(c.x + c.w - 112, c.y - 64, 54, 18, 3).fill('#7CD3A0');   // the till
  counter.roundRect(c.x + 30, c.y - 52, 90, 14, 4).fill('#9AA6B2').roundRect(c.x + 34, c.y - 62, 82, 12, 4).fill('#B8C3CF');               // a stack of trays
  counter.zIndex = c.y + c.d; layer.addChild(counter);
  // round tables, each with two stools
  for (const [x, y] of r.tables) {
    const g = new Graphics(), stools = new Graphics();
    g.ellipse(x + 8, y + 12, 70, 18).fill({ color: NAVY, alpha: 0.16 });
    // stools at the same three-quarter angle as the table: an oval seat on a post, a little foot on the floor
    for (const sx of [-STOOL, STOOL]) {
      const cx = x + sx, fy = y + 14;
      stools.ellipse(cx + 6, fy + 4, 20, 6).fill({ color: NAVY, alpha: 0.16 });
      stools.roundRect(cx - 5 - BAND, fy - 40, 10 + 2 * BAND, 40 + BAND, 4).fill('#FFFFFF').ellipse(cx, fy, 16 + BAND, 6 + BAND).fill('#FFFFFF');
      stools.roundRect(cx - 5, fy - 40, 10, 40, 3).fill('#9AA6B2').ellipse(cx, fy, 16, 6).fill('#7D8A98');
      stools.ellipse(cx, fy - 42, 26 + BAND, 11 + BAND).fill('#FFFFFF').ellipse(cx, fy - 40, 26, 10).fill('#D9822B').ellipse(cx, fy - 43, 26, 10).fill('#F9A826');
    }
    stools.zIndex = y; layer.addChild(stools);   // (behind whoever's sitting on them)
    // a pedestal table, its top a little above the stools' seats
    g.ellipse(x, y + 10, 30 + BAND, 10 + BAND).fill('#FFFFFF').ellipse(x, y + 10, 30, 10).fill('#7D8A98');
    g.roundRect(x - 8 - BAND, y - TABLE_TOP, 16 + 2 * BAND, TABLE_TOP + 10, 4).fill('#FFFFFF').roundRect(x - 8, y - TABLE_TOP, 16, TABLE_TOP + 8, 3).fill('#9AA6B2');
    g.ellipse(x, y - TABLE_TOP, 66 + BAND, 28 + BAND).fill('#FFFFFF').ellipse(x, y - TABLE_TOP + 4, 66, 28).fill('#C9D3DC').ellipse(x, y - TABLE_TOP, 66, 28).fill('#F4F6F8').ellipse(x, y - TABLE_TOP - 2, 56, 21).fill('#E9EEF3');
    g.zIndex = y + 14; layer.addChild(g);
  }
  view.addChild(layer);
  return { view, layer };
}

/** A tray with something on it (carried, or on a table while you eat). */
export function trayArt(emoji: string): Container {
  const c = new Container(), g = new Graphics().roundRect(-30, -10, 60, 20, 6).fill('#FFFFFF').roundRect(-27, -8, 54, 16, 5).fill('#E5484D');
  const t = new Text({ text: emoji, style: { fontSize: 30 } }); t.anchor.set(0.5, 0.9); t.position.set(0, -2);
  c.addChild(g, t); return c;
}

// ---- the storage building: a hallway of roll-up doors (each a unit for sale), an office desk
export const HALL_ROOM = { w: 1960, h: 780, wall: 300 };
export const doorX = (i: number) => 360 + i * 260;          // each door's centre
export const DOOR_W = 210;
export const HALL_DESK = { x: 40, y: 380, w: 200, d: 56 };   // the office desk (the clerk stands behind it)
export const HALL_EXIT: [number, number] = [HALL_ROOM.w / 2, HALL_ROOM.h - 30];

export interface DoorView { g: Graphics; sign: Text; note: Text; peek: Text }
export function drawHall(): { view: Container; layer: Container; doors: DoorView[] } {
  const view = new Container(), floor = new Graphics(), layer = new Container(); layer.sortableChildren = true;
  const { w, h, wall } = HALL_ROOM;
  floor.rect(-3000, -3000, w + 6000, h + 6000).fill('#23272E');
  floor.rect(0, wall, w, h - wall).fill('#C9CCC4');
  for (let x = 0; x < w; x += 160) floor.rect(x, wall, 3, h - wall).fill({ color: '#000000', alpha: 0.05 });   // floor joints
  floor.rect(0, 0, w, wall).fill('#8E9AA6');
  for (let y = 10; y < wall; y += 22) floor.rect(0, y, w, 6).fill({ color: '#FFFFFF', alpha: 0.08 });   // corrugated wall
  floor.rect(0, wall - 12, w, 12).fill('#6B7782');
  floor.roundRect(HALL_EXIT[0] - 100, h - 34, 200, 34, 8).fill('#4B5560');   // the way out
  view.addChild(floor);
  const doors: DoorView[] = [];
  for (let i = 0; i < 6; i++) {
    const g = new Graphics(); view.addChild(g);
    const st = { fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '900' as const, fill: '#2B3F55' };
    const sign = new Text({ text: '', style: { ...st, fontSize: 24 } }); sign.anchor.set(0.5); sign.position.set(doorX(i), 40);
    const note = new Text({ text: '', style: { ...st, fontSize: 18, fill: '#FFFFFF', fontWeight: '800' as const } }); note.anchor.set(0.5); note.position.set(doorX(i), 190);
    const peek = new Text({ text: '', style: { fontSize: 26 } }); peek.anchor.set(0.5, 1); peek.position.set(doorX(i), wall - 4);
    view.addChild(sign, note, peek);
    doors.push({ g, sign, note, peek });
  }
  // the office: a desk, a sign
  const d = HALL_DESK, desk = new Graphics()
    .roundRect(d.x - BAND, d.y - 40 - BAND, d.w + 2 * BAND, d.d + 40 + 2 * BAND, 8).fill('#FFFFFF')
    .roundRect(d.x, d.y - 40, d.w, 34, 6).fill('#D8C7A0').roundRect(d.x, d.y - 8, d.w, d.d + 8, 6).fill('#E3A857')
    .roundRect(d.x + 120, d.y - 66, 54, 30, 4).fill('#2B3F55');
  desk.zIndex = d.y + d.d; layer.addChild(desk);
  const office = new Text({ text: 'OFFICE', style: { fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '900', fontSize: 20, fill: '#FFFFFF' } });
  office.anchor.set(0.5); office.position.set(d.x + d.w / 2, 150); view.addChild(office);
  view.addChild(layer);
  return { view, layer, doors };
}

/** Redraw one door: for sale (closed, with a gap you can peek through), yours (rolled up, open), sold, or locked. */
export function paintDoor(v: DoorView, i: number, state: 'sale' | 'yours' | 'sold' | 'locked', sign: string, note: string, peek: string) {
  const x = doorX(i) - DOOR_W / 2, top = 64, bottom = HALL_ROOM.wall - 2, g = v.g.clear();
  g.roundRect(x - BAND - 6, top - BAND - 6, DOOR_W + 2 * BAND + 12, bottom - top + BAND + 6, 8).fill('#FFFFFF').roundRect(x - 6, top - 6, DOOR_W + 12, bottom - top + 6, 6).fill('#5A6570');
  g.roundRect(x + 30 - BAND, 20 - BAND, DOOR_W - 60 + 2 * BAND, 40 + 2 * BAND, 8).fill('#FFFFFF').roundRect(x + 30, 20, DOOR_W - 60, 40, 6).fill(state === 'sale' ? '#F9C846' : state === 'yours' ? '#7CD3A0' : '#C9D3DC');
  if (state === 'yours') {
    g.rect(x, top, DOOR_W, bottom - top).fill('#2C3440');
    for (let y = top; y < top + 40; y += 10) g.rect(x, y, DOOR_W, 7).fill('#E3A857');   // rolled up at the top
  } else {
    const c = state === 'sale' ? ['#E3A857', '#C98E3E'] : ['#AEB5BC', '#959DA6'];
    for (let y = top; y < bottom - (state === 'sale' ? 30 : 0); y += 16) g.rect(x, y, DOOR_W, 12).fill(c[0]).rect(x, y + 12, DOOR_W, 4).fill(c[1]);
    if (state === 'sale') g.rect(x, bottom - 30, DOOR_W, 30).fill('#2C3440');   // the gap at the bottom you can peek through
    g.roundRect(x + DOOR_W / 2 - 18, bottom - 52, 36, 10, 4).fill('#5A6570');      // handle
  }
  v.sign.text = sign; v.note.text = note; v.peek.text = peek;
}

// ---- inside a storage unit: a concrete box with the finds lying about, and the door behind you
export const UNIT_ROOM = { w: 1040, h: 760, wall: 170 };
/** Where each find lies (by its slot in the unit), a little scattered. */
export function unitSlot(slot: number): [number, number] {
  const cols = 4, col = slot % cols, row = Math.floor(slot / cols);
  const jx = ((slot * 37) % 50) - 25, jy = ((slot * 53) % 40) - 20;
  return [190 + col * 220 + jx + (row % 2) * 60, 320 + row * 150 + jy];
}
export const UNIT_EXIT: [number, number] = [UNIT_ROOM.w / 2, UNIT_ROOM.h - 30];
export function drawUnit(): { view: Container; layer: Container } {
  const view = new Container(), g = new Graphics(), layer = new Container(); layer.sortableChildren = true;
  const { w, h, wall } = UNIT_ROOM;
  g.rect(-3000, -3000, w + 6000, h + 6000).fill('#23272E');
  g.rect(0, wall, w, h - wall).fill('#B9B8AE');
  for (const [x, y, r] of [[300, 400, 60], [760, 600, 80], [520, 300, 40]]) g.ellipse(x, y, r, r * 0.4).fill({ color: '#000000', alpha: 0.05 });   // stains
  g.rect(0, 0, w, wall).fill('#9AA3AD');
  for (let x = 0; x < w; x += 26) g.rect(x, 0, 8, wall).fill({ color: '#FFFFFF', alpha: 0.08 });
  g.rect(0, wall - 10, w, 10).fill('#6B7782');
  g.rect(w / 2 - 120, h - 20, 240, 20).fill('#2C3440');   // the open door behind you
  g.roundRect(60, 40, 120, 10, 4).fill('#F9E39A');           // a light
  view.addChild(g, layer);
  return { view, layer };
}
/** A find lying in a unit: big emoji on a sticker disc, with a shadow. */
export function findArt(emoji: string): Container {
  const c = new Container(), g = new Graphics()
    .ellipse(6, 4, 40, 12).fill({ color: NAVY, alpha: 0.18 })
    .circle(0, -38, 36 + BAND).fill('#FFFFFF').circle(0, -38, 36).fill('#FFF4DA');
  const t = new Text({ text: emoji, style: { fontSize: 46 } }); t.anchor.set(0.5); t.position.set(0, -38);
  c.addChild(g, t); return c;
}

// ---- Nico's work shed: wooden floor, a window, and a place for each piece of equipment (each one a
// sticker outline until he buys it: unlocks.ts)
export const SHED_ROOM = { w: 1200, h: 820, wall: 230 };
export const SHED_EXIT: [number, number] = [SHED_ROOM.w / 2, SHED_ROOM.h - 30];
/** Where each piece of equipment stands: its footprint (x, y, w, d) and how tall it's drawn (h). */
export const SHED_SLOTS: Record<string, { x: number; y: number; w: number; d: number; h: number }> = {
  workbench: { x: 420, y: 430, w: 360, d: 50, h: 60 },   // (waist-high on Nico: he's ~132 px tall)
  shelves: { x: 70, y: 262, w: 300, d: 36, h: 210 },
  bins: { x: 80, y: 600, w: 230, d: 70, h: 80 },
  paint: { x: 880, y: 480, w: 200, d: 50, h: 70 },
};
export function drawShedRoom(): { view: Container; layer: Container } {
  const view = new Container(), g = new Graphics(), layer = new Container(); layer.sortableChildren = true;
  const { w, h, wall } = SHED_ROOM;
  g.rect(-3000, -3000, w + 6000, h + 6000).fill('#2B2320');
  for (let y = wall; y < h; y += 40) g.rect(0, y, w, 40).fill(((y - wall) / 40) % 2 ? '#C9965F' : '#BE8A54').rect(0, y + 38, w, 2).fill('#9E7444');   // floorboards
  g.rect(0, 0, w, wall).fill('#A8754A');
  for (let x = 0; x < w; x += 60) g.rect(x, 0, 4, wall).fill({ color: '#000000', alpha: 0.1 });   // wall planks
  g.rect(0, wall - 12, w, 12).fill('#7A5236');
  g.roundRect(w / 2 - 110 - BAND, 40 - BAND, 220 + 2 * BAND, 120 + 2 * BAND, 10).fill('#FFFFFF').roundRect(w / 2 - 110, 40, 220, 120, 8).fill('#BFE3F5')
   .rect(w / 2 - 3, 40, 6, 120).fill('#FFFFFF').rect(w / 2 - 110, 97, 220, 6).fill('#FFFFFF');   // a window
  g.roundRect(SHED_EXIT[0] - 100, h - 30, 200, 30, 6).fill('#5E3E28');   // the door
  view.addChild(g, layer);
  return { view, layer };
}
/** Benches are drawn from the floor up: legs to about Nico's waist (BENCH px), then the top's surface
 * seen from above. (The first workbench was 200 px tall: taller than Nico.) */
export const BENCH = 64;
/** The workbench: a wooden top on legs, a shelf underneath, a vise and a few tools on top. */
export function workbenchArt(): Container {
  const s = SHED_SLOTS.workbench, c = new Container(), g = new Graphics(), F = s.y + s.d, front = F - BENCH, depth = 34;
  g.ellipse(s.x + s.w / 2 + 10, F - 2, s.w / 2 + 10, 12).fill({ color: NAVY, alpha: 0.18 });
  const legs = [s.x + 14, s.x + s.w - 32];
  for (const lx of legs) g.roundRect(lx - BAND, front, 18 + 2 * BAND, BENCH + BAND, 5).fill('#FFFFFF');
  g.roundRect(s.x + 26 - BAND, F - 24 - BAND, s.w - 52 + 2 * BAND, 10 + 2 * BAND, 5).fill('#FFFFFF');
  g.roundRect(s.x - BAND, front - depth - BAND, s.w + 2 * BAND, depth + 12 + 2 * BAND, 9).fill('#FFFFFF');
  for (const lx of legs) g.roundRect(lx, front, 18, BENCH, 4).fill('#7A5236');
  g.roundRect(s.x + 26, F - 24, s.w - 52, 10, 4).fill('#B9895A');                   // a shelf low down
  g.roundRect(s.x, front - depth, s.w, depth, 8).fill('#E3AE74').rect(s.x, front - 2, s.w, 12).fill('#B9895A');   // the top, and its front edge
  g.roundRect(s.x + s.w - 76, front - depth - 14, 46, 22, 4).fill('#5B78AA').rect(s.x + s.w - 58, front - depth - 24, 10, 12).fill('#9AA6B2');   // the vise
  g.roundRect(s.x + 40, front - depth + 8, 70, 11, 4).fill('#E5484D').rect(s.x + 108, front - depth + 10, 24, 7).fill('#9AA6B2');               // a hammer
  g.roundRect(s.x + 160, front - depth + 12, 56, 7, 3).fill('#2F7FD8');                                                                          // a screwdriver
  c.addChild(g); c.zIndex = F;
  return c;
}

/** Tall wooden shelves against the wall; `things` (emoji) sit along the boards. */
export function shelvesArt(things: string[]): Container {
  const s = SHED_SLOTS.shelves, c = new Container(), g = new Graphics(), top = s.y - s.h;
  g.roundRect(s.x - BAND, top - BAND, s.w + 2 * BAND, s.h + s.d + 2 * BAND, 8).fill('#FFFFFF').roundRect(s.x, top, s.w, s.h + s.d, 6).fill('#8A5A3B');
  const boards = [top + 60, top + 130, top + 200];
  for (const by of boards) g.rect(s.x + 8, by, s.w - 16, 10).fill('#D9A066');
  g.rect(s.x + 8, top + 8, s.w - 16, s.h + s.d - 16).fill({ color: '#000000', alpha: 0.12 });
  c.addChild(g);
  things.slice(0, 18).forEach((e, i) => {
    const t = new Text({ text: e, style: { fontSize: 30 } }); t.anchor.set(0.5, 1);
    t.position.set(s.x + 30 + (i % 6) * 48, boards[Math.floor(i / 6)] + 2); c.addChild(t);
  });
  c.zIndex = s.y + s.d; return c;
}
/** A row of coloured bins, each with a part showing over the rim. */
export function binsArt(): Container {
  const s = SHED_SLOTS.bins, c = new Container(), g = new Graphics(), top = s.y - s.h + s.d;
  g.ellipse(s.x + s.w / 2 + 8, s.y + s.d - 2, s.w / 2 + 6, 12).fill({ color: NAVY, alpha: 0.18 });
  const cols = ['#E5484D', '#2F7FD8', '#F9C846', '#3BB273'], bw = s.w / 4;
  cols.forEach((col, i) => {
    const x = s.x + i * bw;
    g.roundRect(x + 2 - BAND, top - BAND, bw - 4 + 2 * BAND, s.h + 2 * BAND, 8).fill('#FFFFFF').roundRect(x + 2, top, bw - 4, s.h, 6).fill(col).rect(x + 2, top + 8, bw - 4, 6).fill({ color: '#FFFFFF', alpha: 0.35 });
  });
  c.addChild(g);
  ['🛞', '⚙️', '🔋', '🥢'].forEach((e, i) => { const t = new Text({ text: e, style: { fontSize: 28 } }); t.anchor.set(0.5); t.position.set(s.x + i * bw + bw / 2, top + 4); c.addChild(t); });
  c.zIndex = s.y + s.d; return c;
}
/** A paint station: a waist-high table of paint cans (a brush in each), with splats on the front. */
export function paintArt(): Container {
  const s = SHED_SLOTS.paint, c = new Container(), g = new Graphics(), F = s.y + s.d, front = F - BENCH, depth = 30;
  g.ellipse(s.x + s.w / 2 + 8, F - 2, s.w / 2 + 8, 12).fill({ color: NAVY, alpha: 0.18 });
  g.roundRect(s.x - BAND, front - depth - BAND, s.w + 2 * BAND, depth + BENCH + 2 * BAND, 8).fill('#FFFFFF');
  g.roundRect(s.x, front, s.w, BENCH, 6).fill('#9AA6B2').roundRect(s.x, front - depth, s.w, depth + 4, 6).fill('#C9D3DC');
  ['#E5484D', '#2F7FD8', '#F9C846', '#3BB273'].forEach((col, i) => {
    const x = s.x + 18 + i * 44, y = front - depth + 2;
    g.roundRect(x - BAND, y - 30 - BAND, 30 + 2 * BAND, 34 + 2 * BAND, 6).fill('#FFFFFF').roundRect(x, y - 30, 30, 34, 5).fill('#E9EEF3').rect(x, y - 30, 30, 10).fill(col);
    g.moveTo(x + 15, y - 30).lineTo(x + 20, y - 46).stroke({ width: 4, color: '#8A5A3B' });   // a brush
  });
  for (let i = 0; i < 5; i++) g.circle(s.x + 28 + i * 36, front + 26 + (i % 2) * 10, 7).fill(['#E5484D', '#2F7FD8', '#F9C846', '#3BB273', '#F06A8A'][i]);   // splats
  c.addChild(g); c.zIndex = F; return c;
}

// ---- Bibs and Bobs, Nico's beach shop (jewelry.ts): shelves of shell jewelry on the back wall,
// the stringing table where he makes it, and the counter with the till. Visitors browse the shelves.
export const SHOP_ROOM = { w: 1200, h: 820, wall: 260 };
export const SHOP_EXIT: [number, number] = [SHOP_ROOM.w / 2, SHOP_ROOM.h - 30];
export const SHOP_SLOTS = {
  table: { x: 80, y: 540, w: 300, d: 50, h: 60 },     // the stringing table (waist-high, like the workbench)
  counter: { x: 830, y: 540, w: 290, d: 60, h: 60 },  // the counter and the till
};
/** The pegs on the shelves, two rows of four: each holds one piece. */
export const SHOP_PEGS: [number, number][] = [0, 1].flatMap(r => [0, 1, 2, 3].map(i => [370 + i * 155, 66 + r * 92] as [number, number]));
/** Where a visitor stands to look at peg i. */
export const browseAt = (i: number): [number, number] => [SHOP_PEGS[i % SHOP_PEGS.length][0], SHOP_ROOM.wall + 50];
export function drawShopRoom(): { view: Container; layer: Container } {
  const view = new Container(), g = new Graphics(), layer = new Container(); layer.sortableChildren = true;
  const { w, h, wall } = SHOP_ROOM;
  g.rect(-3000, -3000, w + 6000, h + 6000).fill('#2B2320');
  for (let y = wall; y < h; y += 40) g.rect(0, y, w, 40).fill(((y - wall) / 40) % 2 ? '#F2E6CF' : '#EADBBE').rect(0, y + 38, w, 2).fill('#D8C59F');   // whitewashed boards
  g.rect(0, 0, w, wall).fill('#8FD3E0');
  for (let x = 0; x < w; x += 60) g.rect(x, 0, 4, wall).fill({ color: '#FFFFFF', alpha: 0.25 });   // beach-hut planks
  g.rect(0, wall - 12, w, 12).fill('#2F9FB8');
  // the sign, and a window onto the sea
  g.roundRect(40 - BAND, 40 - BAND, 250 + 2 * BAND, 90 + 2 * BAND, 14).fill('#FFFFFF').roundRect(40, 40, 250, 90, 12).fill('#F28C38');
  g.roundRect(950 - BAND, 36 - BAND, 210 + 2 * BAND, 130 + 2 * BAND, 10).fill('#FFFFFF').roundRect(950, 36, 210, 130, 8).fill('#BFE3F5')
   .rect(950, 110, 210, 56).fill('#4FB3D9').rect(1052, 36, 6, 130).fill('#FFFFFF');
  // the display shelves: two boards with pegs
  for (const r of [0, 1]) {
    const y = 66 + r * 92;
    g.roundRect(320, y - 8, 620, 12, 4).fill('#B9895A');
    for (let i = 0; i < 4; i++) g.circle(370 + i * 155, y - 2, 5).fill('#7A5236');
  }
  g.roundRect(SHOP_EXIT[0] - 100, h - 30, 200, 30, 6).fill('#5E3E28');   // the door
  const t = new Text({ text: 'BIBS AND BOBS', style: { fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '900', fontSize: 26, fill: '#FFFFFF', stroke: { color: NAVY, width: 5 } } });
  t.anchor.set(0.5); t.position.set(165, 85);
  view.addChild(g, t, layer);
  return { view, layer };
}
/** One piece of shell jewelry, hanging from (0, 0): a bracelet's loop, a necklace's U, or a wind
 * chime's strings under a bit of driftwood. `colors`: each shell's colour, in order along the twine. */
export function pieceArt(id: string, colors: string[]): Graphics {
  const g = new Graphics(), TW = '#C9A46A', bead = (x: number, y: number, c: string) => g.circle(x, y, 8).fill('#FFFFFF').circle(x, y, 6).fill(c);
  if (id === 'bracelet') {
    g.ellipse(0, 26, 24, 20).stroke({ width: 3, color: TW });
    colors.forEach((c, i) => { const a = Math.PI / 2 + (i - (colors.length - 1) / 2) * 0.75; bead(Math.cos(a) * 24, 26 + Math.sin(a) * 20, c); });
  } else if (id === 'necklace') {
    g.moveTo(-34, 0).bezierCurveTo(-34, 70, 34, 70, 34, 0).stroke({ width: 3, color: TW });
    colors.forEach((c, i) => { const u = (i + 1) / (colors.length + 1), a = Math.PI * u; bead(-Math.cos(a) * 31, Math.sin(a) * 50, c); });
  } else {
    g.roundRect(-40, 0, 80, 9, 4).fill('#9C7A55');
    const strings = [-28, 0, 28];
    for (const x of strings) g.moveTo(x, 6).lineTo(x, 74).stroke({ width: 2, color: TW });
    colors.forEach((c, i) => bead(strings[i % 3], 22 + Math.floor(i / 3) * 16, c));
  }
  return g;
}
/** The stringing table: waist-high, with bowls of shells and a spool of twine on top. */
export function craftTableArt(): Container {
  const s = SHOP_SLOTS.table, c = new Container(), g = new Graphics(), F = s.y + s.d, front = F - BENCH, depth = 34;
  g.ellipse(s.x + s.w / 2 + 8, F - 2, s.w / 2 + 8, 12).fill({ color: NAVY, alpha: 0.18 });
  const legs = [s.x + 14, s.x + s.w - 32];
  for (const lx of legs) g.roundRect(lx - BAND, front, 18 + 2 * BAND, BENCH + BAND, 5).fill('#FFFFFF');
  g.roundRect(s.x - BAND, front - depth - BAND, s.w + 2 * BAND, depth + 12 + 2 * BAND, 9).fill('#FFFFFF');
  for (const lx of legs) g.roundRect(lx, front, 18, BENCH, 4).fill('#7A5236');
  g.roundRect(s.x, front - depth, s.w, depth, 8).fill('#F2D6A2').rect(s.x, front - 2, s.w, 12).fill('#D9B27A');
  ['#F4A6A0', '#E8C99A', '#B9C7D6'].forEach((col, i) => {   // bowls of shells
    const x = s.x + 50 + i * 70, y = front - depth + 6;
    g.ellipse(x, y, 26, 11).fill('#FFFFFF').ellipse(x, y, 23, 9).fill('#5B8FD6');
    for (const dx of [-9, 0, 9]) g.circle(x + dx, y - 4 - (dx === 0 ? 3 : 0), 6).fill(col);
  });
  g.roundRect(s.x + 240, front - depth - 18, 30, 30, 6).fill('#FFFFFF').roundRect(s.x + 243, front - depth - 15, 24, 24, 5).fill('#C9A46A')
   .rect(s.x + 243, front - depth - 6, 24, 3).fill('#9C7A55');   // the twine spool
  c.addChild(g); c.zIndex = F; return c;
}
/** The counter, with the till on it. */
export function counterArt(): Container {
  const s = SHOP_SLOTS.counter, c = new Container(), g = new Graphics(), F = s.y + s.d, front = F - 74, depth = 36;
  g.ellipse(s.x + s.w / 2 + 8, F - 2, s.w / 2 + 8, 12).fill({ color: NAVY, alpha: 0.18 });
  g.roundRect(s.x - BAND, front - depth - BAND, s.w + 2 * BAND, depth + 74 + 2 * BAND, 9).fill('#FFFFFF');
  g.roundRect(s.x, front, s.w, 74, 6).fill('#2F9FB8').rect(s.x, front + 30, s.w, 8).fill({ color: '#FFFFFF', alpha: 0.5 });
  g.roundRect(s.x, front - depth, s.w, depth + 4, 6).fill('#F2D6A2');
  const tx = s.x + s.w - 120, ty = front - depth + 4;   // the till
  g.roundRect(tx - BAND, ty - 46 - BAND, 84 + 2 * BAND, 50 + 2 * BAND, 8).fill('#FFFFFF').roundRect(tx, ty - 46, 84, 50, 7).fill('#E5484D')
   .roundRect(tx + 10, ty - 40, 64, 16, 4).fill('#BFF0C8');
  for (let i = 0; i < 3; i++) g.rect(tx + 12 + i * 22, ty - 18, 16, 8).fill('#FFFFFF');
  c.addChild(g); c.zIndex = F; return c;
}

// ---- Nico's house (Nico: "he wants to be able to go inside his house"; the user: "how can Nico
// sleep?"): his bed (sleep the night away), a couch, the kitchen with the fridge, windows that show
// the sky outside. Furniture is data (HOME_FURNITURE) so decorating can add to it later.
export const HOME_ROOM = { w: 1300, h: 880, wall: 250 };
export const HOME_EXIT: [number, number] = [HOME_ROOM.w / 2, HOME_ROOM.h - 30];
/** Each piece: its footprint (solid) and how tall it's drawn. */
export const HOME_FURNITURE: Record<string, { x: number; y: number; w: number; d: number; h: number }> = {
  bed: { x: 90, y: 250, w: 210, d: 270, h: 40 },        // head against the back wall
  nightstand: { x: 320, y: 250, w: 70, d: 60, h: 60 },
  couch: { x: 520, y: 262, w: 300, d: 70, h: 70 },       // under the windows, facing the room
  kitchen: { x: 930, y: 250, w: 300, d: 80, h: 70 },     // counter along the wall, the fridge at the end
};
/** Where Nico's head goes on the pillow (he's tucked in under the blanket). */
export const PILLOW: [number, number] = [HOME_FURNITURE.bed.x + HOME_FURNITURE.bed.w / 2, HOME_FURNITURE.bed.y + 50];
export function drawHomeRoom(paper = WALLPAPERS.blue, rug = RUGS.sunny): { view: Container; layer: Container; windows: Graphics } {
  const view = new Container(), g = new Graphics(), layer = new Container(); layer.sortableChildren = true;
  const { w, h, wall } = HOME_ROOM;
  g.rect(-3000, -3000, w + 6000, h + 6000).fill('#2B2320');
  for (let y = wall; y < h; y += 40) g.rect(0, y, w, 40).fill(((y - wall) / 40) % 2 ? '#D9B48A' : '#D1AA7E').rect(0, y + 38, w, 2).fill('#B8915F');   // wooden floor
  g.rect(0, 0, w, wall).fill(paper.wall);
  for (let x = 0; x < w; x += 46) g.rect(x, 0, 18, wall).fill({ color: paper.stripe, alpha: 0.3 });   // striped wallpaper
  g.rect(0, wall - 14, w, 14).fill(paper.trim);
  g.ellipse(w / 2 + 40, 560, 330, 150).fill('#FFFFFF').ellipse(w / 2 + 40, 560, 320, 142).fill(rug.rings[0]).ellipse(w / 2 + 40, 560, 250, 105).fill(rug.rings[1]).ellipse(w / 2 + 40, 560, 170, 70).fill(rug.rings[2]);   // a round rug
  // a picture on the wall
  const px = 840; g.roundRect(px - BAND, 60 - BAND, 80 + 2 * BAND, 64 + 2 * BAND, 6).fill('#FFFFFF').roundRect(px, 60, 80, 64, 4).fill('#7FD1C1').circle(px + 22, 80, 8).fill('#F9C846').poly([px, 124, px + 36, 92, px + 56, 110, px + 80, 96, px + 80, 124]).fill('#3E8F5A');
  g.roundRect(SHOP_EXIT[0] - 100, h - 30, 200, 30, 6).fill('#5E3E28');   // the front door
  const windows = new Graphics();
  for (const x of [540, 700]) windows.roundRect(x, 50, 120, 120, 8).fill('#FFFFFF');
  view.addChild(g, windows, layer);
  return { view, layer, windows };
}
/** The windows' glass: blue sky by day, night sky with a star or two after dark (k: 0 day .. 1 night). */
export function paintWindows(g: Graphics, k: number) {
  g.clear();
  const sky = k < 0.5 ? (k < 0.2 ? '#9FD4F5' : '#F2A65A') : '#1E2A55';
  for (const x of [540, 700]) {
    g.roundRect(x - BAND, 50 - BAND, 120 + 2 * BAND, 120 + 2 * BAND, 10).fill('#FFFFFF').roundRect(x, 50, 120, 120, 8).fill(sky);
    if (k >= 0.5) g.circle(x + 30, 80, 2.5).fill('#FFFFFF').circle(x + 85, 70, 2).fill('#FFFFFF').circle(x + 60, 120, 1.8).fill('#FFFFFF');
    if (k >= 0.5 && x === 700) g.circle(x + 80, 95, 14).fill('#F4F1DE');   // the moon
    g.rect(x + 57, 50, 6, 120).fill('#FFFFFF').rect(x, 107, 120, 6).fill('#FFFFFF');
  }
}
/** The bed (headboard, pillow, mattress) and, separately, the blanket (drawn over Nico when he's in it). */
export function bedArt(): { bed: Container; blanket: Container } {
  const s = HOME_FURNITURE.bed, bed = new Container(), g = new Graphics(), top = s.y - 70;
  g.ellipse(s.x + s.w / 2 + 8, s.y + s.d - 2, s.w / 2 + 8, 14).fill({ color: NAVY, alpha: 0.18 });
  g.roundRect(s.x - BAND, top - BAND, s.w + 2 * BAND, s.d + 70 + 2 * BAND, 14).fill('#FFFFFF');
  g.roundRect(s.x, top, s.w, 90, 12).fill('#5B78AA');                                      // headboard
  g.roundRect(s.x + 6, s.y, s.w - 12, s.d - 10, 10).fill('#F4F6F8');                         // mattress
  g.roundRect(s.x + 34, s.y + 14, s.w - 68, 56, 22).fill('#FFFFFF').roundRect(s.x + 38, s.y + 18, s.w - 76, 48, 20).fill('#E9EEF3');   // pillow
  g.roundRect(s.x, s.y + s.d - 30, s.w, 30, 8).fill('#3E5F8E');                             // footboard
  bed.addChild(g); bed.zIndex = s.y;
  const blanket = new Container(), b = new Graphics();
  b.roundRect(s.x + 4, s.y + 92, s.w - 8, s.d - 116, 14).fill('#E5484D').roundRect(s.x + 4, s.y + 92, s.w - 8, 22, 10).fill('#FFFFFF');   // folded over at the top
  for (let i = 0; i < 3; i++) b.rect(s.x + 4, s.y + 140 + i * 36, s.w - 8, 8).fill({ color: '#FFFFFF', alpha: 0.35 });
  blanket.addChild(b); blanket.zIndex = s.y + s.d;   // (in front of whoever's in bed)
  return { bed, blanket };
}
export function nightstandArt(): { view: Container; bulb: [number, number] } {
  const s = HOME_FURNITURE.nightstand, c = new Container(), g = new Graphics(), F = s.y + s.d, top = F - s.h - 30;
  g.roundRect(s.x - BAND, top - BAND, s.w + 2 * BAND, s.h + 30 + 2 * BAND, 8).fill('#FFFFFF').roundRect(s.x, top, s.w, s.h + 30, 6).fill('#B9895A')
   .rect(s.x + 8, top + 34, s.w - 16, 4).fill('#8A5A3B');
  g.rect(s.x + s.w / 2 - 3, top - 40, 6, 40).fill('#5B6472').poly([s.x + 12, top - 40, s.x + s.w - 12, top - 40, s.x + s.w - 20, top - 72, s.x + 20, top - 72]).fill('#F9E39A');   // a lamp
  c.addChild(g); c.zIndex = F; return { view: c, bulb: [s.x + s.w / 2, top - 50] };
}
export function couchArt(): Container {
  const s = HOME_FURNITURE.couch, c = new Container(), g = new Graphics(), F = s.y + s.d, seat = F - 40;
  g.ellipse(s.x + s.w / 2 + 8, F - 2, s.w / 2 + 8, 12).fill({ color: NAVY, alpha: 0.18 });
  g.roundRect(s.x - BAND, seat - 70 - BAND, s.w + 2 * BAND, 110 + 2 * BAND, 16).fill('#FFFFFF');
  g.roundRect(s.x, seat - 70, s.w, 60, 14).fill('#3E8F8A');                                   // the back
  g.roundRect(s.x + 20, seat - 16, s.w - 40, 40, 10).fill('#4FA9A2');                           // the seat cushions
  g.rect(s.x + s.w / 2 - 1, seat - 14, 2, 36).fill('#3E8F8A');
  for (const x of [s.x, s.x + s.w - 30]) g.roundRect(x, seat - 40, 30, 80, 12).fill('#357B76');   // arms
  g.roundRect(s.x + 40, seat - 52, 54, 34, 10).fill('#F2C14E');                                  // a cushion
  c.addChild(g); c.zIndex = F; return c;
}
export function kitchenArt(): Container {
  const s = HOME_FURNITURE.kitchen, c = new Container(), g = new Graphics(), F = s.y + s.d, front = F - 74, depth = 30;
  g.roundRect(s.x - BAND, front - depth - BAND, s.w + 2 * BAND, 74 + depth + 2 * BAND, 8).fill('#FFFFFF');
  g.roundRect(s.x, front, s.w - 90, 74, 4).fill('#F4F6F8').roundRect(s.x, front - depth, s.w - 90, depth + 4, 4).fill('#9AA6B2');
  for (let i = 0; i < 3; i++) g.rect(s.x + 10 + i * 70, front + 10, 60, 54).fill('#E9EEF3').rect(s.x + 34 + i * 70, front + 16, 12, 4).fill('#5B6472');   // cupboards
  g.roundRect(s.x + 30, front - depth + 6, 60, 20, 6).fill('#C9D3DC');   // the sink
  const fx = s.x + s.w - 86;   // the fridge, tall
  g.roundRect(fx - BAND, front - 150 - BAND, 86 + 2 * BAND, 224 + 2 * BAND, 10).fill('#FFFFFF').roundRect(fx, front - 150, 86, 224, 8).fill('#E9EEF3')
   .rect(fx, front - 60, 86, 4).fill('#C9D3DC').rect(fx + 70, front - 120, 5, 40).fill('#9AA6B2').rect(fx + 70, front - 40, 5, 50).fill('#9AA6B2');
  g.rect(fx + 16, front - 132, 26, 20).fill('#FFFFFF').rect(fx + 18, front - 130, 22, 3).fill('#E5484D');   // mom's note on the fridge
  c.addChild(g); c.zIndex = F; return c;
}

// ---- Nico's Bakery (bakery.ts): the oven and the mixing table, a glass display case in the middle
// where what he bakes sits until someone buys it, the pantry shelf, and the counter with the till.
export const BAKERY_ROOM = { w: 1200, h: 820, wall: 260 };
export const BAKERY_EXIT: [number, number] = [BAKERY_ROOM.w / 2, BAKERY_ROOM.h - 30];
export const BAKERY_SLOTS = {
  oven: { x: 70, y: 262, w: 230, d: 60, h: 200 },
  table: { x: 110, y: 560, w: 280, d: 50, h: 60 },
  case: { x: 430, y: 470, w: 380, d: 80, h: 90 },
  pantry: { x: 880, y: 262, w: 260, d: 36, h: 200 },
  counter: { x: 880, y: 560, w: 260, d: 60, h: 60 },
};
/** Spots inside the display case, two rows of four. */
export const CASE_SPOTS: [number, number][] = [0, 1].flatMap(r => [0, 1, 2, 3].map(i => [BAKERY_SLOTS.case.x + 58 + i * 88, BAKERY_SLOTS.case.y - 60 + r * 46] as [number, number]));
export const caseBrowseAt = (i: number): [number, number] => [CASE_SPOTS[i % CASE_SPOTS.length][0], BAKERY_SLOTS.case.y + BAKERY_SLOTS.case.d + 46];
export function drawBakeryRoom(): { view: Container; layer: Container } {
  const view = new Container(), g = new Graphics(), layer = new Container(); layer.sortableChildren = true;
  const { w, h, wall } = BAKERY_ROOM;
  g.rect(-3000, -3000, w + 6000, h + 6000).fill('#2B2320');
  for (let j = 0; wall + j * 50 < h; j++) for (let i = 0; i * 50 < w; i++) g.rect(i * 50, wall + j * 50, 50, 50).fill((i + j) % 2 ? '#F4F6F8' : '#F2B8B5');   // checkerboard floor
  g.rect(0, 0, w, wall).fill('#F7D9C4');
  for (let x = 0; x < w; x += 40) g.rect(x, 0, 20, wall).fill({ color: '#FFFFFF', alpha: 0.35 });   // candy-stripe wallpaper
  g.rect(0, wall - 12, w, 12).fill('#C8463D');
  // the menu board
  g.roundRect(440 - BAND, 40 - BAND, 360 + 2 * BAND, 150 + 2 * BAND, 12).fill('#FFFFFF').roundRect(440, 40, 360, 150, 10).fill('#2F3B33');
  g.roundRect(BAKERY_EXIT[0] - 100, h - 30, 200, 30, 6).fill('#5E3E28');
  const t = new Text({ text: "NICO'S BAKERY\n🍪 $3  🧁 $4  🍞 $5", style: { fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '900', fontSize: 26, fill: '#FFFFFF', align: 'center', lineHeight: 40 } });
  t.anchor.set(0.5); t.position.set(620, 115);
  view.addChild(g, t, layer);
  return { view, layer };
}
/** One baked thing, sitting at (0, 0). */
export function bakedArt(id: string): Graphics {
  if (id === 'pizzelle') return pizzelleArt();
  const g = new Graphics(), W = '#FFFFFF';
  if (id === 'cookie') {
    g.circle(0, -12, 17).fill(W).circle(0, -12, 14).fill('#D9A066');
    for (const [x, y] of [[-6, -16], [5, -18], [-2, -7], [7, -9]]) g.circle(x, y, 2.6).fill('#5A3A22');
  } else if (id === 'cupcake') {
    g.poly([-16, -16, 16, -16, 11, 4, -11, 4]).fill(W).poly([-13, -15, 13, -15, 9, 2, -9, 2]).fill('#7FD1E8');
    g.circle(0, -24, 15).fill(W).circle(0, -23, 12).fill('#F7C8D0').circle(-5, -28, 6).fill('#F7C8D0').circle(0, -34, 3.5).fill('#E5484D');
  } else {
    g.roundRect(-24, -26, 48, 28, 13).fill(W).roundRect(-21, -23, 42, 23, 11).fill('#C9874A');
    for (const x of [-10, 0, 10]) g.moveTo(x - 4, -20).lineTo(x + 4, -14).stroke({ width: 2.5, color: '#E8B47A' });
  }
  return g;
}
export function ovenArt(): Container {
  const s = BAKERY_SLOTS.oven, c = new Container(), g = new Graphics(), F = s.y + s.d, top = F - s.h;
  g.roundRect(s.x - BAND, top - BAND, s.w + 2 * BAND, s.h + 2 * BAND, 12).fill('#FFFFFF').roundRect(s.x, top, s.w, s.h, 10).fill('#9AA6B2');
  g.roundRect(s.x + 20, top + 54, s.w - 40, s.h - 80, 10).fill('#2C3440').roundRect(s.x + 30, top + 64, s.w - 60, s.h - 100, 8).fill('#F28C38');   // the glowing window
  g.rect(s.x + 26, top + 40, s.w - 52, 8).fill('#5B6472');                                                                                    // the handle
  for (let i = 0; i < 3; i++) g.circle(s.x + 40 + i * 30, top + 20, 9).fill('#2C3440');                                                     // knobs
  c.addChild(g); c.zIndex = F; return c;
}
export function mixTableArt(): Container {
  const s = BAKERY_SLOTS.table, c = new Container(), g = new Graphics(), F = s.y + s.d, front = F - BENCH, depth = 34;
  g.ellipse(s.x + s.w / 2 + 8, F - 2, s.w / 2 + 8, 12).fill({ color: NAVY, alpha: 0.18 });
  g.roundRect(s.x - BAND, front - depth - BAND, s.w + 2 * BAND, depth + BENCH + 2 * BAND, 9).fill('#FFFFFF');
  g.roundRect(s.x, front, s.w, BENCH, 6).fill('#B9895A').roundRect(s.x, front - depth, s.w, depth + 4, 8).fill('#F2D6A2');
  g.ellipse(s.x + 90, front - depth + 4, 40, 16).fill('#FFFFFF').ellipse(s.x + 90, front - depth + 2, 34, 12).fill('#7FD1E8').ellipse(s.x + 90, front - depth - 2, 26, 7).fill('#FFF4DA');   // a mixing bowl
  g.roundRect(s.x + 170, front - depth - 6, 70, 14, 7).fill('#D9A066');   // a rolling pin
  c.addChild(g); c.zIndex = F; return c;
}
/** The glass display case: a counter with glass shelves (what's for sale goes in CASE_SPOTS). */
export function caseArt(): { back: Container; glass: Container } {
  const s = BAKERY_SLOTS.case, back = new Container(), g = new Graphics(), F = s.y + s.d, top = F - s.h - 70;
  g.ellipse(s.x + s.w / 2 + 8, F - 2, s.w / 2 + 8, 12).fill({ color: NAVY, alpha: 0.18 });
  g.roundRect(s.x - BAND, top - BAND, s.w + 2 * BAND, s.h + 70 + 2 * BAND, 10).fill('#FFFFFF');
  g.roundRect(s.x, top, s.w, 70, 8).fill('#FFF4DA').rect(s.x, top + 46, s.w, 4).fill('#E9DCC7');   // the shelves inside
  g.roundRect(s.x, F - s.h, s.w, s.h, 8).fill('#E5484D').rect(s.x, F - s.h + 20, s.w, 8).fill({ color: '#FFFFFF', alpha: 0.6 });   // the front
  back.addChild(g); back.zIndex = s.y;
  const glass = new Container(), q = new Graphics();
  q.roundRect(s.x + 4, top + 2, s.w - 8, 72, 8).fill({ color: '#BFE3F5', alpha: 0.25 }).moveTo(s.x + 30, top + 10).lineTo(s.x + 70, top + 62).stroke({ width: 4, color: '#FFFFFF', alpha: 0.6 });
  glass.addChild(q); glass.zIndex = s.y + 2;
  return { back, glass };
}
export function pantryArt(): Container {
  const s = BAKERY_SLOTS.pantry, c = new Container(), g = new Graphics(), top = s.y - s.h;
  g.roundRect(s.x - BAND, top - BAND, s.w + 2 * BAND, s.h + s.d + 2 * BAND, 8).fill('#FFFFFF').roundRect(s.x, top, s.w, s.h + s.d, 6).fill('#8A5A3B');
  const boards = [top + 70, top + 150];
  for (const by of boards) g.rect(s.x + 8, by, s.w - 16, 10).fill('#D9A066');
  c.addChild(g);
  ['🌾', '🍬', '🧈', '🥚', '🍫', '🌾', '🍬', '🥚'].forEach((e, i) => {
    const t = new Text({ text: e, style: { fontSize: 34 } }); t.anchor.set(0.5, 1); t.position.set(s.x + 36 + (i % 4) * 62, boards[Math.floor(i / 4)] + 2); c.addChild(t);
  });
  c.zIndex = s.y + s.d; return c;
}
export function bakeryCounterArt(): Container {
  const s = BAKERY_SLOTS.counter, c = new Container(), g = new Graphics(), F = s.y + s.d, front = F - 74, depth = 36;
  g.ellipse(s.x + s.w / 2 + 8, F - 2, s.w / 2 + 8, 12).fill({ color: NAVY, alpha: 0.18 });
  g.roundRect(s.x - BAND, front - depth - BAND, s.w + 2 * BAND, depth + 74 + 2 * BAND, 9).fill('#FFFFFF');
  g.roundRect(s.x, front, s.w, 74, 6).fill('#C8463D').roundRect(s.x, front - depth, s.w, depth + 4, 6).fill('#F2D6A2');
  const tx = s.x + s.w - 110, ty = front - depth + 4;
  g.roundRect(tx - BAND, ty - 46 - BAND, 84 + 2 * BAND, 50 + 2 * BAND, 8).fill('#FFFFFF').roundRect(tx, ty - 46, 84, 50, 7).fill('#2F7FD8').roundRect(tx + 10, ty - 40, 64, 16, 4).fill('#BFF0C8');
  c.addChild(g); c.zIndex = F; return c;
}

/** Things Nico can buy for his house (unlocks.ts, room 'home'): footprint (solid; d 0 for things on the wall) and drawn height. */
export const HOME_DECOR: Record<string, { x: number; y: number; w: number; d: number; h: number }> = {
  posters: { x: 100, y: 40, w: 180, d: 0, h: 110 },        // on the wall above the bed
  bookshelf: { x: 410, y: 262, w: 110, d: 36, h: 200 },
  tv: { x: 100, y: 640, w: 210, d: 50, h: 120 },          // a TV on a low cabinet, facing the room...
  beanbag: { x: 150, y: 770, w: 110, d: 40, h: 50 },      // ...and the beanbag in front of it
  fishtank: { x: 980, y: 640, w: 190, d: 50, h: 150 },
  plant: { x: 1190, y: 520, w: 60, d: 36, h: 130 },
  cat: { x: 900, y: 770, w: 0, d: 0, h: 0 },
  sign: { x: 940, y: 50, w: 170, d: 0, h: 60 },             // made at Poppop's (on the wall over the kitchen)
  metalstar: { x: 1150, y: 14, w: 76, d: 0, h: 76 },               // she sits watching the fish
};
/** The art for a piece of decor, standing on its slot. */
export function decorArt(id: string): Container {
  const s = HOME_DECOR[id], c = new Container(), g = new Graphics(), F = s.y + s.d, top = F - s.h;
  const shadow = () => g.ellipse(s.x + s.w / 2 + 6, F - 2, s.w / 2 + 6, 10).fill({ color: NAVY, alpha: 0.18 });
  switch (id) {
    case 'posters':
      g.roundRect(s.x - BAND, s.y - BAND, 80 + 2 * BAND, 110 + 2 * BAND, 6).fill('#FFFFFF').roundRect(s.x, s.y, 80, 110, 4).fill('#3BB273')
       .circle(s.x + 40, s.y + 70, 18).fill('#FFFFFF').circle(s.x + 40, s.y + 70, 6).fill('#2B3F55').rect(s.x + 34, s.y + 20, 12, 30).fill('#F9C846');   // a soccer poster
      g.roundRect(s.x + 100 - BAND, s.y - BAND, 80 + 2 * BAND, 110 + 2 * BAND, 6).fill('#FFFFFF').roundRect(s.x + 100, s.y, 80, 110, 4).fill('#2E3A66')
       .poly([s.x + 140, s.y + 15, s.x + 155, s.y + 60, s.x + 125, s.y + 60]).fill('#E5484D').rect(s.x + 128, s.y + 60, 24, 30).fill('#E9EEF3').poly([s.x + 132, s.y + 90, s.x + 148, s.y + 90, s.x + 140, s.y + 104]).fill('#F28C38');   // a rocket
      for (const [x, y] of [[s.x + 112, s.y + 22], [s.x + 168, s.y + 40], [s.x + 116, s.y + 92]]) g.circle(x, y, 2).fill('#FFFFFF');
      c.zIndex = 1; break;
    case 'bookshelf': {
      g.roundRect(s.x - BAND, top - BAND, s.w + 2 * BAND, s.h + 2 * BAND, 8).fill('#FFFFFF').roundRect(s.x, top, s.w, s.h, 6).fill('#8A5A3B');
      const cols = ['#E5484D', '#2F7FD8', '#F9C846', '#3BB273', '#7B5BA6', '#F28C38'];
      for (let r = 0; r < 3; r++) {
        const by = top + 60 + r * 58; g.rect(s.x + 6, by, s.w - 12, 8).fill('#D9A066');
        for (let i = 0; i < 6; i++) g.rect(s.x + 10 + i * 15, by - 40 + (i % 3) * 4, 12, 40 - (i % 3) * 4).fill(cols[(i + r * 2) % 6]);
      }
      c.zIndex = F; break;
    }
    case 'tv': {
      shadow();
      g.roundRect(s.x - BAND, top - BAND, s.w + 2 * BAND, s.h + 2 * BAND, 8).fill('#FFFFFF');
      g.roundRect(s.x, F - 50, s.w, 50, 6).fill('#5B6472').rect(s.x + 20, F - 34, 60, 18).fill('#2C3440');   // the cabinet, the console in it
      g.roundRect(s.x + 15, top, s.w - 30, s.h - 56, 8).fill('#1E2733');                                       // the TV
      c.zIndex = F; break;
    }
    case 'beanbag':
      shadow();
      g.ellipse(s.x + s.w / 2, F - 22, s.w / 2 + BAND, 30 + BAND).fill('#FFFFFF').ellipse(s.x + s.w / 2, F - 22, s.w / 2, 30).fill('#F28C38').ellipse(s.x + s.w / 2 - 14, F - 34, 22, 10).fill({ color: '#FFFFFF', alpha: 0.3 });
      c.zIndex = F; break;
    case 'fishtank': {
      shadow();
      g.roundRect(s.x - BAND, top - BAND, s.w + 2 * BAND, s.h + 2 * BAND, 8).fill('#FFFFFF');
      g.roundRect(s.x, F - 60, s.w, 60, 6).fill('#8A5A3B');                                                                 // the stand
      g.roundRect(s.x + 6, top, s.w - 12, s.h - 64, 6).fill('#7FD1E8').rect(s.x + 6, top + s.h - 84, s.w - 12, 20).fill('#E8CF8E');   // water, sand
      g.moveTo(s.x + 40, top + s.h - 84).quadraticCurveTo(s.x + 30, top + 40, s.x + 46, top + 20).stroke({ width: 5, color: '#3E8F5A' });   // a water plant
      c.zIndex = F; break;
    }
    case 'sign': {   // a carved wooden sign (sign: the design carved into it)
      g.roundRect(s.x - BAND, s.y - BAND, s.w + 2 * BAND, s.h + 2 * BAND, 10).fill('#FFFFFF').roundRect(s.x, s.y, s.w, s.h, 8).fill('#D9A066').roundRect(s.x + 6, s.y + 6, s.w - 12, s.h - 12, 6).stroke({ width: 3, color: '#8A5A3B' });
      c.zIndex = 1; break;
    }
    case 'metalstar': {
      const pts: number[] = [], cx = s.x + s.w / 2, cy = s.y + s.h / 2;
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 15 : 36; pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      g.poly(pts.map((v, i) => v + (i % 2 ? 0 : 0))).stroke({ width: 8, color: '#FFFFFF' }).poly(pts).fill('#9AA6B2').poly(pts).stroke({ width: 2, color: '#5B6472' });
      g.moveTo(cx - 10, cy - 14).lineTo(cx + 2, cy - 22).stroke({ width: 3, color: '#E9EEF3' });
      c.zIndex = 1; break;
    }
    case 'plant':
      shadow();
      g.poly([s.x + 8, F - 50, s.x + s.w - 8, F - 50, s.x + s.w - 14, F, s.x + 14, F]).fill('#FFFFFF').poly([s.x + 12, F - 46, s.x + s.w - 12, F - 46, s.x + s.w - 17, F - 4, s.x + 17, F - 4]).fill('#C8463D');
      for (const [dx, dy, r] of [[0, -95, 26], [-20, -75, 22], [20, -78, 22], [-6, -118, 18], [14, -110, 16]]) g.circle(s.x + s.w / 2 + dx, F + dy, r + BAND).fill('#FFFFFF');
      for (const [dx, dy, r] of [[0, -95, 26], [-20, -75, 22], [20, -78, 22], [-6, -118, 18], [14, -110, 16]]) g.circle(s.x + s.w / 2 + dx, F + dy, r).fill(dy < -100 ? '#5DB86F' : '#3E8F5A');
      c.zIndex = F; break;
  }
  c.addChild(g);
  return c;
}
/** The TV's screen (it lights up when someone's playing) and the fish (they swim): drawn separately to animate. */
export function tvScreen(): Graphics { const s = HOME_DECOR.tv, g = new Graphics(); g.roundRect(s.x + 22, s.y + s.d - s.h + 7, s.w - 44, s.h - 70, 6).fill('#FFFFFF'); g.zIndex = s.y + s.d + 1; return g; }
export function fishArt(color: string): Graphics { const g = new Graphics(); g.ellipse(0, 0, 9, 5).fill(color).poly([-8, 0, -15, -5, -15, 5]).fill(color).circle(4, -1, 1.4).fill('#2B3F55'); g.zIndex = HOME_DECOR.fishtank.y + HOME_DECOR.fishtank.d + 1; return g; }

/** The birdhouse Nico built with Poppop, on a post in his garden (a bird visits now and then). */
export function birdhouseArt(x: number, y: number): Container {
  const c = new Container(), g = new Graphics();
  g.ellipse(x + 4, y + 2, 16, 5).fill({ color: NAVY, alpha: 0.2 });
  g.rect(x - 4 - BAND / 2, y - 110, 8 + BAND, 112).fill('#FFFFFF').rect(x - 4, y - 108, 8, 108).fill('#8A5A3B');
  g.poly([x - 34, y - 110, x, y - 142, x + 34, y - 110]).fill('#FFFFFF').roundRect(x - 26 - BAND, y - 112, 52 + 2 * BAND, 46 + BAND, 4).fill('#FFFFFF');
  g.roundRect(x - 26, y - 110, 52, 42, 3).fill('#D9A066').poly([x - 30, y - 110, x, y - 138, x + 30, y - 110]).fill('#B8382F').circle(x, y - 92, 8).fill('#5A3A22').rect(x - 6, y - 78, 12, 3).fill('#8A5A3B');
  c.addChild(g); c.zIndex = y; return c;
}
/** A pizzelle (Nonna's waffle cookie), for the bakery case. */
export function pizzelleArt(): Graphics {
  const g = new Graphics(); g.circle(0, -12, 17).fill('#FFFFFF').circle(0, -12, 14).fill('#E8C27A');
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.circle(Math.cos(a) * 7, -12 + Math.sin(a) * 7, 3).stroke({ width: 1.5, color: '#C9974A' }); }
  return g;
}
/** Yia-Yia's own paintings, redrawn in the game's style from her real ones (the photos stay out of the repo):
 * long grasses round a carved stone pillar with a fish on it and one pink flower, on gold; and a portrait of a
 * fair-haired little girl wrapped in white, on deep green. w x h, from (0, 0). */
export function yiayiaPainting(which: 0 | 1, w: number, h: number): Graphics {
  const g = new Graphics();
  if (which === 0) {
    g.rect(0, 0, w, h).fill('#C9A848');
    for (let i = 0; i < 60; i++) g.rect((i * 37) % w, (i * 53) % h, 6, 6).fill({ color: i % 3 ? '#E3C877' : '#8E9A4A', alpha: 0.7 });
    g.rect(w * 0.45, h * 0.32, w * 0.36, h * 0.12).fill('#E9E4D8').rect(w * 0.48, h * 0.44, w * 0.3, h * 0.16).fill('#A8A4B4').rect(w * 0.47, h * 0.6, w * 0.32, h * 0.1).fill('#E9E4D8').rect(w * 0.5, h * 0.7, w * 0.26, h * 0.3).fill('#F4F1EA');
    g.ellipse(w * 0.63, h * 0.52, w * 0.09, h * 0.035).fill('#3A3A40');   // the fish
    for (let i = 0; i < 14; i++) { const x0 = (i / 14) * w, c = i % 2 ? '#3E6B2E' : '#55803A'; g.moveTo(x0, h).bezierCurveTo(x0 + w * 0.1, h * 0.5, x0 + w * 0.25, h * 0.3, x0 + w * (i % 3 ? 0.3 : -0.1), h * 0.1).stroke({ width: 3, color: c }); }
    g.circle(w * 0.3, h * 0.38, w * 0.05).fill('#F2B8C6').circle(w * 0.3, h * 0.38, w * 0.015).fill('#C9708A');   // the pink flower
  } else {
    g.rect(0, 0, w, h * 0.62).fill('#5C6B3A').rect(0, h * 0.62, w, h * 0.38).fill('#3E6E66');
    g.ellipse(w / 2, h * 0.62, w * 0.3, h * 0.2).fill('#F4F6F2').ellipse(w / 2, h * 0.72, w * 0.36, h * 0.1).fill('#DCEEF0');   // the white bundle
    g.ellipse(w / 2, h * 0.3, w * 0.16, h * 0.12).fill('#E8D07A');                                                                  // fair hair
    g.circle(w / 2, h * 0.33, w * 0.11).fill('#F2CDB4').rect(w * 0.39, h * 0.22, w * 0.22, h * 0.05).fill('#E8D07A');               // face, fringe
    g.circle(w * 0.46, h * 0.33, w * 0.022).fill('#4F8FA0').circle(w * 0.54, h * 0.33, w * 0.022).fill('#4F8FA0').ellipse(w / 2, h * 0.39, w * 0.025, h * 0.012).fill('#D98A8A');
  }
  return g;
}
