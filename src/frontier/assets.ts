import pubgMobile from "./assets/games/pubg-mobile.svg";
import callOfDutyMobile from "./assets/games/call-of-duty-mobile.svg";
import freeFire from "./assets/games/free-fire.svg";
import fortnite from "./assets/games/fortnite.svg";
import mobileLegends from "./assets/games/mobile-legends.svg";
import wildRift from "./assets/games/wild-rift.svg";
import brawlStars from "./assets/games/brawl-stars.svg";
import efootball from "./assets/games/efootball.svg";
import roblox from "./assets/games/roblox.svg";
import genshinImpact from "./assets/games/genshin-impact.svg";
import asphaltLegends from "./assets/games/asphalt-legends.svg";
import clashRoyale from "./assets/games/clash-royale.svg";
import stealthArt from "./assets/performance/stealth.svg";
import balancedArt from "./assets/performance/balanced.svg";
import hyperArt from "./assets/performance/hyper.svg";
import overdriveArt from "./assets/performance/overdrive.svg";
import gamePreviewScene from "./assets/scene/game-preview.svg";
import reactorCore from "./assets/onboarding/reactor-core.svg";
import type { Mode } from "./telemetry";

export const GAME_ART: Record<string, string> = {
  "pubg-mobile": pubgMobile,
  "call-of-duty-mobile": callOfDutyMobile,
  "free-fire": freeFire,
  fortnite,
  "mobile-legends": mobileLegends,
  "wild-rift": wildRift,
  "brawl-stars": brawlStars,
  efootball,
  roblox,
  "genshin-impact": genshinImpact,
  "asphalt-legends": asphaltLegends,
  "clash-royale": clashRoyale,
};

export const MODE_ART: Record<Mode, string> = {
  stealth: stealthArt,
  balanced: balancedArt,
  hyper: hyperArt,
  overdrive: overdriveArt,
};

export const SCENE_ART = gamePreviewScene;
export const REACTOR_ART = reactorCore;
export const VISUAL_ASSET_COUNT = Object.keys(GAME_ART).length + Object.keys(MODE_ART).length + 2;
