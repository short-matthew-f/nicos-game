// Ducks paddling round the pond, each on its own slow loop, bobbing a little.
import { Container, Graphics } from 'pixi.js';
import { POND } from './map';

function duckArt(): Graphics {
  // a sticker duck facing right, origin at the waterline
  const g = new Graphics();
  g.ellipse(0, -10, 22, 13).fill('#FFFFFF').circle(13, -26, 12).fill('#FFFFFF');            // white band
  g.ellipse(0, -10, 17, 9).fill('#FFFFFF').ellipse(-2, -12, 12, 6).fill('#E9EEF3');          // body, wing
  g.circle(13, -26, 8).fill('#3E8F5A').poly([19, -27, 28, -24, 19, -21]).fill('#F28C38')     // head (mallard green), beak
   .circle(15, -28, 1.8).fill('#2B3F55').rect(7, -19, 11, 3).fill('#FFFFFF');               // eye, collar
  return g;
}

export class Ducks {
  readonly views: Container[] = [];
  private t = Math.random() * 10;
  private ducks = [0, 2.1, 4.2].map((ph, i) => ({ ph, speed: 0.18 + i * 0.04, rx: POND.w / 2 - 60 - i * 25, ry: POND.d / 2 - 45 - i * 12, dir: i === 1 ? -1 : 1 }));
  constructor() { for (let i = 0; i < this.ducks.length; i++) { const c = new Container(); c.addChild(duckArt()); this.views.push(c); } }
  update(dt: number) {
    this.t += dt;
    const cx = POND.x + POND.w / 2, cy = POND.y + POND.d / 2;
    this.ducks.forEach((d, i) => {
      const a = d.ph + this.t * d.speed * d.dir;
      const x = cx + Math.cos(a) * d.rx, y = cy + Math.sin(a) * d.ry;
      const vx = -Math.sin(a) * d.dir;                            // which way it's paddling
      const v = this.views[i];
      v.position.set(x, y + Math.sin(this.t * 3 + i) * 1.5);
      v.scale.x = vx >= 0 ? 1 : -1;
      v.zIndex = y;
    });
  }
}
