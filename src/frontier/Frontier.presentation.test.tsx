import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Frontier } from "./Frontier";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  MotionConfig: ({ children }: { children: React.ReactNode }) => children,
  motion: new Proxy({}, { get: (_target, tag) => tag }),
  useMotionValue: () => ({ get: () => 0, set: vi.fn() }),
  useTransform: () => 0.5,
}));

vi.mock("./audio", () => ({
  haptic: vi.fn(),
  playSfx: vi.fn(),
  setHaptics: vi.fn(),
  setSound: vi.fn(),
}));

vi.mock("./telemetry", () => ({
  useTelemetry: () => ({
    fps: 60, frameTime: 16.7, stability: 99, history: Array(60).fill(60), refresh: 60,
    cpu: 0, gpu: 0, temp: 0, battery: 80, charging: false, batteryReal: true,
    ping: null, pingReal: false,
  }),
}));

vi.mock("./store", () => ({
  useSettings: () => [{
    accent: "cyan", motion: 1, sound: true, volume: 0.35, haptics: true,
    edgeSensitivity: 40, autoHide: 0, opacity: 0.9, miniFps: true,
    startMode: "balanced", refresh: 60, pacing: true, language: "en",
  }, vi.fn()],
}));

vi.mock("./pages", () => ({
  MODES: {
    balanced: { name: "Balanced", color: "#50e5ff", target: "60/90", tag: "Adaptive" },
    stealth: { name: "Stealth", color: "#aaffaa", target: "60", tag: "Quiet" },
    hyper: { name: "Hyper", color: "#fff", target: "120", tag: "Smooth" },
    overdrive: { name: "Overdrive", color: "#f55", target: "144", tag: "Max" },
  },
  HomePage: () => <div data-testid="original-home-page">ORIGINAL HOME PAGE</div>,
  PerformancePage: () => <div data-testid="original-performance-page">ORIGINAL PERFORMANCE PAGE</div>,
  ToolsPage: () => <div data-testid="original-tools-page">ORIGINAL TOOLS PAGE</div>,
  VoicePage: () => <div data-testid="original-voice-page">ORIGINAL VOICE PAGE</div>,
  SettingsPage: () => <div data-testid="original-settings-page">ORIGINAL SETTINGS PAGE</div>,
}));

vi.mock("./components/Artwork", () => ({
  SceneArtwork: () => <div data-testid="browser-game-preview" />,
}));

describe("FRONTIER presentation", () => {
  beforeEach(() => {
    Object.defineProperty(window, "FrontierAndroid", {
      configurable: true,
      value: {
        expandOverlay: vi.fn(),
        collapseOverlay: vi.fn(),
      },
    });
  });

  it("uses the original CORE composition as a left-only Android overlay", () => {
    render(<Frontier presentation="android-overlay" />);

    fireEvent.click(screen.getByRole("button", { name: "Open FRONTIER from left" }));

    expect(screen.getByTestId("original-home-page")).toBeInTheDocument();
    expect(screen.queryByTestId("browser-game-preview")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open FRONTIER from right" })).not.toBeInTheDocument();
    expect(screen.queryByText("02 / NEXUS INTELLIGENCE")).not.toBeInTheDocument();
    expect(document.querySelector(".frontier-android-presentation")).toBeInTheDocument();
  });

  it("preserves the existing browser twin-core preview by default", () => {
    render(<Frontier />);
    expect(screen.getByTestId("browser-game-preview")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open FRONTIER from right" })).toBeInTheDocument();
  });
});
