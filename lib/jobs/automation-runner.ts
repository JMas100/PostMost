import { prisma } from "@/lib/prisma";
import { getAdapter } from "@/lib/marketplaces";
import { getAccountData } from "@/lib/marketplaces/account-data";
import { relistPlatformListing } from "@/lib/marketplaces/relist";
import { STOCK_SYNC_RULE, RELIST_STALE_RULE, RELIST_STALE_DAYS } from "@/lib/automation/rule-types";
import type { Photo } from "@prisma/client";
import { createBrowserJobBudget, type BrowserJobBudget } from "@/lib/jobs/browser-job-budget";
import { upsertAutomationRanNotification } from "@/lib/notifications";

/** Default per-call budget when no shared deadline is passed in. */
const DEFAULT_BUDGET_MS = 270 * 1000;

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

/**
 * Stock sync (Pro tier, opt-in): when a listing's quantity hits 0, delist it
 * from every marketplace where it's still POSTED. Runs as a scheduled job
 * rather than hooking every quantity-mutation call site (listing edits,
 * extension sync) individually.
 */
export async function runStockSyncRule(
  deadline: number = Date.now() + DEFAULT_BUDGET_MS,
  browserBudget: BrowserJobBudget = createBrowserJobBudget()
): Promise<AutomationRunSummary> {
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

  // Collected during the loop, written once per user after it ends -- see lib/notifications.ts.
  const delistedByUser = new Map<string, string[]>();

  for (const listing of listings) {
    // Leftover candidates just get picked up by tomorrow's cron run -- nothing here is left
    // half-done in a way that needs reclaiming, unlike the CrossPostJob RUNNING-lock case.
    if (Date.now() >= deadline) break;
    summary.listingsProcessed += 1;
    for (const platformListing of listing.platformListings) {
      const adapter = getAdapter(platformListing.platform);
      if (!adapter?.delist || !platformListing.externalId) {
        summary.failed += 1;
        await prisma.automationEvent.create({
          data: {
            userId: listing.userId,
            ruleType: STOCK_SYNC_RULE,
            listingId: listing.id,
            platform: platformListing.platform,
            message: `"${listing.title}" sold out, but ${adapter?.name || platformListing.platform} doesn't support automatic delisting yet`,
            success: false,
          },
        });
        continue;
      }

      const accountData = await getAccountData(listing.userId, platformListing.platform);
      if (!accountData) {
        summary.failed += 1;
        await prisma.automationEvent.create({
          data: {
            userId: listing.userId,
            ruleType: STOCK_SYNC_RULE,
            listingId: listing.id,
            platform: platformListing.platform,
            message: `"${listing.title}" sold out, but no connected ${adapter.name} account was found to delist it`,
            success: false,
          },
        });
        continue;
      }

      // See browser-job-budget.ts -- a manual-adapter delist launches a real Chromium instance;
      // once the shared per-invocation budget is spent, leave this one for tomorrow's cron
      // rather than risk exhausting the function's memory.
      if (adapter.authType === "manual" && browserBudget.remaining <= 0) continue;

      try {
        if (adapter.authType === "manual") browserBudget.remaining -= 1;
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
          const tokens = delistedByUser.get(listing.userId) ?? [];
          tokens.push(`${platformListing.platform}::${platformListing.id}`);
          delistedByUser.set(listing.userId, tokens);
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
          await prisma.automationEvent.create({
            data: {
              userId: listing.userId,
              ruleType: STOCK_SYNC_RULE,
              listingId: listing.id,
              platform: platformListing.platform,
              message: `"${listing.title}" sold out, but delisting from ${adapter.name} failed: ${result.error || "unknown error"}`,
              success: false,
            },
          });
        }
      } catch (err) {
        summary.failed += 1;
        const message = err instanceof Error ? err.message : "Unknown error";
        await prisma.automationEvent.create({
          data: {
            userId: listing.userId,
            ruleType: STOCK_SYNC_RULE,
            listingId: listing.id,
            platform: platformListing.platform,
            message: `"${listing.title}" sold out, but delisting from ${adapter.name} threw an error: ${message}`,
            success: false,
          },
        });
      }
    }
  }

  for (const [userId, tokens] of delistedByUser) {
    await upsertAutomationRanNotification(userId, STOCK_SYNC_RULE, tokens);
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
export async function runRelistStaleRule(
  deadline: number = Date.now() + DEFAULT_BUDGET_MS,
  browserBudget: BrowserJobBudget = createBrowserJobBudget()
): Promise<RelistRunSummary> {
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

  // Collected during the loop, written once per user after it ends -- see lib/notifications.ts.
  const relistedByUser = new Map<string, string[]>();

  for (const platformListing of candidates) {
    if (Date.now() >= deadline) break;
    const { listing } = platformListing;
    if (!listing) continue;
    const adapter = getAdapter(platformListing.platform);
    // A manual-adapter relist delists then reposts -- two browser launches internally for one
    // candidate -- so it's charged double against the shared per-invocation budget (see
    // browser-job-budget.ts). Left for the next invocation once spent, same as elsewhere.
    if (adapter?.authType === "manual") {
      if (browserBudget.remaining <= 0) continue;
      browserBudget.remaining -= 2;
    }
    summary.candidatesProcessed += 1;
    const platformName = adapter?.name || platformListing.platform;

    const outcome = await relistPlatformListing({
      userId: listing.userId,
      platform: platformListing.platform,
      externalId: platformListing.externalId,
      listingData: {
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
      },
    });

    if (outcome.outcome === "relisted") {
      await prisma.platformListing.update({
        where: { id: platformListing.id },
        data: {
          status: "POSTED",
          externalId: outcome.externalId || null,
          externalUrl: outcome.externalUrl || null,
          postedAt: new Date(),
          errorMessage: null,
        },
      });
      summary.relisted += 1;
      const tokens = relistedByUser.get(listing.userId) ?? [];
      tokens.push(`${platformListing.platform}::${platformListing.id}`);
      relistedByUser.set(listing.userId, tokens);
      await prisma.automationEvent.create({
        data: {
          userId: listing.userId,
          ruleType: RELIST_STALE_RULE,
          listingId: listing.id,
          platform: platformListing.platform,
          message: `"${listing.title}" relisted on ${platformName} after ${RELIST_STALE_DAYS} days`,
        },
      });
    } else if (outcome.outcome === "stranded") {
      // Delisted for real, but the repost didn't take — nothing live for this platform now.
      await prisma.platformListing.update({
        where: { id: platformListing.id },
        data: {
          status: "FAILED",
          externalId: null,
          externalUrl: null,
          errorMessage: `Relist failed after delist succeeded: ${outcome.error}`,
        },
      });
      summary.strandedAfterDelist += 1;
      await prisma.automationEvent.create({
        data: {
          userId: listing.userId,
          ruleType: RELIST_STALE_RULE,
          listingId: listing.id,
          platform: platformListing.platform,
          message: `"${listing.title}" was taken down from ${platformName} to relist, but the repost failed — it needs attention`,
          success: false,
        },
      });
    } else {
      // "not_attempted" or "delist_unconfirmed" — nothing was touched, a safe no-op.
      summary.failed += 1;
      const reason = outcome.outcome === "not_attempted" ? outcome.reason : `removal couldn't be confirmed, so it was left as-is: ${outcome.error}`;
      await prisma.automationEvent.create({
        data: {
          userId: listing.userId,
          ruleType: RELIST_STALE_RULE,
          listingId: listing.id,
          platform: platformListing.platform,
          message: `"${listing.title}" wasn't relisted on ${platformName} — ${reason}`,
          success: false,
        },
      });
    }
  }

  for (const [userId, tokens] of relistedByUser) {
    await upsertAutomationRanNotification(userId, RELIST_STALE_RULE, tokens);
  }

  return summary;
}
