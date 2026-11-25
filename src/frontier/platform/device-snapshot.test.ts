import { describe, expect, it } from "vitest";
import { parseDeviceSnapshot } from "./device-snapshot";

describe("parseDeviceSnapshot", () => {
  it("parses real Android memory, battery and thermal fields", () => {
    expect(parseDeviceSnapshot(JSON.stringify({
      availableMemoryMb: 3124,
      totalMemoryMb: 8192,
      lowMemory: false,
      batteryPercent: 87,
      thermalStatus: "moderate",
    }))).toEqual({
      availableMemoryMb: 3124,
      totalMemoryMb: 8192,
      lowMemory: false,
      batteryPercent: 87,
      thermalStatus: "MODERATE",
    });
  });

  it("does not turn unavailable battery data into a false zero reading", () => {
    const snapshot = parseDeviceSnapshot(JSON.stringify({
      availableMemoryMb: 1024,
      totalMemoryMb: 4096,
      lowMemory: true,
      batteryPercent: -1,
      thermalStatus: "UNSUPPORTED",
    }));
    expect(snapshot?.batteryPercent).toBeNull();
    expect(snapshot?.lowMemory).toBe(true);
  });

  it("rejects malformed or incomplete bridge responses", () => {
    expect(parseDeviceSnapshot("not-json")).toBeNull();
    expect(parseDeviceSnapshot(JSON.stringify({ availableMemoryMb: -2 }))).toBeNull();
    expect(parseDeviceSnapshot(undefined)).toBeNull();
  });
});
