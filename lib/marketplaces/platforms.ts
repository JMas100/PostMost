export const PLATFORMS = [
  { id: "ebay", name: "eBay", color: "#e53238", supportsApi: true, supportsAutomation: false },
  { id: "etsy", name: "Etsy", color: "#F1641E", supportsApi: true, supportsAutomation: false },
  { id: "poshmark", name: "Poshmark", color: "#C2185B", supportsApi: false, supportsAutomation: true },
  { id: "mercari", name: "Mercari", color: "#FF3B3B", supportsApi: false, supportsAutomation: true },
  { id: "depop", name: "Depop", color: "#000000", supportsApi: false, supportsAutomation: true },
  { id: "facebook", name: "Facebook Marketplace", color: "#1877F2", supportsApi: false, supportsAutomation: true },
  { id: "craigslist", name: "Craigslist", color: "#4C4C4C", supportsApi: false, supportsAutomation: true },
  { id: "offerup", name: "OfferUp", color: "#00A87E", supportsApi: false, supportsAutomation: true },
  { id: "vinted", name: "Vinted", color: "#007782", supportsApi: false, supportsAutomation: true },
  { id: "grailed", name: "Grailed", color: "#000000", supportsApi: false, supportsAutomation: true },
] as const;

export type PlatformId = (typeof PLATFORMS)[number]["id"];

export function getPlatform(id: string) {
  return PLATFORMS.find((p) => p.id === id);
}
