import { prisma } from "@/lib/prisma";
import { getAdapter } from "@/lib/marketplaces";
import { decrypt } from "@/lib/crypto";
import { parseSessionCookies } from "@/lib/marketplaces/automation/playwright-runner";

/**
 * Proactively re-verifies every currently-active manual-adapter account (password or session
 * auth) once a day, independent of whether anyone has actually tried to publish anything.
 *
 * Before this, `needsReauth` (see MarketplaceAccount.needsReauth) was purely reactive -- it only
 * ever got set from a real publish job's terminal failure, which meant a genuinely broken
 * account (wrong password, or the marketplace account itself deleted) kept reading "Connected"
 * indefinitely until someone happened to try posting something and that job burned through all
 * 3 retries (20+ minutes). This closes that gap: a deleted/broken account gets flagged within a
 * day even with zero publish activity.
 *
 * Reuses the exact same verifySession/verifyLogin adapter methods already used at connect time
 * (see lib/actions/accounts.ts) -- same "unknown" (bot detection, Playwright unavailable) is
 * never treated as evidence of a real problem, only a confirmed "rejected" flags the account,
 * matching the same principle used everywhere else this check appears. OAuth platforms (eBay/
 * Etsy) aren't touched here at all -- they already have their own token-refresh path in
 * account-data.ts and don't define verifySession/verifyLogin.
 */
export async function runAccountHealthChecks(): Promise<{ checked: number; flagged: number; cleared: number }> {
  const accounts = await prisma.marketplaceAccount.findMany({
    where: { isActive: true, authMethod: { in: ["session", "password"] } },
  });

  let checked = 0;
  let flagged = 0;
  let cleared = 0;

  for (const account of accounts) {
    if (!account.accessToken) continue;
    const adapter = getAdapter(account.platform);
    if (!adapter) continue;
    // Retired platforms' verifySession/verifyLogin already refuse immediately without launching
    // a browser (see ManualAdapterConfig.automationRetired), so this wouldn't cause a real
    // headless check either way -- but without this it would flag a confusing needsReauth
    // ("no longer supports connecting an account") on any leftover connected account instead of
    // just leaving it alone, which isn't the actionable signal this field means to carry.
    if (adapter.automationRetired) continue;

    try {
      let result;
      if (account.authMethod === "session") {
        if (!adapter.verifySession) continue;
        const cookies = parseSessionCookies(decrypt(account.accessToken));
        if (!cookies) continue;
        checked += 1;
        result = await adapter.verifySession(cookies);
      } else {
        if (!adapter.verifyLogin) continue;
        checked += 1;
        result = await adapter.verifyLogin(account.displayName, decrypt(account.accessToken));
      }

      if (result.status === "rejected") {
        await prisma.marketplaceAccount.update({
          where: { id: account.id },
          data: { needsReauth: true, needsReauthReason: result.error },
        });
        flagged += 1;
      } else if (result.status === "verified" && account.needsReauth) {
        await prisma.marketplaceAccount.update({
          where: { id: account.id },
          data: { needsReauth: false, needsReauthReason: null },
        });
        cleared += 1;
      }
      // "unknown" -- leave as-is, deliberately. Same reasoning as connectMarketplaceAccount's own
      // verifyLogin check: an inconclusive result (bot detection, a timeout) is not evidence the
      // account is actually broken.
    } catch {
      // Best-effort health check -- a crash checking one account should never take down the
      // batch or misclassify that account either way.
      continue;
    }
  }

  return { checked, flagged, cleared };
}
