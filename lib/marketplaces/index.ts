import { MarketplaceAdapter } from "./types";
import { eBayAdapter } from "./adapters/ebay";
import { etsyAdapter } from "./adapters/etsy";
import { poshmarkAdapter } from "./adapters/poshmark";
import { mercariAdapter } from "./adapters/mercari";
import { depopAdapter } from "./adapters/depop";
import { facebookAdapter } from "./adapters/facebook";
import { craigslistAdapter } from "./adapters/craigslist";
import { offerupAdapter } from "./adapters/offerup";
import { vintedAdapter } from "./adapters/vinted";
import { grailedAdapter } from "./adapters/grailed";

const adapters: Record<string, MarketplaceAdapter> = {
  ebay: eBayAdapter,
  etsy: etsyAdapter,
  poshmark: poshmarkAdapter,
  mercari: mercariAdapter,
  depop: depopAdapter,
  facebook: facebookAdapter,
  craigslist: craigslistAdapter,
  offerup: offerupAdapter,
  vinted: vintedAdapter,
  grailed: grailedAdapter,
};

export function getAdapter(platformId: string): MarketplaceAdapter | undefined {
  return adapters[platformId];
}

export function getAllAdapters(): MarketplaceAdapter[] {
  return Object.values(adapters);
}
