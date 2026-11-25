export type DeviceSnapshot = {
  availableMemoryMb: number;
  totalMemoryMb: number;
  lowMemory: boolean;
  batteryPercent: number | null;
  thermalStatus: string;
};

function finiteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function parseDeviceSnapshot(encoded: string | null | undefined): DeviceSnapshot | null {
  if (!encoded) return null;
  try {
    const value = JSON.parse(encoded) as Record<string, unknown>;
    if (
      !finiteNonNegative(value.availableMemoryMb) ||
      !finiteNonNegative(value.totalMemoryMb) ||
      typeof value.lowMemory !== "boolean"
    ) return null;

    const battery = value.batteryPercent;
    const batteryPercent =
      typeof battery === "number" && Number.isFinite(battery) && battery >= 0 && battery <= 100
        ? Math.round(battery)
        : null;
    const thermalStatus =
      typeof value.thermalStatus === "string" && value.thermalStatus.trim()
        ? value.thermalStatus.trim().toUpperCase()
        : "UNSUPPORTED";

    return {
      availableMemoryMb: Math.round(value.availableMemoryMb),
      totalMemoryMb: Math.round(value.totalMemoryMb),
      lowMemory: value.lowMemory,
      batteryPercent,
      thermalStatus,
    };
  } catch {
    return null;
  }
}
