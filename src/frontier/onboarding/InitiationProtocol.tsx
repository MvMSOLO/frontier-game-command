import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Gamepad2, Search, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { GAME_CATALOG, type GameCatalogItem } from "./catalog";
import { GameArtwork, ReactorArtwork } from "../components/Artwork";
import { completeOnboarding, ONBOARDING_STEPS, type OnboardingState, type OnboardingStep } from "./model";
import { getPlatformAdapter, SYSTEM_PERMISSION_IDS, type PermissionStatus, type PlatformAdapter, type SystemPermissionId } from "../platform";

interface InitiationProtocolProps {
  initialState: OnboardingState;
  onStateChange: (state: OnboardingState) => void;
  onComplete: (state: OnboardingState) => void;
  adapter?: PlatformAdapter;
}
const STEP_LABELS: Record<OnboardingStep, string> = { welcome: "WELCOME", permissions: "ACCESS", games: "GAMES", review: "REVIEW", ready: "READY" };
const PERMISSION_INFO: Array<{ id: SystemPermissionId; title: string; description: string; purpose: string }> = [
  { id: "overlay", title: "Display over other apps", description: "Allows the FRONTIER game panel to appear above a running game.", purpose: "Game Space overlay" },
  { id: "usage-access", title: "Usage access", description: "Allows FRONTIER to identify which supported game is currently in use.", purpose: "Active game detection" },
  { id: "notification-access", title: "Notification access", description: "Enables optional notification awareness and distraction controls.", purpose: "Notification controls" },
];
const STATUS_LABELS: Record<PermissionStatus, string> = { unknown: "NOT CHECKED", granted: "GRANTED", denied: "NOT GRANTED", restricted: "RESTRICTED", unsupported: "NATIVE REQUIRED" };
const CATEGORIES = ["All", "Battle Royale", "MOBA", "Sports", "Racing", "Sandbox", "Action"] as const;
function StageDots({ active }: { active: OnboardingStep }) {
  const activeIndex = ONBOARDING_STEPS.indexOf(active);
  return <div className="frontier-init-progress" aria-label={"Setup stage " + (activeIndex + 1) + " of 5"}>
    {ONBOARDING_STEPS.map((step, index) => <div className="frontier-init-progress-item" key={step}><span className={index <= activeIndex ? "is-active" : ""} /><small>{STEP_LABELS[step]}</small></div>)}
  </div>;
}
function PermissionCard({ item, status, onCheck }: { item: (typeof PERMISSION_INFO)[number]; status: PermissionStatus; onCheck: () => void }) {
  return <article className="frontier-init-permission">
    <div className="frontier-init-permission-icon"><ShieldCheck size={19} /></div>
    <div className="frontier-init-permission-copy"><div className="frontier-init-permission-title">{item.title}</div><p>{item.description}</p><small>{item.purpose}</small></div>
    <div className="frontier-init-permission-action"><span className={"frontier-init-status status-" + status}>{STATUS_LABELS[status]}</span>
      <button type="button" onClick={onCheck} disabled={status === "unsupported"} aria-label={"Check " + item.title}>{status === "granted" ? <Check size={14} /> : "CHECK"}</button>
    </div>
  </article>;
}
function GameCard({ game, selected, onToggle }: { game: GameCatalogItem; selected: boolean; onToggle: () => void }) {
  return <button type="button" className={"frontier-init-game" + (selected ? " is-selected" : "")} aria-pressed={selected} onClick={onToggle}>
    <span className="frontier-init-game-art"><GameArtwork gameId={game.id} /></span><span className="frontier-init-game-copy"><strong>{game.name}</strong><small>{game.category}</small></span>
    <span className="frontier-init-game-check">{selected ? <Check size={14} /> : "+"}</span>
  </button>;
}
export function InitiationProtocol({ initialState, onStateChange, onComplete, adapter = getPlatformAdapter() }: InitiationProtocolProps) {
  const [state, setState] = useState(initialState);
  const [permissionStatuses, setPermissionStatuses] = useState<Record<SystemPermissionId, PermissionStatus>>({ overlay: "unknown", "usage-access": "unknown", "notification-access": "unknown" });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const entries = await Promise.all(SYSTEM_PERMISSION_IDS.map(async (id) => ({ id, status: await adapter.getPermissionStatus(id) })));
      if (active) setPermissionStatuses((current) => {
        const next = { ...current };
        entries.forEach(({ id, status }) => { next[id] = status; });
        return next;
      });
    };
    void refresh();
    const handleVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", handleVisible);
    return () => { active = false; document.removeEventListener("visibilitychange", handleVisible); };
  }, [adapter]);
  const updateState = (next: OnboardingState) => { setState(next); onStateChange(next); };
  const goTo = (step: OnboardingStep) => updateState({ ...state, status: "in-progress", currentStep: step, completedAt: null });
  const toggleGame = (id: string) => {
    const selected = state.selectedGameIds.includes(id) ? state.selectedGameIds.filter((gameId) => gameId !== id) : [...state.selectedGameIds, id];
    updateState({ ...state, selectedGameIds: selected });
  };
  const filteredGames = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return GAME_CATALOG.filter((game) => (!query || game.name.toLocaleLowerCase().includes(query)) && (category === "All" || game.category === category));
  }, [search, category]);
  const permissionCount = Object.values(permissionStatuses).filter((status) => status === "granted").length;
  const nextStep = () => { const next = ONBOARDING_STEPS[Math.min(ONBOARDING_STEPS.indexOf(state.currentStep) + 1, ONBOARDING_STEPS.length - 1)]; if (next) goTo(next); };
  const previousStep = () => { const previous = ONBOARDING_STEPS[Math.max(ONBOARDING_STEPS.indexOf(state.currentStep) - 1, 0)]; if (previous) goTo(previous); };
  const checkPermission = async (id: SystemPermissionId) => { const status = await adapter.openPermissionSettings(id); setPermissionStatuses((current) => ({ ...current, [id]: status })); };
  const isReady = state.currentStep === "ready";
  return <MotionConfig reducedMotion="user">
    <main className="frontier-init-shell">
      <div className="frontier-init-ambient frontier-init-ambient-core" /><div className="frontier-init-ambient frontier-init-ambient-nexus" />
      <section className="frontier-init-frame">
        <header className="frontier-init-header"><div className="frontier-init-brand"><div className="frontier-init-brand-mark"><Zap size={20} /></div><div><strong>FRONTIER</strong><small>GAME SPACE & PERFORMANCE ENGINE</small></div></div><div className="frontier-init-protocol-id">INITIATION PROTOCOL <span>V1.0</span></div></header>
        <StageDots active={state.currentStep} />
        <AnimatePresence mode="wait">
          <motion.div key={state.currentStep} className="frontier-init-stage" initial={{ opacity: 0, y: 12, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -8, filter: "blur(3px)" }} transition={{ duration: 0.22, ease: "easeOut" }}>
            {state.currentStep === "welcome" && <div className="frontier-init-welcome">
              <div className="frontier-init-eyebrow"><span /> SYSTEM INITIALIZATION / 01</div>
              <div className="frontier-init-reactor" aria-hidden="true"><ReactorArtwork className="frontier-init-reactor-art" /><div className="frontier-init-reactor-ring ring-one" /><div className="frontier-init-reactor-ring ring-two" /><div className="frontier-init-reactor-core"><Zap size={36} /></div></div>
              <h1>YOUR GAME SPACE.<br /><span>YOUR CONTROL.</span></h1><p>Configure your game library and review the system capabilities FRONTIER can use on this device.</p>
              <div className="frontier-init-feature-row"><span><ShieldCheck size={15} /> CONTROL</span><span><Gamepad2 size={15} /> GAME LIBRARY</span><span><Sparkles size={15} /> PERSONAL SETUP</span></div>
            </div>}
            {state.currentStep === "permissions" && <div className="frontier-init-content">
              <div className="frontier-init-eyebrow"><span /> SYSTEM ACCESS / 02</div><h1>CONNECT YOUR<br /><span>CAPABILITIES.</span></h1>
              <p className="frontier-init-lead">Review the Android capabilities FRONTIER may use. You can continue without granting optional access.</p>
              <div className="frontier-init-permission-list">{PERMISSION_INFO.map((item) => <PermissionCard key={item.id} item={item} status={permissionStatuses[item.id]} onCheck={() => void checkPermission(item.id)} />)}</div>
              <div className="frontier-init-note"><span className="frontier-init-note-dot" />{adapter.kind === "browser" ? "BROWSER PREVIEW — Android system permissions are unavailable here. No permission is being simulated." : permissionCount + " of 3 system permissions granted on this device."}</div>
            </div>}
            {state.currentStep === "games" && <div className="frontier-init-content">
              <div className="frontier-init-eyebrow"><span /> GAME LIBRARY / 03</div>
              <div className="frontier-init-heading-row"><div><h1>CHOOSE YOUR<br /><span>ARENA.</span></h1><p className="frontier-init-lead">Select the games you want FRONTIER to organize. You can change this later in Settings.</p></div><div className="frontier-init-selected-count"><strong>{state.selectedGameIds.length.toString().padStart(2, "0")}</strong><small>SELECTED</small></div></div>
              <label className="frontier-init-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your games..." aria-label="Search games" />{search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search">×</button>}</label>
              <div className="frontier-init-categories" aria-label="Filter games by category">{CATEGORIES.map((item) => <button type="button" key={item} className={category === item ? "is-active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
              <div className="frontier-init-game-grid">{filteredGames.map((game) => <GameCard key={game.id} game={game} selected={state.selectedGameIds.includes(game.id)} onToggle={() => toggleGame(game.id)} />)}{filteredGames.length === 0 && <div className="frontier-init-empty">NO MATCHING GAMES FOUND</div>}</div>
              <div className="frontier-init-note"><span className="frontier-init-note-dot" />{adapter.kind === "browser" ? "DEMO CATALOG — The browser cannot inspect installed Android apps. Device game discovery is reserved for the Android adapter." : "Installed games are supplied by the connected Android platform adapter."}</div>
            </div>}
            {state.currentStep === "review" && <div className="frontier-init-content">
              <div className="frontier-init-eyebrow"><span /> CONFIGURATION REVIEW / 04</div><h1>VERIFY YOUR<br /><span>CONFIGURATION.</span></h1><p className="frontier-init-lead">Check the selections and device capabilities before activation.</p>
              <div className="frontier-init-review-grid">
                <article><span className="frontier-init-review-icon"><Gamepad2 size={19} /></span><div><small>GAME LIBRARY</small><strong>{state.selectedGameIds.length} selected</strong></div><button type="button" onClick={() => goTo("games")}>EDIT</button></article>
                <article><span className="frontier-init-review-icon"><ShieldCheck size={19} /></span><div><small>SYSTEM PERMISSIONS</small><strong>{permissionCount} of 3 granted</strong></div><button type="button" onClick={() => goTo("permissions")}>REVIEW</button></article>
              </div>
              <div className="frontier-init-review-games"><small>SELECTED TITLES</small>{state.selectedGameIds.length > 0 ? GAME_CATALOG.filter((game) => state.selectedGameIds.includes(game.id)).map((game) => <span key={game.id}><GameArtwork gameId={game.id} className="frontier-init-review-game-art" /><span>{game.name}</span></span>) : <span>No games selected yet. You can add games later in Settings.</span>}</div>
              <div className="frontier-init-note"><span className="frontier-init-note-dot" />Missing permissions do not block setup. Features requiring unavailable access remain inactive.</div>
            </div>}
            {state.currentStep === "ready" && <div className="frontier-init-welcome frontier-init-ready">
              <div className="frontier-init-eyebrow"><span /> INITIALIZATION COMPLETE / 05</div><div className="frontier-init-ready-mark"><CheckCircle2 size={54} /></div>
              <h1>FRONTIER IS<br /><span>READY.</span></h1><p>Your setup is saved. The selected library and permission status can be reviewed from Settings at any time.</p>
              <div className="frontier-init-ready-summary"><div><small>SELECTED GAMES</small><strong>{state.selectedGameIds.length.toString().padStart(2, "0")}</strong></div><div><small>PERMISSIONS</small><strong>{permissionCount}/03</strong></div><div><small>PLATFORM</small><strong>{adapter.kind.toUpperCase()}</strong></div></div>
            </div>}
          </motion.div>
        </AnimatePresence>
        <footer className="frontier-init-footer"><div className="frontier-init-footer-meta"><span>FRONTIER / TWIN-CORE</span><small>GAME FIRST · SYSTEM AWARE</small></div>
          <div className="frontier-init-actions">{state.currentStep !== "welcome" && <button type="button" className="frontier-init-back" onClick={previousStep}><ArrowLeft size={15} /> BACK</button>}
            {isReady ? <button type="button" className="frontier-init-primary" onClick={() => onComplete(completeOnboarding(state))}>ENTER FRONTIER <ArrowRight size={16} /></button> : <button type="button" className="frontier-init-primary" onClick={nextStep}>{state.currentStep === "welcome" ? "INITIALIZE SYSTEM" : state.currentStep === "review" ? "ACTIVATE FRONTIER" : "CONTINUE"} <ArrowRight size={16} /></button>}
          </div>
        </footer>
      </section>
      <div className="frontier-init-corner frontier-init-corner-left">SYS / INIT / 001</div><div className="frontier-init-corner frontier-init-corner-right">SECURE SESSION</div>
    </main>
  </MotionConfig>;
}