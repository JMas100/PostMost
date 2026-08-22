import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { getAdapter } from "@/lib/marketplaces";
import { STOCK_SYNC_RULE, RELIST_STALE_RULE, RELIST_STALE_DAYS } from "@/lib/automation/rule-types";
import type { Photo } from "@prisma/client";

export interface AutomationRunSummary {
  usersChecked: number;
  listingsProcessed: number;
  delisted: number;
  failed: number;
}

export interface RelistRunSummary {
  usersChecked: number;
  candidatesProcessed: number;
  relisted: number;
  failed: number;
  /** Delist succeeded but the repost failed after — the listing is now down everywhere and
   *  needs a human, not just a retry. Surfaced distinctly so it can't get lost in "failed". */
  strandedAfterDelist: number;
}

async function getDecryptedAccount(userId: string, platform: string) {
  const account = await prisma.marketplaceAccount.findFirst({
    where: { userId, platform, isActive: true },
  });
  if (!account?.accessToken) return null;
  return {
    accessToken: decrypt(account.accessToken),
    refreshToken: account.refreshToken ? decrypt(account.refreshToken) : null,
    externalId: account.externalId,
    tokenExpiresAt: account.tokenExpiresAt,
    settings: account.settings ? JSON.parse(account.settings) : {},
  };
}

/**
 * Stock sync (Pro tier, opt-in): when a listing's quantity hits 0, delist it
 * from every marketplace where it's still POSTED. Runs as a scheduled job
 * rather than hooking every quantity-mutation call site (listing edits,
 * extension sync) individually.
 */
export async function runStockSyncRule(): Promise<AutomationRunSummary> {
  const summary: AutomationRunSummary = { usersChecked: 0, listingsProcessed: 0, delisted: 0, failed: 0 };

  const enabledRules = await prisma.automationRule.findMany({
    where: { ruleType: STOCK_SYNC_RULE, enabled: true },
    select: { userId: true },
  });
  summary.usersChecked = enabledRules.length;
  if (enabledRules.length === 0) return summary;

  const userIds = enabledRules.map((r) => r.userId);

  const listings = await prisma.listing.findMany({
    where: {
      userId: { in: userIds },
      isDraft: false,
      quantity: 0,
      platformListings: { some: { status: "POSTED" } },
    },
    include: { platformListings: { where: { status: "POSTED" } } },
  });

  for (const listing of listings) {
    summary.listingsProcessed += 1;
    for (const platformListing of listing.platformListings) {
      const adapter = getAdapter(platformListing.platform);
      if (!adapter?.delist || !platformListing.externalId) {
        summary.failed += 1;
        continue;
      }

      const accountData = await getDecryptedAccount(listing.userId, platformListing.platform);
      if (!accountData) {
        summary.failed += 1;
        continue;
      }

      try {
        const result = await adapter.delist(platformListing.externalId, accountData);

        await prisma.platformListing.update({
          where: { id: platformListing.id },
          data: {
            status: result.success ? "DELISTED" : "FAILED",
            errorMessage: result.success ? null : result.error || "Delist failed",
          },
        });

        if (result.success) {
          summary.delisted += 1;
          await prisma.automationEvent.create({
            data: {
              userId: listing.userId,
              ruleType: STOCK_SYNC_RULE,
              listingId: listing.id,
              platform: platformListing.platform,
              message: `"${listing.title}" sold out — delisted from ${adapter.name}`,
              savedAmount: platformListing.price ?? listing.price,
            },
          });
        } else {
          summary.failed += 1;
        }
      } catch {
        summary.failed += 1;
      }
    }
  }

  return summary;
}

/**
 * Relist stale items (Grow tier, opt-in): for a POSTED listing older than RELIST_STALE_DAYS,
 * delist it and post it again fresh. Only ever reposts after delist reports a *verified*
 * removal (see runPlaywrightDelist's verifyRemoved) — if delist can't be confirmed, the
 * listing is left exactly as it was rather than risking a duplicate. If delist succeeds but
 * the repost then fails, the listing is now down everywhere with nothing live to show for it;
 * that's tracked separately as "stranded" so it surfaces as something needing a person, not
 * folded into an ordinary retry-able failure.
 */
export async function runRelistStaleRule(): Promise<RelistRunSummary> {
  const summary: RelistRunSummary = {
    usersChecked: 0,
    candidatesProcessed: 0,
    relisted: 0,
    failed: 0,
    strandedAfterDelist: 0,
  };

  const enabledRules = await prisma.automationRule.findMany({
    where: { ruleType: RELIST_STALE_RULE, enabled: true },
    select: { userId: true },
  });
  summary.usersChecked = enabledRules.length;
  if (enabledRules.length === 0) return summary;

  const userIds = enabledRules.map((r) => r.userId);
  const staleBefore = new Date(Date.now() - RELIST_STALE_DAYS * 24 * 60 * 60 * 1000);

  const candidates = await prisma.platformListing.findMany({
    where: {
      status: "POSTED",
      postedAt: { lt: staleBefore },
      listing: { userId: { in: userIds }, isDraft: false, quantity: { gt: 0 } },
    },
    include: { listing: { include: { photos: true } } },
  });

  for (const platformListing of candidates) {
    const { listing } = platformListing;
    if (!listing) continue;
    summary.candidatesProcessed += 1;

    const adapter = getAdapter(platformListing.platform);
    if (!adapter?.delist || !platformListing.externalId) {
      summary.failed += 1;
      continue;
    }

    const accountData = await getDecryptedAccount(listing.userId, platformListing.platform);
    if (!accountData) {
      summary.failed += 1;
      continue;
    }

    try {
      const delistResult = await adapter.delist(platformListing.externalId, accountData);
      if (!delistResult.success) {
        // Not confirmed removed — leave everything untouched, this is a safe no-op.
        summary.failed += 1;
        continue;
      }

      const listingData = {
        title: listing.title,
        description: listing.description,
        price: listing.price,
        quantity: listing.quantity,
        condition: listing.condition,
        category: listing.category,
        brand: listing.brand,
        size: listing.size,
        color: listing.color,
        material: listing.material,
        sku: listing.sku,
        tags: listing.tags ? listing.tags.split(",").map((t) => t.trim()) : undefined,
        photos: listing.photos.map((p: Photo) => p.url),
      };

      const postResult = await adapter.post(listingData, accountData);

      if (postResult.success) {
        await prisma.platformListing.update({
          where: { id: platformListing.id },
          data: {
            status: "POSTED",
            externalId: postResult.externalId || null,
            externalUrl: postResult.externalUrl || null,
            postedAt: new Date(),
            errorMessage: null,
          },
        });
        summary.relisted += 1;
        await prisma.automationEvent.create({
          data: {
            userId: listing.userId,
            ruleType: RELIST_STALE_RULE,
            listingId: listing.id,
            platform: platformListing.platform,
            message: `"${listing.title}" relisted on ${adapter.name} after ${RELIST_STALE_DAYS} days`,
          },
        });
      } else {
        // Delisted for real, but the repost didn't take — nothing live for this platform now.
        await prisma.platformListing.update({
          where: { id: platformListing.id },
          data: {
            status: "FAILED",
            externalId: null,
            externalUrl: null,
            errorMessage: `Relist failed after delist succeeded: ${postResult.error || "unknown error"}`,
          },
        });
        summary.strandedAfterDelist += 1;
        await prisma.automationEvent.create({
          data: {
            userId: listing.userId,
            ruleType: RELIST_STALE_RULE,
            listingId: listing.id,
            platform: platformListing.platform,
            message: `"${listing.title}" was taken down from ${adapter.name} to relist, but the repost failed — it needs attention`,
          },
        });
      }
    } catch {
      summary.failed += 1;
    }
  }

  return summary;
}
