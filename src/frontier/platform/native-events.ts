export type NativeGameSummary = {
  id: string;
  name: string;
  packageName: string;
};

export type NativeEventPayloads = {
  "game-library": {
    availability: "available" | "permission-required" | "unsupported";
    games: NativeGameSummary[];
  };
  "game-state": {
    status: "idle" | "running" | "game-active" | "permission-required" | "unavailable";
    game: NativeGameSummary | null;
  };
  "detector-state": {
    status: "disabled" | "running" | "permission-required" | "unavailable";
  };
  "selection-state": { selectedGameIds: string[] };
  "permission-state": Record<string, string>;
  "overlay-state": { expanded: boolean };
};

export type NativeEventType = keyof NativeEventPayloads;
export interface NativeEventEnvelope<T extends NativeEventType = NativeEventType> {
  version: 1;
  sequence: number;
  type: T;
  payload: NativeEventPayloads[T];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isGame(value: unknown): value is NativeGameSummary {
  return isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.packageName === "string";
}

export function parseNativeEvent(value: unknown): NativeEventEnvelope | null {
  if (!isRecord(value) || value.version !== 1 ||
    !Number.isSafeInteger(value.sequence) || (value.sequence as number) < 1 ||
    typeof value.type !== "string" || !isRecord(value.payload)) return null;

  const payload = value.payload;
  switch (value.type) {
    case "game-library":
      if (!["available", "permission-required", "unsupported"].includes(String(payload.availability)) ||
        !Array.isArray(payload.games) || !payload.games.every(isGame)) return null;
      break;
    case "game-state":
      if (!["idle", "running", "game-active", "permission-required", "unavailable"].includes(String(payload.status)) ||
        (payload.game !== null && !isGame(payload.game))) return null;
      break;
    case "detector-state":
      if (!["disabled", "running", "permission-required", "unavailable"].includes(String(payload.status))) return null;
      break;
    case "selection-state":
      if (!Array.isArray(payload.selectedGameIds) || !payload.selectedGameIds.every((id) => typeof id === "string")) return null;
      break;
    case "permission-state":
      if (!Object.values(payload).every((status) => typeof status === "string")) return null;
      break;
    case "overlay-state":
      if (typeof payload.expanded !== "boolean") return null;
      break;
    default:
      return null;
  }

  return value as unknown as NativeEventEnvelope;
}

export function subscribeNativeEvents(
  listener: (event: NativeEventEnvelope) => void,
  target: EventTarget | null = typeof window === "undefined" ? null : window,
): () => void {
  if (!target) return () => undefined;
  let lastSequence = 0;
  const handle = (event: Event) => {
    const detail = (event as CustomEvent<unknown>).detail;
    const parsed = parseNativeEvent(detail);
    if (!parsed || parsed.sequence <= lastSequence) return;
    lastSequence = parsed.sequence;
    listener(parsed);
  };
  target.addEventListener("frontier:native-event", handle);
  return () => target.removeEventListener("frontier:native-event", handle);
}
