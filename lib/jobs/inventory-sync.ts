import { prisma } from "@/lib/prisma";
import { getAdapter } from "@/lib/marketplaces";
import { getAccountData } from "@/lib/marketplaces/account-data";
import { PlatformListingStatus } from "@/lib/marketplaces/listing-status";
import { DELIST_ON_SALE_RULE } from "@/lib/automation/rule-types";
import { triggerJobWorker } from "@/lib/jobs/trigger";

interface InventorySyncResult {
  platform: string;
  externalId: string | null;
  /** Delist was queued as a real job (with its own retry/timeout handling), not completed here. */
  queued: boolean;
  error?: string;
}

/** `userId` is the owner of the MarketplaceAccount whose webhook secret verified this request
 *  (see the route handler) -- scoping the lookup to it means a compromised per-account webhook
 *  secret can only ever mark that one account owner's own listings sold, not any user's. */
export async function syncInventorySale(platform: string, externalId: string, userId: string): Promise<InventorySyncResult[]> {
  const soldListing = await prisma.platformListing.findFirst({
    where: { platform, externalId, status: { not: PlatformListingStatus.SOLD }, listing: { userId } },
    include: { listing: true },
  });

  if (!soldListing) {
    return [];
  }

  await prisma.platformListing.update({
    where: { id: soldListing.id },
    data: { status: PlatformListingStatus.SOLD, soldAt: new Date() },
  });

  await prisma.listing.update({
    where: { id: soldListing.listingId },
    data: { status: "SOLD" },
  });

  const otherListings = await prisma.platformListing.findMany({
    where: {
      listingId: soldListing.listingId,
      platform: { not: platform },
      status: PlatformListingStatus.POSTED,
    },
  });

  // Delisting elsewhere runs through the same CrossPostJob queue as every other delist -- not
  // synchronously here. A webhook handler doing real Playwright automation inline, one platform
  // at a time with no timeout wrapper and no explicit maxDuration, is exactly the bug class
  // already found and fixed in the scheduled job runner (see crosspost-runner.ts): get cut off
  // mid-call and the remaining platforms are left silently still POSTED -- live and sellable --
  // on a marketplace where the item is actually sold out, with no retry to ever correct it.
  // Queuing reuses the runner's existing per-call timeout, retry-with-backoff, and time-budget
  // guard for free.
  const results: InventorySyncResult[] = [];
  const jobsToQueue: { userId: string; listingId: string; platform: string; type: "DELIST"; status: "PENDING" }[] = [];

  const autoDelistDisabled = new Set(
    (
      await prisma.marketplaceAccount.findMany({
        where: {
          userId: soldListing.listing.userId,
          platform: { in: otherListings.map((p) => p.platform) },
          autoDelistEnabled: false,
        },
        select: { platform: true },
      })
    ).map((a) => a.platform)
  );

  for (const platformListing of otherListings) {
    // The seller explicitly opted this platform out of auto-delist (Marketplaces page toggle) --
    // leave it exactly as-is, not a failure, nothing to log or retry.
    if (autoDelistDisabled.has(platformListing.platform)) continue;

    const adapter = getAdapter(platformListing.platform);
    if (!adapter || !adapter.delist) {
      results.push({
        platform: platformListing.platform,
        externalId: platformListing.externalId,
        queued: false,
        error: "Delist not supported for this platform",
      });
      await prisma.platformListing.update({
        where: { id: platformListing.id },
        data: {
          status: PlatformListingStatus.FAILED,
          errorMessage: `Sold elsewhere, but ${platformListing.platform} doesn't support automatic delisting yet.`,
        },
      });
      await prisma.automationEvent.create({
        data: {
          userId: soldListing.listing.userId,
          ruleType: DELIST_ON_SALE_RULE,
          listingId: soldListing.listingId,
          platform: platformListing.platform,
          message: `"${soldListing.listing.title}" sold on ${platform}, but ${platformListing.platform} doesn't support automatic delisting yet`,
          success: false,
        },
      });
      continue;
    }

    const accountData = await getAccountData(soldListing.listing.userId, platformListing.platform);

    if (!accountData?.accessToken) {
      results.push({
        platform: platformListing.platform,
        externalId: platformListing.externalId,
        queued: false,
        error: "No connected account to delist",
      });
      await prisma.platformListing.update({
        where: { id: platformListing.id },
        data: {
          status: PlatformListingStatus.FAILED,
          errorMessage: `Sold elsewhere, but no connected ${adapter.name} account was found to delist it.`,
        },
      });
      await prisma.automationEvent.create({
        data: {
          userId: soldListing.listing.userId,
          ruleType: DELIST_ON_SALE_RULE,
          listingId: soldListing.listingId,
          platform: platformListing.platform,
          message: `"${soldListing.listing.title}" sold on ${platform}, but no connected ${adapter.name} account was found to delist it`,
          success: false,
        },
      });
      continue;
    }

    jobsToQueue.push({
      userId: soldListing.listing.userId,
      listingId: soldListing.listingId,
      platform: platformListing.platform,
      type: "DELIST",
      status: "PENDING",
    });
    await prisma.automationEvent.create({
      data: {
        userId: soldListing.listing.userId,
        ruleType: DELIST_ON_SALE_RULE,
        listingId: soldListing.listingId,
        platform: platformListing.platform,
        message: `"${soldListing.listing.title}" sold on ${platform} — delisting from ${adapter.name} queued`,
      },
    });
    results.push({ platform: platformListing.platform, externalId: platformListing.externalId, queued: true });
  }

  if (jobsToQueue.length > 0) {
    await prisma.crossPostJob.createMany({ data: jobsToQueue });
    triggerJobWorker();
  }

  return results;
}
