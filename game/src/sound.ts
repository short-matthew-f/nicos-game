// Sound: all synthesised (no files to load). Safari only allows audio after a tap, so the
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

/** The little sound effects, by name. */
const effects = {
  kick: () => { audio.noise(0.09, 0.5, 900); audio.tone('sine', 160, 70, 0.1, 0.25); },
  coin: () => { audio.tone('square', 988, 988, 0.08, 0.06); audio.tone('square', 1319, 1319, 0.22, 0.06, 0.08); },
  goal: () => { [523, 659, 784, 1047].forEach((f, i) => audio.tone('triangle', f, f, 0.18, 0.12, i * 0.09)); },
  quack: () => { audio.tone('sawtooth', 520, 260, 0.13, 0.05); audio.tone('sawtooth', 480, 240, 0.12, 0.04, 0.16); },
  honk: () => { audio.tone('square', 392, 392, 0.22, 0.05); audio.tone('square', 330, 330, 0.22, 0.05); },
  tap: () => audio.tone('sine', 660, 880, 0.06, 0.06),
  splash: () => audio.noise(0.3, 0.25, 2400),
  flap: () => { audio.noise(0.18, 0.18, 3200); audio.noise(0.14, 0.12, 2600); },
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
