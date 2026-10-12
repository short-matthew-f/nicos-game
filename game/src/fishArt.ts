// Drawing the catch (fishing, fish.ts): one fish shape coloured per species, plus the crab, the boot and the bottle.
// Used on the fishing screen (2D canvas) and as icons in the sticker book (Pixi Graphics, via icons.ts).
import type { Species } from './fish';

/** A path-drawing target both a canvas and a Pixi Graphics can be driven through. */
export function drawCatch(c: CanvasRenderingContext2D, s: Species, x: number, y: number, len: number, flip = false, t = 0) {
  c.save(); c.translate(x, y); if (flip) c.scale(-1, 1);
  const k = len / 100, wig = Math.sin(t * 10) * 0.12;
  if (s.kind === 'crab') {
    c.fillStyle = s.color; c.beginPath(); c.ellipse(0, 0, 40 * k, 26 * k, 0, 0, Math.PI * 2); c.fill();
    for (const sg of [-1, 1]) { c.beginPath(); c.ellipse(sg * 52 * k, -22 * k, 16 * k, 11 * k, sg * 0.5, 0, Math.PI * 2); c.fill();
      c.strokeStyle = s.color; c.lineWidth = 5 * k; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(sg * 30 * k, (4 + i * 8) * k); c.lineTo(sg * (52 + Math.sin(t * 12 + i) * 4) * k, (14 + i * 10) * k); c.stroke(); } }
    c.fillStyle = '#FFFFFF'; for (const sg of [-1, 1]) { c.beginPath(); c.arc(sg * 12 * k, -28 * k, 7 * k, 0, Math.PI * 2); c.fill(); } c.fillStyle = '#1E2733'; for (const sg of [-1, 1]) { c.beginPath(); c.arc(sg * 12 * k, -28 * k, 3.5 * k, 0, Math.PI * 2); c.fill(); }
  } else if (s.kind === 'boot') {
    c.fillStyle = s.color; c.beginPath(); c.moveTo(-30 * k, -50 * k); c.lineTo(5 * k, -50 * k); c.lineTo(8 * k, 0); c.lineTo(45 * k, 6 * k); c.lineTo(48 * k, 26 * k); c.lineTo(-32 * k, 26 * k); c.closePath(); c.fill();
    c.fillStyle = s.belly; c.fillRect(-34 * k, 20 * k, 84 * k, 10 * k); c.fillStyle = '#8A6A48'; for (let i = 0; i < 4; i++) c.fillRect(-20 * k, (-40 + i * 10) * k, 22 * k, 3 * k);
    c.fillStyle = '#3BB273'; c.beginPath(); c.ellipse(-26 * k, -54 * k, 10 * k, 4 * k, 0.4, 0, Math.PI * 2); c.fill();   // (seaweed)
  } else if (s.kind === 'bottle') {
    c.rotate(-0.3); c.fillStyle = s.color; c.globalAlpha = 0.85; c.beginPath(); c.roundRect(-40 * k, -16 * k, 64 * k, 32 * k, 12 * k); c.fill(); c.fillRect(22 * k, -7 * k, 22 * k, 14 * k);
    c.globalAlpha = 1; c.fillStyle = '#B9895A'; c.fillRect(42 * k, -8 * k, 10 * k, 16 * k); c.fillStyle = '#F4EBD6'; c.beginPath(); c.roundRect(-28 * k, -8 * k, 40 * k, 16 * k, 4 * k); c.fill();
    c.strokeStyle = '#C8463D'; c.lineWidth = 2 * k; c.beginPath(); c.moveTo(-8 * k, -8 * k); c.lineTo(-8 * k, 8 * k); c.stroke();
  } else {
    const flat = s.id === 'flounder' ? 0.75 : 1, tall = s.id === 'flounder' ? 1.35 : 1;
    c.fillStyle = s.color;
    c.beginPath(); c.moveTo(-40 * k, 0); c.lineTo(-62 * k, (-20 + wig * 40) * k * tall); c.lineTo(-58 * k, 0); c.lineTo(-62 * k, (20 + wig * 40) * k * tall); c.closePath(); c.fill();   // tail
    c.beginPath(); c.moveTo(-8 * k, -18 * k * tall); c.lineTo(10 * k, -30 * k * tall); c.lineTo(18 * k, -16 * k * tall); c.closePath(); c.fill();   // fin
    c.beginPath(); c.ellipse(0, 0, 46 * k * flat, 20 * k * tall, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = s.belly; c.beginPath(); c.ellipse(4 * k, 8 * k * tall, 36 * k * flat, 9 * k * tall, 0, 0, Math.PI * 2); c.fill();
    if (s.id === 'striper') { c.strokeStyle = '#2B3F55'; c.lineWidth = 2.5 * k; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-30 * k, (-10 + i * 5) * k); c.lineTo(34 * k, (-10 + i * 5) * k); c.stroke(); } }
    if (s.id === 'mackerel') { c.strokeStyle = '#1E4C6E'; c.lineWidth = 3 * k; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo((-26 + i * 12) * k, -16 * k); c.quadraticCurveTo((-20 + i * 12) * k, -8 * k, (-26 + i * 12) * k, -2 * k); c.stroke(); } }
    if (s.id === 'golden') { c.fillStyle = '#FFFFFF'; for (const [a, b] of [[-20, -26], [30, -24], [-40, 18]]) { c.fillRect((a - 1) * k, (b - 6) * k, 2 * k, 12 * k); c.fillRect((a - 6) * k, (b - 1) * k, 12 * k, 2 * k); } }
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(28 * k, -5 * k, 6 * k, 0, Math.PI * 2); c.fill(); c.fillStyle = '#1E2733'; c.beginPath(); c.arc(30 * k, -5 * k, 3 * k, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#1E2733'; c.lineWidth = 2 * k; c.beginPath(); c.moveTo(44 * k, 4 * k); c.lineTo(38 * k, 6 * k); c.stroke();
  }
  c.restore();
}
