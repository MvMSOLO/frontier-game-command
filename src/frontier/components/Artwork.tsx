import type { Mode } from "../telemetry";
import { GAME_ART, MODE_ART, REACTOR_ART, SCENE_ART } from "../assets";

type ArtworkProps = { className?: string };

export function GameArtwork({ gameId, className }: ArtworkProps & { gameId: string }) {
  return <img src={GAME_ART[gameId] ?? REACTOR_ART} alt="" aria-hidden="true" draggable={false} loading="lazy" decoding="async" className={className} />;
}

export function PerformanceArtwork({ mode, className }: ArtworkProps & { mode: Mode }) {
  return <img src={MODE_ART[mode]} alt="" aria-hidden="true" draggable={false} loading="lazy" decoding="async" className={className} />;
}

export function SceneArtwork({ className }: ArtworkProps) {
  return <img src={SCENE_ART} alt="" aria-hidden="true" draggable={false} loading="eager" decoding="async" fetchPriority="high" className={className} />;
}

export function ReactorArtwork({ className }: ArtworkProps) {
  return <img src={REACTOR_ART} alt="" aria-hidden="true" draggable={false} loading="eager" decoding="async" className={className} />;
}
