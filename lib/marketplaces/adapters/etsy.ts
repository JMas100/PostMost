import { MarketplaceAdapter, ListingData, PlatformAccount, PostResult } from "../types";

export const etsyAdapter: MarketplaceAdapter = {
  name: "Etsy",
  id: "etsy",
  supportsApi: true,
  supportsAutomation: false,
  authType: "oauth",
  async post(_listing: ListingData, account: PlatformAccount): Promise<PostResult> {
    if (!account.accessToken) {
      return { success: false, error: "Etsy account not connected." };
    }
    return {
      success: false,
      error: "Etsy integration is scaffolded. Add ETSY_API_KEY and complete OAuth to enable real posting.",
    };
  },
  async delist(_externalId: string, _account: PlatformAccount) {
    return { success: false, error: "Etsy delisting requires OAuth token." };
  },
  getAuthUrl() {
    const key = process.env.ETSY_API_KEY || "";
    const redirect = `${process.env.NEXTAUTH_URL}/api/auth/callback/etsy`;
    return `https://www.etsy.com/oauth/connect?response_type=code&client_id=${key}&redirect_uri=${encodeURIComponent(
      redirect
    )}&scope=listings_w listings_r`;
  },
};
