import { MarketplaceAdapter, ListingData, PlatformAccount, PostResult } from "../types";

export const grailedAdapter: MarketplaceAdapter = {
  name: "Grailed",
  id: "grailed",
  supportsApi: false,
  supportsAutomation: true,
  authType: "manual",
  authFields: [{ key: "username", label: "Username", type: "text" }],
  async post(_listing: ListingData, _account: PlatformAccount): Promise<PostResult> {
    return {
      success: false,
      error: "Grailed has no public listing API. Real posting requires Playwright automation.",
    };
  },
  async delist(_externalId: string, _account: PlatformAccount) {
    return { success: false, error: "Grailed delisting requires Playwright automation." };
  },
};
