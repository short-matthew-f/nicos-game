// Sound: Safari only allows audio after a tap, so the context starts on the first touch.
// For now there's just the fire truck's siren, louder the closer it is.

export class Siren {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private t = 0;

  constructor() {
    const start = () => {
      if (this.ctx) { void this.ctx.resume(); return; }
      try {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AC();
        this.gain = this.ctx.createGain(); this.gain.gain.value = 0; this.gain.connect(this.ctx.destination);
        this.osc = this.ctx.createOscillator(); this.osc.type = 'triangle'; this.osc.connect(this.gain); this.osc.start();
      } catch { this.ctx = null; }
    };
    window.addEventListener('pointerdown', start);
    window.addEventListener('keydown', start);
  }

  /** `dist`: how far the truck is from the middle of the screen (world px); null = silent. */
  update(dt: number, dist: number | null) {
    if (!this.ctx || !this.osc || !this.gain) return;
    this.t += dt;
    const vol = dist === null ? 0 : 0.09 * Math.max(0, 1 - dist / 1400) ** 2;
    const now = this.ctx.currentTime;
    this.gain.gain.setTargetAtTime(vol, now, 0.1);
    // nee-naw: two tones, half a second each
    this.osc.frequency.setTargetAtTime(Math.floor(this.t * 2) % 2 ? 660 : 880, now, 0.02);
  }
}
