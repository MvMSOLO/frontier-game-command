import { AnimatePresence, motion, useMotionValue, useTransform, MotionConfig } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { haptic, setHaptics, setSound, sfx } from "./audio";
import { useTelemetry, type Mode } from "./telemetry";
import { useSettings } from "./store";
import * as Ic from "./icons";
import { HomePage, MODES, PerformancePage, SettingsPage, ToolsPage, VoicePage, type ToolState } from "./pages";
import type { VoiceEngine } from "./voice";

type Tab = "home" | "perf" | "tools" | "voice" | "settings";
const NAV: { id: Tab; label: string; icon: typeof Ic.IHome }[] = [
  { id: "home", label: "Home", icon: Ic.IHome }, { id: "perf", label: "Performance", icon: Ic.IPerf },
  { id: "tools", label: "Tools", icon: Ic.ITools }, { id: "voice", label: "Voice", icon: Ic.IVoice }, { id: "settings", label: "Settings", icon: Ic.ISettings },
];
const SPRING = { type: "spring" as const, stiffness: 380, damping: 28 };
const NOTES = ["Squad invite from N1GHTFALL", "New message: 'gg wp'", "Battery saver suggestion", "Store: weekend bundle -40%", "Friend is now online"];

function GameScene({ overdrive }: { overdrive: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-obsidian" aria-hidden>
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMax slice" viewBox="0 0 1600 900">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="oklch(0.22 0.06 260)" /><stop offset=".6" stopColor="oklch(0.42 0.09 240)" /><stop offset="1" stopColor="oklch(0.7 0.1 60)" /></linearGradient>
          <linearGradient id="m1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="oklch(0.32 0.05 250)" /><stop offset="1" stopColor="oklch(0.2 0.03 250)" /></linearGradient>
          <linearGradient id="m2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="oklch(0.26 0.06 150)" /><stop offset="1" stopColor="oklch(0.14 0.03 160)" /></linearGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#sky)" />
        <circle cx="1180" cy="520" r="90" fill="oklch(0.9 0.12 75)" opacity=".55" />
        <g className="fx-drift" opacity=".35">{[0, 1600].map((o) => <g key={o} transform={`translate(${o},0)`} fill="oklch(0.85 0.03 240)">{[[200, 180, 140], [620, 120, 90], [980, 220, 160], [1350, 150, 110]].map(([x, y, r]) => <ellipse key={x} cx={x} cy={y} rx={r} ry={(r ?? 0) / 3.5} />)}</g>)}</g>
        <path d="M0 620 L180 480 L320 560 L520 400 L720 540 L900 430 L1100 560 L1300 450 L1600 580 V900 H0Z" fill="url(#m1)" />
        <path d="M0 720 Q300 620 600 700 T1200 680 T1600 700 V900 H0Z" fill="url(#m2)" />
        <path d="M1050 560 h40 l12 -110 h-64z" fill="oklch(0.3 0.02 250)" />
        {Array.from({ length: 22 }).map((_, i) => <path key={i} d={`M${i * 75 + 20} ${730 - (i % 3) * 12} l14 -50 l14 50z`} fill="oklch(0.18 0.05 150)" />)}
        <path d="M0 900 L700 760 L900 760 L1600 900Z" fill="oklch(0.16 0.02 140)" opacity=".7" />
      </svg>
      {/* mock in-game HUD (right side belongs to the game) */}
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

export function Frontier() {
  const [s, upd] = useSettings();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [mode, setModeRaw] = useState<Mode>("balanced");
  const [activating, setActivating] = useState(false);
  const t = useTelemetry(mode, Infinity);
  const [ts, setTsRaw] = useState<ToolState>({ touch: false, net: false, crosshair: false, crossStyle: "cross", crossColor: "var(--crimson)", shield: false, replay: false, recording: false });
  const setTs = (p: Partial<ToolState>) => setTsRaw((o) => ({ ...o, ...p }));
  const [notes, setNotes] = useState<{ id: number; text: string }[]>([]); const [blocked, setBlocked] = useState(0);
  const [recErr, setRecErr] = useState<string | null>(null);
  const voice = useRef<VoiceEngine | null>(null);
  const rec = useRef<{ mr: MediaRecorder; stream: MediaStream; chunks: Blob[]; kind: "rec" | "replay" } | null>(null);
  const lastTouch = useRef(Date.now());
  const shieldRef = useRef(ts.shield); shieldRef.current = ts.shield;

  useEffect(() => { setSound(s.sound, s.volume); setHaptics(s.haptics); document.documentElement.style.setProperty("--accent-fx", `var(--${s.accent})`); }, [s.sound, s.volume, s.haptics, s.accent]);
  useEffect(() => { setModeRaw(s.startMode); }, [s.startMode]);
  // Fake game notifications — Zero-Distraction shield actually suppresses them
  useEffect(() => { const iv = setInterval(() => {
    if (shieldRef.current) { setBlocked((b) => b + 1); return; }
    const id = Date.now(); setNotes((n) => [...n, { id, text: NOTES[Math.floor(Math.random() * NOTES.length)]! }].slice(-2));
    setTimeout(() => setNotes((n) => n.filter((x) => x.id !== id)), 3500);
  }, 9000); return () => clearInterval(iv); }, []);
  useEffect(() => { if (ts.shield) setNotes([]); }, [ts.shield]);
  // Auto-hide
  useEffect(() => { if (!open || !s.autoHide) return; const iv = setInterval(() => { if (Date.now() - lastTouch.current > s.autoHide * 1000) { setOpen(false); sfx.close(); } }, 500); return () => clearInterval(iv); }, [open, s.autoHide]);

  const doOpen = useCallback(() => { setOpen(true); sfx.open(); haptic(15); lastTouch.current = Date.now(); }, []);
  const doClose = () => { setOpen(false); sfx.close(); haptic(10); };
  const setMode = (m: Mode) => {
    if (m === mode) return; setModeRaw(m); haptic(m === "overdrive" ? [20, 40, 20, 40, 60] as unknown as number : 12);
    if (m === "overdrive") { sfx.overdrive(); setActivating(true); setTimeout(() => setActivating(false), 1300); } else sfx.mode();
  };

  const stopRec = () => { const r = rec.current; if (!r) return; r.mr.stop(); r.stream.getTracks().forEach((x) => x.stop()); rec.current = null; setTs({ recording: false, replay: false }); };
  const download = (chunks: Blob[], name: string) => { const url = URL.createObjectURL(new Blob(chunks, { type: "video/webm" })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); };
  const startCapture = async (kind: "rec" | "replay") => {
    setRecErr(null);
    if (!navigator.mediaDevices?.getDisplayMedia) { setRecErr("Screen capture isn't available in this browser. On Android it runs through the native bridge."); return; }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 60 }, audio: true });
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm" });
      const r = { mr, stream, chunks: [] as Blob[], kind }; rec.current = r;
      mr.ondataavailable = (e) => { if (!e.data.size) return; r.chunks.push(e.data); if (kind === "replay" && r.chunks.length > 31) r.chunks.splice(1, 1); };
      mr.onstop = () => { if (kind === "rec") download(r.chunks, `frontier-${Date.now()}.webm`); };
      stream.getVideoTracks()[0]?.addEventListener("ended", stopRec);
      mr.start(1000); sfx.exec(); setTs(kind === "rec" ? { recording: true, replay: false } : { replay: true, recording: false });
    } catch { setRecErr("Screen capture was cancelled or blocked."); }
  };
  const onRecord = () => (ts.recording ? stopRec() : (stopRec(), void startCapture("rec")));
  const onReplay = () => (ts.replay ? stopRec() : (stopRec(), void startCapture("replay")));
  const onClip = () => { const r = rec.current; if (r?.kind === "replay") { sfx.exec(); download([...r.chunks], `frontier-replay-${Date.now()}.webm`); } };

  // Magnetic edge handle
  const dragX = useMotionValue(0);
  const glow = useTransform(dragX, [0, s.edgeSensitivity], [0.35, 1]);
  const width = useTransform(dragX, [0, s.edgeSensitivity], [3, 8]);
  const od = mode === "overdrive"; const M = MODES[mode];

  return (
    <MotionConfig reducedMotion={s.motion === 0 ? "always" : "never"} transition={{ ...SPRING, stiffness: 380 * Math.max(0.5, s.motion) }}>
      <div className="fixed inset-0 select-none overflow-hidden text-foreground" style={{ touchAction: ts.touch ? "none" : "manipulation" }}>
        <GameScene overdrive={od} />
        {ts.crosshair && <Crosshair style={ts.crossStyle} color={ts.crossColor} />}
        {(ts.recording || ts.replay) && <div className="tnum absolute right-40 top-3 flex items-center gap-1.5 bg-obsidian/70 px-2 py-1 text-[10px] text-crimson sm:right-48"><span className="fx-pulse h-2 w-2 rounded-full bg-crimson" />{ts.recording ? "REC" : "REPLAY BUFFER"}</div>}
        <div className="absolute right-40 top-12 space-y-1 sm:right-48">
          <AnimatePresence>{notes.map((n) => <motion.div key={n.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="chamfer-sm bg-glass-strong px-3 py-2 text-[11px]">{n.text}</motion.div>)}</AnimatePresence>
        </div>

        {/* Closed: edge indicator */}
        <AnimatePresence>{!open && (
          <motion.div key="edge" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="absolute inset-y-0 left-0 z-20 flex items-center">
            <motion.button aria-label="Open FRONTIER" drag="x" dragConstraints={{ left: 0, right: s.edgeSensitivity + 20 }} dragElastic={0.25} dragSnapToOrigin style={{ x: dragX }}
              onPointerDown={() => { sfx.edge(); haptic(5); }} onDragEnd={(_, i) => { if (i.offset.x > s.edgeSensitivity) doOpen(); }} onTap={doOpen}
              className="relative flex h-40 w-8 items-center">
              <motion.span style={{ opacity: glow, width }} className="block h-32 bg-fx shadow-[0_0_16px_var(--accent-fx)] [clip-path:polygon(0_0,100%_8%,100%_92%,0_100%)]" />
              <span className="fx-pulse absolute left-2 top-1/2 h-6 w-[2px] -translate-y-1/2 bg-fx/60" />
            </motion.button>
            {s.miniFps && <div className="tnum pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 bg-obsidian/60 px-2 py-0.5 text-[11px]" style={{ color: M.color }}><span className="h-1.5 w-1.5 rotate-45" style={{ background: M.color }} />{t.fps} FPS</div>}
          </motion.div>)}</AnimatePresence>

        {/* Open: rail + panel */}
        <AnimatePresence>{open && (
          <motion.div key="panel" onPointerDown={() => (lastTouch.current = Date.now())} className="absolute bottom-2 left-0 top-2 z-30 flex max-w-[calc(100vw-1rem)]" initial="closed" animate="open" exit="closed">
            {/* Rail */}
            <motion.nav aria-label="FRONTIER navigation" variants={{ closed: { x: -90 }, open: { x: 0, transition: { ...SPRING, staggerChildren: 0.05, delayChildren: 0.1 } } }}
              className="relative flex w-[68px] flex-col items-center gap-1 border-r-2 border-magenta/70 bg-glass-strong py-2 shadow-[4px_0_18px_color-mix(in_oklab,var(--magenta)_40%,transparent)] [clip-path:polygon(0_0,100%_3%,100%_97%,0_100%)]" style={{ opacity: s.opacity + 0.05 }}>
              <motion.div variants={{ closed: { opacity: 0, rotate: -90, scale: 0.4 }, open: { opacity: 1, rotate: 0, scale: 1 } }} className="mb-2 mt-1 flex h-11 w-11 items-center justify-center chamfer-sm border border-magenta/60 bg-magenta/10 shadow-[0_0_14px_var(--magenta)]" style={{ color: od ? "var(--gold)" : "var(--magenta)" }}><Ic.ILogo width={24} height={24} /></motion.div>
              {NAV.map((n) => { const on = tab === n.id; return (
                <motion.button key={n.id} variants={{ closed: { opacity: 0, x: -10 }, open: { opacity: 1, x: 0 } }} aria-label={n.label} aria-current={on ? "page" : undefined}
                  onClick={() => { if (n.id !== tab) { setTab(n.id); sfx.nav(); haptic(5); } }} whileTap={{ scale: 0.9 }}
                  className={cn("relative flex h-14 w-14 flex-col items-center justify-center gap-0.5 transition-colors", on ? "text-fx" : "text-muted-foreground hover:text-foreground")}>
                  {on && <motion.span layoutId="railActive" className="absolute inset-0 chamfer-sm border border-cyan/70 bg-cyan/15 shadow-[inset_0_0_14px_color-mix(in_oklab,var(--cyan)_45%,transparent)]" />}
                  {on && <motion.span layoutId="railBar" className="absolute -left-[6px] top-2 h-8 w-[3px] bg-fx shadow-[0_0_10px_var(--accent-fx)]" />}
                  <n.icon width={20} height={20} className="relative" /><span className="relative text-[8px] font-semibold">{n.id === "perf" ? "Perform" : n.label}</span>
                </motion.button>); })}
              <div className="flex-1" />
              <motion.button variants={{ closed: { opacity: 0 }, open: { opacity: 1 } }} onClick={doClose} aria-label="Minimize FRONTIER" whileTap={{ scale: 0.9 }} className="flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-crimson"><Ic.IMin /></motion.button>
            </motion.nav>
            {/* Panel */}
            <motion.section variants={{ closed: { opacity: 0, scaleX: 0.3, x: -40 }, open: { opacity: 1, scaleX: 1, x: 0, transition: { ...SPRING, delay: 0.08 } } }} style={{ transformOrigin: "left center" }}
              className="relative ml-1.5 flex w-[min(330px,calc(100vw-84px))] flex-col overflow-hidden">
              <div className="absolute inset-0 chamfer border border-cyan/40 bg-glass shadow-[inset_0_0_30px_color-mix(in_oklab,var(--cyan)_12%,transparent)]" style={{ opacity: s.opacity }} />
              <motion.span key={`scan-${tab}`} initial={{ top: "0%", opacity: 1 }} animate={{ top: "100%", opacity: 0 }} transition={{ duration: 0.9, ease: "easeOut" }} className="pointer-events-none absolute inset-x-0 z-20 h-[2px] bg-cyan shadow-[0_0_16px_4px_var(--cyan)]" />
              <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-40" aria-hidden><path className="fx-circuit" d="M0 40 H40 L60 60 V300 L80 320 H300" stroke={od ? "var(--gold)" : "var(--accent-fx)"} strokeOpacity=".35" fill="none" /></svg>
              <span className="absolute left-0 right-8 top-0 h-px" style={{ background: `linear-gradient(90deg, ${od ? "var(--gold)" : "var(--accent-fx)"}, transparent)` }} />
              <header className="relative flex items-center gap-2 px-4 pb-2 pt-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2"><span className={cn("font-display text-[16px] italic tracking-[0.15em]", od ? "text-gold" : "text-foreground")}>FRONT<span className="bg-gradient-to-r from-cyan to-magenta bg-clip-text text-transparent">IER</span></span><span className="fx-pulse h-2 w-2 rounded-full bg-lime shadow-[0_0_8px_var(--lime)]" /></div>
                  <div className="text-[8px] font-semibold tracking-[0.25em] text-muted-foreground">{tab === "home" ? "GAME SPACE • PERFORMANCE • VICTORY" : `${NAV.find((n) => n.id === tab)?.label.toUpperCase()} · ${M.name.toUpperCase()}`}</div>
                </div>
                <span className="tnum text-[10px]" style={{ color: M.color }}>{t.fps}<span className="text-muted-foreground"> fps</span></span>
              </header>
              <div className="relative flex-1 overflow-y-auto overscroll-contain px-4 pb-4 [scrollbar-width:none]">
                <AnimatePresence mode="wait">
                  <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8, transition: { duration: 0.12 } }}>
                    {tab === "home" && <HomePage t={t} mode={mode} setMode={setMode} ts={ts} setTs={setTs} onRecord={onRecord} onToolsMore={() => { setTab("tools"); sfx.nav(); }} />}
                    {tab === "perf" && <PerformancePage t={t} mode={mode} setMode={setMode} s={s} upd={upd} />}
                    {tab === "tools" && <ToolsPage ts={ts} setTs={setTs} blocked={blocked} onRecord={onRecord} onReplay={onReplay} onClip={onClip} recErr={recErr} goVoice={() => { setTab("voice"); sfx.nav(); }} />}
                    {tab === "voice" && <VoicePage engine={voice} />}
                    {tab === "settings" && <SettingsPage s={s} upd={upd} />}
                  </motion.div>
                </AnimatePresence>
              </div>
              <AnimatePresence>{activating && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-obsidian/85">
                  <motion.div initial={{ scale: 0.4, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 14 }} className="text-gold"><Ic.IOverdrive width={56} height={56} /></motion.div>
                  <div className="mt-3 flex gap-1">{[0, 1, 2, 3, 4, 5].map((i) => <motion.span key={i} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.1 + i * 0.1 }} className="h-4 w-2 origin-bottom bg-crimson" />)}</div>
                  <div className="mt-3 font-display text-[11px] tracking-[0.4em] text-gold">OVERDRIVE ONLINE</div>
                </motion.div>)}</AnimatePresence>
            </motion.section>
          </motion.div>)}</AnimatePresence>
        {/* Right wing: compact reactor pod (SIM data) */}
        <AnimatePresence>{open && (
          <motion.aside key="wing" aria-label="Reactor telemetry" initial={{ x: 120, opacity: 0 }} animate={{ x: 0, opacity: 1, transition: { ...SPRING, delay: 0.15 } }} exit={{ x: 120, opacity: 0 }}
            className="pointer-events-none absolute right-0 top-1/2 z-20 hidden w-[92px] -translate-y-1/2 flex-col items-center gap-2 border-l-2 border-magenta/60 bg-glass-strong py-3 sm:flex [clip-path:polygon(18%_0,100%_0,100%_100%,18%_100%,0_88%,0_12%)]">
            <span className="fx-laser absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-transparent via-cyan to-transparent" />
            {([["GPU", t.gpu, "var(--magenta)"], ["CPU", t.cpu, "var(--cyan)"]] as const).map(([l, v, c]) => (
              <div key={l} className="relative flex h-16 w-16 items-center justify-center">
                <svg viewBox="0 0 64 64" className="absolute inset-0" style={{ color: c }}>
                  <ellipse className="fx-spin" cx="32" cy="38" rx="28" ry="10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" style={{ transformOrigin: "32px 38px" }} />
                  <ellipse className="fx-spin-rev" cx="32" cy="38" rx="20" ry="6" fill="none" stroke="currentColor" strokeOpacity=".6" strokeDasharray="3 3" style={{ transformOrigin: "32px 38px" }} />
                </svg>
                <div className="relative -mt-3 text-center"><div className="tnum text-[15px] font-bold" style={{ color: c, textShadow: `0 0 8px ${c}` }}>{v}%</div><div className="font-display text-[8px] tracking-widest text-muted-foreground">{l} · SIM</div></div>
              </div>))}
            <div className="flex flex-col-reverse gap-[3px]" aria-label={`Thermal ${t.temp}°C`}>
              {Array.from({ length: 12 }).map((_, i) => { const lit = i < Math.round((t.temp / 60) * 12); return <span key={i} className="h-[4px] transition-colors" style={{ width: 20 + i * 2, background: lit ? (i > 8 ? "var(--crimson)" : i > 5 ? "var(--gold)" : "var(--cyan)") : "var(--line)", boxShadow: lit ? "0 0 6px currentColor" : undefined }} />; })}
            </div>
            <div className="tnum text-[9px] text-muted-foreground">{t.temp}°C</div>
          </motion.aside>)}</AnimatePresence>
      </div>
    </MotionConfig>
  );
}
