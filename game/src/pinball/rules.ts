// Nico's City Pinball: the rules. Three balls; points for everything; light N-I-C-O (the rollover lanes
// under the arch: the flipper buttons move the lit lanes along) for a bigger bonus multiplier; knock down
// the three drop targets to light the Burger Barn lock, then sink the saucer for MULTIBALL. A ball save
// at the start of each ball, an extra ball at 100,000. Pure: view.ts shows it, physics.ts plays it.
import { Table, type Hit } from './physics';

export const SCORE = { bumper: 100, sling: 10, lane: 500, nico: 5000, target: 750, bank: 5000, saucer: 1500, lock: 10000, spin: 25, multiball: 25000, replay: 100000 };
export const RULES = { balls: 3, save: 8, maxMult: 5 };

export interface Message { text: string; t: number }

export class Game {
  table = new Table();
  score = 0; ball = 1; over = false; started = false;
  mult = 1; lanes = [false, false, false, false]; lockLit = false;
  bonus = 0;              // counts up through the ball; paid x mult when it drains
  save = 0;               // s of ball save left (it starts when the ball is launched)
  extra = 0;              // extra balls earned
  replayed = false;
  multiball = false;
  flash: Record<string, number> = {};   // what lit up just now (bumper ids, 'L'/'R' slings, lanes...), s left
  messages: Message[] = [];
  /** The sound/feel of things, for view.ts: filled by update, emptied by whoever reads it. */
  events: Hit[] = [];

  constructor(public high = 0) {}

  start() {
    this.table = new Table(); this.score = 0; this.ball = 1; this.over = false; this.started = true; this.extra = 0; this.replayed = false;
    this.newBall(); this.say('BALL 1', 1.6);
  }
  private newBall() {
    this.mult = 1; this.lanes = [false, false, false, false]; this.bonus = 0; this.multiball = false; this.lockLit = false;
    this.table.resetTargets(); this.table.load(); this.save = RULES.save; this.saveStarted = false;
  }
  private saveStarted = false;
  private stillFor = new Map<number, number>();
  say(text: string, t = 2) { this.messages.push({ text, t }); if (this.messages.length > 4) this.messages.shift(); }
  get message(): string | null { return this.messages[0]?.text ?? null; }

  /** The flipper buttons. Pressing one also moves the lit lanes along (classic lane change). */
  flip(side: 'L' | 'R', down: boolean) {
    const s = this.table.flippers.find(f => f.f.side === side)!;
    if (down && !s.pressed && !this.over && this.started) {
      const l = this.lanes;
      this.lanes = side === 'L' ? [...l.slice(1), l[0]] : [l[3], ...l.slice(0, 3)];
    }
    s.pressed = down && !this.over;
  }
  launch(power: number) { if (!this.over && this.started) this.table.launch(power, this.events); }

  private add(n: number) {
    this.score += n;
    if (!this.replayed && this.score >= SCORE.replay) { this.replayed = true; this.extra++; this.say('EXTRA BALL!', 2.5); this.events.push({ kind: 'eject' }); }
  }

  update(dt: number) {
    for (const k in this.flash) { this.flash[k] -= dt; if (this.flash[k] <= 0) delete this.flash[k]; }
    if (this.messages.length) { this.messages[0].t -= dt; if (this.messages[0].t <= 0) this.messages.shift(); }
    if (!this.started || this.over) { this.table.step(dt); return; }
    const hits = this.table.step(dt);
    if (!this.saveStarted && this.table.balls.some(b => !b.inLane)) this.saveStarted = true;
    if (this.saveStarted && this.save > 0) this.save -= dt;
    for (const h of hits) this.score1(h);
    this.events.push(...hits);
    // ball search (as real machines do): a ball that's sat still somewhere for a while, not on the plunger, in
    // the saucer or cradled on a flipper, gets a little kick
    for (const b of this.table.balls) {
      const still = !b.inLane && b.held <= 0 && b.y < 880 && Math.hypot(b.vx, b.vy) < 15;
      const k = still ? (this.stillFor.get(b.id) ?? 0) + dt : 0; this.stillFor.set(b.id, k);
      if (k > 5) { b.vy = -500; b.vx = (b.x < 278 ? 1 : -1) * 250; this.stillFor.set(b.id, 0); this.events.push({ kind: 'eject' }); }
    }
  }

  private score1(h: Hit) {
    switch (h.kind) {
      case 'bumper': this.add(SCORE.bumper); this.bonus += 50; this.flash[h.id] = 0.15; break;
      case 'sling': this.add(SCORE.sling); this.flash[`sling${h.id}`] = 0.12; break;
      case 'spin': this.add(SCORE.spin * h.n); break;
      case 'lane': {
        if (!this.lanes[h.i]) { this.lanes[h.i] = true; this.add(SCORE.lane); this.bonus += 200; } else this.add(100);
        this.flash[`lane${h.i}`] = 0.5;
        if (this.lanes.every(Boolean)) {
          this.lanes = [false, false, false, false]; this.add(SCORE.nico); this.bonus += 1000;
          if (this.mult < RULES.maxMult) this.mult++;
          this.say('N I C O !', 1.6); this.say(`BONUS ${this.mult}X`, 1.6); this.flash.nico = 1.2;
        }
        break;
      }
      case 'target': {
        this.add(SCORE.target); this.bonus += 300; this.flash[`target${h.i}`] = 0.3;
        if (this.table.targets.every(t => !t)) {
          this.add(SCORE.bank); this.lockLit = true; this.table.resetTargets(); this.say('LOCK IS LIT!', 2); this.say('SHOOT BURGER BARN', 2);
        }
        break;
      }
      case 'saucer':
        this.add(SCORE.saucer); this.bonus += 500; this.flash.saucer = 1.4;
        if (this.lockLit && !this.multiball) {
          this.lockLit = false; this.multiball = true; this.add(SCORE.lock); this.say('MULTIBALL!', 3); this.flash.multiball = 3;
          this.table.load(); this.table.launch(0.85, this.events); this.save = Math.max(this.save, 6);
        } else this.say('BURGER BARN', 1.2);
        break;
      case 'drain': this.drained(); break;
    }
  }

  private drained() {
    if (this.save > 0 && this.saveStarted) {
      // ball save: straight back in
      this.say('BALL SAVED!', 1.8); this.flash.saved = 1.8;
      this.table.load(); this.table.launch(0.8, this.events); return;
    }
    if (this.table.balls.length > 0) { if (this.table.balls.length === 1) this.multiball = false; return; }   // still a ball in play
    // the end of a ball: the bonus, times the multiplier
    this.messages = [];   // (whatever was still to say about the last ball)
    const paid = this.bonus * this.mult;
    if (paid) { this.say(`BONUS ${paid.toLocaleString()}`, 2.2); this.add(paid); }
    if (this.extra > 0) { this.extra--; this.say('SHOOT AGAIN!', 2); this.newBall(); return; }
    if (this.ball >= RULES.balls) {
      this.over = true;
      if (this.score > this.high) { this.high = this.score; this.say('NEW HIGH SCORE!', 4); }
      this.say('GAME OVER', 99);
      return;
    }
    this.ball++; this.say(`BALL ${this.ball}`, 1.6); this.newBall();
  }
}
