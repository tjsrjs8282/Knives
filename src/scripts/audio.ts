/**
 * Web Audio engine. Three buses:
 *   sfx + ambience (the "sound" switch) — ElevenLabs effects and a mansion bed
 *   music (the BGM button) — an original theme, routed through an analyser so
 *   the HUD equaliser shows real levels instead of the 2020 CSS loop.
 * Everything is generated for this project (scripts/sfx.mjs).
 */
export type Sfx = "hover" | "select" | "open" | "close" | "page" | "thunk" | "shing" | "lens" | "shutter" | "stamp" | "typing" | "enter";

const GAIN: Record<Sfx, number> = {
  hover: 0.5,
  select: 1.1,
  open: 0.9,
  close: 0.8,
  page: 0.9,
  thunk: 1,
  shing: 0.85,
  lens: 0.8,
  shutter: 0.9,
  stamp: 1,
  typing: 0.7,
  enter: 1,
};
const NAMES = Object.keys(GAIN) as Sfx[];
const AMBIENCE_LEVEL = 0.6;
const MUSIC_LEVEL = 0.55;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private ambBus!: GainNode;
  private musicBus!: GainNode;
  private buffers = new Map<string, AudioBuffer>();
  private loading: Promise<void> | null = null;
  private ambience: AudioBufferSourceNode | null = null;
  private music: HTMLAudioElement | null = null;
  private lastHover = 0;
  analyser: AnalyserNode | null = null;
  enabled = false;
  musicOn = false;

  /** Must run inside a user gesture the first time (autoplay policy). */
  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      this.ambBus = this.ctx.createGain();
      this.ambBus.gain.value = AMBIENCE_LEVEL;
      this.ambBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0;
      this.musicBus.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private load(): Promise<void> {
    if (this.loading) return this.loading;
    const ctx = this.ensureContext();
    this.loading = Promise.all(
      [...NAMES, "ambience"].map(async (name) => {
        try {
          const res = await fetch(`/audio/sfx/${name}.mp3`);
          this.buffers.set(name, await ctx.decodeAudioData(await res.arrayBuffer()));
        } catch {
          /* a missing sound must never break the page */
        }
      }),
    ).then(() => undefined);
    return this.loading;
  }

  /** Effects + ambience. */
  async setEnabled(on: boolean) {
    this.enabled = on;
    if (!on && !this.ctx) return;
    const ctx = this.ensureContext();
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, on ? 0.5 : 0.12);
    if (on) {
      await this.load();
      this.startAmbience();
    }
  }

  private startAmbience() {
    if (this.ambience || !this.ctx) return;
    const buf = this.buffers.get("ambience");
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(this.ambBus);
    src.start();
    this.ambience = src;
  }

  /** The BGM button. Streams the theme through an <audio> element (no 40 MB decode). */
  async setMusic(on: boolean) {
    this.musicOn = on;
    if (!on && !this.music) return;
    const ctx = this.ensureContext();
    if (!this.music) {
      const el = new Audio("/audio/theme.mp3");
      el.loop = true;
      el.preload = "auto";
      el.crossOrigin = "anonymous";
      const source = ctx.createMediaElementSource(el);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.78;
      source.connect(this.analyser).connect(this.musicBus);
      this.music = el;
    }
    const now = ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(now);
    if (on) {
      this.musicBus.gain.setTargetAtTime(MUSIC_LEVEL, now, 0.6);
      this.ambBus.gain.setTargetAtTime(AMBIENCE_LEVEL * 0.35, now, 0.8);
      await this.music.play().catch(() => {
        this.musicOn = false;
      });
    } else {
      this.musicBus.gain.setTargetAtTime(0, now, 0.25);
      this.ambBus.gain.setTargetAtTime(AMBIENCE_LEVEL, now, 1);
      const el = this.music;
      window.setTimeout(() => {
        if (!this.musicOn) el.pause();
      }, 900);
    }
    return this.musicOn;
  }

  /** A trailer is playing: everything of ours steps aside. */
  duck(on: boolean) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(on ? 0 : this.enabled ? 1 : 0, now, on ? 0.2 : 0.8);
    this.musicBus.gain.setTargetAtTime(on ? 0 : this.musicOn ? MUSIC_LEVEL : 0, now, on ? 0.2 : 0.8);
  }

  play(name: Sfx, opts: { detune?: number; volume?: number } = {}) {
    if (!this.enabled || !this.ctx) return;
    const buf = this.buffers.get(name);
    if (!buf) return;
    if (name === "hover") {
      const t = performance.now();
      if (t - this.lastHover < 80) return;
      this.lastHover = t;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.detune.value = opts.detune ?? (name === "hover" || name === "select" ? (Math.random() - 0.5) * 240 : 0);
    const g = this.ctx.createGain();
    g.gain.value = GAIN[name] * (opts.volume ?? 1);
    src.connect(g).connect(this.sfxBus);
    src.start();
  }
}

export const audio = new AudioEngine();
