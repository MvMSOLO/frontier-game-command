import { describe, expect, it } from "vitest";
import { browserPlatformAdapter } from "./browser-adapter";
import { SYSTEM_PERMISSION_IDS } from "./contracts";
describe("FRONTIER browser platform adapter", () => {
  it("never reports Android-only permissions as granted in a browser preview", async () => {
    const statuses = await Promise.all(SYSTEM_PERMISSION_IDS.map((id) => browserPlatformAdapter.getPermissionStatus(id)));
    expect(statuses).toEqual(["unsupported", "unsupported", "unsupported"]);
  });
  it("does not pretend browser preview can open Android settings", async () => {
    expect(await browserPlatformAdapter.openPermissionSettings("overlay")).toBe("unsupported");
  });
  it("does not claim to discover installed Android games in a browser", async () => {
    expect(await browserPlatformAdapter.getInstalledGames()).toEqual({ availability: "unsupported", games: [] });
  });
});