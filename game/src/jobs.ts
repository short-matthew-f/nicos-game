// Odd jobs from people around town: a way to earn a little money. Data first; the game
// loop only asks "where's the next target?" and calls advance() when Nico does the step.
import { BUILDINGS, FIELD, ROADS_X, ROAD_W, SIDEWALK, doorOf } from './world/map';

export type Step =
  | { kind: 'go'; label: string; note: string; at: [number, number] | [number, number][] }   // several: one is picked when the job starts
  | { kind: 'ball'; note: string }      // kick the soccer ball to the person who asked
  | { kind: 'return'; note: string };   // go back and tell them

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
      { kind: 'go', label: 'Water flowers', note: 'water the flowers (1 of 3)', at: [130, 1915] },
      { kind: 'go', label: 'Water flowers', note: 'water the flowers (2 of 3)', at: [300, 1915] },
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
