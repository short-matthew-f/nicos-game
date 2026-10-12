// Nico's sticker book (from the "what next" list: one place for everything he collects, with empty
// slots to fill, so every corner of the world is worth exploring). Pages of stickers: shells, animal
// photos, storage treasures, things he's made, things he's done with the family, karate belts, and
// bits of town life. A full page pays a one-off reward. Data and pure functions over the save
// (Biz.seen remembers what's been sold or used up); main.ts draws the book.
import { SPECIES } from './fish';
import { PATIENTS } from './eyes';
import { CASES } from './surgery';
import { ITEMS, type Biz } from './business';
import { SHELL_KINDS } from './world/beach';
import { DESIGNS } from './jewelry';
import { RECIPES } from './bakery';
import { BELTS } from './karate';
import { ITEM_ICON } from './world/icons';

/** How a sticker is drawn: a drawn icon, a big thing (animals), a beach shell, or a belt. */
export type Art = ['icon' | 'big' | 'shell' | 'belt', string];
export interface Entry { id: string; label: string; art: Art; hint: string; has: (b: Biz) => number }   // has: 0 not yet; 1 (or stars, for photos)
export interface Page { id: string; title: string; reward: number; entries: Entry[] }

const seen = (b: Biz, k: string) => (b.seen[k] ?? 0) > 0 ? 1 : 0;
const bool = (x: boolean) => (x ? 1 : 0);
const ANIMALS: [string, string, Art][] = [
  ['cow', 'Cow', ['big', 'cow']], ['chicken', 'Chicken', ['big', 'chicken']], ['deer', 'Deer', ['icon', 'deer']], ['rabbit', 'Rabbit', ['icon', 'rabbit']],
  ['gull', 'Seagull', ['icon', 'gull']], ['crab', 'Crab', ['icon', 'crab']], ['fox', 'Fox', ['icon', 'fox']],
];
const label = (id: string) => ITEMS.find(i => i.id === id)!.label.replace(/^[^\p{L}\p{N}]+/u, '');

export const PAGES: Page[] = [
  { id: 'beach', title: 'On the beach', reward: 15, entries: [
    ...SHELL_KINDS.map(k => ({ id: k.id, label: k.label, art: ['shell', k.id] as Art, hint: 'Look along the sand at the beach.', has: (b: Biz) => bool(b.found.includes(k.id)) })),
    ...ITEMS.filter(i => i.where === 'beach').map(i => ({ id: i.id, label: label(i.id), art: ['icon', ITEM_ICON[i.id] ?? i.id] as Art, hint: 'Buried treasure: dig where the metal detector beeps.', has: (b: Biz) => seen(b, `find:${i.id}`) || bool(b.finds.some(f => f.id === i.id)) })),
  ] },
  { id: 'animals', title: 'Animal photos', reward: 20, entries: ANIMALS.map(([id, name, art]) => ({ id, label: name, art, hint: id === 'fox' ? 'Very shy: take its photo from far away (in the forest).' : 'Take its photo with the camera (from Parts & Tools).', has: (b: Biz) => b.photos[id] ?? 0 })) },
  { id: 'treasures', title: 'Storage treasures', reward: 30, entries: ITEMS.filter(i => i.kind === 'find' && !i.where).map(i => ({ id: i.id, label: label(i.id), art: ['icon', ITEM_ICON[i.id] ?? i.id] as Art, hint: 'Buy a storage unit and see what\'s inside.', has: (b: Biz) => seen(b, `find:${i.id}`) || bool(b.finds.some(f => f.id === i.id)) })) },
  { id: 'made', title: 'Made by Nico', reward: 25, entries: [
    { id: 'car', label: 'Toy car', art: ['icon', 'toycar'], hint: 'Build one at your workbench and sell it at the toy shop.', has: b => bool((b.sold.car ?? 0) > 0) },
    { id: 'robot', label: 'Toy robot', art: ['icon', 'robot'], hint: 'After the toy car: build a robot.', has: b => bool((b.sold.robot ?? 0) > 0) },
    ...DESIGNS.map(d => ({ id: d.id, label: d.name[0].toUpperCase() + d.name.slice(1), art: ['icon', d.id === 'bracelet' ? 'ring' : d.id === 'necklace' ? 'heart' : 'star'] as Art, hint: 'String shells at Bibs and Bobs.', has: (b: Biz) => seen(b, `jewelry:${d.id}`) })),
    ...RECIPES.map(r => ({ id: r.id, label: r.name[0].toUpperCase() + r.name.slice(1), art: ['icon', r.id === 'pizzelle' ? 'cookies' : r.id] as Art, hint: r.learn ? 'Learn it from Nonna, then bake it.' : 'Bake it at your bakery.', has: (b: Biz) => seen(b, `bake:${r.id}`) })),
  ] },
  { id: 'family', title: 'With the family', reward: 20, entries: [
    { id: 'pasta', label: "Nonna's pasta", art: ['icon', 'pot'], hint: 'Visit Nonna: she always has pasta.', has: b => seen(b, 'family:pasta') },
    { id: 'pizzelle', label: 'Pizzelle with Nonna', art: ['icon', 'cookies'], hint: 'Ask Nonna to teach you her pizzelle.', has: b => bool(b.learned.includes('pizzelle')) },
    { id: 'birdhouse', label: 'Birdhouse with Poppop', art: ['icon', 'hammer'], hint: "Build one in Poppop's woodshop.", has: b => bool(b.unlocked.includes('birdhouse')) },
    { id: 'sign', label: 'A carved sign', art: ['icon', 'cnc'], hint: "Poppop's CNC router.", has: b => bool(b.unlocked.includes('sign')) },
    { id: 'metalstar', label: 'A metal star', art: ['icon', 'star'], hint: "Poppop's plasma cutter.", has: b => bool(b.unlocked.includes('metalstar')) },
    { id: 'painting', label: 'A painting with Yia-Yia', art: ['icon', 'palette'], hint: "Paint at Yia-Yia's studio.", has: b => seen(b, 'art:painting') || bool(b.paintings.length > 0) },
  ] },
  { id: 'fish', title: 'Gone fishing', reward: 25, entries: SPECIES.map(sp => ({ id: sp.id, label: sp.name, art: ['icon', sp.kind === 'crab' ? 'crab' : sp.kind === 'bottle' ? 'bottle' : sp.kind ? sp.kind : `fish_${sp.id}`] as Art,
    hint: sp.id === 'golden' ? 'Very rare. Cast as far out as you can...' : sp.far > 0.8 ? 'A big one: cast far out from the end of the pier.' : 'Fish off the end of the pier.', has: (b: Biz) => seen(b, `fish:${sp.id}`) })) },
  { id: 'hospital', title: 'At the hospital', reward: 30, entries: [
    ...PATIENTS.map(p => ({ id: `eyes_${p.who}`, label: `${p.name}'s glasses`, art: ['icon', 'glasses'] as Art, hint: 'Help Dr. Nonna with eye exams at the hospital.', has: (b: Biz) => seen(b, `patient:${p.who}`) })),
    ...CASES.map(c => ({ id: `case_${c.id}`, label: c.title, art: ['icon', 'tweezers'] as Art, hint: 'Steady hands with Dr. Poppop at the hospital.', has: (b: Biz) => seen(b, `case:${c.id}`) })),
    { id: 'xray', label: 'X-ray detective', art: ['icon', 'xray'] as Art, hint: 'Find 3 or more swallowed things on Dr. Poppop\'s X-rays.', has: (b: Biz) => seen(b, 'xray:detective') },
  ] },
  { id: 'dojo', title: 'Karate belts', reward: 40, entries: BELTS.map((bt, i) => ({ id: bt.id, label: `${bt.name} belt`, art: ['belt', bt.color] as Art, hint: i === 0 ? 'Take a class at the dojo.' : 'Train at the dojo (sparring, pad rhythm, forms), then test with Mr. Master Krantz.', has: (b: Biz) => bool(b.belt >= i) })) },
  { id: 'town', title: 'Around town', reward: 20, entries: [
    { id: 'dog', label: 'A dog of your own', art: ['icon', 'heart'], hint: 'The doghouse in your yard.', has: b => bool(b.unlocked.includes('doghouse')) },
    { id: 'potatoes', label: "Yarosh's potatoes", art: ['icon', 'bakedpot'], hint: "Order something at Yarosh's Potatoes (next to the school).", has: b => bool(['bakedpot', 'curly', 'mash', 'tots'].some(i => seen(b, `food:${i}`))) },
    { id: 'peel', label: 'Potato peeler', art: ['icon', 'potato'], hint: "Help Yarosh peel potatoes (at his shop).", has: b => seen(b, 'job:peel') },
    { id: 'bob', label: 'Bobbing for bakers', art: ['icon', 'bakedpot'], hint: "Bob for bakers at Yarosh's Potatoes.", has: b => seen(b, 'game:bob') },
    { id: 'rea', label: 'Rea\'s castles', art: ['icon', 'shell'], hint: 'Find Rea on the beach. Build her a sandcastle!', has: b => seen(b, 'town:rea') },
    { id: 'tempo', label: 'Beat Tempo in a race', art: ['icon', 'trophy'], hint: 'Find Tempo on the beach and race him.', has: b => bool(['pier', 'lighthouse'].some(c => seen(b, `race:${c}`))) },
    { id: 'hide', label: 'Hide-and-seek with Primo', art: ['icon', 'teddy'], hint: 'Find Primo at the playground and play hide-and-seek.', has: b => seen(b, 'game:hide') },
    { id: 'snake', label: 'At the arcade', art: ['icon', 'joystick'], hint: "Play a game at Alpha's Retro Games.", has: b => bool(['snake', 'blasters', 'bricks', 'frog'].some(g => seen(b, `game:${g}`))) },
    { id: 'pinball', label: 'Pinball!', art: ['icon', 'target'], hint: 'Play the machine in your house.', has: b => seen(b, 'game:pinball') },
    { id: 'goal', label: 'Score a goal', art: ['icon', 'target'], hint: 'Kick the ball into a goal at the soccer field.', has: b => seen(b, 'town:goal') },
    { id: 'fire', label: 'A fire put out', art: ['icon', 'extinguisher'], hint: 'Follow the fire truck when the alarm rings.', has: b => seen(b, 'town:fire') },
    { id: 'rain', label: 'Out in the rain', art: ['icon', 'jar'], hint: 'Go outside when it rains.', has: b => seen(b, 'sky:rain') },
    { id: 'snow', label: 'Out in the snow', art: ['icon', 'star'], hint: 'Go outside when it snows (in winter).', has: b => seen(b, 'sky:snow') },
    { id: 'shop', label: 'Bibs and Bobs', art: ['icon', 'shell'], hint: 'Buy the shop on the beach.', has: b => bool(b.unlocked.includes('shop')) },
    { id: 'bakery', label: "Nico's Bakery", art: ['icon', 'cupcake'], hint: 'Buy the bakery.', has: b => bool(b.unlocked.includes('bakery')) },
  ] },
];

/** How much of a page is filled in. */
export const filled = (b: Biz, p: Page) => p.entries.filter(e => e.has(b) > 0).length;
export const complete = (b: Biz, p: Page) => filled(b, p) === p.entries.length;
export const claimed = (b: Biz, p: Page) => (b.seen[`book:${p.id}`] ?? 0) > 0;
/** Collect a full page's reward (once): the money, or 0. */
export function claim(b: Biz, id: string): number {
  const p = PAGES.find(q => q.id === id);
  if (!p || !complete(b, p) || claimed(b, p)) return 0;
  b.seen[`book:${p.id}`] = 1;
  return p.reward;
}
/** Every sticker, every page. */
export const totals = (b: Biz) => ({ got: PAGES.reduce((n, p) => n + filled(b, p), 0), all: PAGES.reduce((n, p) => n + p.entries.length, 0) });
