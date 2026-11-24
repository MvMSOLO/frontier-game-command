export type GameCategory = "Battle Royale" | "MOBA" | "Sports" | "Racing" | "Sandbox" | "Action";
export interface GameCatalogItem { id: string; name: string; category: GameCategory; shortName: string; }
export const GAME_CATALOG: GameCatalogItem[] = [
  { id: "pubg-mobile", name: "PUBG MOBILE", category: "Battle Royale", shortName: "PUBG" },
  { id: "call-of-duty-mobile", name: "Call of Duty: Mobile", category: "Action", shortName: "COD" },
  { id: "free-fire", name: "Free Fire", category: "Battle Royale", shortName: "FF" },
  { id: "fortnite", name: "Fortnite", category: "Battle Royale", shortName: "FN" },
  { id: "mobile-legends", name: "Mobile Legends: Bang Bang", category: "MOBA", shortName: "ML" },
  { id: "wild-rift", name: "League of Legends: Wild Rift", category: "MOBA", shortName: "WR" },
  { id: "brawl-stars", name: "Brawl Stars", category: "Action", shortName: "BS" },
  { id: "efootball", name: "eFootball", category: "Sports", shortName: "EF" },
  { id: "roblox", name: "Roblox", category: "Sandbox", shortName: "RB" },
  { id: "genshin-impact", name: "Genshin Impact", category: "Action", shortName: "GI" },
  { id: "asphalt-legends", name: "Asphalt Legends", category: "Racing", shortName: "AL" },
  { id: "clash-royale", name: "Clash Royale", category: "Action", shortName: "CR" },
];