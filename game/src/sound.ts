// Sound: mostly synthesised; footsteps are real recordings (public/sfx, CC0). Safari only allows audio after a tap, so the
// context starts on the first touch. One master volume with a mute switch (remembered on
// this device); the fire truck's siren gets louder the closer it is.

const MUTE_KEY = 'nico-city-muted';

class Audio {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  muted = false;
  private listeners: (() => void)[] = [];

  constructor() {
    try { this.muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* storage blocked */ }
    const start = () => {
      if (this.ctx) { void this.ctx.resume(); return; }
      try {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 1; this.master.connect(this.ctx.destination);
        for (const f of this.listeners) f();
      } catch { this.ctx = null; }
    };
    window.addEventListener('pointerdown', start);
    window.addEventListener('keydown', start);
  }
  onReady(f: () => void) { if (this.ctx) f(); else this.listeners.push(f); }
  setMuted(m: boolean) {
    this.muted = m;
    try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch { /* fine */ }
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.02);
  }

  /** A short tone: type, start/end pitch (Hz), length (s), volume, delay (s). */
  tone(type: OscillatorType, f0: number, f1: number, len: number, vol: number, delay = 0) {
    const c = this.ctx, m = this.master; if (!c || !m || this.muted) return;
    const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + len);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(m); o.start(t); o.stop(t + len + 0.02);
  }
  // ---- recorded samples (loaded once the context exists)
  private buffers = new Map<string, AudioBuffer>();
  load(names: string[], base = './sfx/') {
    this.onReady(() => { for (const n of names) if (!this.buffers.has(n))
      fetch(`${base}${n}.m4a`).then(r => r.arrayBuffer()).then(b => this.ctx!.decodeAudioData(b)).then(buf => { this.buffers.set(n, buf); }).catch(() => { /* play on without it */ }); });
  }
  /** Play a loaded sample (quietly skipped if it isn't loaded yet). rate: pitch/speed. pan: -1..1. */
  sample(name: string, vol: number, rate = 1, pan = 0) {
    const c = this.ctx, m = this.master, buf = this.buffers.get(name); if (!c || !m || !buf || this.muted) return;
    const s = c.createBufferSource(), g = c.createGain(); s.buffer = buf; s.playbackRate.value = rate; g.gain.value = vol;
    s.connect(g);
    if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(m); } else g.connect(m);
    s.start();
  }
  /** A loop of soft noise through a filter, for wind in the leaves and waves (gain starts at 0). */
  bed(type: BiquadFilterType, freq: number, q = 0.7): { gain: GainNode; filter: BiquadFilterNode } | null {
    const c = this.ctx, m = this.master; if (!c || !m) return null;
    const n = c.sampleRate * 4, buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    let b = 0; for (let i = 0; i < n; i++) { b = 0.97 * b + 0.03 * (Math.random() * 2 - 1); d[i] = b * 6; }   // (soft brown-ish noise)
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; s.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = 0;
    s.connect(f); f.connect(g); g.connect(m); s.start();
    return { gain: g, filter: f };
  }
  /** A bird's note: a quick sweep with a little warble, at `delay` s. */
  chirp(f0: number, f1: number, len: number, vol: number, delay = 0, pan = 0) {
    const c = this.ctx, m = this.master; if (!c || !m || this.muted) return;
    const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + len);
    lfo.frequency.value = 38 + Math.random() * 20; lg.gain.value = f0 * 0.04; lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + len * 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g);
    if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(m); } else g.connect(m);
    o.start(t); lfo.start(t); o.stop(t + len + 0.02); lfo.stop(t + len + 0.02);
  }
  /** A short burst of filtered noise (thumps, splashes). */
  noise(len: number, vol: number, freq: number) {
    const c = this.ctx, m = this.master; if (!c || !m || this.muted) return;
    const n = Math.floor(c.sampleRate * len), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    // fade in over 6 ms: a burst that starts at full volume clicks
    const t = c.currentTime;
    s.buffer = buf; f.type = 'lowpass'; f.frequency.value = freq; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.006);
    s.connect(f); f.connect(g); g.connect(m); s.start();
  }
}

export const audio = new Audio();

/** A gentle car horn: two notes a third apart, square waves through a soft filter. */
function horn(delay: number) {
  const c = audio.ctx, m = audio.master; if (!c || !m || audio.muted) return;
  const t = c.currentTime + delay, f = c.createBiquadFilter(), g = c.createGain();
  f.type = 'lowpass'; f.frequency.value = 1300; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.045, t + 0.02);
  g.gain.setValueAtTime(0.045, t + 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.21);
  for (const hz of [415, 523]) { const o = c.createOscillator(); o.type = 'square'; o.frequency.value = hz; o.connect(f); o.start(t); o.stop(t + 0.23); }
  f.connect(g); g.connect(m);
}

/** The little sound effects, by name. */
const effects = {
  kick: () => { audio.noise(0.09, 0.5, 900); audio.tone('sine', 160, 70, 0.1, 0.25); },
  coin: () => { audio.tone('square', 988, 988, 0.08, 0.06); audio.tone('square', 1319, 1319, 0.22, 0.06, 0.08); },
  goal: () => { [523, 659, 784, 1047].forEach((f, i) => audio.tone('triangle', f, f, 0.18, 0.12, i * 0.09)); },
  quack: () => { audio.tone('sawtooth', 520, 260, 0.13, 0.05); audio.tone('sawtooth', 480, 240, 0.12, 0.04, 0.16); },
  honk: () => { for (const d of [0, 0.26]) horn(d); },   // a polite double toot
  tap: () => audio.tone('sine', 660, 880, 0.06, 0.06),
  purr: () => { audio.noise(0.9, 0.12, 200); audio.tone('sine', 55, 50, 0.9, 0.05); },   // the cat
  thud: () => { audio.noise(0.22, 0.35, 260); audio.tone('sine', 110, 50, 0.22, 0.2); },   // something heavy lands
  splash: () => audio.noise(0.3, 0.25, 2400),
  flap: () => { audio.noise(0.18, 0.18, 3200); audio.noise(0.14, 0.12, 2600); },
  // the beach
  shell: () => { audio.tone('sine', 1568, 1568, 0.12, 0.07); audio.tone('sine', 2093, 2093, 0.2, 0.06, 0.07); },
  beep: (level = 1) => audio.tone('square', 700 + level * 140, 700 + level * 140, 0.05, 0.035),
  dig: () => { audio.noise(0.25, 0.25, 1200); audio.noise(0.25, 0.2, 1000); },
  shutter: () => { audio.noise(0.04, 0.4, 6000); audio.noise(0.06, 0.3, 3000); },
  // the workshop
  pop: () => { audio.tone('sine', 300, 900, 0.09, 0.12); audio.noise(0.05, 0.12, 4000); },            // a box opens
  sparkle: () => { [1319, 1568, 1976, 2637].forEach((f, i) => audio.tone('triangle', f, f, 0.16, 0.06, i * 0.06)); },   // a rare find
  lift: () => audio.tone('sine', 520, 700, 0.05, 0.05),                                                   // picked up a part
  snap: () => { audio.noise(0.04, 0.35, 5000); audio.tone('square', 1200, 900, 0.04, 0.04); },           // a part clicks in
  boing: () => audio.tone('sine', 420, 140, 0.32, 0.12),                                                  // wrong spot / fell short
  roll: () => audio.noise(1.4, 0.06, 500),                                                                // wheels on the ramp
  door: () => { audio.noise(0.7, 0.12, 900); audio.tone('sawtooth', 90, 140, 0.6, 0.02); },              // roll-up door
  cheer: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => audio.tone('triangle', f, f, 0.22, 0.12, i * 0.08)); audio.noise(0.6, 0.08, 3000); },
  cash: (n = 3) => { for (let i = 0; i < Math.min(n, 8); i++) { audio.tone('square', 988, 988, 0.06, 0.04, i * 0.07); audio.tone('square', 1319, 1319, 0.12, 0.04, i * 0.07 + 0.05); } },
};
/** How many times each effect has played (for tests, and for hunting down a noisy one). */
export const played: Record<string, number> = {};
export const sfx = Object.fromEntries(Object.entries(effects).map(([k, f]) =>
  [k, (...a: unknown[]) => { played[k] = (played[k] ?? 0) + 1; (f as (...a: unknown[]) => void)(...a); }])) as typeof effects;

export class Siren {
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private t = 0;

  constructor() {
    audio.onReady(() => {
      const c = audio.ctx!, m = audio.master!;
      this.gain = c.createGain(); this.gain.gain.value = 0; this.gain.connect(m);
      this.osc = c.createOscillator(); this.osc.type = 'triangle'; this.osc.connect(this.gain); this.osc.start();
    });
  }

  /** `dist`: how far the truck is from the middle of the screen (world px); null = silent. */
  update(dt: number, dist: number | null) {
    const c = audio.ctx;
    if (!c || !this.osc || !this.gain) return;
    this.t += dt;
    const vol = dist === null ? 0 : 0.09 * Math.max(0, 1 - dist / 1400) ** 2;
    const now = c.currentTime;
    this.gain.gain.setTargetAtTime(vol, now, 0.1);
    // nee-naw: two tones, half a second each
    this.osc.frequency.setTargetAtTime(Math.floor(this.t * 2) % 2 ? 660 : 880, now, 0.02);
  }
}

// ---- footsteps: real recordings, one set per surface (step_<set>_<0-4>.m4a)
const STEP_SET: Record<string, string> = { concrete: 'concrete', grass: 'grass', sand: 'snow', wood: 'wood' };   // (snow crunch sounds like sand)
audio.load(Object.values(STEP_SET).flatMap(s => [0, 1, 2, 3, 4].map(i => `step_${s}_${i}`)));
let lastStep = -1;
export function footstep(surface: string, vol = 0.35) {
  let i = Math.floor(Math.random() * 5); if (i === lastStep) i = (i + 1) % 5; lastStep = i;
  played.step = (played.step ?? 0) + 1; played[`step_${surface}`] = (played[`step_${surface}`] ?? 0) + 1;
  audio.sample(`step_${STEP_SET[surface] ?? 'concrete'}_${i}`, vol * (surface === 'grass' ? 1.3 : 1), 0.92 + Math.random() * 0.16);
}

// ---- the world's own sounds: birds by day (owls and crickets at night), the wind in the trees,
// waves on the beach. Ambience.update is told where Nico is and what's round him.
export interface Around { trees: number; shore: number; forest: boolean; dark: number; inside: boolean }
const SONGS: ((pan: number) => void)[] = [
  pan => { for (let i = 0; i < 2; i++) audio.chirp(3800, 2600, 0.11, 0.035, i * 0.16, pan); },                       // tweet-tweet
  pan => { for (let i = 0; i < 6; i++) audio.chirp(4200 + (i % 2) * 300, 3900, 0.05, 0.025, i * 0.06, pan); },       // a trill
  pan => { audio.chirp(2400, 3600, 0.18, 0.03, 0, pan); audio.chirp(3600, 2200, 0.22, 0.03, 0.22, pan); },           // a whistle up and down
  pan => { [3000, 3400, 2800, 3600].forEach((f, i) => audio.chirp(f, f * 1.15, 0.08, 0.028, i * 0.11, pan)); },     // a little warble
];
export class Ambience {
  private wind: { gain: GainNode; filter: BiquadFilterNode } | null = null;
  private waves: { gain: GainNode; filter: BiquadFilterNode } | null = null;
  private birdIn = 2; private owlIn = 6; private cricketIn = 1; private t = 0;
  constructor() { audio.onReady(() => { this.wind = audio.bed('bandpass', 1400, 0.6); this.waves = audio.bed('lowpass', 420); }); }
  update(dt: number, a: Around) {
    const c = audio.ctx; if (!c) return;
    this.t += dt;
    const now = c.currentTime, out = a.inside ? 0 : 1;
    // leaves rustling: louder among trees, in gusts
    const gust = 0.55 + 0.45 * Math.sin(this.t * 0.37) * Math.sin(this.t * 0.11 + 1);
    this.wind?.gain.gain.setTargetAtTime(out * Math.min(1, a.trees / 6) * 0.05 * gust, now, 0.4);
    this.wind?.filter.frequency.setTargetAtTime(1100 + 700 * gust, now, 0.4);
    // waves: a slow swell near the shore
    const swell = 0.5 + 0.5 * Math.sin(this.t * 0.8);
    this.waves?.gain.gain.setTargetAtTime(out * Math.max(0, 1 - a.shore / 700) * (0.03 + 0.07 * swell), now, 0.3);
    if (!out) return;
    // birds sing by day (more of them among trees), owls hoot and crickets chirp at night
    if (a.dark < 0.5) {
      if ((this.birdIn -= dt * (0.6 + Math.min(1, a.trees / 4))) <= 0) {
        this.birdIn = 2.5 + Math.random() * 5;
        played.bird = (played.bird ?? 0) + 1;
        SONGS[Math.floor(Math.random() * SONGS.length)](Math.random() * 1.4 - 0.7);
      }
    } else {
      if (a.forest && (this.owlIn -= dt) <= 0) {
        this.owlIn = 7 + Math.random() * 8; played.owl = (played.owl ?? 0) + 1;
        const pan = Math.random() * 1.2 - 0.6;
        audio.chirp(400, 370, 0.35, 0.05, 0, pan); audio.chirp(390, 360, 0.55, 0.05, 0.5, pan);   // hoo... hoooo
      }
      if ((this.cricketIn -= dt) <= 0) {
        this.cricketIn = 0.6 + Math.random() * 0.8;
        for (let i = 0; i < 3; i++) audio.tone('sine', 4600, 4500, 0.03, 0.008, i * 0.05);
      }
    }
  }
}
