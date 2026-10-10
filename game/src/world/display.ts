// The toy shop's front window: once Nico sells a toy car, it's on display there (one more
// for each sale, up to three), so the town shows what he's made.
import { Container, Graphics, Text } from 'pixi.js';
import { bld } from './map';

const CAR_COLORS = ['#E0453A', '#2F7FD8', '#F2B632'];

function robotArt(): Graphics {
  return new Graphics()
    .moveTo(0, -30).lineTo(0, -24).stroke({ color: '#2B3F55', width: 2 }).circle(0, -31, 3).fill('#FFE066')
    .roundRect(-11, -24, 22, 24, 5).fill('#A9B8C6').stroke({ color: '#2B3F55', width: 2 })
    .circle(-5, -16, 3).fill('#FFFFFF').circle(5, -16, 3).fill('#FFFFFF').circle(-5, -16, 1.4).fill('#2B3F55').circle(5, -16, 1.4).fill('#2B3F55');
}

export class ToyWindow {
  readonly view = new Container();
  private slots: { car: Container; robot: Container }[] = [];
  constructor() {
    const b = bld('toys'), x = b.x + 30, y = b.y + b.d - 92, w = 130, hgt = 70;
    const g = new Graphics()
      .roundRect(x - 6, y - 6, w + 12, hgt + 12, 10).fill('#FFFFFF')
      .roundRect(x, y, w, hgt, 6).fill('#CFE6F7')
      .rect(x, y + hgt - 14, w, 14).fill('#F7C8D0');                      // the shelf
    this.view.addChild(g);
    CAR_COLORS.forEach((c, i) => {
      const car = new Container();
      const art = new Graphics()
        .roundRect(-17, -11, 34, 11, 4).fill(c).stroke({ color: '#2B3F55', width: 2 })
        .roundRect(-5, -18, 13, 8, 3).fill('#F7D9A8').stroke({ color: '#2B3F55', width: 2 })
        .circle(-10, 1, 5).fill('#2C3E52').circle(10, 1, 5).fill('#2C3E52');
      car.addChild(art);
      const robot = new Container(); robot.addChild(robotArt());
      for (const t of [car, robot]) { t.position.set(x + 26 + i * 40, y + hgt - 16); t.visible = false; this.view.addChild(t); }
      robot.position.y += 2;
      this.slots.push({ car, robot });
    });
    const tag = new Text({ text: 'MADE BY NICO', style: { fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '800', fontSize: 12, fill: '#2B3F55' } });
    tag.anchor.set(0.5, 0); tag.position.set(x + w / 2, y + 4);
    this.view.addChild(tag);
    this.view.zIndex = b.y + b.d + 1;
    this.set([]);
  }
  /** What Nico has sold, as up to three product ids to show ('car', 'robot'). */
  set(kinds: string[]) {
    this.view.visible = kinds.length > 0;
    this.slots.forEach((sl, i) => { sl.car.visible = kinds[i] === 'car'; sl.robot.visible = kinds[i] === 'robot'; });
  }
}
