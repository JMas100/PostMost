export const PLATFORMS = [
  { id: "ebay", name: "eBay", color: "#e53238", supportsApi: true, supportsAutomation: false, authType: "oauth" as const },
  { id: "etsy", name: "Etsy", color: "#F1641E", supportsApi: true, supportsAutomation: false, authType: "oauth" as const },
  { id: "poshmark", name: "Poshmark", color: "#C2185B", supportsApi: false, supportsAutomation: true, authType: "manual" as const },
  { id: "mercari", name: "Mercari", color: "#FF3B3B", supportsApi: false, supportsAutomation: true, authType: "manual" as const },
  { id: "depop", name: "Depop", color: "#000000", supportsApi: false, supportsAutomation: true, authType: "manual" as const },
  { id: "facebook", name: "Facebook Marketplace", color: "#1877F2", supportsApi: false, supportsAutomation: true, authType: "manual" as const },
  { id: "craigslist", name: "Craigslist", color: "#4C4C4C", supportsApi: false, supportsAutomation: true, authType: "manual" as const },
  { id: "offerup", name: "OfferUp", color: "#00A87E", supportsApi: false, supportsAutomation: true, authType: "manual" as const },
  { id: "vinted", name: "Vinted", color: "#007782", supportsApi: false, supportsAutomation: true, authType: "manual" as const },
  { id: "grailed", name: "Grailed", color: "#000000", supportsApi: false, supportsAutomation: true, authType: "manual" as const },
  { id: "whatnot", name: "Whatnot", color: "#9146FF", supportsApi: false, supportsAutomation: false, authType: "none" as const },
  { id: "shopify", name: "Shopify", color: "#96BF48", supportsApi: false, supportsAutomation: false, authType: "none" as const },
] as const;

export type PlatformId = (typeof PLATFORMS)[number]["id"];

export function getPlatform(id: string) {
  return PLATFORMS.find((p) => p.id === id);
}
