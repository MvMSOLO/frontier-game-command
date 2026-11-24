import { useCallback, useEffect, useState } from "react";
import { Frontier } from "./Frontier";
import { InitiationProtocol } from "./onboarding/InitiationProtocol";
import { createInitialOnboardingState, type OnboardingState } from "./onboarding/model";
import { readOnboardingState, writeOnboardingState } from "./onboarding/persistence";
import { useSettings } from "./store";
import { LanguageProvider, useText } from "./i18n";
type EntryView = "initializing" | "onboarding" | "frontier";
function InitializingScreen({ language }: { language: "en" | "ru" }) {
  return <LanguageProvider language={language}><InitializingScreenContent /></LanguageProvider>;
}
function InitializingScreenContent() {
  const t = useText();
  return <main className="frontier-entry-loading"><div className="frontier-entry-loading-mark">F<span>/</span></div><div className="frontier-entry-loading-name">FRONTIER</div><div className="frontier-entry-loading-line"><span /></div><small>{t("CHECKING LOCAL CONFIGURATION")}</small></main>;
}
export function FrontierEntry() {
  const [view, setView] = useState<EntryView>("initializing");
  const [settings] = useSettings();
  const [setup, setSetup] = useState<OnboardingState>(createInitialOnboardingState());
  useEffect(() => {
    const saved = readOnboardingState();
    setSetup(saved);
    setView(saved.status === "complete" ? "frontier" : "onboarding");
    window.FrontierAndroid?.setSelectedGames?.(JSON.stringify(saved.selectedGameIds));
  }, []);
  const persist = useCallback((next: OnboardingState) => {
    setSetup(next);
    writeOnboardingState(next);
    window.FrontierAndroid?.setSelectedGames?.(JSON.stringify(next.selectedGameIds));
  }, []);
  const complete = useCallback((next: OnboardingState) => { persist(next); setView("frontier"); }, [persist]);
  const manageSetup = useCallback(() => {
    const next: OnboardingState = { ...setup, status: "in-progress", currentStep: "games", completedAt: null };
    persist(next);
    setView("onboarding");
  }, [persist, setup]);
  useEffect(() => {
    const openSetup = () => manageSetup();
    window.addEventListener("frontier:manage-setup", openSetup);
    return () => window.removeEventListener("frontier:manage-setup", openSetup);
  }, [manageSetup]);
  if (view === "initializing") return <InitializingScreen language={settings.language} />;
  if (view === "onboarding") return <InitiationProtocol initialState={setup} onStateChange={persist} onComplete={complete} />;
  return <Frontier onManageSetup={manageSetup} />;
}