// Karate at the dojo (Nico does karate: the user, 2026-10-09, "a karate class in the game... belts as
// earned outfits"). Sensei calls a combination of moves; watch, then do it back in order. Three clean
// combinations in a class earns the next belt, and the belt shows on Nico's outfit (rig/person.ts
// setBelt). Each belt's combinations are a move longer and called a little faster. Data first.

export interface Belt { id: string; name: string; color: string }
export const BELTS: Belt[] = [
  { id: 'white', name: 'White', color: '#F4F4F0' }, { id: 'yellow', name: 'Yellow', color: '#F9D33C' },
  { id: 'orange', name: 'Orange', color: '#F28C38' }, { id: 'green', name: 'Green', color: '#3BB273' },
  { id: 'blue', name: 'Blue', color: '#2F6FD0' }, { id: 'purple', name: 'Purple', color: '#8E5BC8' },
  { id: 'brown', name: 'Brown', color: '#8A5A3B' }, { id: 'black', name: 'Black', color: '#1F1F24' },
];
export type Move = 'punch' | 'kick' | 'block' | 'kiai';
export const MOVES: { id: Move; name: string; call: string; color: string }[] = [
  { id: 'punch', name: 'Punch', call: 'Punch!', color: '#E5484D' },
  { id: 'kick', name: 'Kick', call: 'Kick!', color: '#2F6FD0' },
  { id: 'block', name: 'Block', call: 'Block!', color: '#3BB273' },
  { id: 'kiai', name: 'Kiai!', call: 'KIAI!', color: '#F9A826' },
];
export const CLASS = { rounds: 3 };

/** The belt he'd be working toward (index into BELTS): his first class earns the white belt. */
export const nextBelt = (belt: number) => Math.min(BELTS.length - 1, belt + 1);
export const isBlack = (belt: number) => belt >= BELTS.length - 1;
/** How many moves in a combination, and how long Sensei shows each (s), for a class toward belt `toward`. */
// (Nico, 2026-10-11: "a little too hard", stuck around brown belt: was 3 + belt moves, down to 0.42 s each;
// now a move longer every other belt, 6 at most, and never quicker than 0.62 s)
export const comboLength = (toward: number) => 3 + Math.floor(toward / 2);
export const callTime = (toward: number) => Math.max(0.62, 0.85 - toward * 0.035);
/** A combination: never the same move three times running, and it ends with a kiai on the higher belts. */
export function combo(toward: number, r: () => number = Math.random): Move[] {
  const n = comboLength(toward), out: Move[] = [];
  const pool: Move[] = toward >= 2 ? ['punch', 'kick', 'block', 'kiai'] : ['punch', 'kick', 'block'];
  while (out.length < n) {
    const m = pool[Math.floor(r() * pool.length)];
    if (out.length >= 2 && out[out.length - 1] === m && out[out.length - 2] === m) continue;
    out.push(m);
  }
  return out;
}
/** Check what he's done so far against the combination: 'ok' (keep going), 'done' (all of it), 'miss'. */
export function check(want: Move[], done: Move[]): 'ok' | 'done' | 'miss' {
  for (let i = 0; i < done.length; i++) if (done[i] !== want[i]) return 'miss';
  return done.length === want.length ? 'done' : 'ok';
}
