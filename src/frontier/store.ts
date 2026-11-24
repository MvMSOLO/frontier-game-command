import { useEffect, useState } from "react";
import type { Mode } from "./telemetry";

export type Language = "en" | "ru";
export type Settings = {
  accent: "cyan" | "lime" | "crimson" | "gold";
  motion: number;
  sound: boolean;
  volume: number;
  haptics: boolean;
  edgeSensitivity: number;
  autoHide: number;
  opacity: number;
  miniFps: boolean;
  startMode: Mode;
  refresh: number;
  pacing: boolean;
  language: Language;
};

export const DEFAULTS: Settings = {
  accent: "cyan",
  motion: 1,
  sound: true,
  volume: 0.35,
  haptics: true,
  edgeSensitivity: 40,
  autoHide: 0,
  opacity: 0.9,
  miniFps: true,
  startMode: "balanced",
  refresh: 120,
  pacing: true,
  language: "en",
};

const SETTINGS_EVENT = "frontier:settings-changed";

function normalizeSettings(value: unknown): Settings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULTS;
  const candidate = value as Partial<Settings>;
  return {
    ...DEFAULTS,
    ...candidate,
    language: candidate.language === "ru" ? "ru" : "en",
    volume: typeof candidate.volume === "number" ? Math.min(1, Math.max(0, candidate.volume)) : DEFAULTS.volume,
    motion: typeof candidate.motion === "number" ? Math.min(2, Math.max(0, candidate.motion)) : DEFAULTS.motion,
  };
}

function readSettings(): Settings {
  try {
    const stored = typeof localStorage === "undefined" ? null : localStorage.getItem("frontier.settings");
    return stored ? normalizeSettings(JSON.parse(stored) as unknown) : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    setSettings(readSettings());
    const handleSettingsChanged = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      setSettings(normalizeSettings(detail));
    };
    window.addEventListener(SETTINGS_EVENT, handleSettingsChanged);
    return () => window.removeEventListener(SETTINGS_EVENT, handleSettingsChanged);
  }, []);

  const update = (patch: Partial<Settings>) => {
    const next = normalizeSettings({ ...settings, ...patch });
    setSettings(next);
    try {
      localStorage.setItem("frontier.settings", JSON.stringify(next));
    } catch {
      // Private browsing or storage quota can disable persistence.
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: next }));
    }
  };

  return [settings, update] as const;
}
