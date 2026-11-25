import { AnimatePresence, motion, useMotionValue, useTransform, MotionConfig } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { haptic, playSfx, setHaptics, setSound, type SfxEvent } from "./audio";
import { useTelemetry, type Mode } from "./telemetry";
import { useSettings } from "./store";
import { applyLanguage, LocalizedTree, tr } from "./i18n";
import * as Ic from "./icons";
import { SceneArtwork } from "./components/Artwork";
import { HomePage, MODES, PerformancePage, SettingsPage, ToolsPage, VoicePage, type ToolState } from "./pages";
import type { VoiceEngine } from "./voice";
import { parseDeviceSnapshot, type DeviceSnapshot } from "./platform/device-snapshot";

type Tab = "home" | "perf" | "tools" | "voice" | "settings";
const MODE_SFX: Record<Mode, SfxEvent> = { stealth: "mode-stealth", balanced: "mode-balanced", hyper: "mode-hyper", overdrive: "mode-overdrive" };
const NAV: { id: Tab; label: string; icon: typeof Ic.IHome }[] = [
  { id: "home", label: "Home", icon: Ic.IHome }, { id: "perf", label: "Performance", icon: Ic.IPerf },
  { id: "tools", label: "Tools", icon: Ic.ITools }, { id: "voice", label: "Voice Changer", icon: Ic.IVoice }, { id: "settings", label: "Settings", icon: Ic.ISettings },
];
const SPRING = { type: "spring" as const, stiffness: 380, damping: 28 };
const NOTES = ["Squad invite from N1GHTFALL", "New message: 'gg wp'", "Battery saver suggestion", "Store: weekend bundle -40%", "Friend is now online"];

function useNativeDeviceSnapshot(enabled: boolean): DeviceSnapshot | null {
  const [snapshot, setSnapshot] = useState<DeviceSnapshot | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const read = () => {
      try {
        const next = parseDeviceSnapshot(window.FrontierAndroid?.getDeviceSnapshot?.());
        if (active) setSnapshot(next);
      } catch {
        if (active) setSnapshot(null);
      }
    };
    read();
    const timer = window.setInterval(read, 15000);
    window.addEventListener("focus", read);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", read);
    };
  }, [enabled]);
  return snapshot;
}
function GameScene({ overdrive }: { overdrive: boolean }) {
  // Browser-only preview art. The future Android overlay must stay transparent over live gameplay.
  return (
    <div className="absolute inset-0 overflow-hidden bg-obsidian" aria-hidden>
      <SceneArtwork className="absolute inset-0 h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-obsidian/5 via-obsidian/10 to-obsidian/45" />
      {/* Fictional game-space HUD; this is a preview, not an Android system overlay. */}
      <div className="frontier-preview-badge absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-1.5 border border-foreground/20 bg-obsidian/65 px-2 py-1 font-display text-[8px] tracking-[0.16em] text-foreground/75">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan" /> GAME PREVIEW · SIM
      </div>
      <div className="absolute right-3 top-3 h-24 w-32 border border-foreground/30 bg-obsidian/50 sm:h-28 sm:w-40"><div className="absolute left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-1/2 border-x-[6px] border-b-[12px] border-x-transparent border-b-cyan" /></div>
      <div className="tnum absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-3 text-sm text-foreground/90"><span className="border border-gold/70 bg-obsidian/50 px-3 py-1">40 / 180</span><span className="border border-foreground/30 bg-obsidian/40 px-3 py-1">5 / 30</span></div>
      <div className="absolute bottom-6 right-6 h-20 w-20 rounded-full border-2 border-foreground/40 bg-obsidian/30 sm:h-24 sm:w-24" />
      <div className="absolute bottom-6 left-[40%] hidden h-24 w-24 rounded-full border border-foreground/20 bg-foreground/5 sm:block" />
      {overdrive && <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_120px_color-mix(in_oklab,var(--crimson)_25%,transparent)]" />}
    </div>
  );
}

function Crosshair({ style, color }: { style: "dot" | "cross" | "ring"; color: string }) {
  return (
    <svg className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" width="48" height="48" viewBox="0 0 48 48" style={{ color, filter: `drop-shadow(0 0 2px ${color})` }} aria-label="Crosshair">
      {style !== "ring" && <circle cx="24" cy="24" r="2" fill="currentColor" />}
      {style === "cross" && <path d="M24 8v10M24 30v10M8 24h10M30 24h10" stroke="currentColor" strokeWidth="2" />}
      {style === "ring" && <><circle cx="24" cy="24" r="12" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="24" cy="24" r="1.5" fill="currentColor" /></>}
    </svg>
  );
}

export function Frontier({ onManageSetup, androidOverlay = false }: { onManageSetup?: () => void; androidOverlay?: boolean } = {}) {
  const [s, upd] = useSettings();
  const [open, setOpen] = useState(androidOverlay);
  const [tab, setTab] = useState<Tab>("home");
  const [activeWing, setActiveWing] = useState<"core" | "nexus">("core");
  const [mode, setModeRaw] = useState<Mode>("balanced");
  const [activating, setActivating] = useState(false);
  const t = useTelemetry(mode, Infinity, !androidOverlay);
  const deviceSnapshot = useNativeDeviceSnapshot(androidOverlay);
  const [ts, setTsRaw] = useState<ToolState>({ touch: false, net: false, crosshair: false, crossStyle: "cross", crossColor: "var(--crimson)", shield: false, replay: false, recording: false });
  const setTs = (p: Partial<ToolState>) => setTsRaw((o) => ({ ...o, ...p }));
  const [notes, setNotes] = useState<{ id: number; text: string }[]>([]); const [blocked, setBlocked] = useState(0);
  const [recErr, setRecErr] = useState<string | null>(null);
  const voice = useRef<VoiceEngine | null>(null);
  const rec = useRef<{ mr: MediaRecorder; stream: MediaStream; chunks: Blob[]; kind: "rec" | "replay" } | null>(null);
  const lastTouch = useRef(Date.now());
  const openRef = useRef(false);
  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => {
    if (!androidOverlay) return;
    const onOverlayState = (event: Event) => {
      const expanded = Boolean((event as CustomEvent<{ expanded?: boolean }>).detail?.expanded);
      openRef.current = expanded;
      setOpen(expanded);
    };
    window.addEventListener("frontier-overlay-expanded", onOverlayState);
    return () => window.removeEventListener("frontier-overlay-expanded", onOverlayState);
  }, [androidOverlay]);
  const shieldRef = useRef(ts.shield); shieldRef.current = ts.shield;

  useEffect(() => { applyLanguage(s.language); window.FrontierAndroid?.setLanguage?.(s.language); }, [s.language]);
  useEffect(() => { window.FrontierAndroid?.setAutoDetectEnabled?.(s.autoDetect); }, [s.autoDetect]);
  useEffect(() => { window.FrontierAndroid?.setZeroDistractionEnabled?.(s.zeroDistraction); }, [s.zeroDistraction]);
  useEffect(() => { setSound(s.sound, s.volume); setHaptics(s.haptics); document.documentElement.style.setProperty("--accent-fx", `var(--${s.accent})`); }, [s.sound, s.volume, s.haptics, s.accent]);
  useEffect(() => { setModeRaw(s.startMode); }, [s.startMode]);
  // Fake game notifications — Zero-Distraction shield actually suppresses them
  useEffect(() => {
    if (androidOverlay) return;
    const iv = setInterval(() => {
      if (shieldRef.current) { setBlocked((b) => b + 1); return; }
      const id = Date.now(); setNotes((n) => [...n, { id, text: NOTES[Math.floor(Math.random() * NOTES.length)]! }].slice(-2));
      setTimeout(() => setNotes((n) => n.filter((x) => x.id !== id)), 3500);
    }, 9000);
    return () => clearInterval(iv);
  }, [androidOverlay]);
  useEffect(() => { if (ts.shield) setNotes([]); }, [ts.shield]);
  // Auto-hide
  const doOpen = useCallback(() => {
    if (androidOverlay) window.FrontierAndroid?.expandOverlay?.();
    if (!openRef.current) {
      openRef.current = true;
      setOpen(true);
      playSfx("panel-open");
      haptic(15);
    }
    lastTouch.current = Date.now();
  }, [androidOverlay]);
  const closePanel = useCallback(() => {
    if (!openRef.current) return;
    if (androidOverlay) window.setTimeout(() => window.FrontierAndroid?.minimizeOverlay?.(), 220);
    openRef.current = false;
    setOpen(false);
    playSfx("panel-close");
    haptic(10);
  }, [androidOverlay]);
  const doClose = closePanel;
  useEffect(() => { if (!open || !s.autoHide) return; const iv = setInterval(() => { if (Date.now() - lastTouch.current > s.autoHide * 1000) closePanel(); }, 500); return () => clearInterval(iv); }, [open, s.autoHide, closePanel]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePanel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closePanel]);
  const setMode = (m: Mode) => {
    if (m === mode) return; setModeRaw(m); haptic(m === "overdrive" ? [20, 40, 20, 40, 60] : 12);
    playSfx(MODE_SFX[m]);
    if (m === "overdrive") { setActivating(true); setTimeout(() => setActivating(false), 1300); }
  };

  const stopRec = () => { const r = rec.current; if (!r) return; rec.current = null; playSfx("capture-stop"); if (r.mr.state !== "inactive") r.mr.stop(); r.stream.getTracks().forEach((x) => x.stop()); setTs({ recording: false, replay: false }); };
  const download = (chunks: Blob[], name: string) => { const url = URL.createObjectURL(new Blob(chunks, { type: "video/webm" })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); };
  const startCapture = async (kind: "rec" | "replay") => {
    setRecErr(null);
    if (!navigator.mediaDevices?.getDisplayMedia) { playSfx("tool-error"); setRecErr("Screen capture isn't available in this browser. Support depends on the browser and device."); return; }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 60 }, audio: true });
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm" });
      const r = { mr, stream, chunks: [] as Blob[], kind }; rec.current = r;
      mr.ondataavailable = (e) => { if (!e.data.size) return; r.chunks.push(e.data); if (kind === "replay" && r.chunks.length > 31) r.chunks.splice(1, 1); };
      mr.onstop = () => { if (kind === "rec") download(r.chunks, `frontier-${Date.now()}.webm`); };
      stream.getVideoTracks()[0]?.addEventListener("ended", stopRec);
      mr.start(1000); playSfx("capture-start"); setTs(kind === "rec" ? { recording: true, replay: false } : { replay: true, recording: false });
    } catch { playSfx("tool-error"); setRecErr("Screen capture was cancelled or blocked."); }
  };
  const onRecord = () => (ts.recording ? stopRec() : (stopRec(), void startCapture("rec")));
  const onReplay = () => (ts.replay ? stopRec() : (stopRec(), void startCapture("replay")));
  const onClip = () => { const r = rec.current; if (r?.kind === "replay") { playSfx("replay-save"); download([...r.chunks], `frontier-replay-${Date.now()}.webm`); } };

  // Magnetic edge handle
  const dragX = useMotionValue(0);
  const glow = useTransform(dragX, [0, s.edgeSensitivity], [0.35, 1]);
  const width = useTransform(dragX, [0, s.edgeSensitivity], [3, 8]);
  const od = mode === "overdrive"; const M = MODES[mode];

  return (
    <MotionConfig reducedMotion={s.motion === 0 ? "always" : "user"} transition={{ ...SPRING, stiffness: 380 * Math.max(0.5, s.motion) }}>
      <LocalizedTree language={s.language}>
      <div className="frontier-app fixed inset-0 select-none overflow-hidden text-foreground" data-panel-open={open} data-android-overlay={androidOverlay ? "true" : undefined} style={{ touchAction: ts.touch && !androidOverlay ? "none" : "manipulation" }}>
        {!androidOverlay && <GameScene overdrive={od} />}
        {ts.crosshair && !androidOverlay && <Crosshair style={ts.crossStyle} color={ts.crossColor} />}
        {!androidOverlay && (ts.recording || ts.replay) && <div className="tnum absolute right-3 top-3 z-10 flex items-center gap-1.5 bg-obsidian/70 px-2 py-1 text-[10px] text-crimson"><span className="fx-pulse h-2 w-2 rounded-full bg-crimson" />{ts.recording ? "REC" : "REPLAY BUFFER"}</div>}
        {!androidOverlay && <div className="absolute right-3 top-12 z-10 space-y-1">
          <AnimatePresence>{notes.map((n) => <motion.div key={n.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="chamfer-sm bg-glass-strong px-3 py-2 text-[11px]">{n.text}</motion.div>)}</AnimatePresence>
        </div>}

        <AnimatePresence>
          {!open && (
            <>
              <motion.div key="left-edge" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="frontier-closed-edge frontier-edge-left absolute inset-y-0 left-0 z-20 flex items-center">
                <motion.button aria-label="Open FRONTIER from left" aria-expanded={open} aria-controls="frontier-navigation" drag="x" dragConstraints={{ left: 0, right: s.edgeSensitivity + 20 }} dragElastic={0.25} dragSnapToOrigin style={{ x: dragX }}
                  onPointerDown={() => { playSfx("edge-touch"); haptic(5); }} onDragEnd={(_, i) => { if (i.offset.x > s.edgeSensitivity) doOpen(); }} onTap={doOpen}
                  className="frontier-edge-handle relative flex h-36 w-8 items-center">
                  <motion.span style={{ opacity: glow, width }} className="block h-28 bg-fx shadow-[0_0_16px_var(--accent-fx)] [clip-path:polygon(0_0,100%_8%,100%_92%,0_100%)]" />
                  <span className="fx-pulse absolute left-2 top-1/2 h-6 w-[2px] -translate-y-1/2 bg-fx/60" />
                </motion.button>
                {s.miniFps && <div className="tnum pointer-events-none absolute left-2 top-3 bg-obsidian/70 px-2 py-1 text-[10px]" style={{ color: M.color }}>{t.fps} FPS</div>}
              </motion.div>
              {!androidOverlay && <motion.button key="right-edge" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} onClick={doOpen} aria-label="Open FRONTIER from right" className="frontier-edge-right absolute inset-y-0 right-0 z-20 flex w-8 items-center justify-end">
                <span className="frontier-edge-right-line block h-28 w-[3px] bg-magenta shadow-[0_0_16px_var(--magenta)]" />
              </motion.button>}
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {open && (
            <motion.div key="twin-core" onPointerDown={() => (lastTouch.current = Date.now())} className="frontier-twin-overlay absolute inset-0 z-30" initial="closed" animate="open" exit="closed">
              <motion.nav id="frontier-navigation" aria-label="FRONTIER main navigation" className="frontier-command-dock absolute left-1/2 top-2 z-40 flex -translate-x-1/2 items-center gap-1.5 border border-cyan/30 bg-obsidian/90 p-1.5 shadow-[0_0_32px_color-mix(in_oklab,var(--cyan)_16%,transparent)] backdrop-blur-xl"
                variants={{ closed: { opacity: 0, y: -18, scale: 0.96 }, open: { opacity: 1, y: 0, scale: 1, transition: { ...SPRING, staggerChildren: 0.045, delayChildren: 0.06 } } }}>
                <div className="frontier-dock-brand flex items-center gap-2 border-r border-line px-3">
                  <span className="flex h-8 w-8 items-center justify-center chamfer-sm border border-cyan/50 bg-obsidian/80 p-0.5 shadow-[0_0_14px_color-mix(in_oklab,var(--cyan)_24%,transparent)]"><img src="/frontier-logo.png" alt="FRONTIER" className="h-full w-full object-contain" /></span>
                  <span className="font-display text-[11px] italic tracking-[0.12em]">FRONT<span className="bg-gradient-to-r from-cyan to-magenta bg-clip-text text-transparent">IER</span></span>
                  <span className="fx-pulse h-1.5 w-1.5 rounded-full bg-lime" />
                </div>
                {NAV.map((n) => {
                  const on = tab === n.id;
                  return (
                    <motion.button key={n.id} variants={{ closed: { opacity: 0, y: -8 }, open: { opacity: 1, y: 0 } }} aria-label={tr(s.language, n.label)} aria-current={on ? "page" : undefined}
                      onClick={() => { if (n.id !== tab) { setTab(n.id); playSfx("navigation"); haptic(5); } }} whileTap={{ scale: 0.92 }}
                      className={cn("frontier-dock-item relative flex items-center gap-2 px-3 py-2 text-[10px] font-semibold tracking-wide transition-colors", on ? "text-cyan" : "text-muted-foreground hover:text-foreground")}>
                      {on && <motion.span layoutId="dockActive" className="absolute inset-0 chamfer-sm border border-cyan/60 bg-cyan/10 shadow-[inset_0 0 16px color-mix(in_oklab,var(--cyan)_18%,transparent)]" />}
                      <n.icon width={16} height={16} className="relative" /><span className="relative">{n.id === "perf" ? "PERF" : n.id === "voice" ? "VOICE" : tr(s.language, n.label).toUpperCase()}</span>
                    </motion.button>
                  );
                })}
                {!androidOverlay && <button type="button" className="frontier-wing-switch" onClick={() => setActiveWing((wing) => wing === "core" ? "nexus" : "core")} aria-label={`Switch to ${activeWing === "core" ? "Nexus" : "Core"} panel`}><span>{activeWing === "core" ? "CORE" : "NEXUS"}</span><span aria-hidden>⇄</span></button>}
                <div className="frontier-dock-fps border-l border-line px-3 text-right">
                  <div className="tnum text-[13px] font-bold" style={{ color: M.color }}>{t.fps}</div><div className="font-display text-[7px] tracking-widest text-muted-foreground">FPS</div>
                </div>
                <button onClick={doClose} aria-label="Minimize FRONTIER" title="Minimize FRONTIER (Esc)" className="flex h-8 w-8 items-center justify-center chamfer-sm border border-magenta/30 text-magenta transition-colors hover:bg-magenta/10"><Ic.IMin width={16} height={16} /></button>
              </motion.nav>

              <motion.section aria-label="FRONTIER Core controls" className={cn("frontier-wing frontier-wing-left absolute bottom-3 left-3 top-[68px] flex min-h-0 flex-col overflow-hidden", activeWing === "core" && "frontier-wing-active")}
                variants={{ closed: { opacity: 0, x: -34, scaleX: 0.96 }, open: { opacity: 1, x: 0, scaleX: 1, transition: { ...SPRING, delay: 0.05 } } }} style={{ transformOrigin: "left center" }}>
                <div className="frontier-wing-surface absolute inset-0 chamfer border border-cyan/45 bg-glass shadow-[0_0_28px_color-mix(in_oklab,var(--cyan)_13%,transparent),inset_0 0 34px color-mix(in_oklab,var(--cyan)_7%,transparent)]" style={{ opacity: s.opacity }} />
                <motion.span key={`left-scan-${tab}`} initial={{ top: "0%", opacity: 0.9 }} animate={{ top: "100%", opacity: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="pointer-events-none absolute inset-x-0 z-20 h-[2px] bg-cyan shadow-[0_0_14px_3px_var(--cyan)]" />
                <header className="frontier-wing-header relative flex items-center justify-between gap-2 border-b border-cyan/20 px-3 py-2.5">
                  <div className="min-w-0"><div className="font-display text-[10px] tracking-[0.18em] text-cyan">01 / CORE SYSTEM</div><div className="mt-0.5 truncate text-[9px] font-semibold tracking-wider text-foreground">{tr(s.language, NAV.find((n) => n.id === tab)?.label ?? "Home").toUpperCase()} CONTROL</div></div>
                  <span className="tnum shrink-0 text-[10px]" style={{ color: M.color }}>{M.name.toUpperCase()}</span>
                </header>
                <div aria-label={androidOverlay ? "Native Android device diagnostics: available memory, battery and thermal status" : `Simulated telemetry: CPU ${t.cpu}%, GPU ${t.gpu}%, temperature ${Math.round(t.temp)} degrees Celsius`} className="frontier-telemetry relative mx-3 grid grid-cols-3 divide-x divide-line border-b border-line/70 py-2">
                  {(androidOverlay
                    ? [
                        ["AVAILABLE RAM", deviceSnapshot ? `${deviceSnapshot.availableMemoryMb} MB` : "—"],
                        ["BATTERY", deviceSnapshot?.batteryPercent == null ? "—" : `${deviceSnapshot.batteryPercent}%`],
                        ["THERMAL", deviceSnapshot?.thermalStatus ?? "—"],
                      ]
                    : [["CPU", `${t.cpu}%`], ["GPU", `${t.gpu}%`], ["THERMAL", `${Math.round(t.temp)}°C`]]
                  ).map(([label, value]) => (
                    <div key={label} className="min-w-0 text-center leading-tight">
                      <div className={androidOverlay ? "tnum truncate text-[10px] font-semibold text-foreground" : "tnum text-[12px] font-semibold text-foreground"}>{value}</div>
                      <div className="font-display text-[7px] tracking-[0.08em] text-muted-foreground">{label} <span className="text-gold">{androidOverlay ? "DEVICE" : "SIM"}</span></div>
                    </div>
                  ))}
                </div>
                <div className="frontier-page-scroll relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 [scrollbar-width:none]">
                  <AnimatePresence mode="wait">
                    <motion.div key={tab} initial={{ opacity: 0, y: 10, scale: 0.992 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.996, transition: { duration: 0.16, ease: "easeOut" } }} transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}>
                      {tab === "home" && <HomePage t={t} mode={mode} setMode={setMode} ts={ts} setTs={setTs} onRecord={onRecord} onToolsMore={() => { setTab("tools"); playSfx("navigation"); }} androidOverlay={androidOverlay} deviceSnapshot={deviceSnapshot} language={s.language} />}
                      {tab === "perf" && <PerformancePage t={t} mode={mode} setMode={setMode} s={s} upd={upd} androidOverlay={androidOverlay} />}
                      {tab === "tools" && <ToolsPage ts={ts} setTs={setTs} blocked={blocked} onRecord={onRecord} onReplay={onReplay} onClip={onClip} recErr={recErr} goVoice={() => { setTab("voice"); playSfx("navigation"); }} androidOverlay={androidOverlay} language={s.language} />}
                      {tab === "voice" && <VoicePage engine={voice} androidOverlay={androidOverlay} language={s.language} />}
                      {tab === "settings" && <SettingsPage s={s} upd={upd} onManageSetup={onManageSetup} />}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.section>

              {!androidOverlay && <motion.aside aria-label="FRONTIER Nexus quick intelligence" className={cn("frontier-wing frontier-wing-right absolute bottom-3 right-3 top-[68px] flex min-h-0 flex-col overflow-hidden", activeWing === "nexus" && "frontier-wing-active")}
                variants={{ closed: { opacity: 0, x: 34, scaleX: 0.96 }, open: { opacity: 1, x: 0, scaleX: 1, transition: { ...SPRING, delay: 0.1 } } }} style={{ transformOrigin: "right center" }}>
                <div className="frontier-wing-surface frontier-nexus-surface absolute inset-0 chamfer border border-magenta/45 bg-glass shadow-[0_0_28px_color-mix(in_oklab,var(--magenta)_13%,transparent),inset_0 0 34px color-mix(in_oklab,var(--magenta)_7%,transparent)]" style={{ opacity: s.opacity }} />
                <motion.span key={`right-scan-${tab}`} initial={{ top: "100%", opacity: 0.8 }} animate={{ top: "0%", opacity: 0 }} transition={{ duration: 0.85, ease: "easeOut" }} className="pointer-events-none absolute inset-x-0 z-20 h-[2px] bg-magenta shadow-[0_0_14px_3px_var(--magenta)]" />
                <header className="frontier-wing-header relative border-b border-magenta/20 px-3 py-2.5">
                  <div className="font-display text-[10px] tracking-[0.18em] text-magenta">02 / NEXUS INTELLIGENCE</div>
                  <div className="mt-0.5 text-[9px] font-semibold tracking-wider text-foreground">LIVE CONTEXT · {tab.toUpperCase()}</div>
                </header>
                <div className="frontier-nexus-content relative min-h-0 flex-1 overflow-y-auto px-3 py-3">
                  <div className="space-y-3">
                    <div className="frontier-nexus-card chamfer-sm border border-magenta/25 bg-obsidian/45 p-3">
                      <div className="flex items-center justify-between"><span className="font-display text-[8px] tracking-[0.16em] text-muted-foreground">ACTIVE PROFILE</span><span className="h-1.5 w-1.5 rounded-full bg-lime shadow-[0_0_8px_var(--lime)]" /></div>
                      <div className="mt-2 flex items-end justify-between gap-2"><div className="font-display text-[13px] font-bold" style={{ color: M.color }}>{M.name.toUpperCase()}</div><span className="tnum text-[10px] text-muted-foreground">TARGET {M.target} FPS</span></div>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10"><motion.div className="h-full rounded-full" animate={{ width: `${Math.min(100, t.stability)}%` }} style={{ background: M.color, boxShadow: `0 0 10px ${M.color}` }} /></div>
                      <div className="mt-1 flex justify-between text-[8px] text-muted-foreground"><span>FRAME STABILITY</span><span className="tnum">{t.stability}%</span></div>
                    </div>
                    {tab === "home" && (
                      <>
                        <div className="frontier-nexus-card chamfer-sm border border-cyan/20 bg-obsidian/45 p-3">
                          <div className="font-display text-[8px] tracking-[0.16em] text-cyan">QUICK SYSTEM ACTIONS</div>
                          <button onClick={() => setTs({ shield: !ts.shield })} aria-pressed={ts.shield} className="mt-3 flex w-full items-center justify-between text-[10px]"><span className="flex items-center gap-2"><Ic.IShield width={15} height={15} /> Distraction Shield</span><span className={cn("rounded px-2 py-1 font-display text-[8px]", ts.shield ? "bg-lime/15 text-lime" : "bg-white/5 text-muted-foreground")}>{ts.shield ? "ON" : "OFF"}</span></button>
                          <button onClick={() => setTs({ crosshair: !ts.crosshair })} aria-pressed={ts.crosshair} className="mt-3 flex w-full items-center justify-between text-[10px]"><span className="flex items-center gap-2"><Ic.ICross width={15} height={15} /> Custom Crosshair</span><span className={cn("rounded px-2 py-1 font-display text-[8px]", ts.crosshair ? "bg-cyan/15 text-cyan" : "bg-white/5 text-muted-foreground")}>{ts.crosshair ? "ON" : "OFF"}</span></button>
                        </div>
                        <div className="frontier-nexus-card chamfer-sm border border-magenta/20 bg-obsidian/45 p-3">
                          <div className="font-display text-[8px] tracking-[0.16em] text-magenta">NETWORK SNAPSHOT</div>
                          <div className="mt-3 grid grid-cols-2 gap-2"><div><div className="tnum text-[20px] font-bold text-cyan">24<span className="text-[9px]">ms</span></div><div className="text-[8px] text-muted-foreground">SIMULATED PING</div></div><div><div className="tnum text-[20px] font-bold text-magenta">0.4<span className="text-[9px]">%</span></div><div className="text-[8px] text-muted-foreground">PACKET LOSS</div></div></div>
                        </div>
                      </>
                    )}
                    {tab === "perf" && (
                      <div className="frontier-nexus-card chamfer-sm border border-gold/25 bg-obsidian/45 p-3">
                        <div className="font-display text-[8px] tracking-[0.16em] text-gold">THERMAL GUARD</div>
                        <div className="mt-3 flex items-center gap-3"><div className="tnum text-[25px] font-bold" style={{ color: t.temp > 43 ? "var(--gold)" : "var(--lime)" }}>{Math.round(t.temp)}°</div><div className="text-[9px] text-muted-foreground">Simulated device temperature<br/>Adaptive thermal awareness</div></div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-lime via-gold to-crimson" style={{ width: `${Math.min(100, t.temp / 60 * 100)}%` }} /></div>
                        <div className="mt-2 text-[8px] text-muted-foreground">PROFILE: {M.tag.toUpperCase()}</div>
                      </div>
                    )}
                    {tab === "tools" && (
                      <div className="frontier-nexus-card chamfer-sm border border-cyan/20 bg-obsidian/45 p-3">
                        <div className="font-display text-[8px] tracking-[0.16em] text-cyan">TOOL STATUS MATRIX</div>
                        {([{label:"Touch response",on:ts.touch},{label:"Network assist",on:ts.net},{label:"Crosshair",on:ts.crosshair},{label:"No disturbance",on:ts.shield},{label:"Screen capture",on:ts.recording}] as const).map((x) => <div key={x.label} className="mt-3 flex items-center justify-between text-[9px]"><span className="text-muted-foreground">{x.label}</span><span className={x.on ? "text-lime" : "text-muted-foreground"}>{x.on ? "ACTIVE" : "STANDBY"}</span></div>)}
                      </div>
                    )}
                    {tab === "voice" && (
                      <div className="frontier-nexus-card chamfer-sm border border-magenta/25 bg-obsidian/45 p-3">
                        <div className="font-display text-[8px] tracking-[0.16em] text-magenta">AUDIO SIGNAL</div>
                        <div className="mt-4 flex h-14 items-center justify-center gap-1">{Array.from({length:18},(_,i)=><motion.span key={i} className="w-1 rounded-full bg-magenta" animate={{height:[6,12+(i%5)*5,8]}} transition={{duration:0.7+(i%4)*0.15,repeat:Infinity,repeatType:"mirror",ease:"easeInOut",delay:i*0.025}} />)}</div>
                        <div className="text-center text-[8px] tracking-widest text-muted-foreground">FRONTIER AUDIO ENGINE</div>
                      </div>
                    )}
                    {tab === "settings" && (
                      <div className="frontier-nexus-card chamfer-sm border border-cyan/20 bg-obsidian/45 p-3">
                        <div className="font-display text-[8px] tracking-[0.16em] text-cyan">INTERFACE STATUS</div>
                        <div className="mt-3 flex items-center justify-between text-[9px]"><span className="text-muted-foreground">Motion profile</span><span className="text-foreground">{s.motion === 0 ? "REDUCED" : "DYNAMIC"}</span></div>
                        <div className="mt-3 flex items-center justify-between text-[9px]"><span className="text-muted-foreground">Haptics</span><span className="text-foreground">{s.haptics ? "ENABLED" : "DISABLED"}</span></div>
                        <div className="mt-3 flex items-center justify-between text-[9px]"><span className="text-muted-foreground">Sound</span><span className="text-foreground">{s.sound ? "ENABLED" : "DISABLED"}</span></div>
                      </div>
                    )}
                    <div className="frontier-nexus-footer border-t border-magenta/20 pt-3 text-center">
                      <div className="font-display text-[8px] tracking-[0.18em] text-magenta">FRONTIER / TWIN-CORE</div>
                      <div className="mt-1 text-[8px] text-muted-foreground">CORE + NEXUS · GAME FIRST</div>
                    </div>
                  </div>
                </div>
              </motion.aside>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </LocalizedTree>
    </MotionConfig>
  );
}
