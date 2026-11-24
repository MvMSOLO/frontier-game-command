import { useEffect, useState } from "react";
import type { Mode } from "./telemetry";
export type Settings = { language: "en" | "ru"; autoDetect: boolean;
  accent: "cyan" | "lime" | "crimson" | "gold"; motion: number; sound: boolean; volume: number; haptics: boolean;
  edgeSensitivity: number; autoHide: number; opacity: number; miniFps: boolean; startMode: Mode; refresh: number; pacing: boolean;
};
export const DEFAULTS: Settings = { language: "en", autoDetect: true, accent: "cyan", motion: 1, sound: true, volume: 0.35, haptics: true, edgeSensitivity: 40,
  autoHide: 0, opacity: 0.9, miniFps: true, startMode: "balanced", refresh: 120, pacing: true };
export function useSettings() {
  const [s, setS] = useState<Settings>(DEFAULTS);
  useEffect(() => { try { const r = localStorage.getItem("frontier.settings"); if (r) setS({ ...DEFAULTS, ...JSON.parse(r) }); } catch { /* ignore */ } }, []);
  const update = (p: Partial<Settings>) => setS((o) => { const n = { ...o, ...p }; try { localStorage.setItem("frontier.settings", JSON.stringify(n)); } catch { /* ignore */ } return n; });
  return [s, update] as const;
}
