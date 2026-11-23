// Real-time microphone voice processor built on Web Audio.
export type VoicePreset = "off" | "robot" | "titan" | "spectre" | "radio" | "alien";
export type VoiceParams = { preset: VoicePreset; tone: number; mod: number; echo: number; monitor: boolean; gain: number };
export const PRESETS: Record<Exclude<VoicePreset, "off">, Partial<VoiceParams>> = {
  robot: { tone: 0, mod: 50, echo: 15 }, titan: { tone: -10, mod: 0, echo: 25 }, spectre: { tone: 6, mod: 0, echo: 60 },
  radio: { tone: 10, mod: 0, echo: 0 }, alien: { tone: 8, mod: 85, echo: 30 },
};
export class VoiceEngine {
  ctx: AudioContext | null = null; stream: MediaStream | null = null; analyser: AnalyserNode | null = null;
  private n: { inGain: GainNode; low: BiquadFilterNode; high: BiquadFilterNode; band: BiquadFilterNode; lfoAmt: GainNode; wet: GainNode; fb: GainNode } | null = null;
  private out: GainNode | null = null; private lfo: OscillatorNode | null = null;
  latency = 0;
  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } });
    const c = (this.ctx = new AudioContext({ latencyHint: "interactive" }));
    const src = c.createMediaStreamSource(this.stream);
    const inGain = c.createGain();
    const low = c.createBiquadFilter(); low.type = "lowshelf"; low.frequency.value = 300;
    const high = c.createBiquadFilter(); high.type = "highshelf"; high.frequency.value = 2500;
    const band = c.createBiquadFilter(); band.type = "allpass";
    const ring = c.createGain(); ring.gain.value = 1;
    const lfo = c.createOscillator(); lfo.frequency.value = 50; const lfoAmt = c.createGain(); lfoAmt.gain.value = 0;
    lfo.connect(lfoAmt).connect(ring.gain); lfo.start(); this.lfo = lfo;
    const dry = c.createGain(); const delay = c.createDelay(1); delay.delayTime.value = 0.18;
    const fb = c.createGain(); fb.gain.value = 0; const wet = c.createGain(); wet.gain.value = 0;
    const out = c.createGain(); out.gain.value = 0;
    const an = c.createAnalyser(); an.fftSize = 512;
    src.connect(inGain).connect(low).connect(high).connect(band).connect(ring);
    ring.connect(dry).connect(an); ring.connect(delay); delay.connect(fb).connect(delay); delay.connect(wet).connect(an);
    an.connect(out).connect(c.destination);
    this.n = { inGain, low, high, band, lfoAmt, wet, fb };
    this.out = out; this.analyser = an;
    this.latency = Math.round(((c.baseLatency || 0) + ((c as AudioContext & { outputLatency?: number }).outputLatency || 0)) * 1000);
  }
  apply(p: VoiceParams) {
    const c = this.ctx; const n = this.n; if (!c || !n) return;
    const t = c.currentTime;
    const off = p.preset === "off";
    n.inGain.gain.setTargetAtTime(p.gain / 50, t, 0.02);
    n.low.gain.setTargetAtTime(off ? 0 : -p.tone * 1.2, t, 0.02);
    n.high.gain.setTargetAtTime(off ? 0 : p.tone * 1.2, t, 0.02);
    if (!off && p.preset === "radio") { n.band.type = "bandpass"; n.band.frequency.value = 1500; n.band.Q.value = 1.2; }
    else n.band.type = "allpass";
    n.lfoAmt.gain.setTargetAtTime(off ? 0 : p.mod / 100, t, 0.02);
    if (this.lfo) this.lfo.frequency.setTargetAtTime(30 + p.mod * 1.5, t, 0.02);
    n.wet.gain.setTargetAtTime(off ? 0 : p.echo / 140, t, 0.02);
    n.fb.gain.setTargetAtTime(off ? 0 : p.echo / 200, t, 0.02);
    this.out?.gain.setTargetAtTime(p.monitor ? 1 : 0, t, 0.02);
  }
  level() {
    if (!this.analyser) return 0; const d = new Uint8Array(this.analyser.fftSize); this.analyser.getByteTimeDomainData(d);
    let s = 0; for (const v of d) s += ((v - 128) / 128) ** 2; return Math.min(1, Math.sqrt(s / d.length) * 4);
  }
  stop() { this.stream?.getTracks().forEach((t) => t.stop()); void this.ctx?.close(); this.ctx = null; this.analyser = null; }
}
