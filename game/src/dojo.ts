// Life in the dojo (the user, 2026-10-11: "I'd love it if they occasionally did a form together or practiced kicking
// and punching while holding pads. These are people we love a lot so making them actually super fun and interesting
// is important to us"). Now and then the instructors walk out onto the mats and either do a form together, in
// step, Mr. Master Krantz counting in Korean, a big "Kihap!" on the kick (and Nico can step into the line and do it
// with them), or pair up with pads: one holds, the other throws jab, cross, kicks, then they swap. Nico can kick
// Mrs. Master Krantz's pads too. Pure timing and poses; main.ts draws it (rig/pose.ts `moves` does the limbs).

export type Actor = 'krantz' | 'mrskrantz' | 'schindewolf' | 'erin' | 'nico';
/** A pose: arm and leg angles (degrees from hanging down; negative is forward), a forward lean, a crouch. */
export interface Move { fa: number; ba: number; fl: number; bl: number; bow?: number; crouch?: number }
export const MOVES: Record<string, Move> = {
  stand: { fa: 0, ba: 0, fl: 0, bl: 0 },
  bow: { fa: 4, ba: 4, fl: 0, bl: 0, bow: 32 },
  ready: { fa: -24, ba: -18, fl: 4, bl: -4 },                  // choon bi: fists in front of the belt
  lowBlock: { fa: -32, ba: 22, fl: -26, bl: 22, crouch: 0.12 },  // front stance, the forward arm sweeping down
  punch: { fa: -92, ba: 20, fl: -26, bl: 22, crouch: 0.12 },
  punch2: { fa: 20, ba: -92, fl: -26, bl: 22, crouch: 0.12 },
  highBlock: { fa: -158, ba: 18, fl: -26, bl: 22, crouch: 0.12 },
  frontKick: { fa: -40, ba: 14, fl: -98, bl: 6 },
  guard: { fa: -62, ba: -46, fl: -14, bl: 14 },                  // fighting stance, hands up
  jab: { fa: -94, ba: -46, fl: -16, bl: 16 },
  cross: { fa: -50, ba: -96, fl: -18, bl: 18, bow: 6 },
  roundhouse: { fa: -70, ba: -30, fl: -84, bl: 10, bow: -10 },
  sideKick: { fa: -40, ba: 30, fl: -96, bl: 14, bow: -24 },
  holdPad: { fa: -72, ba: -64, fl: -12, bl: 12 },                // both hands on the pad, braced
  recoil: { fa: -64, ba: -56, fl: -6, bl: 18, bow: -8 },         // the pad's just been hit
};
const KOREAN = ['Hana!', 'Dul!', 'Set!', 'Net!', 'Dasot!', 'Yosot!', 'Ilgop!', 'Yodol!', 'Ahop!', 'Yol!'];

export interface Beat { move: string; dur: number; step?: number; turn?: boolean; say?: string; all?: string; hit?: boolean }
/** Kicho Hyung Il Bu, kept in profile so everyone can see it: bow, ready, block-punch up the line, turn, back down,
 * turn, a high block, punch, and the kick with a kihap; ready, bow. `step` moves them forward (rig units of ~30 px). */
export const FORM: Beat[] = (() => {
  const b: Beat[] = [{ move: 'stand', dur: 0.8, say: 'Line up! Kicho Hyung Il Bu!' }, { move: 'bow', dur: 1.1, say: 'Kyung ye!' }, { move: 'ready', dur: 1.0, say: 'Choon bi!' }];
  const seq: Omit<Beat, 'dur'>[] = [
    { move: 'lowBlock', step: 1 }, { move: 'punch', step: 1 }, { move: 'lowBlock', turn: true }, { move: 'punch', step: 1 },
    { move: 'punch2', step: 1 }, { move: 'highBlock', turn: true }, { move: 'punch' }, { move: 'frontKick', all: 'Kihap!' }, { move: 'punch2' },
  ];
  seq.forEach((s, i) => b.push({ ...s, dur: 0.85, say: s.all ? undefined : KOREAN[i] }));
  b.push({ move: 'ready', dur: 1.0, say: 'Ba ro!' }, { move: 'bow', dur: 1.1, say: 'Kyung ye!' }, { move: 'stand', dur: 0.6 });
  return b;
})();
/** A round on the pads: the striker's combination (the holder holds and gets knocked back a little on each hit). */
export const PADS: Beat[] = [
  { move: 'guard', dur: 0.7 }, { move: 'jab', dur: 0.45, hit: true }, { move: 'guard', dur: 0.35 }, { move: 'cross', dur: 0.45, hit: true },
  { move: 'guard', dur: 0.45 }, { move: 'frontKick', dur: 0.6, hit: true, all: 'Kihap!' }, { move: 'guard', dur: 0.5 },
  { move: 'jab', dur: 0.4, hit: true }, { move: 'cross', dur: 0.4, hit: true }, { move: 'roundhouse', dur: 0.65, hit: true }, { move: 'guard', dur: 0.5 },
  { move: 'sideKick', dur: 0.7, hit: true, all: 'Kihap!' }, { move: 'guard', dur: 0.8 },
];
const PAD_LINES = ['Nice!', 'Again!', 'Good snap!', 'Sharper!', 'Yes!', 'Great kick!'];

export interface ActorPose { x: number; y: number; face: 1 | -1; move: Move | null; walking: boolean; pad?: boolean; side: boolean }
export interface DojoEvent { kind: 'say' | 'hit' | 'kihap' | 'snap'; actor: Actor; text?: string; x?: number; y?: number }

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
function blend(a: Move, b: Move, k: number): Move {
  return { fa: lerp(a.fa, b.fa, k), ba: lerp(a.ba, b.ba, k), fl: lerp(a.fl, b.fl, k), bl: lerp(a.bl, b.bl, k), bow: lerp(a.bow ?? 0, b.bow ?? 0, k), crouch: lerp(a.crouch ?? 0, b.crouch ?? 0, k) };
}
const SNAP = 0.14;   // s to snap into each new position (then it's held)
const STEP = 34;     // px per step forward
const WALK = 150;    // px/s walking out to their places and back

type Slot = { actor: Actor; x: number; y: number; face: 1 | -1; role: 'form' | 'striker' | 'holder' };

/** One routine: walk out, perform it, walk back. update() gives everyone's pose and what happened this frame. */
export class Routine {
  t = 0; done = false;
  private beats: Beat[]; private slots: Slot[]; private homes: Record<string, [number, number]>;
  private walkIn = 0; private beatAt = -1; private rounds: number; private round = 0;
  private stepOf = new Map<Actor, number>(); private faceOf = new Map<Actor, 1 | -1>();
  private last: Map<Actor, Move> = new Map(); private from: Map<Actor, Move> = new Map(); private beatT = 0;
  private pos = new Map<Actor, [number, number]>();
  private phase: 'in' | 'go' | 'out' = 'in';
  private recoil = new Map<Actor, number>();

  constructor(readonly kind: 'form' | 'pads' | 'nicopads', homes: Record<string, [number, number]>, actors: Actor[]) {
    this.homes = homes;
    this.beats = kind === 'form' ? FORM : PADS;
    this.rounds = kind === 'pads' ? 2 : 1;
    // where everyone stands: a line across the mat for the form; facing pairs for the pads
    if (kind === 'form') this.slots = actors.map((a, i) => ({ actor: a, x: 380 + i * 120, y: 590 + (i % 2) * 22, face: 1, role: 'form' as const }));
    else if (kind === 'pads') this.slots = [
      { actor: 'schindewolf', x: 420, y: 560, face: 1, role: 'striker' }, { actor: 'mrskrantz', x: 526, y: 560, face: -1, role: 'holder' },
      { actor: 'krantz', x: 690, y: 640, face: 1, role: 'striker' }, { actor: 'erin', x: 796, y: 640, face: -1, role: 'holder' },
    ].filter(s => actors.includes(s.actor as Actor)) as Slot[];
    else this.slots = [{ actor: 'nico', x: 510, y: 600, face: 1, role: 'striker' }, { actor: 'mrskrantz', x: 606, y: 600, face: -1, role: 'holder' }];
    for (const s of this.slots) { this.pos.set(s.actor, [...(homes[s.actor] ?? [s.x, s.y])] as [number, number]); this.faceOf.set(s.actor, s.face); this.stepOf.set(s.actor, 0); this.last.set(s.actor, MOVES.stand); this.from.set(s.actor, MOVES.stand); }
    if (kind === 'nicopads') { this.pos.set('nico', [this.slots[0].x, this.slots[0].y]); this.beats = PADS.slice(0, 7).concat([{ move: 'roundhouse', dur: 0.65, hit: true }, { move: 'guard', dur: 0.7 }]); }
  }
  /** Nico steps into the end of the line (only while they're still walking out to their places). */
  join(at: [number, number]): boolean {
    if (this.kind !== 'form' || this.phase !== 'in' || this.slots.some(s => s.actor === 'nico')) return false;
    const last = this.slots[this.slots.length - 1];
    this.slots.push({ actor: 'nico', x: last.x + 120, y: 590 + (this.slots.length % 2) * 22, face: 1, role: 'form' });
    this.pos.set('nico', at); this.faceOf.set('nico', 1); this.stepOf.set('nico', 0); this.last.set('nico', MOVES.stand); this.from.set('nico', MOVES.stand);
    return true;
  }
  get actors(): Actor[] { return this.slots.map(s => s.actor); }
  get canJoin() { return this.kind === 'form' && this.phase === 'in' && !this.slots.some(s => s.actor === 'nico'); }

  update(dt: number): { poses: Map<Actor, ActorPose>; events: DojoEvent[] } {
    this.t += dt;
    const events: DojoEvent[] = [], poses = new Map<Actor, ActorPose>();
    const target = (s: Slot): [number, number] => {
      const st = this.stepOf.get(s.actor) ?? 0;
      return this.phase === 'out' ? (this.homes[s.actor] ?? [s.x, s.y]) : [s.x + st * STEP, s.y];
    };
    // walking out (and back): everyone heads for their place, then they start together
    if (this.phase !== 'go') {
      let all = true;
      for (const s of this.slots) {
        const p = this.pos.get(s.actor)!, [tx, ty] = target(s), dx = tx - p[0], dy = ty - p[1], d = Math.hypot(dx, dy), step = WALK * dt;
        const walking = d > 2;
        if (walking) { all = false; if (d <= step) { p[0] = tx; p[1] = ty; } else { p[0] += dx / d * step; p[1] += dy / d * step; } }
        poses.set(s.actor, { x: p[0], y: p[1], face: walking ? (dx >= 0 ? 1 : -1) : this.phase === 'out' ? 1 : (this.faceOf.get(s.actor) ?? 1), move: walking ? null : MOVES.stand, walking, side: walking || this.phase === 'in', pad: this.phase === 'in' && s.role === 'holder' && !walking });
      }
      this.walkIn += dt;
      if (all && this.phase === 'in' && this.walkIn > 0.6) { this.phase = 'go'; this.beatAt = -1; this.beatT = 0; }
      if (all && this.phase === 'out') this.done = true;
      return { poses, events };
    }
    // the routine itself, beat by beat
    this.beatT += dt;
    const cur = this.beatAt < 0 ? null : this.beats[this.beatAt];
    if (!cur || this.beatT >= cur.dur) {
      this.beatAt++; this.beatT = 0;
      if (this.beatAt >= this.beats.length) {
        if (++this.round < this.rounds) {   // pads: swap who holds
          this.beatAt = 0;
          for (const s of this.slots) s.role = s.role === 'holder' ? 'striker' : 'holder';
          for (let i = 0; i + 1 < this.slots.length; i += 2) { const a = this.slots[i], b = this.slots[i + 1]; [a.x, b.x] = [b.x, a.x]; a.face = (a.face * -1) as 1 | -1; b.face = (b.face * -1) as 1 | -1; this.faceOf.set(a.actor, a.face); this.faceOf.set(b.actor, b.face); }
          for (const s of this.slots) this.pos.set(s.actor, [s.x, s.y]);
          events.push({ kind: 'say', actor: this.slots.find(s => s.role === 'striker')!.actor, text: 'Switch!' });
        } else {
          this.phase = 'out';
          for (const s of this.slots) this.stepOf.set(s.actor, 0);
          return this.update(0);
        }
      }
      const b = this.beats[this.beatAt];
      for (const s of this.slots) {
        this.from.set(s.actor, this.last.get(s.actor)!);
        if (b.turn) this.faceOf.set(s.actor, (-(this.faceOf.get(s.actor) ?? 1)) as 1 | -1);
        if (b.step) this.stepOf.set(s.actor, (this.stepOf.get(s.actor) ?? 0) + b.step * (this.faceOf.get(s.actor) ?? 1));
      }
      // what's said, and the hits on the pads
      const leader = this.slots.find(s => s.actor === 'krantz') ?? this.slots[0];
      if (b.say && this.kind === 'form') events.push({ kind: 'say', actor: leader.actor, text: b.say });
      if (b.all) for (const s of this.slots) if (s.role !== 'holder') events.push({ kind: 'kihap', actor: s.actor, text: b.all });
      if (this.kind !== 'form' || b.move !== 'stand') events.push({ kind: 'snap', actor: leader.actor });
      if (b.hit) for (const s of this.slots) if (s.role === 'holder') {
        this.recoil.set(s.actor, 0.22);
        const p = this.pos.get(s.actor)!; events.push({ kind: 'hit', actor: s.actor, x: p[0] + (this.faceOf.get(s.actor) ?? 1) * 30, y: p[1] - 82 });
        if (Math.random() < 0.3) events.push({ kind: 'say', actor: s.actor, text: PAD_LINES[Math.floor(Math.random() * PAD_LINES.length)] });
      }
    }
    const b = this.beats[this.beatAt], k = Math.min(1, this.beatT / SNAP);
    for (const s of this.slots) {
      let want = s.role === 'holder' ? MOVES.holdPad : MOVES[b.move];
      const rc = this.recoil.get(s.actor) ?? 0;
      if (rc > 0) { this.recoil.set(s.actor, rc - dt); want = MOVES.recoil; }
      const m = s.role === 'holder' && rc > 0 ? want : blend(this.from.get(s.actor)!, want, k);
      this.last.set(s.actor, m);
      const p = this.pos.get(s.actor)!, [tx, ty] = target(s);
      p[0] += (tx - p[0]) * Math.min(1, dt * 12); p[1] += (ty - p[1]) * Math.min(1, dt * 12);   // (a step glides forward)
      poses.set(s.actor, { x: p[0], y: p[1], face: this.faceOf.get(s.actor) ?? 1, move: m, walking: false, side: true, pad: s.role === 'holder' });
    }
    return { poses, events };
  }
}

/** How long till the instructors do something (s), after the last thing. */
export const SHOW = { first: 6, every: [16, 30] as [number, number] };
