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
  /** "password" (accessToken is an encrypted password) | "session" (accessToken is an
   *  encrypted JSON array of browser cookies, captured via the extension). Only meaningful
   *  for "manual" (browser-automation) platforms. */
  authMethod?: string;
}

/** A single cookie in Playwright's `context.addCookies()` shape. The browser extension's
 *  background script translates Chrome's native cookie shape into this before sending it. */
export interface SessionCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Strict" | "Lax" | "None";
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
  /** Pushes a new price to an already-live listing on this platform. Never called for a
   *  PlatformListing with its own per-marketplace price override -- an override means the seller
   *  deliberately set a different price here, and a base-price change shouldn't silently flatten
   *  that. `sku` is the Listing's own sku field (not account-level) -- eBay's REST Inventory API
   *  needs it to look up the internal offer id that externalId (the published listingId) doesn't
   *  resolve to directly; other adapters can ignore it. */
  updatePrice?(externalId: string, newPrice: number, account: PlatformAccount, sku?: string | null): Promise<{ success: boolean; error?: string }>;
  /** Attempts a real login with the given credentials before they're ever saved, so a wrong
   *  username/password is caught at connect time instead of the next time a job fails. Only
   *  meaningful for "manual" (browser-automation) platforms -- OAuth already verifies identity
   *  as part of the auth flow itself. "unknown" (Playwright unavailable, bot detection, a
   *  timeout) is deliberately distinct from "rejected" -- only a real rejection should block
   *  saving; an inconclusive check should not. */
  verifyLogin?(username: string, password: string): Promise<CredentialCheckResult>;
  /** Same idea as verifyLogin, but for a session captured via the browser extension instead of
   *  a username/password pair -- confirms the cookies actually leave the browser authenticated
   *  before they're ever saved. */
  verifySession?(cookies: SessionCookie[]): Promise<CredentialCheckResult>;
  getAuthUrl?(opts?: { codeVerifier?: string }): string;
  exchangeCode?(code: string, ctx?: { codeVerifier?: string }): Promise<OAuthTokenResult>;
  /** Exchanges a stored refresh token for a new access token once the current one expires. */
  refreshAccessToken?(refreshToken: string): Promise<OAuthTokenResult>;
}
