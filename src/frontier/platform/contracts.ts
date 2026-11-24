export const SYSTEM_PERMISSION_IDS = ["overlay", "usage-access", "notification-access"] as const;
export type SystemPermissionId = (typeof SYSTEM_PERMISSION_IDS)[number];
export type PermissionStatus = "unknown" | "granted" | "denied" | "restricted" | "unsupported";
export interface DiscoveredGame { id: string; name: string; packageName: string; }
export interface GameDiscoveryResult { availability: "available" | "unsupported"; games: DiscoveredGame[]; }
export interface PlatformAdapter {
  readonly kind: "browser" | "android";
  getPermissionStatus(id: SystemPermissionId): Promise<PermissionStatus>;
  openPermissionSettings(id: SystemPermissionId): Promise<PermissionStatus>;
  getInstalledGames(): Promise<GameDiscoveryResult>;
}