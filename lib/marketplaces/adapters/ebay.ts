import { MarketplaceAdapter, ListingData, PlatformAccount, PostResult } from "../types";

export const eBayAdapter: MarketplaceAdapter = {
  name: "eBay",
  id: "ebay",
  supportsApi: true,
  supportsAutomation: false,
  authType: "oauth",
  async post(_listing: ListingData, account: PlatformAccount): Promise<PostResult> {
    if (!account.accessToken) {
      return {
        success: false,
        error: "eBay account not connected. Please authorize via eBay OAuth.",
      };
    }
    return {
      success: false,
      error: "eBay integration is scaffolded. Add EBAY_APP_ID and complete OAuth to enable real posting.",
    };
  },
  async delist(_externalId: string, _account: PlatformAccount) {
    return { success: false, error: "eBay delisting requires OAuth token and Sell API access." };
  },
  getAuthUrl() {
    const ruName = process.env.EBAY_RU_NAME || "";
    const appId = process.env.EBAY_APP_ID || "";
    return `https://auth.ebay.com/oauth2/authorize?client_id=${appId}&response_type=code&redirect_uri=${encodeURIComponent(
      ruName
    )}&scope=${encodeURIComponent("https://api.ebay.com/oauth/api_scope/sell.inventory")}`;
  },
};
