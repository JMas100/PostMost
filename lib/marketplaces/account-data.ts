import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";
import { getAdapter } from "./index";
import type { PlatformAccount } from "./types";

const REFRESH_BUFFER_MS = 2 * 60 * 1000;

/**
 * Fetches a user's active account for a platform, decrypts its tokens, and — for OAuth
 * platforms with a refresh token — transparently refreshes the access token when it's expired
 * or about to be, persisting the new tokens back to the DB. Without this, eBay/Etsy access
 * tokens (which last on the order of 1-2 hours) would silently stop working a couple hours
 * after connecting, with no path back except manually disconnecting and reconnecting.
 *
 * A refresh failure (revoked/expired refresh token) is swallowed here on purpose: the caller
 * proceeds with whatever token it has and gets a real, honest auth error from the marketplace
 * API, which is the same failure a user would see anyway — just with a clearer error message
 * than a generic refresh failure would give them.
 */
export async function getAccountData(userId: string, platform: string): Promise<PlatformAccount | null> {
  const account = await prisma.marketplaceAccount.findFirst({
    where: { userId, platform, isActive: true },
  });
  if (!account?.accessToken) return null;

  let accessToken = decrypt(account.accessToken);
  let refreshToken = account.refreshToken ? decrypt(account.refreshToken) : null;
  let tokenExpiresAt = account.tokenExpiresAt;

  const isExpiring = Boolean(tokenExpiresAt && tokenExpiresAt.getTime() - Date.now() < REFRESH_BUFFER_MS);
  if (isExpiring && refreshToken) {
    const adapter = getAdapter(platform);
    if (adapter?.refreshAccessToken) {
      try {
        const refreshed = await adapter.refreshAccessToken(refreshToken);
        accessToken = refreshed.accessToken;
        refreshToken = refreshed.refreshToken || refreshToken;
        tokenExpiresAt = refreshed.tokenExpiresAt ?? null;
        await prisma.marketplaceAccount.update({
          where: { id: account.id },
          data: {
            accessToken: encrypt(accessToken),
            refreshToken: refreshToken ? encrypt(refreshToken) : null,
            tokenExpiresAt,
          },
        });
      } catch {
        // Fall through with the pre-refresh token; the caller's API call will fail with a
        // real auth error instead.
      }
    }
  }

  return {
    accessToken,
    refreshToken,
    externalId: account.externalId,
    tokenExpiresAt,
    settings: account.settings ? JSON.parse(account.settings) : {},
    authMethod: account.authMethod,
  };
}
