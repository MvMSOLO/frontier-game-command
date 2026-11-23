// Synthesized UI sound engine (Web Audio). All sounds are generated, no samples.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let volume = 0.35;

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}
export function setSound(on: boolean, vol: number) {
  enabled = on; volume = vol;
  if (master) master.gain.value = vol;
}
function tone(f0: number, f1: number, dur: number, type: OscillatorType = "sine", gain = 0.2, delay = 0) {
  const c = ac(); if (!c || !master || !enabled) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur: number, freq: number, gain = 0.1, delay = 0) {
  const c = ac(); if (!c || !master || !enabled) return;
  const t = c.currentTime + delay;
  const b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(); s.buffer = b;
  const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 4;
  const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(master); s.start(t);
}
export const sfx = {
  edge: () => tone(1800, 2600, 0.05, "sine", 0.08),
  open: () => { noise(0.25, 1200, 0.05); tone(220, 880, 0.22, "triangle", 0.12); tone(1320, 1760, 0.12, "sine", 0.06, 0.12); },
  close: () => { tone(880, 180, 0.2, "triangle", 0.1); noise(0.15, 600, 0.04); },
  nav: () => tone(1200, 1500, 0.06, "square", 0.04),
  mode: () => { tone(440, 660, 0.12, "triangle", 0.1); tone(660, 990, 0.14, "sine", 0.08, 0.08); },
  overdrive: () => {
    tone(60, 220, 0.9, "sawtooth", 0.08); noise(0.9, 300, 0.05);
    [0, 0.15, 0.3, 0.45].forEach((d, i) => tone(400 + i * 200, 600 + i * 300, 0.12, "square", 0.04, d));
    tone(1760, 2640, 0.3, "sine", 0.08, 0.7);
  },
  toggleOn: () => tone(900, 1400, 0.07, "sine", 0.08),
  toggleOff: () => tone(1100, 600, 0.07, "sine", 0.06),
  exec: () => { noise(0.4, 2400, 0.06); tone(300, 1200, 0.35, "triangle", 0.08); tone(1500, 1500, 0.08, "sine", 0.06, 0.38); },
};
let hapticsOn = true;
export function setHaptics(on: boolean) { hapticsOn = on; }
export function haptic(ms = 8) { if (!hapticsOn) return; try { navigator.vibrate?.(ms); } catch { /* unsupported */ } }
