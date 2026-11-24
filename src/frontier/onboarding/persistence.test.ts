import { describe, expect, it } from "vitest";
import { createInitialOnboardingState } from "./model";
import { readOnboardingState, writeOnboardingState, type OnboardingStorage } from "./persistence";
function createMemoryStorage(): OnboardingStorage {
  const values = new Map<string, string>();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: (key) => { values.delete(key); } };
}
describe("FRONTIER onboarding persistence", () => {
  it("returns a fresh setup when no setup has been stored", () => { expect(readOnboardingState(createMemoryStorage())).toEqual(createInitialOnboardingState()); });
  it("persists selected games and current stage", () => {
    const storage = createMemoryStorage();
    const state = { ...createInitialOnboardingState(), currentStep: "review" as const, selectedGameIds: ["pubg-mobile"] };
    expect(writeOnboardingState(state, storage)).toBe(true);
    expect(readOnboardingState(storage)).toEqual(state);
  });
  it("recovers from storage read and write failures", () => {
    const brokenStorage: OnboardingStorage = { getItem: () => { throw new Error("storage blocked"); }, setItem: () => { throw new Error("storage blocked"); }, removeItem: () => { throw new Error("storage blocked"); } };
    expect(readOnboardingState(brokenStorage)).toEqual(createInitialOnboardingState());
    expect(writeOnboardingState(createInitialOnboardingState(), brokenStorage)).toBe(false);
  });
});