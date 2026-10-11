// Nico's dog (2026-10-10, from the "what next" list: a dog that follows Nico round town, fetches the
// soccer ball and sleeps at the foot of his bed). Adopted by buying the doghouse in his yard
// (unlocks.ts). The brain is here, pure and testable; world/dog.ts draws it.

export const DOG = {
  name: 'Biscuit',
  heel: 70,          // how close behind Nico it likes to be
  trot: 300,         // px/s keeping up (Nico walks at 270)
  dash: 480,         // px/s after the ball, or catching up from far behind
  far: 260,          // further than this behind: dash
  lost: 1400,        // further than this (Nico drove off, or it got stuck): it pops back beside him
  sit: 1.2,          // s of Nico standing still before it sits...
  lie: 10,           // ...and lies down
  fetchRange: 450,   // it only chases a ball kicked this near it
  giveUp: 12,        // s chasing before it gives up (the ball's gone in the pond, or round a building)
  mouth: 30,         // where the ball sits in its mouth, ahead of its middle
};

export type DogMode = 'follow' | 'sit' | 'lie' | 'fetch' | 'bring';
export interface DogState { x: number; y: number; vx: number; vy: number; face: 1 | -1; mode: DogMode; still: number; chase: number }
export const freshDog = (x: number, y: number): DogState => ({ x, y, vx: 0, vy: 0, face: 1, mode: 'follow', still: 0, chase: 0 });

type Pt = { x: number; y: number };
/** How it moves: `move` takes it from where it is by (dx, dy), stopping at walls (the game's moveCircle). */
export type Mover = (x: number, y: number, dx: number, dy: number) => [number, number];

/** Off after the ball (it was just kicked, nearby). */
export function fetch(d: DogState, ball: Pt): boolean {
  if (d.mode === 'fetch' || d.mode === 'bring' || Math.hypot(ball.x - d.x, ball.y - d.y) > DOG.fetchRange) return false;
  d.mode = 'fetch'; d.chase = 0; return true;
}

/** One step. `me`: Nico (or whoever he's playing), and whether he's moving; `ball`: the soccer ball.
 * Returns what happened this step, for sounds and the ball: 'got' (picked it up), 'drop' (dropped it
 * at Nico's feet), 'lost' (popped back beside him). While it's bringing the ball back the game puts
 * the ball in its mouth (`mouthOf`). */
export function stepDog(d: DogState, dt: number, me: Pt, moving: boolean, ball: Pt, move: Mover): 'got' | 'drop' | 'lost' | null {
  let out: 'got' | 'drop' | 'lost' | null = null;
  const toMe = Math.hypot(me.x - d.x, me.y - d.y);
  if (toMe > DOG.lost) { d.x = me.x - 60; d.y = me.y + 10; d.vx = d.vy = 0; d.mode = 'follow'; return 'lost'; }
  let tx = me.x, ty = me.y, speed = 0, stop = 0;
  if (d.mode === 'fetch') {
    d.chase += dt;
    tx = ball.x; ty = ball.y; speed = DOG.dash; stop = 4;
    if (Math.hypot(ball.x - d.x, ball.y - d.y) < 26) { d.mode = 'bring'; out = 'got'; }
    else if (d.chase > DOG.giveUp) d.mode = 'follow';
  }
  if (d.mode === 'bring') {
    speed = toMe > DOG.far ? DOG.dash : DOG.trot; stop = 60;
    if (toMe < 75) { d.mode = 'follow'; out = 'drop'; }
  }
  if (d.mode !== 'fetch' && d.mode !== 'bring') {
    // heel: aim for a spot just behind him (the side it's already on), sit when he stops, lie down after a while
    d.still = moving ? 0 : d.still + dt;
    const side = d.x < me.x ? -1 : 1;
    tx = me.x + side * DOG.heel; ty = me.y + 8;
    const gap = Math.hypot(tx - d.x, ty - d.y);
    speed = toMe > DOG.far ? DOG.dash : gap > 30 ? DOG.trot : 0;
    stop = 6;
    d.mode = speed > 0 || moving ? 'follow' : d.still > DOG.lie ? 'lie' : d.still > DOG.sit ? 'sit' : 'follow';
  }
  const dx = tx - d.x, dy = ty - d.y, dist = Math.hypot(dx, dy);
  // ease toward the target speed (it doesn't stop dead or start at full tilt)
  const want = dist > stop && speed > 0 ? Math.min(speed, (dist - stop) * 6) : 0;
  const wx = dist > 0 ? dx / dist * want : 0, wy = dist > 0 ? dy / dist * want : 0, k = 1 - Math.exp(-dt * 10);
  d.vx += (wx - d.vx) * k; d.vy += (wy - d.vy) * k;
  [d.x, d.y] = move(d.x, d.y, d.vx * dt, d.vy * dt);
  if (Math.abs(d.vx) > 8) d.face = d.vx > 0 ? 1 : -1;
  else if (d.mode !== 'fetch' && Math.abs(me.x - d.x) > 4) d.face = me.x > d.x ? 1 : -1;   // (looking up at him)
  return out;
}

/** Where the ball is while it's carrying it. */
export const mouthOf = (d: DogState): [number, number] => [d.x + d.face * DOG.mouth, d.y + 2];
