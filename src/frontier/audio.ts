export type SfxEvent =
  | "edge-touch"
  | "panel-open"
  | "panel-close"
  | "navigation"
  | "toggle-on"
  | "toggle-off"
  | "mode-stealth"
  | "mode-balanced"
  | "mode-hyper"
  | "mode-overdrive"
  | "tool-start"
  | "tool-complete"
  | "tool-error"
  | "capture-start"
  | "capture-stop"
  | "replay-save"
  | "voice-start"
  | "voice-stop"
  | "voice-preset"
  | "setting-change";

export const SFX_EVENTS: readonly SfxEvent[] = [
  "edge-touch",
  "panel-open",
  "panel-close",
  "navigation",
  "toggle-on",
  "toggle-off",
  "mode-stealth",
  "mode-balanced",
  "mode-hyper",
  "mode-overdrive",
  "tool-start",
  "tool-complete",
  "tool-error",
  "capture-start",
  "capture-stop",
  "replay-save",
  "voice-start",
  "voice-stop",
  "voice-preset",
  "setting-change",
] as const;

const DEFAULT_VOLUME = 0.35;
const MAX_ACTIVE_SOURCES = 18;
const EVENT_COOLDOWNS: Partial<Record<SfxEvent, number>> = {
  "edge-touch": 90,
  navigation: 55,
  "voice-preset": 65,
  "setting-change": 75,
};

type AudioContextFactory = () => AudioContext | null;
type AudioBus = "core" | "nexus" | "power";

const WAVEFORMS: OscillatorType[] = ["sine", "triangle", "square", "sawtooth"];

export function normalizeAudioVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VOLUME;
  return Math.min(1, Math.max(0, value));
}

function browserAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  const browserWindow = window as Window & {
    webkitAudioContext?: typeof AudioContext;
  };
  const AudioContextConstructor = window.AudioContext ?? browserWindow.webkitAudioContext;
  if (!AudioContextConstructor) return null;

  try {
    return new AudioContextConstructor({ latencyHint: "interactive" });
  } catch {
    return null;
  }
}

function setParam(param: AudioParam, value: number, time: number, constant = 0.012) {
  param.cancelScheduledValues(time);
  param.setTargetAtTime(value, time, constant);
}

export class FrontierAudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private buses: Record<AudioBus, GainNode> | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private readonly activeSources = new Set<AudioScheduledSourceNode>();
  private readonly lastPlayed = new Map<SfxEvent, number>();
  private enabled = true;
  private volume = DEFAULT_VOLUME;
  private resumeInFlight: Promise<void> | null = null;
  private listenersAttached = false;

  constructor(private readonly createContext: AudioContextFactory = browserAudioContext) {}

  setSound(enabled: boolean, volume: number) {
    this.enabled = enabled;
    this.volume = normalizeAudioVolume(volume);

    if (this.master && this.context && this.context.state !== "closed") {
      const now = this.context.currentTime;
      setParam(this.master.gain, this.enabled ? this.volume : 0, now, 0.018);
    }
  }

  setVolume(volume: number) {
    this.setSound(this.enabled, volume);
  }

  async play(event: SfxEvent): Promise<void> {
    if (!this.enabled || this.volume <= 0 || this.isDocumentHidden()) return;

    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const cooldown = EVENT_COOLDOWNS[event] ?? 28;
    if (now - (this.lastPlayed.get(event) ?? Number.NEGATIVE_INFINITY) < cooldown) return;
    this.lastPlayed.set(event, now);

    const context = this.getContext();
    if (!context || context.state === "closed") return;

    try {
      if (context.state !== "running") {
        this.resumeInFlight ??= context.resume().then(() => undefined).finally(() => {
          this.resumeInFlight = null;
        });
        await this.resumeInFlight;
      }
    } catch {
      return;
    }

    if (!this.enabled || this.volume <= 0 || context !== this.context || context.state !== "running") return;

    const startAt = context.currentTime + 0.012;
    this.render(event, context, startAt);
  }

  async unlock(): Promise<boolean> {
    if (this.isDocumentHidden()) return false;
    const context = this.getContext();
    if (!context || context.state === "closed") return false;

    try {
      if (context.state !== "running") await context.resume();
      return context.state === "running";
    } catch {
      return false;
    }
  }

  async suspend(): Promise<void> {
    if (!this.context || this.context.state !== "running") return;
    try {
      await this.context.suspend();
    } catch {
      // Some mobile browsers can interrupt or close audio while changing focus.
    }
  }

  async dispose(): Promise<void> {
    this.detachLifecycleListeners();
    const context = this.context;
    this.stopActiveSources();
    this.context = null;
    this.master = null;
    this.compressor = null;
    this.buses = null;
    this.noiseBuffer = null;
    this.resumeInFlight = null;

    if (context && context.state !== "closed") {
      try {
        await context.close();
      } catch {
        // The browser may already have closed the context.
      }
    }
  }

  private getContext(): AudioContext | null {
    if (this.context && this.context.state !== "closed") return this.context;

    const context = this.createContext();
    if (!context) return null;

    try {
      const master = context.createGain();
      const compressor = context.createDynamicsCompressor();
      const core = context.createGain();
      const nexus = context.createGain();
      const power = context.createGain();

      master.gain.value = this.enabled ? this.volume : 0;
      compressor.threshold.value = -18;
      compressor.knee.value = 18;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.14;
      core.gain.value = 0.88;
      nexus.gain.value = 0.82;
      power.gain.value = 0.78;

      core.connect(master);
      nexus.connect(master);
      power.connect(master);
      master.connect(compressor);
      compressor.connect(context.destination);

      this.context = context;
      this.master = master;
      this.compressor = compressor;
      this.buses = { core, nexus, power };
      this.attachLifecycleListeners();
      return context;
    } catch {
      void context.close().catch(() => undefined);
      return null;
    }
  }

  private attachLifecycleListeners() {
    if (this.listenersAttached || typeof document === "undefined" || typeof window === "undefined") return;
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("pagehide", this.handlePageHide);
    this.listenersAttached = true;
  }

  private detachLifecycleListeners() {
    if (!this.listenersAttached || typeof document === "undefined" || typeof window === "undefined") return;
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    window.removeEventListener("pagehide", this.handlePageHide);
    this.listenersAttached = false;
  }

  private readonly handleVisibilityChange = () => {
    if (this.isDocumentHidden()) void this.suspend();
  };

  private readonly handlePageHide = () => {
    void this.suspend();
  };

  private isDocumentHidden() {
    return typeof document !== "undefined" && document.visibilityState === "hidden";
  }

  private stopActiveSources() {
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {
        // A source may have already stopped naturally.
      }
    }
    this.activeSources.clear();
  }

  private trackSource(source: AudioScheduledSourceNode) {
    if (this.activeSources.size >= MAX_ACTIVE_SOURCES) {
      const oldest = this.activeSources.values().next().value as AudioScheduledSourceNode | undefined;
      if (oldest) {
        try {
          oldest.stop();
        } catch {
          // The source may already be finished.
        }
        this.activeSources.delete(oldest);
      }
    }

    this.activeSources.add(source);
    source.addEventListener("ended", () => this.activeSources.delete(source), { once: true });
  }

  private bus(name: AudioBus): GainNode {
    if (!this.buses) throw new Error("FRONTIER audio buses are not initialized");
    return this.buses[name];
  }

  private tone(
    context: AudioContext,
    bus: AudioBus,
    from: number,
    to: number,
    duration: number,
    waveform: OscillatorType,
    level: number,
    delay = 0,
    cutoff?: number,
  ) {
    if (!this.master || !this.buses || this.activeSources.size >= MAX_ACTIVE_SOURCES) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const startAt = context.currentTime + delay;
    const endAt = startAt + duration;

    oscillator.type = WAVEFORMS.includes(waveform) ? waveform : "sine";
    oscillator.frequency.setValueAtTime(Math.max(1, from), startAt);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), endAt);
    envelope.gain.setValueAtTime(0.0001, startAt);
    envelope.gain.linearRampToValueAtTime(Math.max(0.0001, level), startAt + Math.min(0.012, duration * 0.3));
    envelope.gain.exponentialRampToValueAtTime(0.0001, endAt);

    if (cutoff) {
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(cutoff, startAt);
      oscillator.connect(filter).connect(envelope).connect(this.bus(bus));
    } else {
      oscillator.connect(envelope).connect(this.bus(bus));
    }

    this.trackSource(oscillator);
    oscillator.start(startAt);
    oscillator.stop(endAt + 0.025);
  }

  private noise(context: AudioContext, bus: AudioBus, duration: number, cutoff: number, level: number, delay = 0) {
    if (!this.master || !this.buses || this.activeSources.size >= MAX_ACTIVE_SOURCES) return;

    if (!this.noiseBuffer) {
      const length = Math.max(1, Math.round(context.sampleRate * 0.45));
      this.noiseBuffer = context.createBuffer(1, length, context.sampleRate);
      const channel = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < channel.length; i += 1) channel[i] = Math.random() * 2 - 1;
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    const startAt = context.currentTime + delay;
    const endAt = startAt + Math.min(duration, this.noiseBuffer.duration);

    source.buffer = this.noiseBuffer;
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(cutoff, startAt);
    filter.Q.setValueAtTime(1.25, startAt);
    envelope.gain.setValueAtTime(0.0001, startAt);
    envelope.gain.linearRampToValueAtTime(Math.max(0.0001, level), startAt + Math.min(0.01, duration * 0.25));
    envelope.gain.exponentialRampToValueAtTime(0.0001, endAt);

    source.connect(filter).connect(envelope).connect(this.bus(bus));
    this.trackSource(source);
    source.start(startAt, 0, Math.min(duration, this.noiseBuffer.duration));
  }

  private render(event: SfxEvent, context: AudioContext, startAt: number) {
    const offset = startAt - context.currentTime;
    const tone = (
      bus: AudioBus,
      from: number,
      to: number,
      duration: number,
      waveform: OscillatorType,
      level: number,
      delay = 0,
      cutoff?: number,
    ) => this.tone(context, bus, from, to, duration, waveform, level, offset + delay, cutoff);
    const noise = (bus: AudioBus, duration: number, cutoff: number, level: number, delay = 0) =>
      this.noise(context, bus, duration, cutoff, level, offset + delay);

    switch (event) {
      case "edge-touch":
        tone("core", 1850, 2650, 0.038, "sine", 0.018);
        break;
      case "panel-open":
        noise("core", 0.17, 1650, 0.018);
        tone("core", 105, 185, 0.28, "triangle", 0.032);
        tone("core", 285, 760, 0.23, "triangle", 0.048, 0.025);
        tone("nexus", 980, 1680, 0.16, "sine", 0.022, 0.11);
        break;
      case "panel-close":
        tone("core", 760, 255, 0.2, "triangle", 0.036);
        tone("nexus", 1480, 740, 0.13, "sine", 0.016, 0.035);
        noise("core", 0.11, 720, 0.012, 0.04);
        break;
      case "navigation":
        tone("core", 940, 1280, 0.052, "sine", 0.025);
        tone("nexus", 1540, 1220, 0.038, "sine", 0.012, 0.018);
        break;
      case "toggle-on":
        tone("core", 560, 920, 0.095, "triangle", 0.042);
        tone("nexus", 1320, 1760, 0.065, "sine", 0.014, 0.025);
        break;
      case "toggle-off":
        tone("core", 920, 520, 0.09, "triangle", 0.035);
        tone("nexus", 1180, 820, 0.055, "sine", 0.012, 0.018);
        break;
      case "mode-stealth":
        tone("core", 330, 246, 0.19, "sine", 0.035);
        tone("nexus", 660, 520, 0.14, "triangle", 0.018, 0.045);
        break;
      case "mode-balanced":
        tone("core", 392, 523, 0.12, "triangle", 0.038);
        tone("nexus", 587, 784, 0.14, "sine", 0.022, 0.075);
        break;
      case "mode-hyper":
        tone("power", 520, 780, 0.12, "triangle", 0.036);
        tone("nexus", 1040, 1560, 0.15, "sine", 0.022, 0.045);
        tone("core", 2080, 1760, 0.075, "sine", 0.01, 0.11);
        break;
      case "mode-overdrive":
        tone("power", 52, 138, 0.48, "sawtooth", 0.032, 0, 280);
        noise("power", 0.24, 360, 0.02, 0.015);
        [0, 0.13, 0.26, 0.39].forEach((delay, index) => {
          tone("power", 290 + index * 95, 430 + index * 120, 0.085, "square", 0.018, delay, 1600);
        });
        tone("nexus", 1320, 1980, 0.19, "sine", 0.028, 0.43);
        break;
      case "tool-start":
        tone("core", 255, 515, 0.15, "triangle", 0.032);
        noise("nexus", 0.09, 2100, 0.012, 0.018);
        break;
      case "tool-complete":
        tone("core", 494, 659, 0.105, "triangle", 0.036);
        tone("nexus", 659, 988, 0.15, "sine", 0.024, 0.075);
        break;
      case "tool-error":
        tone("power", 310, 175, 0.18, "triangle", 0.042);
        tone("nexus", 520, 390, 0.12, "sine", 0.018, 0.04);
        break;
      case "capture-start":
        tone("core", 660, 880, 0.09, "sine", 0.035);
        tone("nexus", 990, 1320, 0.1, "sine", 0.022, 0.08);
        break;
      case "capture-stop":
        tone("core", 880, 590, 0.12, "triangle", 0.033);
        tone("nexus", 660, 440, 0.12, "sine", 0.018, 0.055);
        break;
      case "replay-save":
        tone("core", 440, 660, 0.09, "triangle", 0.032);
        tone("nexus", 880, 1320, 0.13, "sine", 0.023, 0.075);
        tone("power", 1760, 1320, 0.08, "sine", 0.01, 0.17);
        break;
      case "voice-start":
        tone("nexus", 390, 780, 0.18, "triangle", 0.032);
        tone("core", 1170, 1560, 0.12, "sine", 0.019, 0.07);
        break;
      case "voice-stop":
        tone("nexus", 780, 390, 0.16, "triangle", 0.028);
        tone("core", 1170, 780, 0.1, "sine", 0.014, 0.05);
        break;
      case "voice-preset":
        tone("nexus", 720, 1040, 0.075, "triangle", 0.028);
        tone("core", 1440, 1180, 0.06, "sine", 0.012, 0.035);
        break;
      case "setting-change":
        tone("core", 820, 1040, 0.052, "sine", 0.02);
        break;
    }
  }
}

const engine = new FrontierAudioEngine();

export function playSfx(event: SfxEvent) {
  void engine.play(event);
}

export function unlockAudio() {
  return engine.unlock();
}

export function setSound(enabled: boolean, volume: number) {
  engine.setSound(enabled, volume);
}

export function setHaptics(on: boolean) {
  hapticsOn = on;
}

let hapticsOn = true;

export function haptic(pattern: number | number[] = 8) {
  if (!hapticsOn || typeof navigator === "undefined") return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Vibration is optional and may be denied by the browser or device.
  }
}
