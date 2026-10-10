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
