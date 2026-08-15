import { MarketplaceAdapter, ListingData, PlatformAccount, PostResult } from "../types";

export const facebookAdapter: MarketplaceAdapter = {
  name: "Facebook Marketplace",
  id: "facebook",
  supportsApi: false,
  supportsAutomation: true,
  authType: "manual",
  authFields: [{ key: "username", label: "Username", type: "text" }],
  async post(_listing: ListingData, _account: PlatformAccount): Promise<PostResult> {
    return {
      success: false,
      error: "Facebook Marketplace has no public seller listing API. Real posting requires Playwright automation.",
    };
  },
  async delist(_externalId: string, _account: PlatformAccount) {
    return { success: false, error: "Facebook delisting requires Playwright automation." };
  },
};
