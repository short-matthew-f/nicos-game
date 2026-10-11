// Snake, on the arcade cabinet in Alpha's Retro Games (the user, 2026-10-11: "alpha needs a retro gaming store").
// The classic: steer round the screen, eat the dots, grow longer, don't hit the walls or yourself. It speeds up
// as you go; now and then a gold dot shows up for a few seconds and is worth five. Pure rules; view.ts draws it.

export type Dir = 'up' | 'down' | 'left' | 'right';
export type Cell = [number, number];
export const GRID = { w: 21, h: 15 };
export const SNAKE = { start: 0.17, fastest: 0.075, faster: 0.0035, gold: { every: [6, 10] as [number, number], life: 6, points: 5 } };
const STEP: Record<Dir, Cell> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const BACK: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
export type SnakeEvent = 'eat' | 'gold' | 'die' | 'goldgone';

export class Snake {
  body: Cell[]; dir: Dir = 'right'; private queue: Dir[] = [];
  food: Cell; gold: Cell | null = null; goldT = 0; private untilGold: number;
  score = 0; eaten = 0; over = false; private t = 0;
  constructor(private r: () => number = Math.random) {
    const y = Math.floor(GRID.h / 2);
    this.body = [[6, y], [5, y], [4, y]];
    this.food = this.free(); this.untilGold = this.goldGap();
  }
  get interval() { return Math.max(SNAKE.fastest, SNAKE.start - this.eaten * SNAKE.faster); }
  /** Steer (it remembers two presses ahead, so quick turns aren't lost; never straight back on itself). */
  turn(d: Dir) {
    const last = this.queue.length ? this.queue[this.queue.length - 1] : this.dir;
    if (d === last || d === BACK[last] || this.queue.length >= 2) return;
    this.queue.push(d);
  }
  update(dt: number): SnakeEvent[] {
    if (this.over) return [];
    const ev: SnakeEvent[] = [];
    if (this.gold) { this.goldT -= dt; if (this.goldT <= 0) { this.gold = null; ev.push('goldgone'); } }
    this.t += dt;
    while (this.t >= this.interval && !this.over) { this.t -= this.interval; ev.push(...this.step()); }
    return ev;
  }
  step(): SnakeEvent[] {
    if (this.queue.length) this.dir = this.queue.shift()!;
    const [dx, dy] = STEP[this.dir], [hx, hy] = this.body[0], head: Cell = [hx + dx, hy + dy];
    const grow = head[0] === this.food[0] && head[1] === this.food[1];
    const body = grow ? this.body : this.body.slice(0, -1);   // (the tail moves out of the way first)
    if (head[0] < 0 || head[1] < 0 || head[0] >= GRID.w || head[1] >= GRID.h || body.some(c => c[0] === head[0] && c[1] === head[1])) { this.over = true; return ['die']; }
    this.body = [head, ...body];
    const ev: SnakeEvent[] = [];
    if (grow) {
      this.score++; this.eaten++; this.food = this.free(); ev.push('eat');
      if (--this.untilGold <= 0 && !this.gold) { this.gold = this.free(); this.goldT = SNAKE.gold.life; this.untilGold = this.goldGap(); }
    }
    if (this.gold && head[0] === this.gold[0] && head[1] === this.gold[1]) {
      this.score += SNAKE.gold.points; this.gold = null; this.body.push(this.body[this.body.length - 1]); ev.push('gold');
    }
    return ev;
  }
  private goldGap() { const [a, b] = SNAKE.gold.every; return a + Math.floor(this.r() * (b - a + 1)); }
  /** A random empty cell. */
  private free(): Cell {
    const taken = new Set([...this.body, ...(this.food ? [this.food] : []), ...(this.gold ? [this.gold] : [])].map(c => c[0] + ',' + c[1]));
    const open: Cell[] = [];
    for (let y = 0; y < GRID.h; y++) for (let x = 0; x < GRID.w; x++) if (!taken.has(x + ',' + y)) open.push([x, y]);
    return open[Math.floor(this.r() * open.length)] ?? [0, 0];
  }
}
