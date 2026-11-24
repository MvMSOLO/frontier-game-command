import { describe, expect, it, vi } from "vitest";
import { createAndroidPlatformAdapter, type FrontierAndroidBridge } from "./native-adapter";

function createBridge(overrides: Partial<FrontierAndroidBridge> = {}): FrontierAndroidBridge {
  return {
    getPermissionStatus: vi.fn(() => "granted"),
    openPermissionSettings: vi.fn(() => "unknown"),
    getInstalledGames: vi.fn(() => JSON.stringify({
      availability: "available",
      games: [{ id: "efootball", name: "eFootball", packageName: "com.konami.pesam" }],
    })),
    getForegroundGame: vi.fn(() => "efootball"),
    ...overrides,
  };
}

describe("FRONTIER Android platform adapter", () => {
  it("reads native permission status and opens the matching Android settings screen", async () => {
    const bridge = createBridge();
    const adapter = createAndroidPlatformAdapter(bridge);

    expect(adapter.kind).toBe("android");
    expect(await adapter.getPermissionStatus("overlay")).toBe("granted");
    expect(await adapter.openPermissionSettings("usage-access")).toBe("unknown");
    expect(bridge.openPermissionSettings).toHaveBeenCalledWith("usage-access");
  });

  it("returns only the installed games supplied by the native package allowlist", async () => {
    const adapter = createAndroidPlatformAdapter(createBridge());

    await expect(adapter.getInstalledGames()).resolves.toEqual({
      availability: "available",
      games: [{ id: "efootball", name: "eFootball", packageName: "com.konami.pesam" }],
    });
    await expect(adapter.getForegroundGame()).resolves.toEqual({
      id: "efootball",
      name: "eFootball",
      packageName: "com.konami.pesam",
    });
  });

  it("reports permission-required and safely rejects malformed native responses", async () => {
    const permissionBridge = createBridge({
      getInstalledGames: vi.fn(() => JSON.stringify({ availability: "permission-required", games: [] })),
    });
    const invalidBridge = createBridge({
      getInstalledGames: vi.fn(() => "{broken"),
      getForegroundGame: vi.fn(() => "not-a-catalog-id"),
    });

    await expect(createAndroidPlatformAdapter(permissionBridge).getInstalledGames()).resolves.toEqual({
      availability: "permission-required",
      games: [],
    });
    await expect(createAndroidPlatformAdapter(invalidBridge).getInstalledGames()).resolves.toEqual({
      availability: "unsupported",
      games: [],
    });
    await expect(createAndroidPlatformAdapter(invalidBridge).getForegroundGame()).resolves.toBeNull();
  });
});
