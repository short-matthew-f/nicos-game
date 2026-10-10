// Things Nico unlocks by buying them, "added to the world like applying a sticker" (user's idea,
// 2026-10-10): until then each shows as a dashed outline with a price where it will go; buy it and
// the sticker slaps down and it works. Data only: add a line here for each new unlockable.
import type { Biz } from './business';

export interface Unlock {
  id: string; label: string; price: number;
  room: 'world' | 'shed';       // where it goes
  text: string;                 // what it does (on the buy card)
  after?: string;               // only offered once this one's unlocked
}
export const UNLOCKS: Unlock[] = [
  { id: 'shed', label: '🏚️ Work shed', price: 15, room: 'world', text: 'Your own work shed, right next to your house. Put tools and equipment in it to make things.' },
  { id: 'workbench', label: '🛠️ Workbench', price: 15, room: 'shed', after: 'shed', text: 'A sturdy bench to build things on: toy cars, robots, and more.' },
  { id: 'shelves', label: '🗄️ Shelves', price: 10, room: 'shed', after: 'shed', text: 'Show off everything you\'ve kept: storage finds, beach treasure, and more.' },
  { id: 'bins', label: '🧰 Parts bins', price: 15, room: 'shed', after: 'workbench', text: 'Order parts right here in your shed: no trip to Parts & Tools.' },
  { id: 'paint', label: '🎨 Paint station', price: 20, room: 'shed', after: 'workbench', text: 'Give every toy you build a shiny coat of paint: painted toys sell for $5 more.' },
];
export const unlockOf = (id: string) => UNLOCKS.find(u => u.id === id)!;
export const isUnlocked = (b: Biz, id: string) => b.unlocked.includes(id);
/** Can it be bought now (not already, and whatever it needs is there)? */
export const canUnlock = (b: Biz, id: string) => !isUnlocked(b, id) && (!unlockOf(id).after || isUnlocked(b, unlockOf(id).after!));
/** Buy it: false if it can't be bought or Nico can't pay. (The workbench also sets biz.workbench.) */
export function unlock(b: Biz, id: string, money: number): boolean {
  if (!canUnlock(b, id) || unlockOf(id).price > money) return false;
  b.unlocked.push(id);
  if (id === 'workbench') b.workbench = true;
  return true;
}
/** A save from before the shed: owning a workbench means the shed and its bench are already there. */
export function migrateUnlocks(b: Biz) {
  if (b.workbench) for (const id of ['shed', 'workbench']) if (!b.unlocked.includes(id)) b.unlocked.push(id);
}
export const PAINT_BONUS = 5;   // $ more for a painted toy
