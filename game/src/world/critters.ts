// Small sticker critters and markers that aren't characters.
import { Container, Graphics } from 'pixi.js';
import { NAVY } from './draw';

/** Whiskers: a ginger cat sitting, origin at her feet. */
export function drawCat(): Container {
  const g = new Graphics();
  g.ellipse(4, 2, 22, 6).fill({ color: NAVY, alpha: 0.2 });
  // white band, then the cat
  g.ellipse(0, -16, 20, 19).fill('#FFFFFF').circle(2, -42, 17).fill('#FFFFFF')
   .poly([-12, -52, -8, -70, 2, -56]).fill('#FFFFFF').poly([6, -56, 14, -70, 16, -52]).fill('#FFFFFF');
  g.roundRect(14, -30, 22, 9, 4).fill('#FFFFFF');
  g.ellipse(0, -16, 15, 15).fill('#F0954A').circle(2, -42, 12).fill('#F0954A')
   .poly([-8, -50, -6, -63, 1, -53]).fill('#F0954A').poly([5, -53, 12, -63, 13, -50]).fill('#F0954A')
   .roundRect(14, -28, 18, 5, 2.5).fill('#F0954A')                                  // tail
   .rect(-6, -26, 12, 3).fill('#D97A30').rect(-6, -18, 12, 3).fill('#D97A30')       // stripes
   .ellipse(2, -10, 8, 6).fill('#FFE7D1')                                             // tummy
   .circle(-3, -44, 2).fill(NAVY).circle(7, -44, 2).fill(NAVY).poly([1, -39, 4, -39, 2.5, -37]).fill('#E96A7A');
  const c = new Container(); c.addChild(g);
  return c;
}

/** A "!" speech bubble: this person has a job for you. Symmetric, so it survives a flip. */
export function drawBubble(): Graphics {
  const g = new Graphics();
  g.circle(0, 0, 22).fill('#FFFFFF').poly([-7, 16, 0, 30, 7, 16]).fill('#FFFFFF');
  g.circle(0, 0, 17).fill('#F9A826');
  g.roundRect(-3.5, -11, 7, 14, 3).fill(NAVY).circle(0, 8, 3.5).fill(NAVY);
  return g;
}
