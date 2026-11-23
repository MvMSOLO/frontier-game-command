import { useEffect, useRef, useState } from "react";
export type Mode = "stealth" | "balanced" | "hyper" | "overdrive";
export type Telemetry = {
  fps: number; frameTime: number; stability: number; history: number[]; refresh: number;
  cpu: number; gpu: number; temp: number; // simulated (no web API)
  battery: number | null; charging: boolean; batteryReal: boolean;
  ping: number | null; pingReal: boolean;
};
const LOAD: Record<Mode, [number, number, number]> = {
  stealth: [22, 30, 34], balanced: [38, 48, 38], hyper: [55, 66, 41], overdrive: [78, 88, 45],
};
export function useTelemetry(mode: Mode, cap: number) {
  const [t, setT] = useState<Telemetry>({ fps: 0, frameTime: 0, stability: 100, history: Array(60).fill(0), refresh: 60,
    cpu: 30, gpu: 40, temp: 36, battery: null, charging: false, batteryReal: false, ping: null, pingReal: false });
  const frames = useRef<number[]>([]);
  const modeRef = useRef(mode); modeRef.current = mode;
  const capRef = useRef(cap); capRef.current = cap;
  useEffect(() => {
    let raf = 0, last = performance.now(), peak = 0;
    const loop = (n: number) => { frames.current.push(n - last); last = n; if (frames.current.length > 240) frames.current.shift(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    const iv = setInterval(() => {
      const f = frames.current.slice(-60); if (!f.length) return;
      const avg = f.reduce((a, b) => a + b, 0) / f.length;
      let fps = Math.round(1000 / avg);
      peak = Math.max(peak, fps);
      const sd = Math.sqrt(f.reduce((a, b) => a + (b - avg) ** 2, 0) / f.length);
      fps = Math.min(fps, capRef.current);
      const [c, g, tp] = LOAD[modeRef.current];
      const j = () => (Math.random() - 0.5) * 6;
      setT((p) => ({ ...p, fps, frameTime: +avg.toFixed(1), stability: Math.max(0, Math.round(100 - sd * 6)),
        history: [...p.history.slice(1), fps], refresh: peak > 130 ? 144 : peak > 100 ? 120 : peak > 75 ? 90 : 60,
        cpu: Math.round(p.cpu + (c + j() - p.cpu) * 0.3), gpu: Math.round(p.gpu + (g + j() - p.gpu) * 0.3),
        temp: +(p.temp + (tp - p.temp) * 0.05 + (Math.random() - 0.5) * 0.2).toFixed(1) }));
    }, 250);
    // Real battery (Battery Status API, Chromium/Android)
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean; addEventListener: (e: string, f: () => void) => void }> };
    nav.getBattery?.().then((b) => {
      const up = () => setT((p) => ({ ...p, battery: Math.round(b.level * 100), charging: b.charging, batteryReal: true }));
      up(); b.addEventListener("levelchange", up); b.addEventListener("chargingchange", up);
    }).catch(() => {});
    // Real round-trip latency to this app's server
    const ping = async () => {
      const s = performance.now();
      try { await fetch(`/favicon.ico?p=${s}`, { cache: "no-store", method: "HEAD" }); setT((p) => ({ ...p, ping: Math.round(performance.now() - s), pingReal: true })); } catch { /* offline */ }
    };
    void ping(); const pi = setInterval(ping, 3000);
    return () => { cancelAnimationFrame(raf); clearInterval(iv); clearInterval(pi); };
  }, []);
  return t;
}
