export interface ListingData {
  title: string;
  description: string;
  price: number;
  quantity: number;
  condition: string;
  category: string;
  brand?: string | null;
  size?: string | null;
  color?: string | null;
  material?: string | null;
  sku?: string | null;
  tags?: string[];
  photos: string[];
}

export interface PlatformAccount {
  accessToken?: string | null;
  refreshToken?: string | null;
  externalId?: string | null;
  tokenExpiresAt?: Date | null;
  settings?: Record<string, unknown>;
}

export interface PostResult {
  success: boolean;
  externalId?: string;
  externalUrl?: string;
  fee?: number;
  error?: string;
  raw?: Record<string, unknown>;
}

export interface OAuthTokenResult {
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  externalId?: string;
  displayName?: string;
}

export interface MarketplaceAdapter {
  name: string;
  id: string;
  supportsApi: boolean;
  supportsAutomation: boolean;
  authType: "oauth" | "credentials" | "manual" | "none";
  authFields?: { key: string; label: string; type: string }[];
  post(listing: ListingData, account: PlatformAccount): Promise<PostResult>;
  delist?(externalId: string, account: PlatformAccount): Promise<{ success: boolean; error?: string }>;
  getAuthUrl?(opts?: { codeVerifier?: string }): string;
  exchangeCode?(code: string, ctx?: { codeVerifier?: string }): Promise<OAuthTokenResult>;
}
