// Fishing off the end of the pier (the user, 2026-10-12: "Build on all three of those games"). Hold to wind up and
// let go to cast (further out, bigger fish). Then wait: the bobber twitches (nibbles, don't fall for it) and then
// it plunges: that's a bite, tap now to hook it. Too early and you scare it off; too slow and it steals your bait.
// Hooked: hold to reel in. The line gets tighter as you reel, much tighter when the fish makes a run for it: let go
// then or the line snaps. Ease off too long and it swims away. Pure; fishView.ts draws it.
export interface Species { id: string; name: string; size: [number, number]; weight: number; far: number; fight: number; color: string; belly: string; kind?: 'crab' | 'boot' | 'bottle'; worth?: number }
export const SPECIES: Species[] = [
  { id: 'sardine', name: 'Sardine', size: [12, 20], weight: 30, far: -0.5, fight: 0.5, color: '#7FA8C9', belly: '#DCE8F2' },
  { id: 'mackerel', name: 'Mackerel', size: [25, 40], weight: 24, far: 0, fight: 0.75, color: '#3E7FA8', belly: '#E9EEF3' },
  { id: 'flounder', name: 'Flounder', size: [25, 45], weight: 14, far: 0.2, fight: 0.7, color: '#A8865A', belly: '#E3D3B0' },
  { id: 'crab', name: 'Crab', size: [8, 18], weight: 10, far: -0.8, fight: 0.6, color: '#E5484D', belly: '#F7A7A0', kind: 'crab' },
  { id: 'bass', name: 'Sea bass', size: [35, 60], weight: 10, far: 0.6, fight: 1, color: '#5B6472', belly: '#C9D3DC' },
  { id: 'bluefish', name: 'Bluefish', size: [40, 75], weight: 7, far: 0.9, fight: 1.25, color: '#2F7FD8', belly: '#BFE3F5' },
  { id: 'striper', name: 'Striped bass', size: [60, 110], weight: 4, far: 1.4, fight: 1.45, color: '#7A8794', belly: '#F4F6F8' },
  { id: 'boot', name: 'An old boot', size: [26, 30], weight: 5, far: -0.3, fight: 0.4, color: '#5A4131', belly: '#3E2C20', kind: 'boot' },
  { id: 'bottle', name: 'A message in a bottle', size: [20, 24], weight: 2, far: 0.5, fight: 0.4, color: '#5FAF8A', belly: '#BFE8D3', kind: 'bottle', worth: 5 },
  { id: 'golden', name: 'The golden fish', size: [30, 45], weight: 0.8, far: 1.6, fight: 1.6, color: '#F9C846', belly: '#FFF1A8', worth: 10 },
];
export const FISHING = { sweep: 1.1, fly: 0.55, wait: [2.5, 6.5] as [number, number], nibbleGap: [0.7, 1.8] as [number, number], nibble: 0.3, bite: 0.85, spooked: 2.5,
  reel: 0.24, slack: 0.045, tight: 0.32, tightRun: 1.15, ease: 0.85, runGap: [1.1, 2.8] as [number, number], runFor: [0.8, 1.5] as [number, number], away: 1.08, after: 1.6 };
export type Phase = 'ready' | 'charging' | 'flying' | 'waiting' | 'fight' | 'caught' | 'lost';

/** Which fish bites: farther casts favour the big ones. */
export function pickSpecies(dist: number, rnd: () => number = Math.random): Species {
  const w = SPECIES.map(s => s.weight * Math.exp(s.far * (dist - 0.5) * 2.2)), total = w.reduce((a, b) => a + b, 0);
  let r = rnd() * total; for (let i = 0; i < SPECIES.length; i++) { r -= w[i]; if (r <= 0) return SPECIES[i]; }
  return SPECIES[0];
}
export class Fishing {
  phase: Phase = 'ready'; power = 0; dist = 0; line = 0; tension = 0; running = false; holding = false;
  fish: Species | null = null; size = 0; why: 'snap' | 'away' | 'stole' | null = null;
  bob = 0;   // how far under the bobber's pulled (0 floating, 0.35 a nibble, 1 a bite): for drawing
  private t = 0; private wait = 0; private nibbleIn = 0; private nibbleT = 0; private biteT = 0; private runIn = 0; private runT = 0; private afterT = 0;
  constructor(private rnd: () => number = Math.random) {}
  private range([a, b]: [number, number]) { return a + this.rnd() * (b - a); }
  press(): string[] {
    this.holding = true;
    if (this.phase === 'ready') { this.phase = 'charging'; this.t = 0; return ['windup']; }
    if (this.phase === 'waiting') {
      if (this.biteT > 0) {   // hooked!
        this.fish = pickSpecies(this.dist, this.rnd); this.size = Math.round(this.range(this.fish.size));
        this.phase = 'fight'; this.line = this.dist; this.tension = 0.15; this.running = false; this.runIn = this.range(FISHING.runGap); this.biteT = 0; this.bob = 0;
        return ['hooked'];
      }
      this.wait = this.range(FISHING.wait) + FISHING.spooked; this.nibbleT = 0; return ['early'];   // (scared it off: wait again)
    }
    if (this.phase === 'caught' || this.phase === 'lost') { if (this.afterT <= 0) this.phase = 'ready'; }
    return [];
  }
  release(): string[] {
    this.holding = false;
    if (this.phase === 'charging') {
      this.dist = 0.2 + 0.8 * this.power; this.phase = 'flying'; this.t = 0; return ['cast'];
    }
    return [];
  }
  /** (tests and the debug hook: a fish bites right now) */
  biteNow() { if (this.phase === 'waiting') { this.wait = 0; } }
  update(dt: number): string[] {
    const ev: string[] = [], F = FISHING; this.t += dt; this.afterT -= dt;
    switch (this.phase) {
      case 'charging': { const u = (this.t / F.sweep) % 2; this.power = u < 1 ? u : 2 - u; break; }
      case 'flying': if (this.t >= F.fly) { this.phase = 'waiting'; this.wait = this.range(F.wait); this.nibbleIn = this.range(F.nibbleGap); ev.push('splash'); } break;
      case 'waiting':
        if (this.biteT > 0) { this.biteT -= dt; this.bob = 1; if (this.biteT <= 0) { this.phase = 'lost'; this.why = 'stole'; this.afterT = F.after; this.bob = 0; ev.push('stole'); } break; }
        this.wait -= dt; this.nibbleT -= dt; this.nibbleIn -= dt;
        if (this.nibbleIn <= 0 && this.wait > 0.6) { this.nibbleT = F.nibble; this.nibbleIn = this.range(F.nibbleGap); ev.push('nibble'); }
        this.bob = this.nibbleT > 0 ? 0.35 : 0;
        if (this.wait <= 0) { this.biteT = F.bite; this.bob = 1; ev.push('bite'); }
        break;
      case 'fight': {
        const f = this.fish!;
        this.runIn -= dt;
        if (this.running) { this.runT -= dt; if (this.runT <= 0) { this.running = false; this.runIn = this.range(F.runGap); } }
        else if (this.runIn <= 0) { this.running = true; this.runT = this.range(F.runFor); ev.push('run'); }
        if (this.holding) {
          this.line -= F.reel * (1.15 - 0.35 * f.fight) * (this.running ? 0.3 : 1) * dt;
          this.tension += (this.running ? F.tightRun : F.tight) * f.fight * dt;
          ev.push('reel');
        } else {
          this.tension = Math.max(0, this.tension - F.ease * dt);
          this.line += F.slack * f.fight * (this.running ? 3 : 1) * dt;
        }
        if (this.tension >= 1) { this.phase = 'lost'; this.why = 'snap'; this.afterT = F.after; ev.push('snap'); }
        else if (this.line > F.away) { this.phase = 'lost'; this.why = 'away'; this.afterT = F.after; ev.push('away'); }
        else if (this.line <= 0) { this.line = 0; this.phase = 'caught'; this.afterT = F.after; ev.push('caught'); }
        break;
      }
    }
    return ev;
  }
}
