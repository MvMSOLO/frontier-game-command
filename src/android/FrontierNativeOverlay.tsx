import { useEffect, useMemo, useState } from "react";
import { Activity, Gamepad2, Gauge, Mic2, Settings2, Wrench, Minimize2, Power, Shield, Cpu, Wifi, Sparkles } from "lucide-react";
import { getPlatformAdapter } from "../frontier/platform";
import { useSettings } from "../frontier/store";
import type { Mode } from "../frontier/telemetry";

type Section = "home" | "performance" | "tools" | "voice" | "settings";
const SECTIONS: Array<{ id: Section; label: string; Icon: typeof Activity }> = [
  { id: "home", label: "CORE", Icon: Activity },
  { id: "performance", label: "PERF", Icon: Gauge },
  { id: "tools", label: "TOOLS", Icon: Wrench },
  { id: "voice", label: "VOICE", Icon: Mic2 },
  { id: "settings", label: "SETUP", Icon: Settings2 },
];
const MODES: Array<{ id: Mode; title: string; subtitle: string; accent: string }> = [
  { id: "stealth", title: "STEALTH", subtitle: "Power-conscious profile", accent: "lime" },
  { id: "balanced", title: "BALANCED", subtitle: "Default profile preference", accent: "cyan" },
  { id: "hyper", title: "HYPER-SMOOTH", subtitle: "Smoothness preference", accent: "magenta" },
  { id: "overdrive", title: "OVERDRIVE", subtitle: "High-priority profile preference", accent: "gold" },
];

export function FrontierNativeOverlay() {
  const adapter = useMemo(() => getPlatformAdapter(), []);
  const [settings, updateSettings] = useSettings();
  const [section, setSection] = useState<Section>("home");
  const [foregroundGame, setForegroundGame] = useState<{ id: string; name: string; packageName: string } | null>(null);
  const [gameAccess, setGameAccess] = useState<"available" | "permission-required" | "unsupported">("unsupported");

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const game = await adapter.getForegroundGame();
      if (!active) return;
      setForegroundGame(game);
    };
    void adapter.getInstalledGames().then((discovery) => {
      if (active) setGameAccess(discovery.availability);
    });
    void refresh();
    const timer = window.setInterval(() => void adapter.getForegroundGame().then((game) => {
      if (active) setForegroundGame(game);
    }), 2200);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [adapter]);

  const minimize = () => window.FrontierAndroid?.minimizeOverlay?.();
  const stop = () => window.FrontierAndroid?.stopOverlay?.();

  return (
    <main className="frontier-native-overlay" aria-label="FRONTIER left-edge game overlay">
      <header className="frontier-native-header">
        <div className="frontier-native-brand">
          <span className="frontier-native-mark">F<span>/</span></span>
          <div>
            <strong>FRONTIER</strong>
            <small>LEFT CONTROL SYSTEM</small>
          </div>
        </div>
        <div className="frontier-native-header-actions">
          <button type="button" aria-label="Minimize overlay" title="Minimize overlay" onClick={minimize}><Minimize2 size={15} /></button>
          <button type="button" aria-label="Stop overlay" title="Stop overlay" onClick={stop}><Power size={15} /></button>
        </div>
      </header>

      <div className="frontier-native-layout">
        <nav className="frontier-native-nav" aria-label="FRONTIER sections">
          {SECTIONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={section === id ? "is-active" : ""}
              aria-current={section === id ? "page" : undefined}
              onClick={() => setSection(id)}
            >
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <section className="frontier-native-content" aria-live="polite">
          {section === "home" && (
            <div className="frontier-native-page">
              <div className="frontier-native-kicker">01 / ACTIVE CONTEXT</div>
              <h1>GAME<br /><span>CONTEXT</span></h1>
              <div className="frontier-native-game-card">
                <div className="frontier-native-game-icon"><Gamepad2 size={23} /></div>
                <div className="frontier-native-game-copy">
                  <small>FOREGROUND GAME</small>
                  <strong>{foregroundGame?.name ?? "NO GAME DETECTED"}</strong>
                  <span>{foregroundGame ? foregroundGame.packageName : gameAccess === "permission-required" ? "USAGE ACCESS REQUIRED" : "OPEN A SUPPORTED GAME"}</span>
                </div>
                <span className={foregroundGame ? "frontier-native-live-dot" : "frontier-native-idle-dot"} />
              </div>
              <div className="frontier-native-metrics">
                <div><span>CPU / GPU</span><strong>—</strong><small>NATIVE REQUIRED</small></div>
                <div><span>GAME FPS</span><strong>—</strong><small>NATIVE REQUIRED</small></div>
                <div><span>THERMAL</span><strong>—</strong><small>NATIVE REQUIRED</small></div>
              </div>
              <div className="frontier-native-info">
                <Shield size={16} />
                <p>FRONTIER stays on the left edge. Device and game metrics are not simulated as real hardware readings.</p>
              </div>
            </div>
          )}

          {section === "performance" && (
            <div className="frontier-native-page">
              <div className="frontier-native-kicker">02 / PROFILE PREFERENCE</div>
              <h1>PERFORMANCE<br /><span>PROFILES</span></h1>
              <div className="frontier-native-mode-list">
                {MODES.map((mode) => (
                  <button
                    type="button"
                    key={mode.id}
                    className={"frontier-native-mode " + (settings.startMode === mode.id ? "is-active" : "") + " accent-" + mode.accent}
                    aria-pressed={settings.startMode === mode.id}
                    onClick={() => updateSettings({ startMode: mode.id })}
                  >
                    <span className="frontier-native-mode-indicator" />
                    <span className="frontier-native-mode-copy"><strong>{mode.title}</strong><small>{mode.subtitle}</small></span>
                    <span className="frontier-native-mode-state">{settings.startMode === mode.id ? "SELECTED" : "SET"}</span>
                  </button>
                ))}
              </div>
              <div className="frontier-native-info"><Sparkles size={16} /><p>Profile preference is saved locally. Hardware tuning needs a supported device integration.</p></div>
            </div>
          )}

          {section === "tools" && (
            <div className="frontier-native-page">
              <div className="frontier-native-kicker">03 / CAPABILITY MATRIX</div>
              <h1>TACTICAL<br /><span>TOOLS</span></h1>
              <div className="frontier-native-tool-list">
                <div><Cpu size={17} /><span><strong>RAM MANAGEMENT</strong><small>Device memory controls</small></span><em>NATIVE REQUIRED</em></div>
                <div><Activity size={17} /><span><strong>TOUCH RESPONSE</strong><small>Input configuration</small></span><em>NATIVE REQUIRED</em></div>
                <div><Wifi size={17} /><span><strong>NETWORK ASSIST</strong><small>Connection diagnostics</small></span><em>NATIVE REQUIRED</em></div>
                <div><Shield size={17} /><span><strong>ZERO-DISTRACTION</strong><small>Notification controls</small></span><em>NATIVE REQUIRED</em></div>
              </div>
            </div>
          )}

          {section === "voice" && (
            <div className="frontier-native-page">
              <div className="frontier-native-kicker">04 / AUDIO SYSTEM</div>
              <h1>VOICE<br /><span>ENGINE</span></h1>
              <div className="frontier-native-voice-core"><Mic2 size={28} /><span>VOICE ROUTING</span><strong>NATIVE REQUIRED</strong></div>
              <p className="frontier-native-body-copy">The browser audio processor is not connected to another game's voice-chat input. No microphone is started from this overlay.</p>
            </div>
          )}

          {section === "settings" && (
            <div className="frontier-native-page">
              <div className="frontier-native-kicker">05 / OVERLAY CONTROL</div>
              <h1>CORE<br /><span>SETTINGS</span></h1>
              <div className="frontier-native-setting-row"><span>LEFT EDGE CONTROL</span><strong>ACTIVE</strong></div>
              <div className="frontier-native-setting-row"><span>START PROFILE</span><strong>{settings.startMode.toUpperCase()}</strong></div>
              <button type="button" className="frontier-native-action" onClick={minimize}>MINIMIZE OVERLAY <Minimize2 size={15} /></button>
              <button type="button" className="frontier-native-action is-danger" onClick={stop}>STOP OVERLAY SERVICE <Power size={15} /></button>
            </div>
          )}
        </section>
      </div>
      <footer className="frontier-native-footer"><span>FRONTIER / CORE</span><span>GAME FIRST · LEFT EDGE</span></footer>
    </main>
  );
}
