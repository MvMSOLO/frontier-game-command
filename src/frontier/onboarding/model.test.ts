import { describe, expect, it } from "vitest";
import { completeOnboarding, createInitialOnboardingState, normalizeOnboardingState } from "./model";
describe("FRONTIER onboarding state model", () => {
  it("starts a new setup at the welcome stage", () => {
    expect(createInitialOnboardingState()).toEqual({ version: 1, status: "in-progress", currentStep: "welcome", selectedGameIds: [], completedAt: null });
  });
  it("preserves a valid in-progress setup and selected game IDs", () => {
    const state = normalizeOnboardingState({ version: 1, status: "in-progress", currentStep: "games", selectedGameIds: ["pubg-mobile", "efootball"], completedAt: null });
    expect(state.currentStep).toBe("games");
    expect(state.selectedGameIds).toEqual(["pubg-mobile", "efootball"]);
  });
  it("resets corrupt or incompatible setup data without throwing", () => {
    expect(normalizeOnboardingState("{broken")).toEqual(createInitialOnboardingState());
    expect(normalizeOnboardingState({ version: 99, status: "complete", currentStep: "ready" })).toEqual(createInitialOnboardingState());
    expect(normalizeOnboardingState({ version: 1, status: "complete", currentStep: "ready", completedAt: "not-a-date" })).toEqual(createInitialOnboardingState());
  });
  it("marks setup complete with a stable timestamp", () => {
    const state = completeOnboarding(createInitialOnboardingState(), "2026-11-24T12:00:00.000Z");
    expect(state.status).toBe("complete");
    expect(state.currentStep).toBe("ready");
    expect(state.completedAt).toBe("2026-11-24T12:00:00.000Z");
  });
});