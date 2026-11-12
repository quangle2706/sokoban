/**
 * Tiny synthesized sound effects (Web Audio API, no audio files).
 *
 * Browsers only allow audio after a user gesture, so the AudioContext is
 * created lazily on the first key press or tap (see `unlock`). If Web Audio
 * is unavailable, every call is a silent no-op: sound is never required.
 */
export type SoundName = 'step' | 'push' | 'goal' | 'blocked' | 'undo' | 'restart' | 'win' | 'toggle';

interface Tone {
  /** Start frequency (Hz) and optional end frequency for a glide. */
  readonly freq: number;
  readonly to?: number;
  readonly type: OscillatorType;
  /** Seconds after the sound starts. */
  readonly at: number;
  readonly dur: number;
  /** Peak gain (0..1) before the master volume. */
  readonly gain: number;
}

const SOUNDS: Readonly<Record<SoundName, readonly Tone[]>> = {
  step: [{ freq: 520, to: 480, type: 'sine', at: 0, dur: 0.05, gain: 0.18 }],
  push: [
    { freq: 150, to: 110, type: 'triangle', at: 0, dur: 0.12, gain: 0.55 },
    { freq: 300, to: 240, type: 'sine', at: 0, dur: 0.06, gain: 0.15 },
  ],
  goal: [
    { freq: 150, to: 110, type: 'triangle', at: 0, dur: 0.1, gain: 0.45 },
    { freq: 660, type: 'sine', at: 0.05, dur: 0.14, gain: 0.3 },
    { freq: 880, type: 'sine', at: 0.11, dur: 0.18, gain: 0.25 },
  ],
  blocked: [{ freq: 120, to: 90, type: 'square', at: 0, dur: 0.07, gain: 0.08 }],
  undo: [{ freq: 440, to: 330, type: 'sine', at: 0, dur: 0.09, gain: 0.2 }],
  restart: [
    { freq: 392, to: 262, type: 'triangle', at: 0, dur: 0.16, gain: 0.25 },
  ],
  win: [
    { freq: 523.25, type: 'triangle', at: 0, dur: 0.18, gain: 0.35 },
    { freq: 659.25, type: 'triangle', at: 0.12, dur: 0.18, gain: 0.35 },
    { freq: 783.99, type: 'triangle', at: 0.24, dur: 0.22, gain: 0.35 },
    { freq: 1046.5, type: 'sine', at: 0.38, dur: 0.45, gain: 0.3 },
  ],
  toggle: [{ freq: 660, type: 'sine', at: 0, dur: 0.08, gain: 0.25 }],
};

const MASTER_VOLUME = 0.35;

export class SoundPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled: boolean;
  private failed = false;

  constructor(enabled: boolean) {
    this.enabled = enabled;
    const unlock = () => this.unlock();
    window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
    window.addEventListener('keydown', unlock, { capture: true, passive: true });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /** Create/resume the AudioContext; must run inside a user gesture. */
  unlock(): void {
    if (!this.enabled || this.failed) return;
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) {
          this.failed = true;
          return;
        }
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = MASTER_VOLUME;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.failed = true;
    }
  }

  play(name: SoundName): void {
    const { ctx, master } = this;
    if (!this.enabled || !ctx || !master || ctx.state !== 'running') return;
    const start = ctx.currentTime + 0.005;
    for (const tone of SOUNDS[name]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t0 = start + tone.at;
      const t1 = t0 + tone.dur;
      osc.type = tone.type;
      osc.frequency.setValueAtTime(tone.freq, t0);
      if (tone.to) osc.frequency.exponentialRampToValueAtTime(tone.to, t1);
      // Short attack, exponential release: no clicks.
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(tone.gain, t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t1);
      osc.connect(gain).connect(master);
      osc.start(t0);
      osc.stop(t1 + 0.02);
    }
  }
}
