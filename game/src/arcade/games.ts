// The cabinets in Alpha's Retro Games, as data: each game's name, marquee colour, controls, and how its screen is
// drawn (a 420 x 300 picture, scaled up to fit). The rules are in their own files (snake, blasters, bricks, frog).
import { Snake, GRID, type Dir } from './snake';
import { Blasters, BL, type Key } from './blasters';
import { Bricks, BR } from './bricks';
import { Frog, FR, W as FW } from './frog';
export type { Key };
export const SW = 420, SH = 300;   // the screen, in its own pixels

/** One game running on a cabinet. */
export interface Machine {
  score: number; over: boolean; lives?: number;
  press(k: Key): void; aim?(x: number): void;
  update(dt: number, held: Set<Key>): string[];
  draw(c: CanvasRenderingContext2D, t: number): void;
  info(): Record<string, unknown>;
}
export interface Cabinet { id: string; name: string; glow: string; body: string; controls: 'dpad' | 'lrfire' | 'paddle'; how: string; make(): Machine }

const px = (c: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) => { c.fillStyle = color; c.fillRect(x, y, w, h); };
/** Little pixel pictures: rows of characters, one colour per character. */
function sprite(c: CanvasRenderingContext2D, art: string[], x: number, y: number, s: number, colors: Record<string, string>) {
  const w = art[0].length * s, h = art.length * s;
  art.forEach((row, j) => [...row].forEach((ch, i) => { if (colors[ch]) px(c, colors[ch], x - w / 2 + i * s, y - h / 2 + j * s, s, s); }));
}
const lives = (c: CanvasRenderingContext2D, n: number, color: string) => { for (let i = 0; i < n; i++) px(c, color, SW - 14 - i * 14, 6, 9, 9); };

// ---- Snake
const SNAKE_GLOW = '#4FE3C1';
function snake(): Machine {
  const g = new Snake(), cell = SW / GRID.w;
  return {
    get score() { return g.score; }, get over() { return g.over; },
    press: k => { if (k !== 'fire') g.turn(k as Dir); },
    update: dt => g.update(dt),
    info: () => ({ dir: g.dir, head: g.body[0], length: g.body.length }),
    draw(c, t) {
      px(c, '#0B1E19', 0, 0, SW, SH);
      c.fillStyle = 'rgba(79,227,193,.06)'; for (let x = 0; x < GRID.w; x++) for (let y = 0; y < GRID.h; y++) if ((x + y) % 2) c.fillRect(x * cell, y * cell, cell, cell);
      const sq = (x: number, y: number, color: string, ins: number) => px(c, color, x * cell + ins, y * cell + ins, cell - ins * 2, cell - ins * 2);
      c.shadowBlur = 10; c.shadowColor = SNAKE_GLOW;
      g.body.forEach(([x, y], i) => sq(x, y, i ? SNAKE_GLOW : '#B8FFF0', i ? 2 : 1));
      c.shadowColor = '#FF5A7A'; sq(g.food[0], g.food[1], '#FF5A7A', 4.5);
      if (g.gold && (g.goldT > 2 || Math.floor(t * 8) % 2)) { c.shadowColor = '#F9C846'; sq(g.gold[0], g.gold[1], '#F9C846', 2.5); }
      c.shadowBlur = 0;
      const [hx, hy] = g.body[0], o = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[g.dir];
      for (const sg of [-1, 1]) px(c, '#0B1E19', hx * cell + cell / 2 + o[0] * 3.6 + (o[1] ? sg : 0) * 4 - 1.6, hy * cell + cell / 2 + o[1] * 3.6 + (o[0] ? sg : 0) * 4 - 1.6, 3.2, 3.2);
    },
  };
}

// ---- Space Blasters
const ALIENS = [
  ['..X..X..', '...XX...', '.XXXXXX.', 'XX.XX.XX', 'XXXXXXXX', '.X....X.'],
  ['.X....X.', '..XXXX..', '.XXXXXX.', 'XX.XX.XX', 'XXXXXXXX', 'X.X..X.X'],
];
const ALIEN_COLORS = ['#FF5A7A', '#F9C846', '#4FE3C1', '#7FB2FF'];
function blasters(): Machine {
  const g = new Blasters();
  return {
    get score() { return g.score; }, get over() { return g.over; }, get lives() { return g.lives; },
    press: k => g.press(k), update: (dt, h) => g.update(dt, h),
    info: () => ({ x: g.x, wave: g.wave, aliens: g.alive.length, lives: g.lives, shots: g.shots.length }),
    draw(c, t) {
      px(c, '#07070F', 0, 0, SW, SH);
      for (let i = 0; i < 40; i++) px(c, i % 3 ? '#2B2A4A' : '#5B5A8A', (i * 97) % SW, (i * 53 + Math.floor(t * 6)) % SH, 2, 2);   // stars drifting
      const frame = Math.floor(t * 2) % 2;
      for (const a of g.alive) { const p = g.at(a); sprite(c, ALIENS[(frame + a.r) % 2], p.x, p.y, 2.75, { X: ALIEN_COLORS[a.r % 4] }); }
      if (g.ufo) sprite(c, ['..XXXX..', '.XXXXXX.', 'XX.XX.XX', '.X....X.'], g.ufo.x, 20, 3, { X: '#E5486D' });
      for (const s of g.shots) px(c, '#B8FFF0', s.x - 1.5, s.y - 6, 3, 10);
      for (const b of g.bombs) px(c, Math.floor(t * 12) % 2 ? '#FF9A2E' : '#F9C846', b.x - 2, b.y - 5, 4, 9);
      for (const b of g.boom) { c.globalAlpha = 1 - b.t / 0.35; sprite(c, ['X.X.X', '.X.X.', 'X.X.X', '.X.X.', 'X.X.X'], b.x, b.y, 3 + b.t * 10, { X: '#F9C846' }); c.globalAlpha = 1; }
      if (!g.over && (g.inv <= 0 || Math.floor(t * 10) % 2)) sprite(c, ['....X....', '...XXX...', '.XXXXXXX.', 'XXXXXXXXX', 'XXXXXXXXX'], g.x, BL.shipY, 3, { X: '#4FE3C1' });
      px(c, '#4FE3C1', 0, BL.shipY + 12, SW, 2);
      lives(c, g.lives, '#4FE3C1');
    },
  };
}

// ---- Brick Breaker
const BRICK_COLORS = ['#E5486D', '#FF9A2E', '#F9C846', '#4FE3C1', '#7FB2FF'];
function bricks(): Machine {
  const g = new Bricks();
  return {
    get score() { return g.score; }, get over() { return g.over; }, get lives() { return g.lives; },
    press: k => g.press(k), aim: x => g.aim(x), update: (dt, h) => g.update(dt, h),
    info: () => ({ pad: g.pad, ball: { ...g.ball }, bricks: g.bricks.filter(b => b.alive).length, level: g.level, lives: g.lives }),
    draw(c, t) {
      px(c, '#0E0C1E', 0, 0, SW, SH);
      for (const b of g.bricks) if (b.alive) { px(c, BRICK_COLORS[b.row], b.x, b.y, BR.bw, BR.bh); px(c, 'rgba(255,255,255,.35)', b.x, b.y, BR.bw, 2); }
      c.shadowBlur = 8; c.shadowColor = '#4FE3C1'; px(c, '#4FE3C1', g.pad - BR.padW / 2, BR.padY, BR.padW, BR.padH); c.shadowBlur = 0;
      c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(g.ball.x, g.ball.y, BR.r, 0, Math.PI * 2); c.fill();
      if (g.ball.stuck && Math.floor(t * 2) % 2) { c.font = '900 16px ui-monospace, Menlo, monospace'; c.textAlign = 'center'; c.fillStyle = '#F9C846'; c.fillText('FIRE TO LAUNCH', SW / 2, 200); }
      lives(c, g.lives, '#FFFFFF');
    },
  };
}

// ---- Frog Hop
function frog(): Machine {
  const g = new Frog(), C = FR.cell;
  const CARS = ['#E5486D', '#F9C846', '#7FB2FF'];
  return {
    get score() { return g.score; }, get over() { return g.over; }, get lives() { return g.lives; },
    press: k => g.press(k), update: dt => g.update(dt),
    info: () => ({ x: g.x, row: g.row, lives: g.lives, filled: g.filled.filter(Boolean).length, level: g.level }),
    draw(c, t) {
      px(c, '#1B4F8A', 0, C, FW, 4 * C);              // the river
      for (let i = 0; i < 30; i++) px(c, '#2E6FB0', (i * 71 + t * 20) % FW, C + (i * 37) % (4 * C), 10, 2);
      px(c, '#2F2F38', 0, 6 * C, FW, 3 * C);           // the road
      for (let x = 0; x < FW; x += 30) { px(c, '#F9C846', x + 4, 7 * C - 1, 14, 2); px(c, '#F9C846', x + 4, 8 * C - 1, 14, 2); }
      for (const r of [5, 9]) { px(c, '#5B3F8A', 0, r * C, FW, C); for (let x = 0; x < FW; x += 12) px(c, '#7A5BB0', x + (r * 5) % 12, r * C + 6 + (x % 3) * 6, 3, 3); }   // the banks
      px(c, '#2E7A3A', 0, 0, FW, C);                   // the hedge, with the lily pads
      FR.slots.forEach((s, i) => { px(c, '#1B4F8A', s * C, 0, C, C); c.fillStyle = '#4FB35A'; c.beginPath(); c.arc(s * C + C / 2, C / 2, 11, 0.3, Math.PI * 2 - 0.3); c.lineTo(s * C + C / 2, C / 2); c.fill();
        if (g.filled[i]) sprite(c, ['X...X', 'XXXXX', '.XXX.', 'XX.XX'], s * C + C / 2, C / 2, 4, { X: '#B8FF6A' }); });
      for (const l of g.lanes) l.items.forEach((x, i) => {
        const y = l.row * C;
        if (l.kind === 'river') { px(c, '#8A5A3B', x + 2, y + 5, l.len * C - 4, C - 10); px(c, '#B07A4A', x + 2, y + 7, l.len * C - 4, 4); px(c, '#6B4430', x + l.len * C - 8, y + 5, 6, C - 10); }
        else { const col = CARS[(i + l.row) % 3], w = l.len * C - 4; px(c, col, x + 2, y + 6, w, C - 12); px(c, '#1E2733', x + (l.speed > 0 ? w - 8 : 6), y + 9, 6, C - 18); px(c, '#0E0C1E', x + 6, y + 3, 6, 3); px(c, '#0E0C1E', x + w - 8, y + 3, 6, 3); px(c, '#0E0C1E', x + 6, y + C - 6, 6, 3); px(c, '#0E0C1E', x + w - 8, y + C - 6, 6, 3); }
      });
      if (g.squish) sprite(c, ['X.X.X', '.XXX.', 'XX.XX', '.XXX.', 'X.X.X'], g.squish.x, g.squish.row * C + C / 2, 4, { X: '#E5486D' });
      if (!g.over && g.dead <= 0) sprite(c, ['X.....X', 'XX.X.XX', '.XXXXX.', 'XXXXXXX', '.XXXXX.', 'XX...XX'], g.x, g.row * C + C / 2, 3.4, { X: '#B8FF6A' });
      lives(c, g.lives, '#B8FF6A');
    },
  };
}

export const CABINETS: Cabinet[] = [
  { id: 'snake', name: 'SNAKE', glow: '#4FE3C1', body: '#2B2A4A', controls: 'dpad', how: 'Eat the dots. Don\'t hit the walls or your tail!', make: snake },
  { id: 'blasters', name: 'SPACE BLASTERS', glow: '#FF9A2E', body: '#7A1F2B', controls: 'lrfire', how: 'Slide and fire! Don\'t let them land.', make: blasters },
  { id: 'bricks', name: 'BRICK BREAKER', glow: '#E5486D', body: '#1E2733', controls: 'paddle', how: 'Drag the paddle, FIRE to launch. Break every brick!', make: bricks },
  { id: 'frog', name: 'FROG HOP', glow: '#B8FF6A', body: '#2E5A2E', controls: 'dpad', how: 'Cross the road, ride the logs, reach the lily pads!', make: frog },
];
