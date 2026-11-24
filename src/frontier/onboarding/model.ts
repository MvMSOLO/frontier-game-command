export const ONBOARDING_VERSION = 1 as const;
export const ONBOARDING_STORAGE_KEY = "frontier.onboarding.v1";
export const ONBOARDING_STEPS = ["welcome", "permissions", "games", "review", "ready"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
export type OnboardingStatus = "in-progress" | "complete";
export interface OnboardingState {
  version: typeof ONBOARDING_VERSION;
  status: OnboardingStatus;
  currentStep: OnboardingStep;
  selectedGameIds: string[];
  completedAt: string | null;
}
export function createInitialOnboardingState(): OnboardingState {
  return { version: ONBOARDING_VERSION, status: "in-progress", currentStep: "welcome", selectedGameIds: [], completedAt: null };
}
export function normalizeOnboardingState(value: unknown): OnboardingState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return createInitialOnboardingState();
  const candidate = value as Record<string, unknown>;
  const validStep = ONBOARDING_STEPS.some((step) => step === candidate.currentStep);
  const validStatus = candidate.status === "in-progress" || candidate.status === "complete";
  const validCompletion = candidate.completedAt === null || typeof candidate.completedAt === "string";
  if (candidate.version !== ONBOARDING_VERSION || !validStep || !validStatus || !validCompletion) return createInitialOnboardingState();
  if (candidate.status === "complete" && (typeof candidate.completedAt !== "string" || Number.isNaN(Date.parse(candidate.completedAt)))) return createInitialOnboardingState();
  return {
    version: ONBOARDING_VERSION,
    status: candidate.status,
    currentStep: candidate.currentStep as OnboardingStep,
    selectedGameIds: Array.isArray(candidate.selectedGameIds) ? candidate.selectedGameIds.filter((id): id is string => typeof id === "string") : [],
    completedAt: candidate.completedAt as string | null,
  };
}
export function completeOnboarding(state: OnboardingState, completedAt = new Date().toISOString()): OnboardingState {
  return { ...state, version: ONBOARDING_VERSION, status: "complete", currentStep: "ready", completedAt };
}