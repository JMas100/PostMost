import { getAccountData } from "@/lib/marketplaces/account-data";
import type { MarketplaceAdapter } from "@/lib/marketplaces/types";

/** The core step every delist call site needs, regardless of whether it's a queued CrossPostJob
 *  (crosspost-runner.ts) or an automation rule's own inline sweep (automation-runner.ts):
 *  resolve the account, call the adapter, and report the outcome in the same {success, error}
 *  shape adapter.delist() itself already returns. Deliberately does *not* touch
 *  PlatformListing/CrossPostJob/AutomationEvent -- callers write those very differently (one
 *  defers a status write until a retry budget is exhausted, the other writes immediately every
 *  time), so that decision stays with them. `externalId`/`adapter.delist` presence are still
 *  each caller's own responsibility to check first, matching what they already did before this
 *  was extracted -- keeping this function focused on the one part that was genuinely identical:
 *  no connected account is the one failure mode that's cleaner caught here than left to the
 *  adapter's own automation to discover by trying to log in with nothing. */
export async function delistPlatformListing(
  adapter: MarketplaceAdapter,
  userId: string,
  externalId: string
): Promise<{ success: boolean; error?: string }> {
  const accountData = await getAccountData(userId, adapter.id);
  if (!accountData) {
    return { success: false, error: `No connected ${adapter.name} account was found to delist it` };
  }

  const result = await adapter.delist!(externalId, accountData);
  return result.success ? { success: true } : { success: false, error: result.error || "Delist failed" };
}
