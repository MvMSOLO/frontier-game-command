import type { GameDiscoveryResult, PermissionStatus, PlatformAdapter, SystemPermissionId } from "./contracts";
export const browserPlatformAdapter: PlatformAdapter = {
  kind: "browser",
  async getPermissionStatus(_id: SystemPermissionId): Promise<PermissionStatus> { return "unsupported"; },
  async openPermissionSettings(_id: SystemPermissionId): Promise<PermissionStatus> { return "unsupported"; },
  async getInstalledGames(): Promise<GameDiscoveryResult> { return { availability: "unsupported", games: [] }; },
  async getForegroundGame() { return null; },
};