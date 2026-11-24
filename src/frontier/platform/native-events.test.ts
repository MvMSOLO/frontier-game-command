import { describe, expect, it, vi } from "vitest";
import { parseNativeEvent, subscribeNativeEvents } from "./native-events";

describe("FRONTIER native event contract", () => {
  it("accepts a valid game-state event with a recognized selected game", () => {
    expect(parseNativeEvent({
      version: 1,
      sequence: 4,
      type: "game-state",
      payload: {
        status: "game-active",
        game: { id: "efootball", name: "eFootball", packageName: "com.konami.pesam" },
      },
    })).toMatchObject({ type: "game-state", sequence: 4 });
  });

  it("rejects unsupported versions, malformed payloads and unknown event types", () => {
    expect(parseNativeEvent({ version: 2, sequence: 1, type: "overlay-state", payload: { expanded: true } })).toBeNull();
    expect(parseNativeEvent({ version: 1, sequence: 1, type: "overlay-state", payload: { expanded: "true" } })).toBeNull();
    expect(parseNativeEvent({ version: 1, sequence: 1, type: "made-up", payload: {} })).toBeNull();
  });

  it("ignores duplicate and out-of-order native events", () => {
    const target = new EventTarget();
    const listener = vi.fn();
    const dispose = subscribeNativeEvents(listener, target);
    const dispatch = (sequence: number) => target.dispatchEvent(new CustomEvent("frontier:native-event", {
      detail: { version: 1, sequence, type: "overlay-state", payload: { expanded: true } },
    }));
    dispatch(2);
    dispatch(2);
    dispatch(1);
    dispatch(3);
    dispose();
    dispatch(4);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls.map(([event]) => event.sequence)).toEqual([2, 3]);
  });
});
