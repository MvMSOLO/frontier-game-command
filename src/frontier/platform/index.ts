import { browserPlatformAdapter } from "./browser-adapter";
import { getNativePlatformAdapter } from "./native-adapter";
import type { PlatformAdapter } from "./contracts";

export function getPlatformAdapter(): PlatformAdapter {
  return getNativePlatformAdapter() ?? browserPlatformAdapter;
}

export type { DiscoveredGame, GameDiscoveryResult, PermissionStatus, PlatformAdapter, SystemPermissionId } from "./contracts";
export { SYSTEM_PERMISSION_IDS } from "./contracts";
