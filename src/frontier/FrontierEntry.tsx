import { useCallback, useEffect, useState } from "react";
import { Frontier } from "./Frontier";
import { InitiationProtocol } from "./onboarding/InitiationProtocol";
import { createInitialOnboardingState, type OnboardingState } from "./onboarding/model";
import { readOnboardingState, writeOnboardingState } from "./onboarding/persistence";
type EntryView = "initializing" | "onboarding" | "frontier";
function InitializingScreen() {
  return <main className="frontier-entry-loading"><div className="frontier-entry-loading-mark">F<span>/</span></div><div className="frontier-entry-loading-name">FRONTIER</div><div className="frontier-entry-loading-line"><span /></div><small>CHECKING LOCAL CONFIGURATION</small></main>;
}
export function FrontierEntry() {
  const [view, setView] = useState<EntryView>("initializing");
  const [setup, setSetup] = useState<OnboardingState>(createInitialOnboardingState());
  useEffect(() => { const saved = readOnboardingState(); setSetup(saved); setView(saved.status === "complete" ? "frontier" : "onboarding"); }, []);
  const persist = useCallback((next: OnboardingState) => { setSetup(next); writeOnboardingState(next); }, []);
  const complete = useCallback((next: OnboardingState) => { persist(next); setView("frontier"); }, [persist]);
  const manageSetup = useCallback(() => {
    const next: OnboardingState = { ...setup, status: "in-progress", currentStep: "games", completedAt: null };
    persist(next); setView("onboarding");
  }, [persist, setup]);
  if (view === "initializing") return <InitializingScreen />;
  if (view === "onboarding") return <InitiationProtocol initialState={setup} onStateChange={persist} onComplete={complete} />;
  return <Frontier onManageSetup={manageSetup} />;
}