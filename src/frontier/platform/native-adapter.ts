import type { DiscoveredGame, GameDiscoveryResult, PermissionStatus, PlatformAdapter, SystemPermissionId } from "./contracts";

export interface FrontierAndroidBridge {
  getPermissionStatus(permissionId: string): string;
  openPermissionSettings(permissionId: string): string;
  getInstalledGames(): string;
  getForegroundGame(): string;
  startOverlay?(): boolean;
  minimizeOverlay?(): void;
  stopOverlay?(): void;
}

declare global {
  interface Window {
    FrontierAndroid?: FrontierAndroidBridge;
  }
}

const PERMISSION_STATUSES = new Set<PermissionStatus>([
  "unknown",
  "granted",
  "denied",
  "restricted",
  "unsupported",
]);

function permissionStatus(value: string): PermissionStatus {
  return PERMISSION_STATUSES.has(value as PermissionStatus)
    ? (value as PermissionStatus)
    : "unknown";
}

function parseGame(value: unknown): DiscoveredGame | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.name !== "string" ||
    typeof candidate.packageName !== "string"
  ) return null;
  return { id: candidate.id, name: candidate.name, packageName: candidate.packageName };
}

function parseDiscovery(value: string): GameDiscoveryResult {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const availability = parsed.availability;
    if (
      availability !== "available" &&
      availability !== "permission-required" &&
      availability !== "unsupported"
    ) return { availability: "unsupported", games: [] };

    const games = Array.isArray(parsed.games)
      ? parsed.games.map(parseGame).filter((game): game is DiscoveredGame => game !== null)
      : [];
    return { availability, games };
  } catch {
    return { availability: "unsupported", games: [] };
  }
}

export function createAndroidPlatformAdapter(bridge: FrontierAndroidBridge): PlatformAdapter {
  return {
    kind: "android",
    async getPermissionStatus(id: SystemPermissionId) {
      try {
        return permissionStatus(bridge.getPermissionStatus(id));
      } catch {
        return "unsupported";
      }
    },
    async openPermissionSettings(id: SystemPermissionId) {
      try {
        return permissionStatus(bridge.openPermissionSettings(id));
      } catch {
        return "unsupported";
      }
    },
    async getInstalledGames() {
      try {
        return parseDiscovery(bridge.getInstalledGames());
      } catch {
        return { availability: "unsupported", games: [] };
      }
    },
    async getForegroundGame() {
      try {
        const encoded = bridge.getForegroundGame();
        if (!encoded) return null;
        return parseGame(JSON.parse(encoded));
      } catch {
        return null;
      }
    },
  };
}

export function getNativePlatformAdapter(): PlatformAdapter | null {
  if (typeof window === "undefined" || !window.FrontierAndroid) return null;
  return createAndroidPlatformAdapter(window.FrontierAndroid);
}
