// The toy shop's front window: once Nico sells a toy car, it's on display there (one more
// for each sale, up to three), so the town shows what he's made.
import { Container, Graphics, Text } from 'pixi.js';
import { bld } from './map';

const CAR_COLORS = ['#E0453A', '#2F7FD8', '#F2B632'];

export class ToyWindow {
  readonly view = new Container();
  private cars: Container[] = [];
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
      car.addChild(art); car.position.set(x + 26 + i * 40, y + hgt - 16); car.visible = false;
      this.cars.push(car); this.view.addChild(car);
    });
    const tag = new Text({ text: 'MADE BY NICO', style: { fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '800', fontSize: 12, fill: '#2B3F55' } });
    tag.anchor.set(0.5, 0); tag.position.set(x + w / 2, y + 4);
    this.view.addChild(tag);
    this.view.zIndex = b.y + b.d + 1;
    this.set(0);
  }
  /** How many cars Nico has sold: the window shows up to three. */
  set(sold: number) {
    this.view.visible = sold > 0;
    this.cars.forEach((c, i) => { c.visible = i < sold; });
  }
}
