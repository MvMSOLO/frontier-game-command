import { createFileRoute } from "@tanstack/react-router";
import { FrontierEntry } from "@/frontier/FrontierEntry";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FRONTIER — Game Space & Performance Engine" },
      { name: "description", content: "Left-edge game space overlay with live FPS telemetry, performance profiles, tactical tools and a real-time voice changer." },
      { property: "og:title", content: "FRONTIER — Game Space & Performance Engine" },
      { property: "og:description", content: "Live telemetry, Overdrive profiles, tactical tools and voice FX — without covering your game." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FrontierEntry,
});
