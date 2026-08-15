import { MarketplaceAdapter, ListingData, PlatformAccount, PostResult } from "../types";

export const poshmarkAdapter: MarketplaceAdapter = {
  name: "Poshmark",
  id: "poshmark",
  supportsApi: false,
  supportsAutomation: true,
  authType: "manual",
  authFields: [{ key: "username", label: "Username", type: "text" }],
  async post(_listing: ListingData, _account: PlatformAccount): Promise<PostResult> {
    return {
      success: false,
      error: "Poshmark has no public listing API. Real posting requires Playwright automation with stored credentials.",
    };
  },
  async delist(_externalId: string, _account: PlatformAccount) {
    return { success: false, error: "Poshmark delisting requires Playwright automation." };
  },
};
