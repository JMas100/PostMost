import { getAdapter } from "./index";
import { getAccountData } from "./account-data";
import type { ListingData } from "./types";

export type RelistOutcome =
  | { outcome: "relisted"; externalId?: string; externalUrl?: string }
  /** Nothing was touched -- no adapter support, no externalId, or no connected account. The
   *  listing is exactly as it was before the attempt. */
  | { outcome: "not_attempted"; reason: string }
  /** Delist couldn't be confirmed, so nothing was touched -- a safe no-op, not a failure of the
   *  listing itself. */
  | { outcome: "delist_unconfirmed"; error: string }
  /** Delist genuinely succeeded but the repost then failed -- the listing is down everywhere
   *  with nothing live to show for it. This one actually needs a human. */
  | { outcome: "stranded"; error: string };

/**
 * Delists a platform listing and reposts it fresh, verifying removal before ever reposting (see
 * runPlaywrightDelist's verifyRemoved) so a false "removed" never risks a duplicate live listing.
 * Shared by the relist-stale automation rule and user-triggered bulk relist so both get the same
 * careful outcome handling instead of two copies drifting apart.
 */
export async function relistPlatformListing(params: {
  userId: string;
  platform: string;
  externalId: string | null;
  listingData: ListingData;
}): Promise<RelistOutcome> {
  const { userId, platform, externalId, listingData } = params;

  const adapter = getAdapter(platform);
  if (!adapter?.delist || !externalId) {
    return {
      outcome: "not_attempted",
      reason: `${adapter?.name || platform} doesn't support automatic delisting yet`,
    };
  }

  const accountData = await getAccountData(userId, platform);
  if (!accountData) {
    return { outcome: "not_attempted", reason: `no connected ${adapter.name} account was found` };
  }

  const delistResult = await adapter.delist(externalId, accountData);
  if (!delistResult.success) {
    return { outcome: "delist_unconfirmed", error: delistResult.error || "unknown error" };
  }

  const postResult = await adapter.post(listingData, accountData);
  if (postResult.success) {
    return { outcome: "relisted", externalId: postResult.externalId, externalUrl: postResult.externalUrl };
  }

  return { outcome: "stranded", error: postResult.error || "unknown error" };
}
