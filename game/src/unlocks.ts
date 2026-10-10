// Things Nico unlocks by buying them, "added to the world like applying a sticker" (user's idea,
// 2026-10-10): until then each shows as a dashed outline with a price where it will go; buy it and
// the sticker slaps down and it works. Data only: add a line here for each new unlockable.
import type { Biz } from './business';

export interface Unlock {
  id: string; label: string; price: number;
  room: 'world' | 'shed' | 'home';   // where it goes
  text: string;                 // what it does (on the buy card)
  after?: string;               // only offered once this one's unlocked
  earned?: string;              // not for sale: made with someone (who), and stuck on when it's done
}
export const UNLOCKS: Unlock[] = [
  { id: 'shed', label: '🏚️ Work shed', price: 15, room: 'world', text: 'Your own work shed, right next to your house. Put tools and equipment in it to make things.' },
  { id: 'workbench', label: '🛠️ Workbench', price: 15, room: 'shed', after: 'shed', text: 'A sturdy bench to build things on: toy cars, robots, and more.' },
  { id: 'shelves', label: '🗄️ Shelves', price: 10, room: 'shed', after: 'shed', text: 'Show off everything you\'ve kept: storage finds, beach treasure, and more.' },
  { id: 'bins', label: '🧰 Parts bins', price: 15, room: 'shed', after: 'workbench', text: 'Order parts right here in your shed: no trip to Parts & Tools.' },
  { id: 'shop', label: '🐚 Bibs and Bobs', price: 25, room: 'world', text: 'Your own little shop on the beach. String shells into bracelets, necklaces and wind chimes, put them on the shelves, and visitors will buy them (even while you\'re away). Collect the money from the till.' },
  { id: 'bakery', label: '🧁 Nico\'s Bakery', price: 40, room: 'world', text: 'Your own bakery! Bake cookies, cupcakes and bread (golden ones sell for more), fill the display case, and people will pop in to buy them. Eggs are free at the farm\'s hen house.' },
  // decorating Nico's house (Nico, 2026-10-10: "he wants to be able to decorate his house")
  { id: 'plant', label: '🪴 Big plant', price: 5, room: 'home', text: 'A big leafy plant in a pot. Very fancy.' },
  { id: 'posters', label: '🖼️ Posters', price: 3, room: 'home', text: 'Posters for your wall: a soccer star and a rocket.' },
  { id: 'bookshelf', label: '📚 Bookshelf', price: 10, room: 'home', text: 'A tall shelf full of books (and your best finds on top).' },
  { id: 'beanbag', label: '🫘 Beanbag', price: 5, room: 'home', text: 'A squishy beanbag to flop into.' },
  { id: 'tv', label: '📺 TV and game console', price: 20, room: 'home', text: 'A TV with a game console. Sit on the beanbag and play!' },
  { id: 'fishtank', label: '🐠 Fish tank', price: 15, room: 'home', text: 'A fish tank with three little fish swimming round.' },
  { id: 'cat', label: '🐱 A pet cat', price: 25, room: 'home', text: 'A fluffy cat of your own! She watches the fish all day and purrs when you pet her.' },
  // made in Poppop's woodshop (not for sale)
  { id: 'birdhouse', label: '🐦 Birdhouse', price: 0, room: 'world', earned: 'Poppop', text: 'A birdhouse you built with Poppop, in your garden.' },
  { id: 'sign', label: '🪵 Carved sign', price: 0, room: 'home', earned: 'Poppop', text: 'A wooden sign you carved on Poppop\'s CNC router.' },
  { id: 'metalstar', label: '⭐ Metal star', price: 0, room: 'home', earned: 'Poppop', text: 'A steel star you cut with Poppop\'s plasma cutter.' },
  { id: 'paint', label: '🎨 Paint station', price: 20, room: 'shed', after: 'workbench', text: 'Give every toy you build a shiny coat of paint: painted toys sell for $5 more.' },
];
export const unlockOf = (id: string) => UNLOCKS.find(u => u.id === id)!;
export const isUnlocked = (b: Biz, id: string) => b.unlocked.includes(id);
/** Can it be bought now (not already, and whatever it needs is there)? */
export const canUnlock = (b: Biz, id: string) => !unlockOf(id).earned && !isUnlocked(b, id) && (!unlockOf(id).after || isUnlocked(b, unlockOf(id).after!));
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
