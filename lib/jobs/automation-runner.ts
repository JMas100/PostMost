import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { getAdapter } from "@/lib/marketplaces";
import { STOCK_SYNC_RULE } from "@/lib/automation/rule-types";

export interface AutomationRunSummary {
  usersChecked: number;
  listingsProcessed: number;
  delisted: number;
  failed: number;
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

      const account = await prisma.marketplaceAccount.findFirst({
        where: { userId: listing.userId, platform: platformListing.platform, isActive: true },
      });
      if (!account?.accessToken) {
        summary.failed += 1;
        continue;
      }

      try {
        const accountData = {
          accessToken: decrypt(account.accessToken),
          refreshToken: account.refreshToken ? decrypt(account.refreshToken) : null,
          externalId: account.externalId,
          tokenExpiresAt: account.tokenExpiresAt,
          settings: account.settings ? JSON.parse(account.settings) : {},
        };
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
