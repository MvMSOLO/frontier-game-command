import { describe, expect, it } from "vitest";
import { GAME_CATALOG } from "./onboarding/catalog";
import { GAME_ART, MODE_ART, REACTOR_ART, SCENE_ART, VISUAL_ASSET_COUNT } from "./assets";

describe("FRONTIER visual asset manifest", () => {
  it("maps every game catalog entry to local artwork", () => {
    expect(Object.keys(GAME_ART).sort()).toEqual(GAME_CATALOG.map((game) => game.id).sort());
    expect(Object.values(GAME_ART).every((src) => typeof src === "string" && src.length > 0)).toBe(true);
  });

  it("provides all performance modes plus the shared scene and reactor artwork", () => {
    expect(Object.keys(MODE_ART).sort()).toEqual(["balanced", "hyper", "overdrive", "stealth"]);
    expect(SCENE_ART).toBeTruthy();
    expect(REACTOR_ART).toBeTruthy();
    expect(VISUAL_ASSET_COUNT).toBe(18);
  });
});
