import { prisma } from "@/lib/prisma";
import { getAdapter } from "@/lib/marketplaces";
import { getAccountData } from "@/lib/marketplaces/account-data";
import { PlatformListingStatus } from "@/lib/marketplaces/listing-status";
import { DELIST_ON_SALE_RULE } from "@/lib/automation/rule-types";

interface InventorySyncResult {
  platform: string;
  externalId: string | null;
  success: boolean;
  error?: string;
}

export async function syncInventorySale(platform: string, externalId: string): Promise<InventorySyncResult[]> {
  const soldListing = await prisma.platformListing.findFirst({
    where: { platform, externalId, status: { not: PlatformListingStatus.SOLD } },
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

  const results: InventorySyncResult[] = [];
  for (const platformListing of otherListings) {
    const adapter = getAdapter(platformListing.platform);
    if (!adapter || !adapter.delist) {
      results.push({
        platform: platformListing.platform,
        externalId: platformListing.externalId,
        success: false,
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
        success: false,
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

    try {
      const delistResult = await adapter.delist(platformListing.externalId || "", accountData);
      await prisma.platformListing.update({
        where: { id: platformListing.id },
        data: {
          status: delistResult.success ? PlatformListingStatus.DELISTED : PlatformListingStatus.FAILED,
          errorMessage: delistResult.error || null,
        },
      });
      await prisma.automationEvent.create({
        data: {
          userId: soldListing.listing.userId,
          ruleType: DELIST_ON_SALE_RULE,
          listingId: soldListing.listingId,
          platform: platformListing.platform,
          message: delistResult.success
            ? `"${soldListing.listing.title}" sold on ${platform} — delisted from ${adapter.name}`
            : `"${soldListing.listing.title}" sold on ${platform}, but delisting from ${adapter.name} failed: ${delistResult.error || "unknown error"}`,
          success: delistResult.success,
          savedAmount: delistResult.success ? platformListing.price ?? soldListing.listing.price : undefined,
        },
      });
      results.push({
        platform: platformListing.platform,
        externalId: platformListing.externalId,
        success: delistResult.success,
        error: delistResult.error,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown delist error";
      await prisma.platformListing.update({
        where: { id: platformListing.id },
        data: { status: PlatformListingStatus.FAILED, errorMessage: message },
      });
      results.push({ platform: platformListing.platform, externalId: platformListing.externalId, success: false, error: message });
      await prisma.automationEvent.create({
        data: {
          userId: soldListing.listing.userId,
          ruleType: DELIST_ON_SALE_RULE,
          listingId: soldListing.listingId,
          platform: platformListing.platform,
          message: `"${soldListing.listing.title}" sold on ${platform}, but delisting from ${adapter.name} threw an error: ${message}`,
          success: false,
        },
      });
    }
  }

  return results;
}
