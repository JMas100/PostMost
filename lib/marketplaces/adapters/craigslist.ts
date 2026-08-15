import { MarketplaceAdapter, ListingData, PlatformAccount, PostResult } from "../types";

export const craigslistAdapter: MarketplaceAdapter = {
  name: "Craigslist",
  id: "craigslist",
  supportsApi: false,
  supportsAutomation: true,
  authType: "manual",
  authFields: [{ key: "email", label: "Email", type: "email" }],
  async post(_listing: ListingData, _account: PlatformAccount): Promise<PostResult> {
    return {
      success: false,
      error: "Craigslist has no API. Real posting requires Playwright automation and email verification handling.",
    };
  },
  async delist(_externalId: string, _account: PlatformAccount) {
    return { success: false, error: "Craigslist delisting requires Playwright automation." };
  },
};
