import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const groups = {
  games: ["pubg-mobile", "call-of-duty-mobile", "free-fire", "fortnite", "mobile-legends", "wild-rift", "brawl-stars", "efootball", "roblox", "genshin-impact", "asphalt-legends", "clash-royale"],
  performance: ["stealth", "balanced", "hyper", "overdrive"],
  scene: ["game-preview"],
  onboarding: ["reactor-core"],
};
const paths = Object.entries(groups).flatMap(([group, names]) => names.map((name) => resolve(root, `src/frontier/assets/${group}/${name}.svg`)));
assert.equal(paths.length, 18, "The visual asset manifest must contain exactly 18 artworks.");

let totalBytes = 0;
for (const path of paths) {
  assert.ok(existsSync(path), `Missing visual asset: ${path}`);
  const bytes = statSync(path).size;
  assert.ok(bytes <= 24_000, `Visual asset exceeds the 24 KB per-file budget: ${path} (${bytes} bytes)`);
  totalBytes += bytes;
}
assert.ok(totalBytes <= 240_000, `Visual assets exceed the 240 KB total budget: ${totalBytes} bytes`);
console.log(`FRONTIER assets verified: ${paths.length} files, ${totalBytes} bytes total.`);
