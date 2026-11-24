import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { haptic, playSfx } from "./audio";
import type { Mode, Telemetry } from "./telemetry";
import type { Settings } from "./store";
import { Label, Ring, Seg, Slider, Src, Toggle } from "./ui";
import * as Ic from "./icons";
import { PerformanceArtwork } from "./components/Artwork";
import { PRESETS, VoiceEngine, type VoiceParams, type VoicePreset } from "./voice";
import { useText } from "./i18n";

export const item = { hidden: { opacity: 0, y: 11, scale: 0.985 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 360, damping: 27, mass: 0.72 } } };
export const list = { hidden: {}, show: { transition: { staggerChildren: 0.045, delayChildren: 0.035 } } };

export const MODES: Record<Mode, { name: string; tag: string; color: string; icon: typeof Ic.IHome; target: string; bullets: string[] }> = {
  stealth: { name: "Stealth", tag: "Thermal guard", color: "var(--lime)", icon: Ic.IStealth, target: "45–60", bullets: ["Battery preservation", "Thermal-conscious clocks", "Background activity reduced"] },
  balanced: { name: "Balanced Sync", tag: "Adaptive", color: "var(--cyan)", icon: Ic.IBalanced, target: "60/90", bullets: ["Stable performance", "Adaptive resource allocation", "60 / 90 FPS targets"] },
  hyper: { name: "Hyper-Smooth", tag: "Frame pacing", color: "oklch(0.92 0.08 230)", icon: Ic.IHyper, target: "120", bullets: ["Frame-pacing optimization", "Reduced perceived stutter", "Smooth render cadence"] },
  overdrive: { name: "Overdrive", tag: "Max priority", color: "var(--crimson)", icon: Ic.IOverdrive, target: "144", bullets: ["Maximum performance priority", "Aggressive resource management", "Thermal ceiling raised"] },
};

function Wave({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(60, ...data) * 1.1, w = 240, h = 54;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[54px] w-full" preserveAspectRatio="none">
      {[0.25, 0.5, 0.75].map((y) => <line key={y} x1="0" x2={w} y1={h * y} y2={h * y} stroke="var(--line)" strokeDasharray="2 4" />)}
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={color} opacity=".08" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.4" style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
    </svg>
  );
}

function useCount(v: number, ms = 280) {
  const [n, setN] = useState(v);
  const displayed = useRef(v);
  useEffect(() => {
    const from = displayed.current;
    const startedAt = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const progress = ms <= 0 ? 1 : Math.min(1, (now - startedAt) / ms);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + (v - from) * eased;
      displayed.current = next;
      setN(Math.round(next));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [v, ms]);
  return n;
}
function Card({ children, className, glow = "var(--accent-fx)" }: { children: React.ReactNode; className?: string; glow?: string }) {
  return (
    <motion.div variants={item} className={cn("frontier-hud-card relative chamfer p-[1px]", className)} style={{ background: `linear-gradient(135deg, ${glow}, color-mix(in oklab, var(--magenta) 60%, transparent) 55%, color-mix(in oklab, ${glow} 30%, transparent))` }}>
      <div className="frontier-hud-card-surface relative chamfer bg-glass-strong p-2.5">{children}</div>
    </motion.div>
  );
}
function BigRing({ value, label, color, unit = "%", max = 100 }: { value: number; label: string; color: string; unit?: string; max?: number }) {
  const t = useText();
  const v = useCount(value); const size = 66, r = 27, c = 2 * Math.PI * r, arc = 0.78, pct = Math.min(1, v / max);
  return (
    <div className="frontier-hud-ring relative flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size} className="rotate-[130deg]">
        <circle cx={35} cy={35} r={r} stroke="var(--line)" strokeWidth="5" fill="none" strokeDasharray={`${c * arc} ${c}`} />
        <circle cx={35} cy={35} r={r} stroke={color} strokeWidth="5" fill="none" strokeDasharray={`${c * arc * pct} ${c}`} style={{ filter: `drop-shadow(0 0 5px ${color})`, transition: "stroke-dasharray 260ms ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-1"><span className="tnum text-[17px] font-bold leading-none">{v}<span className="text-[10px]">{unit}</span></span><span className="mt-0.5 text-[9px] font-semibold tracking-wider" style={{ color }}>{t(label)}</span></div>
    </div>
  );
}
function QT({ icon: I, label, on, onClick, color = "var(--cyan)", dot }: { icon: typeof Ic.IHome; label: string; on: boolean; onClick: () => void; color?: string; dot?: boolean }) {
  const t = useText();
  return (
    <motion.button variants={item} whileTap={{ scale: 0.92 }} onClick={onClick} aria-pressed={on}
      className="frontier-quick-tool relative flex h-[66px] flex-col items-center justify-center gap-1.5 chamfer-sm border border-line text-[11px] font-semibold leading-tight transition-colors"
      style={{ color: on ? color : "var(--foreground)", background: on ? `color-mix(in oklab, ${color} 16%, transparent)` : "color-mix(in oklab, var(--foreground) 4%, transparent)", boxShadow: on ? `inset 0 0 14px color-mix(in oklab, ${color} 35%, transparent)` : undefined }}>
      {dot && <span className="fx-pulse absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-crimson" />}
      <span style={{ color, filter: `drop-shadow(0 0 4px ${color})` }}><I width={20} height={20} /></span><span className="text-center">{t(label)}</span>
    </motion.button>
  );
}
const MODE_COL: Record<Mode, string> = { stealth: "var(--lime)", balanced: "var(--cyan)", hyper: "var(--magenta)", overdrive: "var(--gold)" };

export function HomePage({ t, mode, setMode, ts, setTs, onRecord, onToolsMore, activeGameName = null, installedGameCount = 0, installedGames = [], selectedGameIds = [], launchMessage = null, deviceSnapshot = null, onLaunchGame, androidPresentation = false }: { t: Telemetry; mode: Mode; setMode: (m: Mode) => void; ts: ToolState; setTs: (p: Partial<ToolState>) => void; onRecord: () => void; onToolsMore: () => void; activeGameName?: string | null; installedGameCount?: number; installedGames?: Array<{ id: string; name: string; packageName: string }>; selectedGameIds?: string[]; launchMessage?: string | null; deviceSnapshot?: import("./platform/native-events").NativeDeviceSnapshot | null; onLaunchGame?: (gameId: string) => void; androidPresentation?: boolean }) {
  const tx = useText();
  const fps = useCount(t.fps, 260);
  const [purged, setPurged] = useState(false);
  const tog = (k: keyof ToolState) => () => { playSfx(ts[k] ? "toggle-off" : "toggle-on"); haptic(); setTs({ [k]: !ts[k] } as Partial<ToolState>); };
  const purge = () => { playSfx("tool-start"); haptic(20); setPurged(true); setTimeout(() => { setPurged(false); playSfx("tool-complete"); }, 1600); };
  return (
    <motion.div variants={list} initial="hidden" animate="show" className="space-y-2 frontier-page frontier-page-home">
      {androidPresentation ? (
        <Card glow="var(--cyan)">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-display text-[9px] tracking-[0.16em] text-cyan">{tx("ACTIVE GAME")}</div>
              <div className="mt-1 truncate text-[14px] font-bold">{activeGameName ?? tx("No supported game detected")}</div>
              <div className="mt-1 text-[9px] text-muted-foreground">{installedGameCount} {tx("supported games installed")}</div>
            </div>
            <Src k="live" />
          </div>
          <div className="mt-3 border-t border-line/70 pt-2 text-[10px] leading-relaxed text-muted-foreground">
            {tx("Android does not expose another game's FPS, CPU or GPU to ordinary apps. No game performance values are fabricated.")}
          </div>
          {deviceSnapshot && <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-line/70 pt-3">
            <div className="rounded border border-line/60 bg-foreground/[0.025] p-2"><small className="block text-[7px] text-muted-foreground">{tx("BATTERY")}</small><strong className="mt-1 block text-[12px]">{deviceSnapshot.batteryPercent === null ? "—" : deviceSnapshot.batteryPercent + "%"}{deviceSnapshot.charging ? " +" : ""}</strong></div>
            <div className="rounded border border-line/60 bg-foreground/[0.025] p-2"><small className="block text-[7px] text-muted-foreground">{tx("THERMAL STATUS")}</small><strong className="mt-1 block text-[11px]">{tx(deviceSnapshot.thermalStatus ?? "Not supported")}</strong></div>
            <div className="rounded border border-line/60 bg-foreground/[0.025] p-2"><small className="block text-[7px] text-muted-foreground">{tx("AVAILABLE MEMORY")}</small><strong className="mt-1 block text-[11px]">{Math.round(deviceSnapshot.availableMemoryMb)} MB</strong></div>
            <div className="rounded border border-line/60 bg-foreground/[0.025] p-2"><small className="block text-[7px] text-muted-foreground">{tx("NETWORK")}</small><strong className="mt-1 block text-[11px]">{tx(deviceSnapshot.networkTransport)} · {tx(deviceSnapshot.networkValidated ? "VALIDATED" : "UNVALIDATED")}</strong></div>
          </div>}
          <div className="mt-3 border-t border-line/70 pt-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="font-display text-[8px] tracking-[0.16em] text-muted-foreground">{tx("YOUR GAME LIBRARY")}</span>
              <span className="tnum text-[9px] text-cyan">{selectedGameIds.length} {tx("SELECTED")}</span>
            </div>
            <div className="space-y-1.5">
              {installedGames.filter((game) => selectedGameIds.includes(game.id)).slice(0, 5).map((game) => (
                <div key={game.id} className="flex items-center gap-2 rounded-md border border-line/70 bg-foreground/[0.025] px-2 py-2">
                  <span className="min-w-0 flex-1 truncate text-[10px] font-semibold">{game.name}</span>
                  <button type="button" className="rounded border border-cyan/35 bg-cyan/10 px-2 py-1 text-[8px] font-display tracking-wider text-cyan" onClick={() => onLaunchGame?.(game.id)}>{tx("LAUNCH")}</button>
                </div>
              ))}
              {installedGames.filter((game) => selectedGameIds.includes(game.id)).length === 0 && (
                <p className="text-[9px] text-muted-foreground">{tx("No selected supported games are installed. Open Settings → Manage Games & Setup.")}</p>
              )}
            </div>
            {launchMessage && <p role="status" className="mt-2 text-[9px] text-cyan">{tx(launchMessage === "launched" ? "Game launch requested." : launchMessage === "not-installed" ? "This game is not installed." : launchMessage === "not-launchable" ? "Android did not provide a launch action for this game." : "Game launch is unavailable.")}</p>}
          </div>
        </Card>
      ) : <Card>
        <div className="flex items-center gap-2">
          <div className="shrink-0 leading-none">
            <div className="tnum text-[40px] font-bold leading-[0.9] text-cyan [text-shadow:0_0_18px_var(--cyan)]">{fps}</div>
            <div className="mt-0.5 flex items-center gap-1 font-display text-[11px] text-cyan">FPS <Src k="live" /></div>
          </div>
          <div className="min-w-0 flex-1"><Wave data={t.history} color="var(--cyan)" /></div>
        </div>
        <div className="mt-1 grid grid-cols-2 divide-x divide-line text-center">
          <div><div className="tnum text-[14px] font-bold text-cyan">{t.frameTime}<span className="text-[10px]">ms</span></div><div className="text-[9px] text-muted-foreground">{tx("Frame Time")}</div></div>
          <div><div className="tnum text-[14px] font-bold text-cyan">{t.stability}%</div><div className="text-[9px] text-muted-foreground">{tx("Stability")}</div></div>
        </div>
      </Card>}
      {!androidPresentation && <Card glow="var(--magenta)">
        <div className="flex items-center justify-around">
          <BigRing value={t.cpu} label="CPU" color="var(--cyan)" />
          <BigRing value={t.gpu} label="GPU" color="var(--crimson)" />
          <BigRing value={Math.round(t.temp)} label="TEMP" unit="°C" max={55} color={t.temp > 43 ? "var(--gold)" : "var(--lime)"} />
        </div>
        <div className="absolute right-2 top-1.5"><Src k="sim" /></div>
      </Card>}
      <Card>
        <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold"><span className="text-cyan"><Ic.IPerf width={14} height={14} /></span>{tx(androidPresentation ? "Overlay profile" : "Performance Mode")}</div>
        {androidPresentation && <p className="mb-2 text-[9px] leading-relaxed text-muted-foreground">{tx("Profiles change FRONTIER's own interface only; they do not boost the game or change device refresh rate.")}</p>}
        <div className="frontier-mode-grid grid grid-cols-2 gap-1.5">
          {(Object.keys(MODES) as Mode[]).map((k) => { const M = MODES[k]; const on = k === mode; const c = MODE_COL[k]; const od = k === "overdrive"; return (
            <motion.button key={k} whileTap={{ scale: 0.92 }} aria-label={tx(M.name)} aria-pressed={on} onClick={() => setMode(k)}
              className={cn("relative isolate flex h-[58px] flex-col items-center justify-center gap-1 overflow-hidden chamfer-sm border text-[9px] font-semibold leading-tight transition-colors", on ? "border-current" : "border-line")}
              style={{ color: on ? c : "var(--foreground)", background: on ? `color-mix(in oklab, ${c} 18%, transparent)` : "color-mix(in oklab, var(--foreground) 4%, transparent)", boxShadow: on ? `0 0 14px color-mix(in oklab, ${c} 50%, transparent), inset 0 0 12px color-mix(in oklab, ${c} 30%, transparent)` : undefined }}>
              <PerformanceArtwork mode={k} className="frontier-mode-art-image" /><span className="frontier-mode-art-scrim" />
              {on && od && <motion.span initial={{ x: "-100%" }} animate={{ x: "100%" }} transition={{ repeat: Infinity, duration: 1.6, ease: "linear" }} className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />}
              <span className="relative z-10" style={{ color: c, filter: `drop-shadow(0 0 4px ${c})` }}><M.icon width={18} height={18} /></span>
              <span className="relative z-10 text-center">{od ? <>FRONTIER<br />{tx("OVERDRIVE")}</> : tx(M.name.split(/[ -]/)[0] ?? M.name)}</span>
            </motion.button>); })}
        </div>
      </Card>
      {!androidPresentation && <Card glow="var(--magenta)">
        <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold"><span className="text-cyan"><Ic.ITools width={14} height={14} /></span>{tx("Quick Tools")}<button onClick={onToolsMore} className="tnum ml-auto text-[10px] text-muted-foreground">6 ›</button></div>
        <motion.div variants={list} className="frontier-quick-tools-grid grid grid-cols-2 gap-1.5">
          <QT icon={Ic.IRam} label={purged ? "Purging…" : "RAM Purge"} on={purged} onClick={purge} />
          <QT icon={Ic.ITouch} label="Touch Boost" on={ts.touch} onClick={tog("touch")} />
          <QT icon={Ic.INet} label="Ping Stabilizer" on={ts.net} onClick={tog("net")} />
          <QT icon={Ic.ICross} label="Crosshair" on={ts.crosshair} onClick={tog("crosshair")} color="var(--crimson)" />
          <QT icon={Ic.IShield} label="No Disturb" on={ts.shield} onClick={tog("shield")} color="var(--lime)" />
          <QT icon={Ic.IRec} label="Screen Recorder" on={ts.recording} onClick={onRecord} dot />
        </motion.div>
      </Card>}
      <Card glow="var(--lime)">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lime text-[14px] font-bold text-obsidian shadow-[0_0_12px_var(--lime)]">✓</span>
          <div className="min-w-0 flex-1"><div className="truncate text-[11px] font-bold text-gold">{tx(androidPresentation ? "Overlay profile active" : "Performance Optimized!")}</div><div className="truncate text-[9px] text-muted-foreground">{tx(androidPresentation ? "FRONTIER interface profile is active" : "Enjoy smoother gameplay")}</div></div>
          <span className="fx-pulse flex gap-0.5">{[0, 1, 2].map((i) => <span key={i} className="h-3 w-1.5 -skew-x-[25deg] bg-cyan" />)}</span>
        </div>
      </Card>
    </motion.div>
  );
}

export function PerformancePage({ mode, setMode, t, s, upd, androidPresentation = false }: { mode: Mode; setMode: (m: Mode) => void; t: Telemetry; s: Settings; upd: (p: Partial<Settings>) => void; androidPresentation?: boolean }) {
  const tx = useText();
  return (
    <motion.div variants={list} initial="hidden" animate="show" className="space-y-4 frontier-page frontier-page-performance">
      <motion.div variants={item}><Label right={<Src k="native" />}>Engine profile</Label></motion.div>
      <div className="space-y-1.5">
        {(Object.keys(MODES) as Mode[]).map((k) => { const M = MODES[k]; const on = k === mode; const od = k === "overdrive"; return (
          <motion.button variants={item} key={k} onClick={() => setMode(k)} whileTap={{ scale: 0.98 }}
            className={cn("frontier-mode-card relative isolate block w-full overflow-hidden chamfer p-3 text-left transition-colors", on ? "bg-foreground/[0.08]" : "bg-foreground/[0.03] hover:bg-foreground/[0.06]")}>
            <PerformanceArtwork mode={k} className="frontier-mode-art-image" /><span className="frontier-mode-art-scrim" />
            {on && <motion.span layoutId="modebar" className="absolute inset-y-0 left-0 w-[3px]" style={{ background: M.color, boxShadow: `0 0 12px ${M.color}` }} />}
            {on && od && <motion.span initial={{ x: "-100%" }} animate={{ x: "100%" }} transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }} className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-gold/15 to-transparent" />}
            <div className="relative z-10 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center chamfer-sm" style={{ color: M.color, background: `color-mix(in oklab, ${M.color} ${on ? 18 : 6}%, transparent)` }}><M.icon /></span>
              <div className="flex-1">
                <div className={cn("text-[13px] font-semibold", od && "font-display text-[11px] tracking-widest")} style={{ color: on ? M.color : undefined }}>{od ? "FRONTIER " + tx("OVERDRIVE") : tx(M.name)}</div>
                <div className="text-[10px] text-muted-foreground">{tx(M.tag)} · {tx("target")} <span className="tnum">{M.target}</span> fps</div>
              </div>
              <span className={cn("h-2 w-2 rotate-45", on ? "fx-pulse" : "opacity-20")} style={{ background: od && on ? "var(--gold)" : M.color }} />
            </div>
            <AnimatePresence>{on && (
              <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pl-12 text-[10px] text-muted-foreground">
                {M.bullets.map((b) => <li key={b} className="pt-1">› {tx(b)}</li>)}
              </motion.ul>)}</AnimatePresence>
          </motion.button>); })}
      </div>
      {androidPresentation ? (
        <motion.div variants={item} className="rounded-md border border-line/70 bg-foreground/[0.025] p-3 text-[9px] leading-relaxed text-muted-foreground">
          {tx("These profiles change FRONTIER's own presentation. Android does not grant this app permission to force another game's FPS, display refresh rate, CPU or GPU settings.")}
        </motion.div>
      ) : <>
        <motion.div variants={item} className="space-y-3">
          <Label right={<Src k="native" />}>Display</Label>
          <Seg label="Refresh rate" value={s.refresh} onChange={(v) => upd({ refresh: v })} options={[60, 90, 120, 144].map((v) => ({ v, l: `${v}Hz` }))} />
          <div className="flex items-center justify-between text-[12px]"><span>Frame pacing lock</span><Toggle label="Frame pacing" on={s.pacing} onChange={(v) => upd({ pacing: v })} /></div>
        </motion.div>
        <motion.div variants={item}>
          <Label right={<Src k="sim" />}>Thermal envelope</Label>
          <div className="relative h-2 bg-gradient-to-r from-lime via-gold to-crimson opacity-80 chamfer-sm" />
          <div className="relative h-3"><motion.span animate={{ left: `${Math.min(100, ((t.temp - 25) / 30) * 100)}%` }} className="absolute top-0 h-3 w-[2px] bg-foreground" /></div>
          <div className="tnum flex justify-between text-[9px] text-muted-foreground"><span>25°</span><span>{t.temp}°C</span><span>55°</span></div>
        </motion.div>
      </>}
    </motion.div>
  );
}

export type ToolState = { touch: boolean; net: boolean; crosshair: boolean; crossStyle: "dot" | "cross" | "ring"; crossColor: string; shield: boolean; replay: boolean; recording: boolean };

function Tile({ icon: I, name, on, onClick, src, children, color = "var(--accent-fx)" }: { icon: typeof Ic.IHome; name: string; on: boolean; onClick: () => void; src: "live" | "sim" | "native"; children?: React.ReactNode; color?: string }) {
  const tx = useText();
  return (
    <motion.div variants={item} className={cn("frontier-tool-tile relative chamfer bg-foreground/[0.03] p-2.5 transition-colors", on && "bg-foreground/[0.08]")}>
      <button onClick={onClick} aria-pressed={on} className="flex w-full items-center gap-2.5 text-left">
        <span className="relative flex h-8 w-8 items-center justify-center" style={{ color: on ? color : "var(--muted-foreground)" }}>
          <svg viewBox="0 0 32 32" className="absolute inset-0"><path d="M6 1h25v25l-5 5H1V6z" fill="none" stroke="currentColor" strokeOpacity={on ? 0.7 : 0.25} /></svg>
          <I width={16} height={16} />
        </span>
        <span className="flex-1"><span className="block text-[12px] font-semibold">{tx(name)}</span><span className="flex items-center gap-1 text-[9px] text-muted-foreground">{tx(on ? "ENGAGED" : "STANDBY")} <Src k={src} /></span></span>
        <span className="h-1.5 w-4" style={{ background: on ? color : "var(--line)", boxShadow: on ? `0 0 8px ${color}` : undefined }} />
      </button>
      {children}
    </motion.div>
  )
}

export function ToolsPage({ ts, setTs, blocked, onRecord, onReplay, onClip, recErr, goVoice, androidPresentation = false }: { ts: ToolState; setTs: (p: Partial<ToolState>) => void; blocked: number; onRecord: () => void; onReplay: () => void; onClip: () => void; recErr: string | null; goVoice: () => void; androidPresentation?: boolean }) {
  const tx = useText();
  const [purge, setPurge] = useState<"idle" | "run" | "done">("idle"); const [freed, setFreed] = useState(0);
  const runPurge = () => { if (purge === "run") return; playSfx("tool-error"); setPurge("idle"); };
  const tog = (k: keyof ToolState) => () => { playSfx(ts[k] ? "toggle-off" : "toggle-on"); haptic(); setTs({ [k]: !ts[k] } as Partial<ToolState>); };
  return (
    <motion.div variants={list} initial="hidden" animate="show" className="space-y-1.5 frontier-page frontier-page-tools">
      <motion.div variants={item}><Label>Tactical tools</Label></motion.div>
      {!androidPresentation && <>
        <Tile icon={Ic.IRam} name="RAM Purge" on={purge !== "idle"} onClick={runPurge} src="sim" color="var(--lime)">
          <div className="tnum pt-1 pl-10 text-[10px] text-gold">{tx("System-wide RAM purge is not available to normal Android apps.")}</div>
        </Tile>
        <Tile icon={Ic.ITouch} name="Touch Boost" on={false} onClick={() => playSfx("tool-error")} src="native" />
        <Tile icon={Ic.INet} name="Ping Stabilizer" on={false} onClick={() => playSfx("tool-error")} src="native" />
      </>}
      {!androidPresentation && <Tile icon={Ic.ICross} name="Pro Crosshair" on={ts.crosshair} onClick={tog("crosshair")} src="live" color="var(--crimson)">
        {ts.crosshair && <div className="space-y-2 pt-2">
          <Seg label="Crosshair style" value={ts.crossStyle} onChange={(v) => setTs({ crossStyle: v })} options={[{ v: "dot", l: "Dot" }, { v: "cross", l: "Cross" }, { v: "ring", l: "Ring" }]} />
          <div className="flex gap-2">{["var(--crimson)", "var(--lime)", "var(--cyan)", "var(--gold)"].map((c) => <button key={c} aria-label={`Color ${c}`} onClick={() => setTs({ crossColor: c })} className={cn("h-5 flex-1 chamfer-sm", ts.crossColor === c && "ring-1 ring-foreground")} style={{ background: c }} />)}</div>
        </div>}
      </Tile>}
      <Tile icon={Ic.IShield} name="Zero-Distraction" on={androidPresentation ? ts.shield : false} onClick={tog("shield")} src={androidPresentation ? "native" : "live"} color="var(--lime)">
        {ts.shield && <div className="tnum pt-1 pl-10 text-[10px] text-muted-foreground">{blocked} {tx("notifications blocked")}</div>}
      </Tile>
      {!androidPresentation && <Tile icon={Ic.IReplay} name="Instant Replay" on={ts.replay} onClick={onReplay} src="live" color="var(--gold)">
        {ts.replay && <button onClick={onClip} className="mt-2 w-full chamfer-sm bg-gold/20 py-1.5 text-[11px] font-semibold text-gold">{tx("SAVE LAST 30s")}</button>}
      </Tile>}
      <Tile icon={Ic.IRec} name="Screen Recorder" on={androidPresentation ? false : ts.recording} onClick={androidPresentation ? () => playSfx("tool-error") : onRecord} src={androidPresentation ? "native" : "live"} color="var(--crimson)" />
      {androidPresentation && <div className="text-[9px] leading-relaxed text-muted-foreground">{tx("Screen capture requires a native MediaProjection session and fresh system consent. It is not yet enabled in this build.")}</div>}
      {recErr && <div className="text-[10px] text-crimson">{tx(recErr)}</div>}
      <Tile icon={Ic.IVoice} name="Voice Changer" on={false} onClick={goVoice} src="live" />
    </motion.div>
  );
}

const PRESET_LIST: { v: VoicePreset; l: string }[] = [{ v: "off", l: "Natural" }, { v: "robot", l: "Robot" }, { v: "titan", l: "Titan" }, { v: "spectre", l: "Spectre" }, { v: "radio", l: "Comms" }, { v: "alien", l: "Xeno" }];
export function VoicePage({ engine, androidPresentation = false }: { engine: React.MutableRefObject<VoiceEngine | null>; androidPresentation?: boolean }) {
  const tx = useText();
  const [live, setLive] = useState(!!engine.current?.ctx); const [err, setErr] = useState<string | null>(null);
  const [p, setP] = useState<VoiceParams>({ preset: "robot", tone: 0, mod: 50, echo: 15, monitor: false, gain: 50 });
  const bars = useRef<HTMLDivElement>(null);
  useEffect(() => { engine.current?.apply(p); }, [p, live, engine]);
  useEffect(() => { if (!live) return; let r = 0; const hist: number[] = Array(24).fill(0);
    const loop = () => { hist.shift(); hist.push(engine.current?.level() ?? 0); if (bars.current) Array.from(bars.current.children).forEach((c, i) => ((c as HTMLElement).style.transform = `scaleY(${0.06 + (hist[i] ?? 0)})`)); r = requestAnimationFrame(loop); };
    loop(); return () => cancelAnimationFrame(r); }, [live, engine]);
  const toggle = async () => {
    if (live) { engine.current?.stop(); engine.current = null; setLive(false); playSfx("voice-stop"); return; }
    try { const e = new VoiceEngine(); await e.start(); engine.current = e; e.apply(p); setLive(true); setErr(null); playSfx("voice-start"); }
    catch { playSfx("tool-error"); setErr("Microphone access was blocked. Allow it in your browser to use the voice changer."); }
  };
  const pick = (v: VoicePreset) => setP((o) => ({ ...o, preset: v, ...(v === "off" ? {} : PRESETS[v]) }));
  return (
    <motion.div variants={list} initial="hidden" animate="show" className="space-y-4 frontier-page frontier-page-voice">
      <motion.div variants={item} className="flex items-center gap-3">
        <button onClick={toggle} aria-pressed={live} className={cn("relative flex h-14 w-14 items-center justify-center chamfer transition-colors", live ? "bg-crimson/25 text-crimson" : "bg-foreground/5 text-muted-foreground")}>
          <Ic.IVoice width={24} height={24} />{live && <span className="fx-pulse absolute right-1.5 top-1.5 h-1.5 w-1.5 bg-crimson" />}
        </button>
        <div className="flex-1">
          <div className="text-[13px] font-semibold">{tx(live ? "Voice engine live" : "Engine offline")}</div>
          <div className="tnum text-[10px] text-muted-foreground">{live ? tx("Output latency") + " " + (engine.current?.latency ?? 0) + "ms" : tx("Tap to arm microphone")} <Src k="live" /></div>
        </div>
      </motion.div>
      {err && <div className="text-[10px] text-crimson">{tx(err)}</div>}
      <motion.div variants={item} ref={bars} className="frontier-voice-wave flex h-12 items-center gap-[3px]">
        {Array.from({ length: 24 }).map((_, i) => <span key={i} className="h-full flex-1 origin-center bg-fx" style={{ transform: "scaleY(.06)", opacity: 0.4 + (i / 24) * 0.6 }} />)}
      </motion.div>
      <motion.div variants={item}><Label>Presets</Label>
        <div className="grid grid-cols-3 gap-1">{PRESET_LIST.map((o) => (
          <button key={o.v} onClick={() => { playSfx("voice-preset"); pick(o.v); }} className={cn("chamfer-sm py-2 text-[11px] transition-colors", p.preset === o.v ? "bg-fx font-bold text-obsidian" : "bg-foreground/5 text-muted-foreground")}>{tx(o.l)}</button>))}
        </div>
      </motion.div>
      <motion.div variants={item} className="space-y-3"><Label>Custom voice</Label>
        <Slider label="Tone (dark ↔ bright)" min={-12} max={12} value={p.tone} onChange={(v) => setP({ ...p, tone: v })} />
        <Slider label="Modulation" min={0} max={100} value={p.mod} onChange={(v) => setP({ ...p, mod: v })} unit="%" />
        <Slider label="Echo" min={0} max={100} value={p.echo} onChange={(v) => setP({ ...p, echo: v })} unit="%" />
        <Slider label="Input gain" min={0} max={100} value={p.gain} onChange={(v) => setP({ ...p, gain: v })} unit="%" />
        <div className="flex items-center justify-between text-[12px]"><span>{tx("Monitor in headphones")}</span><Toggle label="Monitor" on={p.monitor} onChange={(v) => setP({ ...p, monitor: v })} /></div>
        <div className="text-[9px] text-muted-foreground">{tx(androidPresentation ? "Android does not provide a generic API to inject this processed microphone into another game's voice chat. This is local preview only." : "Routing into in-game voice chat requires the Android native bridge.")}</div>
      </motion.div>
    </motion.div>
  );
}

export function SettingsPage({ s, upd, onManageSetup, autoDetectEnabled = false, detectorStatus = "disabled", notificationSuppressionEnabled = false, onAutoDetectChange, onNotificationSuppressionChange }: { s: Settings; upd: (p: Partial<Settings>) => void; onManageSetup?: () => void; autoDetectEnabled?: boolean; detectorStatus?: "disabled" | "monitoring" | "running" | "permission-required" | "unavailable"; notificationSuppressionEnabled?: boolean; onAutoDetectChange?: (enabled: boolean) => void; onNotificationSuppressionChange?: (enabled: boolean) => void }) {
  const tx = useText();
  const accents = [["cyan", "var(--cyan)"], ["lime", "var(--lime)"], ["crimson", "var(--crimson)"], ["gold", "var(--gold)"]] as const;
  return (
    <motion.div variants={list} initial="hidden" animate="show" className="space-y-4 frontier-page frontier-page-settings">
      <motion.div variants={item}>
        <Label>Language</Label>
        <Seg label="Language" value={s.language} onChange={(language) => upd({ language })} options={[{ v: "en", l: "English" }, { v: "ru", l: "Russian" }]} />
      </motion.div>
      <motion.div variants={item}><Label>Lighting</Label>
        <div className="flex gap-2">{accents.map(([k, c]) => <button key={k} aria-label={tx(`Accent ${k}`)} onClick={() => { playSfx("setting-change"); upd({ accent: k }); }} className={cn("h-8 flex-1 chamfer-sm transition-transform", s.accent === k && "scale-110 ring-1 ring-foreground")} style={{ background: `linear-gradient(135deg, ${c}, color-mix(in oklab, ${c} 30%, transparent))` }} />)}</div>
      </motion.div>
      <motion.div variants={item} className="frontier-settings-group space-y-3"><Label>Interface</Label>
        <Slider label="Animation intensity" min={0} max={2} step={0.5} value={s.motion} onChange={(v) => upd({ motion: v })} unit="×" />
        <Slider label="Panel opacity" min={0.6} max={1} step={0.05} value={s.opacity} onChange={(v) => upd({ opacity: v })} />
        <div className="flex items-center justify-between text-[12px]"><span>{tx("Mini FPS when closed")}</span><Toggle label="Mini FPS" on={s.miniFps} onChange={(v) => upd({ miniFps: v })} /></div>
      </motion.div>
      <motion.div variants={item} className="frontier-settings-group frontier-sound-settings space-y-3">
        <Label>Sound & haptics</Label>
        <div className="flex items-center justify-between text-[12px]"><span>{tx("Interface sounds")}</span><Toggle label="Sounds" on={s.sound} onChange={(v) => { setSound(v, s.volume); upd({ sound: v }); if (v) playSfx("toggle-on"); }} /></div>
        <Slider label="Master volume" min={0} max={1} step={0.05} value={s.volume} onChange={(v) => { setSound(s.sound, v); upd({ volume: v }); }} />
        <div className="frontier-sound-preview">
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-[9px] tracking-[0.16em] text-muted-foreground">{tx("SONIC PREVIEW")}</span>
            <span className="tnum text-[8px] text-muted-foreground">{tx(s.sound && s.volume > 0 ? "READY" : "MUTED")}</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <button type="button" disabled={!s.sound || s.volume === 0} onClick={() => playSfx("panel-open")} className="frontier-sound-preview-button"><span>01</span><strong>{tx("DEPLOY")}</strong></button>
            <button type="button" disabled={!s.sound || s.volume === 0} onClick={() => playSfx("navigation")} className="frontier-sound-preview-button"><span>02</span><strong>{tx("SELECT")}</strong></button>
            <button type="button" disabled={!s.sound || s.volume === 0} onClick={() => playSfx("mode-overdrive")} className="frontier-sound-preview-button"><span>03</span><strong>{tx("OVERDRIVE")}</strong></button>
          </div>
          {!s.sound || s.volume === 0 ? <p className="mt-1 text-[9px] text-muted-foreground">{tx("Enable interface sounds and raise the volume to preview FRONTIER SFX.")}</p> : null}
        </div>
        <div className="flex items-center justify-between text-[12px]"><span>{tx("Haptic feedback")}</span><Toggle label="Haptics" on={s.haptics} onChange={(v) => upd({ haptics: v })} /></div>
      </motion.div>
      <motion.div variants={item} className="frontier-settings-group space-y-3"><Label>Gestures & overlay</Label>
        <Slider label="Edge swipe distance" min={20} max={90} step={5} value={s.edgeSensitivity} onChange={(v) => upd({ edgeSensitivity: v })} unit="px" />
        <Seg label="Auto-hide" value={s.autoHide} onChange={(v) => upd({ autoHide: v })} options={[{ v: 0, l: "Never" }, { v: 5, l: "5s" }, { v: 10, l: "10s" }, { v: 20, l: "20s" }]} />
      </motion.div>
      <motion.div variants={item} className="frontier-settings-group space-y-3">
        <Label>System setup</Label>
        <p className="text-[10px] leading-relaxed text-muted-foreground">Manage the games selected during initiation and review platform access.</p>
        <button type="button" onClick={onManageSetup} className="frontier-setup-manage-button" disabled={!onManageSetup}>
          <span>{tx("MANAGE GAMES & SETUP")}</span><span aria-hidden>↗</span>
        </button>
      </motion.div>
      <motion.div variants={item} className="frontier-settings-group space-y-3">
        <Label>Game detection</Label>
        <p className="text-[9px] leading-relaxed text-muted-foreground">{tx("Automatically open FRONTIER when a selected supported game starts.")}</p>
        <div className="flex items-center justify-between text-[11px]">
          <span>{tx("Auto-detect")}</span>
          <Toggle label="Auto-detect" on={autoDetectEnabled} onChange={(enabled) => onAutoDetectChange?.(enabled)} />
        </div>
        <div className="text-[9px] text-muted-foreground">{tx(detectorStatus === "running" ? "Detector active" : detectorStatus === "monitoring" ? "Passive game detection ready" : detectorStatus === "permission-required" ? "Usage access required" : detectorStatus === "unavailable" ? "Game detection unavailable on this device" : "Detector disabled")}</div>
      </motion.div>
      <motion.div variants={item} className="frontier-settings-group space-y-3">
        <Label>Notification control</Label>
        <p className="text-[9px] leading-relaxed text-muted-foreground">{tx("When enabled, selected-game notifications are dismissed while the game is active. Calls, alarms, navigation and system notifications are preserved. No notification text is stored.")}</p>
        <div className="flex items-center justify-between text-[11px]">
          <span>{tx("Quiet notifications in selected games")}</span>
          <Toggle label="Quiet notifications in selected games" on={notificationSuppressionEnabled} onChange={(enabled) => onNotificationSuppressionChange?.(enabled)} />
        </div>
        <div className="text-[9px] text-muted-foreground">{tx("Requires Notification access.")}</div>
      </motion.div>
      <motion.div variants={item} className="frontier-settings-group space-y-2"><Label>Performance preference</Label>
        <Seg label="Launch profile" value={s.startMode} onChange={(v) => upd({ startMode: v })} options={(Object.keys(MODES) as Mode[]).map((m) => ({ v: m, l: MODES[m].name.split(" ")[0]! }))} />
      </motion.div>
    </motion.div>
  );
}
