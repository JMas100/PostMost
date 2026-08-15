import { MarketplaceAdapter, ListingData, PlatformAccount, PostResult } from "../types";

export const mercariAdapter: MarketplaceAdapter = {
  name: "Mercari",
  id: "mercari",
  supportsApi: false,
  supportsAutomation: true,
  authType: "manual",
  authFields: [{ key: "username", label: "Username", type: "text" }],
  async post(_listing: ListingData, _account: PlatformAccount): Promise<PostResult> {
    return {
      success: false,
      error: "Mercari has no public listing API. Real posting requires Playwright automation.",
    };
  },
  async delist(_externalId: string, _account: PlatformAccount) {
    return { success: false, error: "Mercari delisting requires Playwright automation." };
  },
};
