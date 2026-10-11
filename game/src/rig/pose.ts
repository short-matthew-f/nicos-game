// Pose math ported from src/rig.py (class Nico). Each part's transform is a list of ops
// applied like a CSS transform list; test/pose.test.ts checks this against poses dumped
// from the Python rig (python3 src/export_game.py).

export type View = 'side' | 'front' | 'back' | 'qfront' | 'qback';   // q = 3/4, drawn facing right
export const VIEWS: View[] = ['side', 'front', 'back', 'qfront', 'qback'];
export type Op = ['t', number, number] | ['r', number] | ['s', number, number];

export interface PoseState {
  view: View;
  face: number;      // side view: +1 right, -1 left
  phase: number;     // gait distance in seconds of full-speed walking
  amp: number;       // gait amplitude 0..1
  stride_y: number;  // front/back: screen-y rig units per unit phase (foot planting)
  crouch: number;    // 0..1
  hold: number;      // 0..1 arms forward
  breath: number;    // idle chest rise (units)
  sit?: number;      // 0..1 sitting (game-only: not in the Python rig, so parity poses leave it out)
  knee?: number;     // 0..1 side view: bend the knees (sitting on a stool): thigh forward, shin down (game-only too)
  /** Side view, game-only: martial arts (the dojo). Angles in degrees from hanging straight down; negative is
   * forward (fa/fl: the near arm and leg; ba/bl: the far ones). `bow`: lean the body forward (deg), `w`: how much
   * of this replaces the walk (0..1). */
  moves?: { fa: number; ba: number; fl: number; bl: number; bow?: number; w?: number };
}

export const CYCLE = 0.7;
export const DC = 30.745;
export const LEAN_C = 25.0;
const LX = 10.0, AX = 20.0, LIFT = 9.0, SWAY = 1.5, ARM_OUT = 7.0;
const RAD = Math.PI / 180;

export const neutral = (view: View = 'side'): PoseState =>
  ({ view, face: 1, phase: 0, amp: 0, stride_y: 0, crouch: 0, hold: 0, breath: 0, sit: 0 });

function gait(st: PoseState): [number, number] {
  const an = 28.0 * st.amp * Math.sin(2 * Math.PI * st.phase / CYCLE);
  const dw = 29.0 * (1 - Math.cos(an * RAD));
  return [an, DC * st.crouch + dw];
}

export const SIT_LEG = -68;   // side view: sitting legs point forward and a little down (deg)
export const SIT_DROP = 44;   // how far the hips drop when sitting (units), so they rest near the feet's level

function sideOps(st: PoseState): Record<string, Op[]> {
  const sit = st.sit ?? 0;
  const [an, gdd] = gait(st);
  const mv = st.moves, mw = mv ? (mv.w ?? 1) : 0;
  // (a wide stance lowers the hips so both feet stay on the floor; the leg nearer upright is the one standing)
  const stance = mv ? (58 - DC * st.crouch) * (1 - Math.cos(Math.min(Math.abs(mv.fl), Math.abs(mv.bl)) * RAD)) * mw : 0;
  const dd = gdd + SIT_DROP * sit + stance;   // sitting lowers the hips
  const lean = LEAN_C * st.crouch + 3.0 * st.amp + (mv?.bow ?? 0) * mw;
  const armang = (far: boolean) => {
    const free = far ? 0.85 * an : -0.85 * an;
    const a = (1 - st.hold) * free + st.hold * -56.0;
    return mv ? a * (1 - mw) + (far ? mv.ba : mv.fa) * mw : a;
  };
  const l = 58 - DC * st.crouch;
  // leg angle: the walk swing (legs opposite), blended toward both legs forward when sitting
  const legAn = (far: boolean) => {
    const a = (far ? -an : an) * (1 - sit) + SIT_LEG * sit;
    return mv ? a * (1 - mw) + (far ? mv.bl : mv.fl) * mw : a;
  };
  const arm = (far: boolean): Op[] =>
    [['t', 0, -58 + dd - st.breath], ['r', lean], ['t', 2, -42], ['r', armang(far)]];
  const leg = (far: boolean): Op[] =>
    [['t', far ? -3 : 3, -58 + dd], ['r', legAn(far)], ['s', 1 + 0.35 * st.crouch, (l - 8) / 50.0]];
  const shoe = (far: boolean): Op[] => {
    const a = legAn(far), r = a * RAD, hx = far ? -3 : 3;
    return [['t', hx - l * Math.sin(r), -58 + dd + l * Math.cos(r)], ['r', a * 0.4]];
  };
  const knee = st.knee ?? 0;
  if (knee > 0) {
    // knees bent: the leg becomes a thigh (toward straight forward) and a shin (toward straight down),
    // both drawn with the leg's art; the shoe goes on the end of the shin
    const bent = (far: boolean): [Op[], Op[], Op[]] => {
      const hx = far ? -3 : 3, hy = -58 + dd;
      const ta = legAn(far) * (1 - knee) - 90 * knee, sa = ta * (1 - knee);
      const lt = l * (1 - 0.5 * knee), ls = l - lt, tr = ta * RAD, sr = sa * RAD;
      const kx = hx - lt * Math.sin(tr), ky = hy + lt * Math.cos(tr);
      return [
        [['t', hx, hy], ['r', ta], ['s', 1 + 0.35 * st.crouch, (lt + 6) / 50.0]],
        [['t', kx, ky], ['r', sa], ['s', 1 + 0.35 * st.crouch, Math.max(0, ls - 8) / 50.0]],
        [['t', kx - ls * Math.sin(sr), ky + ls * Math.cos(sr)], ['r', sa * 0.4]],
      ];
    };
    const [bt, bk, bs] = bent(true), [ft, fk, fs] = bent(false);
    return { ba: arm(true), bl: bt, bk, bs, fl: ft, fk, fs, up: [['t', 0, -58 + dd - st.breath], ['r', lean]], fa: arm(false) };
  }
  return {
    ba: arm(true), bl: leg(true), bs: shoe(true), fl: leg(false), fs: shoe(false),
    up: [['t', 0, -58 + dd - st.breath], ['r', lean]], fa: arm(false),
  };
}

function fbOps(st: PoseState): Record<string, Op[]> {
  const ph = 2 * Math.PI * st.phase / CYCLE;
  const amp = st.amp, [, dd] = gait(st);
  const off = st.stride_y * CYCLE / (2 * Math.PI) * amp * Math.sin(ph);
  const sway = SWAY * amp * Math.cos(ph);
  const side = (i: number) => {
    const sg = i < 0 ? 1 : -1;
    return { lift: LIFT * amp * Math.max(0, sg * Math.cos(ph)), off: sg * off, arm: -sg * amp * Math.sin(ph) };
  };
  const leg = (i: number): Op[] => {
    const q = side(i), l = 58 - dd - q.lift + q.off;
    return [['t', i * LX + sway, -58 + dd], ['r', Math.asin(sway / l) / RAD], ['s', 1, (l - 8) / 50.0]];
  };
  const shoe = (i: number): Op[] => { const q = side(i); return [['t', i * LX, -q.lift + q.off]]; };
  const arm = (i: number): Op[] => {
    const a = side(i).arm;
    return [['t', i * AX + sway, -100 + dd - st.breath], ['r', -i * (ARM_OUT + 3.0 * Math.abs(a))], ['s', 1, 1 - 0.14 * Math.abs(a)]];
  };
  return {
    legl: leg(-1), legr: leg(1), shl: shoe(-1), shr: shoe(1),
    up: [['t', sway, -58 + dd - st.breath]], arml: arm(-1), armr: arm(1),
  };
}

// 3/4 views: the front/back gait, with hips and shoulders placed for a turned body
const QLX = [-10, 9], QAX = [-19, 15], QNEAR_DY = 2;   // [near (viewer-left), far]

function qOps(st: PoseState): Record<string, Op[]> {
  const ph = 2 * Math.PI * st.phase / CYCLE;
  const amp = st.amp, [, dd] = gait(st);
  const off = st.stride_y * CYCLE / (2 * Math.PI) * amp * Math.sin(ph);
  const sway = SWAY * amp * Math.cos(ph);
  const side = (i: number) => {
    const sg = i < 0 ? 1 : -1;
    return { lift: LIFT * amp * Math.max(0, sg * Math.cos(ph)), off: sg * off, arm: -sg * amp * Math.sin(ph) };
  };
  const k = (i: number) => (i < 0 ? 0 : 1), dy = (i: number) => (i < 0 ? QNEAR_DY : 0);
  const leg = (i: number): Op[] => {
    const q = side(i), l = 58 - dd - q.lift + q.off;
    return [['t', QLX[k(i)] + sway, -58 + dd + dy(i)], ['r', Math.asin(sway / l) / RAD], ['s', 1, (l - 8) / 50.0]];
  };
  const shoe = (i: number): Op[] => { const q = side(i); return [['t', QLX[k(i)], -q.lift + q.off + dy(i)]]; };
  const arm = (i: number): Op[] => {
    const a = side(i).arm, rest = i < 0 ? 8 : -6;
    return [['t', QAX[k(i)] + sway, -100 + dd - st.breath], ['r', rest + (i < 0 ? -1 : 1) * 3.0 * Math.abs(a)], ['s', 1, 1 - 0.14 * Math.abs(a)]];
  };
  return {
    armf: arm(1), legf: leg(1), shf: shoe(1), legn: leg(-1), shn: shoe(-1),
    up: [['t', sway, -58 + dd - st.breath]], armn: arm(-1),
  };
}

/** Ops for every part of the active view, keyed by the part names in nico.json. */
export function partOps(st: PoseState): Record<string, Op[]> {
  switch (st.view) {
    case 'side': return sideOps(st);
    case 'front': case 'back': return fbOps(st);
    case 'qfront': case 'qback': return qOps(st);
    default: throw new Error(`no pose for view ${String(st.view)}`);
  }
}

/** 2x3 affine [a, b, c, d, tx, ty] (x' = a x + c y + tx, y' = b x + d y + ty) of an op
 * list, composed left to right the way CSS composes a transform list. */
export type Mat = [number, number, number, number, number, number];
export function opsMatrix(ops: Op[]): Mat {
  let m: Mat = [1, 0, 0, 1, 0, 0];
  for (const o of ops) {
    let n: Mat;
    if (o[0] === 't') n = [1, 0, 0, 1, o[1], o[2]];
    else if (o[0] === 'r') { const c = Math.cos(o[1] * RAD), s = Math.sin(o[1] * RAD); n = [c, s, -s, c, 0, 0]; }
    else n = [o[1], 0, 0, o[2], 0, 0];
    m = mul(m, n);
  }
  return m;
}
export function mul(m: Mat, n: Mat): Mat {
  return [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
          m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
          m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
}
export function apply(m: Mat, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}
