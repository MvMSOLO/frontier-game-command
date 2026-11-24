import { browserPlatformAdapter } from "./browser-adapter";
import type { PlatformAdapter } from "./contracts";
export function getPlatformAdapter(): PlatformAdapter { return browserPlatformAdapter; }
export type { GameDiscoveryResult, PermissionStatus, PlatformAdapter, SystemPermissionId } from "./contracts";
export { SYSTEM_PERMISSION_IDS } from "./contracts";