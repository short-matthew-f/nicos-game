// Odd jobs from people around town: a way to earn a little money. Data first; the game
// loop only asks "where's the next target?" and calls advance() when Nico does the step.
import { BUILDINGS, FIELD, ROADS_X, ROAD_W, SIDEWALK, doorOf } from './world/map';
import { ITEMS, item } from './business';

export type Step =
  | { kind: 'go'; label: string; note: string; at: [number, number] | [number, number][] }   // several: one is picked when the job starts
  | { kind: 'ball'; note: string }      // kick the soccer ball to the person who asked
  | { kind: 'return'; note: string }    // go back and tell them
  | { kind: 'bring'; item: string; note: string };   // find one of these (storage units) and hand it over

export interface Job {
  id: string; giver: string; title: string; ask: string; thanks: string; reward: number; steps: Step[]; cooldown: number;
  meet?: [number, number][];   // while the job's on, the giver walks these points and waits at the last one
}

const door = (id: string) => { const [x, y] = doorOf(BUILDINGS.find(b => b.id === id)!); return [x, y] as [number, number]; };

export const JOBS: Job[] = [
  { id: 'water', giver: 'mrskim', title: "Water Mrs. Kim's flowers", reward: 5, cooldown: 90,
    ask: 'My back is aching today. Could you water the flowers by my house? I\'ll give you $5.',
    thanks: 'They look so happy now. Thank you, dear!',
    steps: [
      { kind: 'go', label: 'Water flowers', note: 'water the flowers (1 of 3)', at: [470, 1895] },
      { kind: 'go', label: 'Water flowers', note: 'water the flowers (2 of 3)', at: [560, 1945] },
      { kind: 'go', label: 'Water flowers', note: 'water the flowers (3 of 3)', at: [400, 1655] },
      { kind: 'return', note: 'tell Mrs. Kim' },
    ] },
  { id: 'package', giver: 'mrbrooks', title: 'Deliver a package', reward: 6, cooldown: 120,
    ask: 'There\'s a package at the hospital for the fire station. Could you take it over? $6 for your trouble.',
    thanks: 'Package delivered? Good work, Nico.',
    steps: [
      { kind: 'go', label: 'Pick up package', note: 'pick up the package at the hospital', at: door('hospital') },
      { kind: 'go', label: 'Deliver package', note: 'take the package to the fire station', at: door('fire') },
      { kind: 'return', note: 'tell Mr. Brooks' },
    ] },
  { id: 'cat', giver: 'sam', title: 'Find Whiskers', reward: 5, cooldown: 120,
    ask: 'My cat Whiskers got out! Can you find her? I\'ll give you $5 from my piggy bank.',
    thanks: 'WHISKERS! You found her! Thank you thank you!',
    steps: [
      { kind: 'go', label: 'Pick up Whiskers', note: 'find Whiskers the cat (check the minimap)',
        at: [[2880, 1700], [2700, 3040], [4250, 3060], [760, 700], [4700, 1650]] },
      { kind: 'return', note: 'bring Whiskers back to Sam' },
    ] },
  { id: 'ball', giver: 'ava', title: "Ava's soccer ball", reward: 4, cooldown: 120,
    ask: 'I lost my soccer ball. I think it\'s on the field behind the toy shop. I\'ll wait at the end of the field: can you kick it to me? I\'ll give you $4.',
    // she comes to the field (down her sidewalk, across the road) so the ball never has to cross traffic
    meet: [[ROADS_X[0] - ROAD_W / 2 - SIDEWALK / 2, FIELD.y + 60], [FIELD.x + 110, FIELD.y + 60]],
    thanks: 'My ball! You\'re the best, Nico.',
    steps: [{ kind: 'ball', note: 'kick the soccer ball over to Ava' }] },
  { id: 'book', giver: 'maya', title: "Maya's library book", reward: 3, cooldown: 90,
    ask: 'I left my library book at school and it\'s due today! Could you grab it? $3?',
    thanks: 'Phew, no late fee! Thanks, Nico.',
    steps: [
      { kind: 'go', label: "Grab Maya's book", note: "grab Maya's book from the school", at: door('school') },
      { kind: 'return', note: 'bring the book to Maya' },
    ] },
];

export interface Active { job: Job; step: number; at: ([number, number] | null)[] }

/** Start a job: pick a spot for any step with several possible places. */
export function start(job: Job, rnd = Math.random): Active {
  return { job, step: 0, at: job.steps.map(s => s.kind !== 'go' ? null : Array.isArray(s.at[0]) ? (s.at as [number, number][])[Math.floor(rnd() * s.at.length)] : s.at as [number, number]) };
}

export const current = (a: Active): Step => a.job.steps[a.step];

/** Do the current step; true when that was the last one (pay up). */
export function advance(a: Active): boolean {
  a.step++;
  return a.step >= a.job.steps.length;
}

/** Where to go next: a place, or the person who asked (for 'return' and 'ball'). */
export function target(a: Active, giverAt: [number, number]): [number, number] {
  const s = current(a);
  return s.kind === 'go' ? a.at[a.step]! : giverAt;
}

export const jobFor = (who: string) => JOBS.find(j => j.giver === who) ?? null;

// ---- item requests: once Nico has bought a storage unit, now and then someone asks him to
// find them something. They pay more than it would sell for, so keeping it is worth it.
export const WANT = { first: 40, every: [60, 120] as [number, number], offerFor: 150 };   // s
export const WANTERS = ['mrskim', 'mrbrooks', 'maya', 'leo', 'sam', 'ava', 'james'];
/** Why someone wants each thing (any find not listed isn't asked for). */
export const WANT_REASONS: Record<string, string> = {
  teddy: "My little brother lost his teddy and he can't sleep.",
  radio: 'My old radio finally broke, and I miss listening to the ball game.',
  books: "I've read every book in my house twice!",
  lamp: "It's so dark in my reading corner.",
  chair: 'We have friends coming for dinner and not enough chairs.',
  suitcase: "I'm going on a trip and my suitcase has a hole in it.",
  skateboard: "Everyone at the park has a skateboard except me.",
  guitar: "I want to start a band. I just need a guitar!",
  painting: 'My living room wall looks so empty.',
  console: "I'd love to play the old games I had as a kid.",
  clock: 'I keep being late. I need a clock!',
  trophy: 'I want a trophy for my bowling team, just for fun.',
};
export const wantReward = (id: string) => Math.ceil(item(id).value[1] * 1.5) + 2;
const wantName = (id: string) => item(id).label.split(' ').slice(1).join(' ').toLowerCase();

/** The job for "find me a ..." (its id says who and what, so it can be saved and rebuilt). */
export function wantJob(giver: string, id: string): Job {
  const reward = wantReward(id), it = item(id);
  return {
    id: `want:${giver}:${id}`, giver, title: `Find a ${wantName(id)}`, reward, cooldown: 0,
    ask: `${WANT_REASONS[id] ?? ''} Could you find me ${/^[aeiou]/.test(wantName(id)) ? 'an' : 'a'} ${wantName(id)}? I'll give you $${reward}.`,
    thanks: `${it.label.split(' ')[0]} Perfect, just what I needed. Thank you!`,
    steps: [{ kind: 'bring', item: id, note: `find ${it.label} (storage units)` }],
  };
}
/** A job by id, including item requests; null if it no longer exists (an old save). */
export function jobById(id: string): Job | null {
  const m = /^want:([a-z]+):([a-z]+)$/.exec(id);
  if (m) return WANTERS.includes(m[1]) && WANT_REASONS[m[2]] && ITEMS.some(i => i.id === m[2]) ? wantJob(m[1], m[2]) : null;
  return JOBS.find(j => j.id === id) ?? null;
}
/** A request to offer: a random person (not `busy`) and a random thing. */
export function pickWant(rnd: () => number, busy: (who: string) => boolean): { giver: string; item: string } | null {
  const who = WANTERS.filter(w => !busy(w)), things = Object.keys(WANT_REASONS);
  if (!who.length) return null;
  return { giver: who[Math.floor(rnd() * who.length)], item: things[Math.floor(rnd() * things.length)] };
}
