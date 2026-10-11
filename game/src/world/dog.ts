// Biscuit, Nico's dog, drawn: a golden dog from the side with a red collar, in the sticker style
// (a white band round everything). Trots (legs swing, tail wags), sits, lies down, and sleeps.
// Origin at its feet, facing right; the view flips to face left. The brain is ../dog.ts.
import { Container, Graphics, Text } from 'pixi.js';
import { NAVY, BAND } from './draw';
import type { DogState } from '../dog';

const FUR = '#E0A458', DARK = '#B97A35', CHEST = '#FFF1DC', COLLAR = '#D9342B';
export type DogPose = 'stand' | 'sit' | 'lie' | 'sleep';

/** Draw the dog into g: `step` is how far through its stride (radians), `wag` its tail. */
export function drawDog(g: Graphics, pose: DogPose, step = 0, wag = 0) {
  g.clear();
  g.ellipse(2, 2, pose === 'lie' || pose === 'sleep' ? 40 : 32, 6).fill({ color: NAVY, alpha: 0.2 });
  // twice: once fat and white (the sticker band), then in colour
  for (const band of [true, false]) {
    const f = (c: string) => (band ? { color: '#FFFFFF' } : { color: c });
    const st = (c: string, w: number) => ({ width: band ? w + BAND * 2 : w, color: band ? '#FFFFFF' : c, cap: 'round' as const });
    const blob = (draw: () => Graphics, c: string) => { draw().fill(f(c)); if (band) draw().stroke({ width: BAND * 2, color: '#FFFFFF' }); };
    if (pose === 'stand') {
      const sw = Math.sin(step) * 9, sw2 = Math.sin(step + Math.PI) * 9;
      for (const [hx, s] of [[-20, sw], [-12, sw2], [16, sw2], [24, sw]] as const) g.moveTo(hx, -24).lineTo(hx + s, -3).stroke(st(hx < 0 ? DARK : FUR, 8));
      g.moveTo(-28, -36).lineTo(-44, -48 + wag * 6).stroke(st(FUR, 7));                       // tail
      blob(() => g.ellipse(0, -32, 31, 15), FUR);
      blob(() => g.circle(34, -50, 14), FUR);                                                   // head
      blob(() => g.ellipse(46, -45, 10, 7), FUR);                                              // snout
    } else if (pose === 'sit') {
      g.moveTo(-18, -14).lineTo(-36, -8 + wag * 5).stroke(st(FUR, 7));                         // tail on the ground
      blob(() => g.ellipse(-8, -12, 18, 11), DARK);                                            // haunches
      for (const hx of [12, 19]) g.moveTo(hx, -32).lineTo(hx, -3).stroke(st(FUR, 8));          // front legs
      blob(() => g.ellipse(2, -30, 18, 19), FUR);
      blob(() => g.circle(22, -58, 14), FUR);
      blob(() => g.ellipse(34, -53, 10, 7), FUR);
    } else {
      g.moveTo(-30, -12).lineTo(-48, -6).stroke(st(FUR, 7));
      blob(() => g.ellipse(0, -15, 33, 13), FUR);
      blob(() => g.ellipse(32, -5, 15, 5), FUR);                                               // front paws out
      blob(() => g.circle(32, -24, 13), FUR);
      blob(() => g.ellipse(43, -18, 10, 6.5), FUR);
    }
  }
  // the details: chest, collar, ear, eye, nose
  if (pose === 'stand') {
    g.ellipse(20, -28, 9, 10).fill(CHEST);
    g.roundRect(23, -45, 7, 13, 3).fill(COLLAR);
    g.roundRect(22, -58, 10, 22, 5).fill(DARK);                                                   // floppy ear
    g.circle(38, -54, 2.6).fill(NAVY).circle(55, -47, 3.6).fill(NAVY);
    g.moveTo(48, -40).quadraticCurveTo(51, -38, 54, -40).stroke({ width: 1.5, color: NAVY });   // smile
  } else if (pose === 'sit') {
    g.ellipse(9, -26, 9, 12).fill(CHEST);
    g.roundRect(12, -50, 7, 12, 3).fill(COLLAR);
    g.roundRect(10, -66, 10, 22, 5).fill(DARK);
    g.circle(26, -62, 2.6).fill(NAVY).circle(43, -55, 3.6).fill(NAVY);
    g.moveTo(36, -48).quadraticCurveTo(39, -46, 42, -48).stroke({ width: 1.5, color: NAVY });
  } else {
    g.roundRect(20, -32, 10, 20, 5).fill(DARK);
    if (pose === 'sleep') g.moveTo(32, -27).quadraticCurveTo(35, -24, 38, -27).stroke({ width: 2, color: NAVY });   // eyes shut
    else g.circle(35, -28, 2.6).fill(NAVY);
    g.circle(52, -20, 3.4).fill(NAVY);
  }
}

/** A dog that follows a DogState about: call update every frame. */
export class DogView {
  readonly view = new Container();
  private g = new Graphics();
  private step = 0; private t = 0;
  constructor() { this.view.addChild(this.g); drawDog(this.g, 'stand'); }
  update(d: DogState, dt: number) {
    this.t += dt;
    const sp = Math.hypot(d.vx, d.vy);
    this.step += sp * dt / 9;
    const pose: DogPose = d.mode === 'lie' ? 'sleep' : d.mode === 'sit' ? 'sit' : 'stand';
    const wag = Math.sin(this.t * (pose === 'stand' ? 14 : 8)) * (pose === 'sleep' ? 0 : 1);
    drawDog(this.g, pose, sp > 15 ? this.step : 0, wag);
    this.view.position.set(d.x, d.y - (sp > 15 ? Math.abs(Math.sin(this.step)) * 3 : 0));   // (a little bounce in its trot)
    this.view.scale.set(d.face * 1.15, 1.15);
    this.view.zIndex = d.y;
  }
}

/** The doghouse in Nico's yard: red, with a peaked roof and the dog's name over the door. Origin at its front middle. */
export function doghouseArt(x: number, y: number, name: string): Container {
  const g = new Graphics();
  g.ellipse(x + 6, y + 2, 62, 10).fill({ color: NAVY, alpha: 0.18 });
  g.roundRect(x - 58, y - 82, 116, 84, 6).fill('#FFFFFF').poly([x - 70, y - 74, x, y - 132, x + 70, y - 74]).fill('#FFFFFF');
  g.rect(x - 52, y - 78, 104, 78).fill('#C8463D');
  for (let k = 1; k < 4; k++) g.rect(x - 52, y - 78 + k * 19, 104, 2).fill('#A93A32');
  g.poly([x - 62, y - 76, x, y - 126, x + 62, y - 76]).fill('#5E2A24');
  g.roundRect(x - 22, y - 50, 44, 50, 20).fill('#3A2A2E');                                        // the doorway
  g.roundRect(x - 34, y - 98, 68, 16, 5).fill('#FFF4C2');
  const t = new Text({ text: name.toUpperCase(), style: { fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '900', fontSize: 13, fill: '#8C2F2B' } });
  t.anchor.set(0.5); t.position.set(x, y - 90);
  const c = new Container(); c.addChild(g, t);
  c.zIndex = y;
  return c;
}
