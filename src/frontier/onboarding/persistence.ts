import { createInitialOnboardingState, normalizeOnboardingState, ONBOARDING_STORAGE_KEY, type OnboardingState } from "./model";
export interface OnboardingStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void; }
function resolveStorage(storage?: OnboardingStorage): OnboardingStorage | undefined {
  if (storage) return storage;
  if (typeof window === "undefined") return undefined;
  try { return window.localStorage; } catch { return undefined; }
}
export function readOnboardingState(storage?: OnboardingStorage): OnboardingState {
  try { const value = resolveStorage(storage)?.getItem(ONBOARDING_STORAGE_KEY); if (!value) return createInitialOnboardingState(); return normalizeOnboardingState(JSON.parse(value) as unknown); }
  catch { return createInitialOnboardingState(); }
}
export function writeOnboardingState(state: OnboardingState, storage?: OnboardingStorage): boolean {
  try { const target = resolveStorage(storage); if (!target) return false; target.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state)); return true; }
  catch { return false; }
}
export function clearOnboardingState(storage?: OnboardingStorage): boolean {
  try { const target = resolveStorage(storage); if (!target) return false; target.removeItem(ONBOARDING_STORAGE_KEY); return true; }
  catch { return false; }
}