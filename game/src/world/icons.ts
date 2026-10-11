// Little drawn things for shelves, counters and walls (and a few big ones: animals, the fire truck),
// in the sticker style: flat shapes with a white edge. These replace emoji (the user: "why are there
// suddenly a bunch of emoji in the game"). icon(name, size): a Graphics centred on (0, 0), about
// `size` px tall. Unknown names draw a small box, so data can't break the room.
import { Graphics } from 'pixi.js';

const WH = '#FFFFFF', NV = '#2B3F55';
type Draw = (g: Graphics, k: number) => void;
const edge = { width: 3, color: WH };
/** Each icon is drawn on a 40-unit square centred at 0 (k scales it). */
const ICONS: Record<string, Draw> = {
  // food
  tomato: (g, k) => g.circle(0, 2 * k, 13 * k).fill('#E5484D').stroke(edge).poly([-5 * k, -10 * k, 0, -6 * k, 5 * k, -10 * k, 0, -13 * k]).fill('#3BB273'),
  garlic: (g, k) => g.ellipse(0, 3 * k, 12 * k, 11 * k).fill('#F4EBD6').stroke(edge).poly([-3 * k, -8 * k, 3 * k, -8 * k, 0, -16 * k]).fill('#E9DCC7').moveTo(0, -6 * k).lineTo(0, 12 * k).stroke({ width: 1.5, color: '#D8C7A4' }),
  olive: (g, k) => g.ellipse(-5 * k, 2 * k, 7 * k, 9 * k).fill('#5E7A2E').stroke(edge).ellipse(6 * k, 4 * k, 7 * k, 9 * k).fill('#7A9A3A').stroke(edge),
  cheese: (g, k) => g.poly([-14 * k, 10 * k, 14 * k, 10 * k, 14 * k, -4 * k, -14 * k, 6 * k]).fill('#F9C846').stroke(edge).circle(4 * k, 4 * k, 2.5 * k).fill('#E3A92A').circle(-6 * k, 6 * k, 2 * k).fill('#E3A92A'),
  apple: (g, k) => g.circle(0, 3 * k, 12 * k).fill('#E5484D').stroke(edge).rect(-1 * k, -13 * k, 2.5 * k, 7 * k).fill('#8A5A3B').ellipse(5 * k, -10 * k, 5 * k, 3 * k).fill('#3BB273'),
  cookies: (g, k) => { g.ellipse(0, 8 * k, 16 * k, 5 * k).fill('#E9EEF3').stroke(edge); for (const x of [-7, 6]) g.circle(x * k, 2 * k, 7 * k).fill('#D9A066').circle(x * k - 2 * k, 0, 1.5 * k).fill('#5A3A22').circle(x * k + 2 * k, 4 * k, 1.5 * k).fill('#5A3A22'); },
  milk: (g, k) => g.roundRect(-7 * k, -12 * k, 14 * k, 26 * k, 4 * k).fill('#F4F6F8').stroke(edge).rect(-7 * k, -2 * k, 14 * k, 6 * k).fill('#5B8FD6'),
  pot: (g, k) => g.roundRect(-15 * k, -8 * k, 30 * k, 20 * k, 4 * k).fill('#9AA6B2').stroke(edge).rect(-19 * k, -6 * k, 5 * k, 4 * k).fill('#5B6472').rect(14 * k, -6 * k, 5 * k, 4 * k).fill('#5B6472').ellipse(0, -8 * k, 15 * k, 4 * k).fill('#C8463D'),
  plate: (g, k) => g.ellipse(0, 4 * k, 15 * k, 6 * k).fill('#FFFFFF').stroke({ width: 2, color: '#C9D3DC' }).ellipse(0, 4 * k, 9 * k, 3.5 * k).fill('#E9EEF3'),
  icecream: (g, k) => { const c = ['#F7C8D0', '#7FD1C1', '#F9E39A', '#8A5A3B', '#E5484D', '#F4F6F8']; for (let i = 0; i < 6; i++) g.roundRect((-30 + i * 10) * k, -2 * k, 9 * k, 10 * k, 2 * k).fill('#C9D3DC').roundRect((-30 + i * 10) * k, -6 * k, 9 * k, 6 * k, 3 * k).fill(c[i]); },
  // school, hospital
  books: (g, k) => { const c = ['#E5484D', '#2F7FD8', '#F9C846', '#3BB273']; c.forEach((col, i) => g.rect((-12 + i * 6) * k, (-10 + (i % 2) * 3) * k, 5 * k, (22 - (i % 2) * 3) * k).fill(col)); },
  globe: (g, k) => g.rect(-1 * k, 8 * k, 2 * k, 6 * k).fill('#8A5A3B').ellipse(0, 14 * k, 8 * k, 2 * k).fill('#8A5A3B').circle(0, -3 * k, 11 * k).fill('#5B8FD6').stroke(edge).ellipse(-3 * k, -6 * k, 5 * k, 3 * k).fill('#3BB273').ellipse(4 * k, 1 * k, 4 * k, 3 * k).fill('#3BB273'),
  clock: (g, k) => g.circle(0, 0, 14 * k).fill('#FFFFFF').stroke({ width: 3, color: NV }).moveTo(0, 0).lineTo(0, -9 * k).moveTo(0, 0).lineTo(6 * k, 2 * k).stroke({ width: 2.5, color: NV }),
  clipboard: (g, k) => g.roundRect(-9 * k, -12 * k, 18 * k, 24 * k, 2 * k).fill('#B9895A').stroke(edge).rect(-6 * k, -8 * k, 12 * k, 18 * k).fill('#FFFFFF').rect(-3 * k, -14 * k, 6 * k, 4 * k).fill('#9AA6B2'),
  stethoscope: (g, k) => g.moveTo(-8 * k, -10 * k).quadraticCurveTo(-8 * k, 8 * k, 0, 8 * k).quadraticCurveTo(8 * k, 8 * k, 8 * k, -10 * k).stroke({ width: 3, color: NV }).circle(0, 12 * k, 4 * k).fill('#9AA6B2'),
  pillow: (g, k) => g.roundRect(-16 * k, -6 * k, 32 * k, 12 * k, 6 * k).fill('#FFFFFF').stroke({ width: 2, color: '#C9D3DC' }),
  // fire station
  helmet: (g, k) => g.ellipse(0, 6 * k, 15 * k, 4 * k).fill('#B8382F').stroke(edge).ellipse(0, 1 * k, 10 * k, 9 * k).fill('#E5484D').rect(-2 * k, -7 * k, 4 * k, 12 * k).fill('#F9C846'),
  extinguisher: (g, k) => g.roundRect(-6 * k, -8 * k, 12 * k, 22 * k, 5 * k).fill('#E5484D').stroke(edge).rect(-3 * k, -13 * k, 8 * k, 5 * k).fill('#2C3440'),
  axe: (g, k) => g.rect(-1.5 * k, -12 * k, 3 * k, 26 * k).fill('#8A5A3B').poly([1 * k, -12 * k, 11 * k, -14 * k, 11 * k, -2 * k, 1 * k, -4 * k]).fill('#9AA6B2').stroke(edge),
  // tools and parts
  hammer: (g, k) => g.rect(-1.5 * k, -6 * k, 3 * k, 20 * k).fill('#B9895A').roundRect(-9 * k, -12 * k, 18 * k, 7 * k, 2 * k).fill('#5B6472'),
  saw: (g, k) => g.poly([-10 * k, -8 * k, 12 * k, -4 * k, 12 * k, 4 * k, -10 * k, 4 * k]).fill('#C9D3DC').stroke(edge).roundRect(-16 * k, -8 * k, 7 * k, 14 * k, 2 * k).fill('#E5484D'),
  screwdriver: (g, k) => g.roundRect(-3 * k, -14 * k, 6 * k, 12 * k, 2 * k).fill('#F9C846').rect(-1 * k, -2 * k, 2 * k, 16 * k).fill('#9AA6B2'),
  wrench: (g, k) => g.rect(-1.5 * k, -8 * k, 3 * k, 20 * k).fill('#9AA6B2').circle(0, -10 * k, 5 * k).fill('#9AA6B2').circle(0, -12 * k, 2.5 * k).fill('#C9A46A'),
  ruler: (g, k) => { g.rect(-14 * k, -3 * k, 28 * k, 6 * k).fill('#F9C846'); for (let i = -12; i <= 12; i += 4) g.rect(i * k, -3 * k, 1 * k, 3 * k).fill(NV); },
  toolbox: (g, k) => g.roundRect(-14 * k, -4 * k, 28 * k, 16 * k, 3 * k).fill('#E5484D').stroke(edge).roundRect(-6 * k, -10 * k, 12 * k, 7 * k, 3 * k).stroke({ width: 2.5, color: '#5B6472' }),
  bolt: (g, k) => g.poly([-6 * k, -10 * k, 6 * k, -10 * k, 8 * k, -6 * k, -8 * k, -6 * k]).fill('#9AA6B2').rect(-2 * k, -6 * k, 4 * k, 18 * k).fill('#9AA6B2'),
  wheel: (g, k) => g.circle(0, 0, 12 * k).fill('#2C3E52').stroke(edge).circle(0, 0, 5 * k).fill('#C9D3DC'),
  gear: (g, k) => { for (let a = 0; a < 8; a++) { const r = a * Math.PI / 4; g.circle(Math.cos(r) * 11 * k, Math.sin(r) * 11 * k, 3.5 * k).fill('#F2B632'); } g.circle(0, 0, 10 * k).fill('#F2B632').circle(0, 0, 3.5 * k).fill(NV); },
  battery: (g, k) => g.roundRect(-12 * k, -6 * k, 24 * k, 12 * k, 2 * k).fill('#3BB273').stroke(edge).rect(12 * k, -3 * k, 3 * k, 6 * k).fill(NV),
  bulb: (g, k) => g.circle(0, -3 * k, 9 * k).fill('#FFE066').stroke(edge).rect(-4 * k, 5 * k, 8 * k, 6 * k).fill('#9AA6B2'),
  twine: (g, k) => g.roundRect(-10 * k, -10 * k, 20 * k, 20 * k, 4 * k).fill('#C9A46A').stroke(edge).rect(-10 * k, -2 * k, 20 * k, 3 * k).fill('#9C7A55'),
  sticks: (g, k) => { for (const x of [-4, 0, 4]) g.rect((x - 1) * k, -12 * k, 2.5 * k, 24 * k).fill('#B9895A'); },
  wood: (g, k) => g.roundRect(-14 * k, -5 * k, 28 * k, 10 * k, 4 * k).fill('#B9895A').stroke(edge).circle(13 * k, 0, 4.5 * k).fill('#D9A066'),
  tin: (g, k) => g.roundRect(-9 * k, -11 * k, 18 * k, 22 * k, 3 * k).fill('#A9B8C6').stroke(edge).rect(-9 * k, -3 * k, 18 * k, 6 * k).fill('#E5484D'),
  receipt: (g, k) => { g.rect(-7 * k, -12 * k, 14 * k, 24 * k).fill('#FFFFFF').stroke({ width: 2, color: '#C9D3DC' }); for (let y = -8; y < 10; y += 4) g.rect(-4 * k, y * k, 8 * k, 1.5 * k).fill('#9AA6B2'); },
  // toys
  teddy: (g, k) => g.circle(-8 * k, -10 * k, 4 * k).fill('#B9895A').circle(8 * k, -10 * k, 4 * k).fill('#B9895A').circle(0, -5 * k, 9 * k).fill('#C9945C').ellipse(0, 9 * k, 10 * k, 8 * k).fill('#C9945C').circle(-3 * k, -6 * k, 1.5 * k).fill(NV).circle(3 * k, -6 * k, 1.5 * k).fill(NV),
  robot: (g, k) => g.roundRect(-9 * k, -12 * k, 18 * k, 14 * k, 3 * k).fill('#A9B8C6').stroke(edge).roundRect(-11 * k, 3 * k, 22 * k, 12 * k, 3 * k).fill('#5B8FD6').circle(-4 * k, -6 * k, 2.5 * k).fill(NV).circle(4 * k, -6 * k, 2.5 * k).fill(NV),
  yoyo: (g, k) => g.circle(0, 4 * k, 10 * k).fill('#E5484D').stroke(edge).rect(-1 * k, -14 * k, 1.5 * k, 10 * k).fill(NV),
  dice: (g, k) => g.roundRect(-10 * k, -10 * k, 20 * k, 20 * k, 4 * k).fill('#FFFFFF').stroke({ width: 2, color: '#C9D3DC' }).circle(-5 * k, -5 * k, 2 * k).fill(NV).circle(0, 0, 2 * k).fill(NV).circle(5 * k, 5 * k, 2 * k).fill(NV),
  toycar: (g, k) => g.roundRect(-14 * k, -6 * k, 28 * k, 12 * k, 5 * k).fill('#E0453A').stroke(edge).circle(-8 * k, 7 * k, 4 * k).fill(NV).circle(8 * k, 7 * k, 4 * k).fill(NV),
  train: (g, k) => g.rect(-14 * k, -4 * k, 28 * k, 12 * k).fill('#3BB273').stroke(edge).rect(4 * k, -12 * k, 10 * k, 8 * k).fill('#3BB273').rect(-12 * k, -9 * k, 5 * k, 5 * k).fill(NV).circle(-7 * k, 9 * k, 3.5 * k).fill(NV).circle(7 * k, 9 * k, 3.5 * k).fill(NV),
  plane: (g, k) => g.roundRect(-14 * k, -3 * k, 28 * k, 7 * k, 3.5 * k).fill('#F4F6F8').stroke(edge).poly([-2 * k, 0, 4 * k, -12 * k, 8 * k, -12 * k, 4 * k, 0]).fill('#5B8FD6').poly([-12 * k, 0, -9 * k, -7 * k, -6 * k, -7 * k, -7 * k, 0]).fill('#5B8FD6'),
  ufo: (g, k) => g.ellipse(0, 3 * k, 15 * k, 5 * k).fill('#9AA6B2').stroke(edge).ellipse(0, -2 * k, 7 * k, 6 * k).fill('#7FD1E8'),
  kite: (g, k) => g.poly([0, -14 * k, 10 * k, 0, 0, 12 * k, -10 * k, 0]).fill('#F28C38').stroke(edge).moveTo(0, -14 * k).lineTo(0, 12 * k).moveTo(-10 * k, 0).lineTo(10 * k, 0).stroke({ width: 1.5, color: '#FFFFFF' }),
  target: (g, k) => g.circle(0, 0, 13 * k).fill('#E5484D').stroke(edge).circle(0, 0, 9 * k).fill('#FFFFFF').circle(0, 0, 5 * k).fill('#E5484D'),
  puzzle: (g, k) => g.roundRect(-10 * k, -10 * k, 20 * k, 20 * k, 2 * k).fill('#7B5BA6').stroke(edge).circle(10 * k, 0, 4 * k).fill('#7B5BA6').circle(0, -10 * k, 4 * k).fill('#7B5BA6'),
  doll: (g, k) => g.ellipse(0, 6 * k, 10 * k, 9 * k).fill('#E5484D').stroke(edge).circle(0, -7 * k, 7 * k).fill('#F2B632').circle(0, -6 * k, 4.5 * k).fill('#F2CDB4'),
  gift: (g, k) => g.rect(-12 * k, -8 * k, 24 * k, 20 * k).fill('#7FD1C1').stroke(edge).rect(-2 * k, -8 * k, 4 * k, 20 * k).fill('#E5484D').rect(-12 * k, -1 * k, 24 * k, 4 * k).fill('#E5484D').circle(-4 * k, -10 * k, 4 * k).fill('#E5484D').circle(4 * k, -10 * k, 4 * k).fill('#E5484D'),
  // pool, cabin
  flipflops: (g, k) => g.ellipse(-6 * k, 0, 5 * k, 12 * k).fill('#F28C38').stroke(edge).ellipse(6 * k, 0, 5 * k, 12 * k).fill('#F28C38').stroke(edge),
  goggles: (g, k) => g.ellipse(-6 * k, 0, 6 * k, 5 * k).fill('#7FD1E8').stroke({ width: 2.5, color: NV }).ellipse(6 * k, 0, 6 * k, 5 * k).fill('#7FD1E8').stroke({ width: 2.5, color: NV }),
  ringbuoy: (g, k) => g.circle(0, 0, 13 * k).fill('#E5484D').stroke(edge).circle(0, 0, 6 * k).fill('#F4F6F8').rect(-2 * k, -13 * k, 4 * k, 7 * k).fill('#FFFFFF').rect(-2 * k, 6 * k, 4 * k, 7 * k).fill('#FFFFFF'),
  duck: (g, k) => g.ellipse(0, 4 * k, 13 * k, 8 * k).fill('#F9C846').stroke(edge).circle(8 * k, -6 * k, 6 * k).fill('#F9C846').poly([13 * k, -6 * k, 18 * k, -4 * k, 13 * k, -3 * k]).fill('#F28C38'),
  binoculars: (g, k) => g.roundRect(-11 * k, -6 * k, 9 * k, 16 * k, 3 * k).fill('#2C3440').roundRect(2 * k, -6 * k, 9 * k, 16 * k, 3 * k).fill('#2C3440').rect(-2 * k, -2 * k, 4 * k, 5 * k).fill('#5B6472'),
  notebook: (g, k) => g.roundRect(-10 * k, -12 * k, 20 * k, 24 * k, 2 * k).fill('#3BB273').stroke(edge).rect(-10 * k, -12 * k, 3 * k, 24 * k).fill('#2F7F4A'),
  deer: (g, k) => g.ellipse(0, 4 * k, 12 * k, 7 * k).fill('#B9895A').circle(11 * k, -6 * k, 5 * k).fill('#B9895A').moveTo(10 * k, -10 * k).lineTo(8 * k, -16 * k).moveTo(13 * k, -10 * k).lineTo(15 * k, -16 * k).stroke({ width: 2, color: '#8A5A3B' }),
  fox: (g, k) => g.ellipse(-2 * k, 4 * k, 11 * k, 7 * k).fill('#F28C38').poly([6 * k, -8 * k, 14 * k, -8 * k, 10 * k, 2 * k]).fill('#F28C38').ellipse(-13 * k, 6 * k, 6 * k, 3 * k).fill('#F4F6F8'),
  rabbit: (g, k) => g.ellipse(0, 5 * k, 9 * k, 7 * k).fill('#E9E2D6').ellipse(-3 * k, -8 * k, 2.5 * k, 7 * k).fill('#E9E2D6').ellipse(3 * k, -8 * k, 2.5 * k, 7 * k).fill('#E9E2D6'),
  owl: (g, k) => g.ellipse(0, 2 * k, 10 * k, 12 * k).fill('#8A5A3B').circle(-4 * k, -2 * k, 4 * k).fill('#F4F1DE').circle(4 * k, -2 * k, 4 * k).fill('#F4F1DE').circle(-4 * k, -2 * k, 1.8 * k).fill(NV).circle(4 * k, -2 * k, 1.8 * k).fill(NV),
  // grandparents
  face1: (g, k) => g.circle(0, 0, 11 * k).fill('#F0C9AE').arc(0, -2 * k, 11 * k, Math.PI, 0).fill('#B9BCC0'),
  face2: (g, k) => g.circle(0, 0, 11 * k).fill('#F0C4A8').ellipse(0, 5 * k, 7 * k, 2.5 * k).fill('#F4F4F4').arc(0, -4 * k, 11 * k, Math.PI * 1.1, -Math.PI * 0.1).stroke({ width: 4, color: '#EDEDED' }),
  face3: (g, k) => g.circle(0, 0, 11 * k).fill('#F2CDB4').arc(0, -2 * k, 11 * k, Math.PI, 0).fill('#3B271B'),
  palette: (g, k) => { g.ellipse(0, 0, 15 * k, 11 * k).fill('#D9A066').stroke(edge); ['#E5484D', '#F9C846', '#3BB273', '#2F7FD8'].forEach((c, i) => g.circle((-8 + i * 5) * k, (-3 + (i % 2) * 5) * k, 2.5 * k).fill(c)); },
  brush: (g, k) => g.rect(-1.5 * k, -12 * k, 3 * k, 18 * k).fill('#B9895A').poly([-3 * k, 6 * k, 3 * k, 6 * k, 0, 14 * k]).fill('#2F7FD8'),
  jar: (g, k) => g.roundRect(-8 * k, -9 * k, 16 * k, 20 * k, 4 * k).fill('#BFE3F5').stroke(edge).rect(-8 * k, 3 * k, 16 * k, 8 * k).fill('#7FD1E8'),
  crayon: (g, k) => g.rect(-3 * k, -8 * k, 6 * k, 20 * k).fill('#7B5BA6').poly([-3 * k, -8 * k, 3 * k, -8 * k, 0, -14 * k]).fill('#7B5BA6'),
  canvas: (g, k) => g.rect(-12 * k, -12 * k, 24 * k, 18 * k).fill('#FFFFFF').stroke({ width: 2, color: '#C9D3DC' }).circle(-4 * k, -5 * k, 3 * k).fill('#F9C846').poly([-12 * k, 6 * k, -2 * k, -4 * k, 6 * k, 2 * k, 12 * k, -3 * k, 12 * k, 6 * k]).fill('#3BB273'),
  cnc: (g, k) => g.rect(-14 * k, -12 * k, 28 * k, 4 * k).fill('#C9D3DC').rect(-3 * k, -12 * k, 6 * k, 16 * k).fill('#9AA6B2').poly([-2 * k, 4 * k, 2 * k, 4 * k, 0, 9 * k]).fill('#F9C846'),
  spark: (g, k) => g.poly([2 * k, -14 * k, -6 * k, 2 * k, 0, 2 * k, -3 * k, 14 * k, 7 * k, -3 * k, 1 * k, -3 * k]).fill('#F9C846').stroke(edge),
  flame: (g, k) => g.poly([0, -14 * k, 9 * k, 2 * k, 5 * k, 12 * k, -5 * k, 12 * k, -9 * k, 2 * k]).fill('#F28C38').stroke(edge).poly([0, -4 * k, 4 * k, 6 * k, -4 * k, 6 * k]).fill('#F9C846'),
  // the pantry
  flour: (g, k) => g.roundRect(-11 * k, -12 * k, 22 * k, 26 * k, 6 * k).fill('#F4EBD6').stroke(edge).rect(-8 * k, -2 * k, 16 * k, 6 * k).fill('#C9A46A'),
  sugar: (g, k) => g.roundRect(-11 * k, -12 * k, 22 * k, 26 * k, 6 * k).fill('#FFFFFF').stroke({ width: 2, color: '#C9D3DC' }).rect(-8 * k, -2 * k, 16 * k, 6 * k).fill('#F7C8D0'),
  butter: (g, k) => g.roundRect(-13 * k, -6 * k, 26 * k, 14 * k, 3 * k).fill('#F9E39A').stroke(edge).rect(-13 * k, -6 * k, 26 * k, 4 * k).fill('#F2D27A'),
  egg: (g, k) => g.ellipse(0, 1 * k, 9 * k, 12 * k).fill('#FFF6E6').stroke({ width: 2, color: '#E9DCC7' }),
  eggs: (g, k) => { for (const x of [-9, 0, 9]) g.ellipse(x * k, 2 * k, 5 * k, 7 * k).fill('#FFF6E6').stroke({ width: 1.5, color: '#E9DCC7' }); },
  chocolate: (g, k) => { g.roundRect(-12 * k, -9 * k, 24 * k, 18 * k, 2 * k).fill('#5A3A22').stroke(edge); for (const x of [-4, 4]) g.rect(x * k, -9 * k, 1 * k, 18 * k).fill('#3E2716'); },
  cookie: (g, k) => g.circle(0, 0, 12 * k).fill('#D9A066').stroke(edge).circle(-4 * k, -3 * k, 2 * k).fill('#5A3A22').circle(4 * k, 2 * k, 2 * k).fill('#5A3A22'),
  cupcake: (g, k) => g.poly([-10 * k, 0, 10 * k, 0, 7 * k, 12 * k, -7 * k, 12 * k]).fill('#7FD1E8').circle(0, -3 * k, 10 * k).fill('#F7C8D0').circle(0, -12 * k, 3 * k).fill('#E5484D'),
  bread: (g, k) => g.roundRect(-14 * k, -7 * k, 28 * k, 14 * k, 7 * k).fill('#C9874A').stroke(edge).moveTo(-6 * k, -5 * k).lineTo(-2 * k, 2 * k).moveTo(2 * k, -5 * k).lineTo(6 * k, 2 * k).stroke({ width: 2, color: '#E8B47A' }),
  plant: (g, k) => g.poly([-7 * k, 4 * k, 7 * k, 4 * k, 5 * k, 14 * k, -5 * k, 14 * k]).fill('#C8463D').circle(0, -6 * k, 8 * k).fill('#3E8F5A').circle(-6 * k, -1 * k, 6 * k).fill('#3E8F5A').circle(6 * k, -1 * k, 6 * k).fill('#5DB86F'),
  star: (g, k) => { const p: number[] = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = (i % 2 ? 6 : 14) * k; p.push(Math.cos(a) * r, Math.sin(a) * r); } g.poly(p).fill('#F9C846').stroke(edge); },
  heart: (g, k) => g.moveTo(0, 12 * k).bezierCurveTo(-18 * k, 0, -10 * k, -14 * k, 0, -5 * k).bezierCurveTo(10 * k, -14 * k, 18 * k, 0, 0, 12 * k).fill('#E5484D').stroke(edge),
  rocket: (g, k) => g.moveTo(0, -14 * k).quadraticCurveTo(8 * k, -4 * k, 5 * k, 8 * k).lineTo(-5 * k, 8 * k).quadraticCurveTo(-8 * k, -4 * k, 0, -14 * k).fill('#E9EEF3').stroke(edge).circle(0, -3 * k, 3 * k).fill('#5B8FD6').poly([-5 * k, 8 * k, 5 * k, 8 * k, 0, 14 * k]).fill('#F28C38'),
};
/** Big things standing on the floor (drawn bottom-centre at 0, 0, `size` px tall). */
const BIG: Record<string, Draw> = {
  cow: (g, k) => g.ellipse(0, -48 * k, 52 * k, 30 * k).fill('#FFFFFF').stroke({ width: 4, color: '#FFFFFF' }).ellipse(-18 * k, -54 * k, 14 * k, 10 * k).fill('#2C3440').ellipse(16 * k, -40 * k, 12 * k, 9 * k).fill('#2C3440')
    .rect(-38 * k, -26 * k, 9 * k, 26 * k).fill('#E9E2D6').rect(28 * k, -26 * k, 9 * k, 26 * k).fill('#E9E2D6').ellipse(54 * k, -58 * k, 16 * k, 13 * k).fill('#FFFFFF').ellipse(62 * k, -52 * k, 10 * k, 7 * k).fill('#F7C8D0').circle(52 * k, -63 * k, 2.5 * k).fill('#2C3440'),
  horse: (g, k) => g.ellipse(0, -52 * k, 46 * k, 22 * k).fill('#8A5A3B').rect(-34 * k, -34 * k, 8 * k, 34 * k).fill('#6B4430').rect(26 * k, -34 * k, 8 * k, 34 * k).fill('#6B4430').poly([30 * k, -60 * k, 48 * k, -98 * k, 62 * k, -92 * k, 46 * k, -54 * k]).fill('#8A5A3B').ellipse(58 * k, -94 * k, 12 * k, 8 * k).fill('#8A5A3B')
    .poly([40 * k, -96 * k, 32 * k, -64 * k, 38 * k, -62 * k]).fill('#3E2716').circle(56 * k, -97 * k, 2 * k).fill('#2C3440'),
  chicken: (g, k) => g.ellipse(0, -18 * k, 16 * k, 13 * k).fill('#FFFFFF').stroke({ width: 2, color: '#E9DCC7' }).circle(12 * k, -30 * k, 8 * k).fill('#FFFFFF').poly([18 * k, -31 * k, 25 * k, -29 * k, 18 * k, -27 * k]).fill('#F28C38').circle(11 * k, -38 * k, 4 * k).fill('#E5484D').rect(-4 * k, -6 * k, 2 * k, 6 * k).fill('#F28C38').rect(3 * k, -6 * k, 2 * k, 6 * k).fill('#F28C38'),
  chick: (g, k) => g.circle(0, -10 * k, 10 * k).fill('#F9E04A').poly([8 * k, -12 * k, 14 * k, -10 * k, 8 * k, -8 * k]).fill('#F28C38').circle(4 * k, -13 * k, 1.5 * k).fill('#2C3440'),
  firetruck: (g, k) => g.roundRect(-150 * k, -110 * k, 300 * k, 90 * k, 12 * k).fill('#FFFFFF').roundRect(-146 * k, -106 * k, 292 * k, 82 * k, 10 * k).fill('#E5484D').roundRect(60 * k, -150 * k, 86 * k, 50 * k, 8 * k).fill('#E5484D').rect(76 * k, -142 * k, 58 * k, 30 * k).fill('#BFE3F5')
    .rect(-140 * k, -126 * k, 190 * k, 10 * k).fill('#C9D3DC').rect(-140 * k, -70 * k, 286 * k, 8 * k).fill('#FFFFFF').circle(-100 * k, -18 * k, 22 * k).fill('#2C3440').circle(90 * k, -18 * k, 22 * k).fill('#2C3440').circle(-100 * k, -18 * k, 9 * k).fill('#9AA6B2').circle(90 * k, -18 * k, 9 * k).fill('#9AA6B2')
    .circle(100 * k, -158 * k, 7 * k).fill('#2F7FD8'),
  bike: (g, k) => g.circle(-34 * k, -24 * k, 22 * k).stroke({ width: 6, color: '#2C3440' }).circle(34 * k, -24 * k, 22 * k).stroke({ width: 6, color: '#2C3440' })
    .moveTo(-34 * k, -24 * k).lineTo(-6 * k, -60 * k).lineTo(22 * k, -60 * k).lineTo(34 * k, -24 * k).moveTo(-6 * k, -60 * k).lineTo(0, -24 * k).lineTo(-34 * k, -24 * k).stroke({ width: 5, color: '#2F7FD8' }).rect(-14 * k, -68 * k, 18 * k, 6 * k).fill('#2C3440'),
  bear: (g, k) => g.circle(-26 * k, -100 * k, 12 * k).fill('#8A5A3B').circle(26 * k, -100 * k, 12 * k).fill('#8A5A3B').ellipse(0, -36 * k, 34 * k, 36 * k).fill('#8A5A3B').circle(0, -86 * k, 28 * k).fill('#9C6A42').ellipse(0, -78 * k, 12 * k, 9 * k).fill('#D9A066')
    .circle(-9 * k, -92 * k, 3 * k).fill('#2C3440').circle(9 * k, -92 * k, 3 * k).fill('#2C3440').circle(0, -82 * k, 4 * k).fill('#2C3440'),
  // a punching bag on a chain, from a stand
  bag: (g, k) => g.rect(-38 * k, -230 * k, 8 * k, 230 * k).fill('#3A3A44').rect(-38 * k, -230 * k, 60 * k, 8 * k).fill('#3A3A44').rect(14 * k, -222 * k, 3 * k, 30 * k).fill('#9AA3AE')
    .roundRect(-6 * k, -194 * k, 42 * k, 130 * k, 18 * k).fill('#C8463D').rect(-6 * k, -170 * k, 42 * k, 6 * k).fill('#2B2B30').rect(-6 * k, -96 * k, 42 * k, 6 * k).fill('#2B2B30')
    .ellipse(-34 * k, 0, 26 * k, 7 * k).fill('#3A3A44'),
  plant: (g, k) => g.poly([-20 * k, -40 * k, 20 * k, -40 * k, 15 * k, 0, -15 * k, 0]).fill('#C8463D').circle(0, -72 * k, 24 * k).fill('#3E8F5A').circle(-18 * k, -56 * k, 18 * k).fill('#3E8F5A').circle(18 * k, -58 * k, 18 * k).fill('#5DB86F').circle(-4 * k, -92 * k, 14 * k).fill('#5DB86F'),
};
export function icon(name: string, size = 32): Graphics {
  const g = new Graphics(), k = size / 32;
  (ICONS[name] ?? ((q: Graphics, kk: number) => q.roundRect(-8 * kk, -8 * kk, 16 * kk, 16 * kk, 3 * kk).fill('#C9D3DC')))(g, k);
  return g;
}
export const hasBig = (name: string) => name in BIG;
/** A big thing standing at (0, 0): `size` is about how tall it's drawn (the art is laid out for 100). */
export function bigThing(name: string, size: number): Graphics {
  const g = new Graphics(), k = size / 100;
  g.ellipse(0, 0, 50 * k * (name === 'firetruck' ? 3 : 1), 8 * k).fill({ color: NV, alpha: 0.18 });
  (BIG[name] ?? ICONS.plant)(g, k);
  return g;
}
/** A row of icons (names separated by spaces), centred at (x, y), each `size` px, `gap` apart. */
export function iconRow(names: string, x: number, y: number, size = 30, gap = 40): Graphics[] {
  const list = names.split(' ').filter(Boolean);
  return list.map((n, i) => { const g = icon(n, size); g.position.set(x + (i - (list.length - 1) / 2) * gap, y); return g; });
}
