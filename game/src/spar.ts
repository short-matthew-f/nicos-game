// Sparring at the dojo (the user, 2026-10-11: "Sparring that feels like an actual fighting game"). Nico against one of
// his instructors, side on across the ring: health bars and a clock, a jab, a kick and a block, knockback and hit
// stun, combos, and a Kihap meter that fills as he lands hits and lets loose a spinning kick. Each instructor fights
// their own way (Erin's the gentlest, Mr. Master Krantz the toughest). Pure rules; dojoGames.ts and main.ts draw it.

export type Attack = 'jab' | 'kick' | 'spin';
/** startup / active / recovery (s), reach (px from the attacker's middle), damage, knockback (px). */
export const ATTACKS: Record<Attack, { start: number; active: number; recover: number; reach: number; dmg: number; push: number }> = {
  jab: { start: 0.07, active: 0.09, recover: 0.16, reach: 114, dmg: 8, push: 22 },
  kick: { start: 0.14, active: 0.1, recover: 0.26, reach: 140, dmg: 14, push: 44 },
  spin: { start: 0.18, active: 0.16, recover: 0.36, reach: 154, dmg: 26, push: 90 },
};
export const SPAR = { hp: 100, time: 60, speed: 190, ring: [330, 870] as [number, number], close: 98, stun: 0.34, blockStun: 0.16, chip: 1, meterHit: 22, meterBlocked: 6 };

export interface Rival { who: string; name: string; reaction: number; aggression: number; block: number; kickiness: number; speed: number; lines: { start: string; hit: string[]; win: string; lose: string } }
export const RIVALS: Rival[] = [
  { who: 'erin', name: 'Erin', reaction: 0.5, aggression: 0.32, block: 0.22, kickiness: 0.35, speed: 0.85,
    lines: { start: "Let's have fun! Hands up!", hit: ['Nice one!', 'Ooh, good jab!', 'You got me!'], win: 'Good match, Nico! Again sometime?', lose: 'Wow! You beat me fair and square!' } },
  { who: 'heidi', name: 'Miss Heidi', reaction: 0.45, aggression: 0.4, block: 0.3, kickiness: 0.45, speed: 0.9,
    lines: { start: 'Hands up, eyes on me. Ready?', hit: ['Ooh, nice!', 'Good one!', 'Yes! Like that!'], win: 'Great match! Keep that guard up.', lose: 'Wow, Nico! You got me!' } },
  { who: 'mrskrantz', name: 'Mrs. Master Krantz', reaction: 0.4, aggression: 0.45, block: 0.38, kickiness: 0.5, speed: 0.95,
    lines: { start: 'Watch my feet, Nico. Ready?', hit: ['Good!', 'Sharp!', 'Again!'], win: 'Keep your guard up and you will get me next time.', lose: 'Excellent! I am proud of you.' } },
  { who: 'schindewolf', name: 'Master Schindewolf', reaction: 0.32, aggression: 0.55, block: 0.5, kickiness: 0.6, speed: 1,
    lines: { start: 'Chamber your kicks. Begin!', hit: ['Good snap!', 'Yes!', 'That one counted.'], win: 'Close! Keep moving your feet.', lose: 'Outstanding, Nico. Truly.' } },
  { who: 'krantz', name: 'Mr. Master Krantz', reaction: 0.25, aggression: 0.62, block: 0.6, kickiness: 0.55, speed: 1.08,
    lines: { start: 'Bow... fighting stance... Shi jak!', hit: ['Good!', 'Hm! Nice.', 'Very good.'], win: 'Well fought. Focus, then strike.', lose: 'Nico! That was black belt sparring. Well done!' } },
];

export type FState = 'idle' | 'walk' | 'attack' | 'block' | 'hit' | 'won' | 'lost';
export interface Fighter { x: number; face: 1 | -1; hp: number; state: FState; t: number; attack: Attack | null; landed: boolean; vx: number; meter: number; combo: number; comboT: number }
export interface SparEvent { kind: 'hit' | 'blocked' | 'whiff' | 'combo' | 'ko' | 'time' | 'say' | 'start'; by?: 'nico' | 'rival'; x?: number; dmg?: number; n?: number; text?: string; attack?: Attack }
export interface Input { left: boolean; right: boolean; block: boolean; punch: boolean; kick: boolean; spin: boolean }   // punch/kick/spin: pressed this frame

const fighter = (x: number, face: 1 | -1): Fighter => ({ x, face, hp: SPAR.hp, state: 'idle', t: 0, attack: null, landed: false, vx: 0, meter: 0, combo: 0, comboT: 0 });

export class Spar {
  nico: Fighter; rival: Fighter;
  time = SPAR.time; intro = 2.2; over = false; winner: 'nico' | 'rival' | null = null;
  private think = 0; private plan: 'close' | 'wait' | 'back' = 'close'; private blockFor = 0;
  constructor(readonly who: Rival, private r: () => number = Math.random) {
    this.nico = fighter(SPAR.ring[0] + 120, 1); this.rival = fighter(SPAR.ring[1] - 120, -1);
  }
  private canAct(f: Fighter) { return f.state === 'idle' || f.state === 'walk' || f.state === 'block'; }
  private start(f: Fighter, a: Attack) { f.state = 'attack'; f.attack = a; f.t = 0; f.landed = false; f.vx = 0; }

  update(dt: number, inp: Input): SparEvent[] {
    const ev: SparEvent[] = [];
    if (this.intro > 0) { this.intro -= dt; if (this.intro <= 0) ev.push({ kind: 'start' }); return ev; }
    if (this.over) { for (const f of [this.nico, this.rival]) f.t += dt; return ev; }
    this.time -= dt;
    // Nico, from the buttons
    const n = this.nico;
    if (this.canAct(n)) {
      if (inp.spin && n.meter >= 100) { n.meter = 0; this.start(n, 'spin'); }
      else if (inp.kick) this.start(n, 'kick');
      else if (inp.punch) this.start(n, 'jab');
      else if (inp.block) { n.state = 'block'; n.vx = 0; }
      else { const d = (inp.right ? 1 : 0) - (inp.left ? 1 : 0); n.vx = d * SPAR.speed; n.state = d ? 'walk' : 'idle'; }
    }
    this.ai(dt, ev);
    // timers, movement, hits
    for (const [f, o, by] of [[this.nico, this.rival, 'nico'], [this.rival, this.nico, 'rival']] as const) {
      f.t += dt; f.comboT -= dt; if (f.comboT <= 0) f.combo = 0;
      if (f.state === 'hit' && f.t >= SPAR.stun) { f.state = 'idle'; f.t = 0; }
      if (f.state === 'attack' && f.attack) {
        const A = ATTACKS[f.attack];
        if (!f.landed && f.t >= A.start && f.t <= A.start + A.active && Math.abs(o.x - f.x) <= A.reach && Math.sign(o.x - f.x) === f.face) {
          f.landed = true;
          if (o.state === 'block' && o.face === -f.face && f.attack !== 'spin') {
            o.hp = Math.max(1, o.hp - SPAR.chip); o.x += f.face * A.push * 0.6; o.state = 'block'; o.t = 0;
            f.meter = Math.min(100, f.meter + SPAR.meterBlocked);
            ev.push({ kind: 'blocked', by, x: (f.x + o.x) / 2, attack: f.attack });
          } else {
            o.hp = Math.max(0, o.hp - A.dmg); o.state = 'hit'; o.t = 0; o.attack = null; o.x += f.face * A.push;
            f.meter = Math.min(100, f.meter + SPAR.meterHit); f.combo++; f.comboT = 1.1;
            ev.push({ kind: 'hit', by, x: (f.x + o.x) / 2, dmg: A.dmg, attack: f.attack });
            if (f.combo >= 2) ev.push({ kind: 'combo', by, n: f.combo });
            if (o.hp <= 0) { this.end(by, ev); }
          }
        }
        if (f.t >= A.start + A.active + A.recover) { if (!f.landed) ev.push({ kind: 'whiff', by }); f.state = 'idle'; f.attack = null; f.t = 0; }
      }
      if (f.state === 'walk') f.x += f.vx * dt;
      if (f.state === 'block' && f === this.nico && !inp.block && f.t > SPAR.blockStun) { f.state = 'idle'; f.t = 0; }
    }
    // keep them in the ring, facing each other, never through each other
    for (const f of [this.nico, this.rival]) f.x = Math.max(SPAR.ring[0], Math.min(SPAR.ring[1], f.x));
    if (Math.abs(this.rival.x - this.nico.x) < SPAR.close) {
      const mid = (this.nico.x + this.rival.x) / 2, s = this.nico.x <= this.rival.x ? 1 : -1;
      this.nico.x = mid - s * SPAR.close / 2; this.rival.x = mid + s * SPAR.close / 2;
    }
    if (this.canAct(this.nico)) this.nico.face = this.rival.x >= this.nico.x ? 1 : -1;
    if (this.canAct(this.rival)) this.rival.face = this.nico.x >= this.rival.x ? 1 : -1;
    if (!this.over && this.time <= 0) { this.time = 0; ev.push({ kind: 'time' }); this.end(this.nico.hp >= this.rival.hp ? 'nico' : 'rival', ev); }
    return ev;
  }

  /** The instructor: close the distance, strike when in range, block what's coming (they see it a moment late). */
  private ai(dt: number, ev: SparEvent[]) {
    const f = this.rival, n = this.nico, R = this.who, d = Math.abs(n.x - f.x);
    if (this.blockFor > 0) { this.blockFor -= dt; f.state = 'block'; f.vx = 0; if (this.blockFor <= 0) { f.state = 'idle'; f.t = 0; } return; }
    if (!this.canAct(f)) return;
    // see an attack coming: maybe block it
    if (n.state === 'attack' && n.t < 0.06 + (1 - R.reaction) * 0.1 && d < 176 && this.r() < R.block * dt * 18) { this.blockFor = 0.45; f.state = 'block'; return; }
    this.think -= dt;
    if (this.think <= 0) {
      this.think = R.reaction * (0.6 + this.r() * 0.8);
      const range = d <= ATTACKS.kick.reach - 6, jabRange = d <= ATTACKS.jab.reach - 4;
      if (range && this.r() < R.aggression) {
        if (f.meter >= 100 && this.r() < 0.5) { f.meter = 0; this.start(f, 'spin'); return; }
        this.start(f, jabRange && this.r() > R.kickiness ? 'jab' : 'kick'); return;
      }
      this.plan = d > ATTACKS.kick.reach ? 'close' : this.r() < 0.3 ? 'back' : 'wait';
      if (n.hp < 30 && this.r() < 0.3) ev.push({ kind: 'say', by: 'rival', text: 'Keep going!' });
    }
    const dir = Math.sign(n.x - f.x) || 1;
    f.vx = this.plan === 'close' ? dir * SPAR.speed * 0.8 * R.speed : this.plan === 'back' ? -dir * SPAR.speed * 0.6 * R.speed : 0;
    f.state = f.vx ? 'walk' : 'idle';
  }
  private end(w: 'nico' | 'rival', ev: SparEvent[]) {
    this.over = true; this.winner = w;
    this.nico.state = w === 'nico' ? 'won' : 'lost'; this.rival.state = w === 'rival' ? 'won' : 'lost';
    this.nico.t = this.rival.t = 0;
    ev.push({ kind: 'ko', by: w });
  }
}
