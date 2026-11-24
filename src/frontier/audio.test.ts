import { afterEach, describe, expect, it, vi } from "vitest";

import { FrontierAudioEngine, normalizeAudioVolume, SFX_EVENTS } from "./audio";

function createAudioParam() {
  return {
    value: 0,
    cancelScheduledValues: vi.fn(),
    setTargetAtTime: vi.fn(),
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
}

function createNode() {
  return {
    connect: vi.fn(function (this: ReturnType<typeof createNode>) {
      return this;
    }),
    disconnect: vi.fn(),
  };
}

function createAudioContextMock() {
  let state: AudioContextState = "suspended";

  const context = {
    get state() {
      return state;
    },
    currentTime: 0,
    sampleRate: 48_000,
    destination: createNode(),
    createGain: vi.fn(() => ({ ...createNode(), gain: createAudioParam() })),
    createDynamicsCompressor: vi.fn(() => ({
      ...createNode(),
      threshold: createAudioParam(),
      knee: createAudioParam(),
      ratio: createAudioParam(),
      attack: createAudioParam(),
      release: createAudioParam(),
    })),
    createOscillator: vi.fn(() => ({
      ...createNode(),
      frequency: createAudioParam(),
      type: "sine" as OscillatorType,
      start: vi.fn(),
      stop: vi.fn(),
      addEventListener: vi.fn(),
    })),
    createBiquadFilter: vi.fn(() => ({
      ...createNode(),
      type: "lowpass" as BiquadFilterType,
      frequency: createAudioParam(),
      Q: createAudioParam(),
    })),
    createBuffer: vi.fn((_channels: number, length: number, sampleRate: number) => ({
      duration: length / sampleRate,
      getChannelData: vi.fn(() => new Float32Array(length)),
    })),
    createBufferSource: vi.fn(() => ({
      ...createNode(),
      buffer: null as AudioBuffer | null,
      start: vi.fn(),
      stop: vi.fn(),
      addEventListener: vi.fn(),
    })),
    resume: vi.fn(async () => {
      state = "running";
    }),
    suspend: vi.fn(async () => {
      state = "suspended";
    }),
    close: vi.fn(async () => {
      state = "closed";
    }),
  };

  return context as unknown as AudioContext & typeof context;
}

describe("FRONTIER Sonic Signature audio engine", () => {
  const originalVisibility = Object.getOwnPropertyDescriptor(document, "visibilityState");

  afterEach(() => {
    if (originalVisibility) {
      Object.defineProperty(document, "visibilityState", originalVisibility);
    }
    vi.restoreAllMocks();
  });

  it("normalizes invalid and out-of-range volume values safely", () => {
    expect(normalizeAudioVolume(-2)).toBe(0);
    expect(normalizeAudioVolume(0.42)).toBe(0.42);
    expect(normalizeAudioVolume(4)).toBe(1);
    expect(normalizeAudioVolume(Number.NaN)).toBe(0.35);
    expect(normalizeAudioVolume(Number.POSITIVE_INFINITY)).toBe(0.35);
  });

  it("exposes a distinct event for each FRONTIER interaction sound", () => {
    expect(SFX_EVENTS).toHaveLength(20);
    expect(new Set(SFX_EVENTS).size).toBe(SFX_EVENTS.length);
    expect(SFX_EVENTS).toContain("mode-overdrive");
    expect(SFX_EVENTS).toContain("capture-start");
    expect(SFX_EVENTS).toContain("voice-preset");
  });

  it("does not create an AudioContext when interface sounds are muted", async () => {
    const factory = vi.fn(() => createAudioContextMock());
    const engine = new FrontierAudioEngine(factory);

    engine.setSound(false, 0.35);
    await engine.play("navigation");

    expect(factory).not.toHaveBeenCalled();
  });

  it("creates audio lazily and resumes playback after a user interaction", async () => {
    const context = createAudioContextMock();
    const factory = vi.fn(() => context);
    const engine = new FrontierAudioEngine(factory);

    await engine.play("navigation");

    expect(factory).toHaveBeenCalledTimes(1);
    expect(context.resume).toHaveBeenCalledTimes(1);
    expect(context.createOscillator).toHaveBeenCalled();
    expect(context.createDynamicsCompressor).toHaveBeenCalledTimes(1);

    await engine.dispose();
    expect(context.close).toHaveBeenCalledTimes(1);
  });

  it("suspends audio when the document becomes hidden", async () => {
    const context = createAudioContextMock();
    const engine = new FrontierAudioEngine(() => context);

    await engine.play("panel-open");
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    await Promise.resolve();

    expect(context.suspend).toHaveBeenCalledTimes(1);
    await engine.dispose();
  });
});
