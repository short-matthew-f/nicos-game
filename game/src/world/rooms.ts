// Inside buildings (Nico: "buildings should have insides"). A room is data: its size, the
// back wall, a counter with someone working behind it, tables, and the way out. Walking in
// through a door swaps the town for the room (the town keeps going, unseen). First: Burger
// Barn, where you order at the counter, carry your tray to a table and eat.
import { Container, Graphics, Text } from 'pixi.js';
import { NAVY, BAND } from './draw';
import type { Rect } from './map';

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
