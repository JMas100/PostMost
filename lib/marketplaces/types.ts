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

export type CredentialCheckResult =
  /** The login actually worked. */
  | { status: "verified" }
  /** The login form ran and rejected these credentials -- safe to block saving on this. */
  | { status: "rejected"; error: string }
  /** Couldn't reach a verdict either way (Playwright unavailable, a crash, a timeout, likely
   *  bot-detection). This is NOT evidence the credentials are wrong -- callers should let the
   *  user save anyway rather than block them on an infrastructure problem. */
  | { status: "unknown"; error: string };

export interface MarketplaceAdapter {
  name: string;
  id: string;
  supportsApi: boolean;
  supportsAutomation: boolean;
  authType: "oauth" | "credentials" | "manual" | "none";
  authFields?: { key: string; label: string; type: string }[];
  post(listing: ListingData, account: PlatformAccount): Promise<PostResult>;
  delist?(externalId: string, account: PlatformAccount): Promise<{ success: boolean; error?: string }>;
  /** Attempts a real login with the given credentials before they're ever saved, so a wrong
   *  username/password is caught at connect time instead of the next time a job fails. Only
   *  meaningful for "manual" (browser-automation) platforms -- OAuth already verifies identity
   *  as part of the auth flow itself. "unknown" (Playwright unavailable, bot detection, a
   *  timeout) is deliberately distinct from "rejected" -- only a real rejection should block
   *  saving; an inconclusive check should not. */
  verifyLogin?(username: string, password: string): Promise<CredentialCheckResult>;
  getAuthUrl?(opts?: { codeVerifier?: string }): string;
  exchangeCode?(code: string, ctx?: { codeVerifier?: string }): Promise<OAuthTokenResult>;
  /** Exchanges a stored refresh token for a new access token once the current one expires. */
  refreshAccessToken?(refreshToken: string): Promise<OAuthTokenResult>;
}
