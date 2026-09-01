"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdapter } from "@/lib/marketplaces";
import { getAccountData } from "@/lib/marketplaces/account-data";
import { getEffectivePlan, PLAN_ASSIGNMENT_SELECT } from "@/lib/plans";
import { DELIST_ON_SALE_RULE } from "@/lib/automation/rule-types";
import { requireWorkspace } from "@/lib/auth-helpers";

const PAGE_SIZE = 25;

export async function markListingSold(listingId: string, soldPlatform?: string, sale?: { soldPrice?: number; soldFees?: number; soldShippingCost?: number }) {
  const { workspaceUserId: userId } = await requireWorkspace();

  const listing = await prisma.listing.findFirst({
    where: { id: listingId, userId },
    include: { platformListings: true, shippingProfile: true },
  });
  if (!listing) return { error: "Listing not found" };

  const cost = listing.cost ?? 0;
  const platformToProfit = soldPlatform || listing.platformListings.find((p) => p.status === "POSTED")?.platform;
  const profitPlatformListing = platformToProfit
    ? listing.platformListings.find((p) => p.platform === platformToProfit)
    : undefined;

  // The listing's terminal SOLD status and the sold-platform's profit figures are both purely
  // local writes with no external call between them -- group them in one transaction so a crash
  // can never leave the listing SOLD with stale/missing profit data (or vice versa). The
  // remaining per-platform delist calls below are external and slow, so they stay outside any
  // transaction and are written one at a time as each one resolves.
  const localWrites: Prisma.PrismaPromise<unknown>[] = [
    prisma.listing.update({ where: { id: listingId }, data: { status: "SOLD" } }),
  ];
  if (profitPlatformListing) {
    const soldPrice = sale?.soldPrice ?? profitPlatformListing.price ?? listing.price;
    const soldFees = sale?.soldFees ?? profitPlatformListing.fees ?? 0;
    const soldShippingCost = sale?.soldShippingCost ?? listing.shippingProfile?.cost ?? 0;
    const profit = soldPrice - cost - soldFees - soldShippingCost;
    localWrites.push(
      prisma.platformListing.update({
        where: { id: profitPlatformListing.id },
        data: { status: "SOLD", soldAt: new Date(), soldPrice, soldFees, soldShippingCost, profit },
      })
    );
  }
  await prisma.$transaction(localWrites);

  const results = [];
  for (const platformListing of listing.platformListings) {
    if (platformListing.id === profitPlatformListing?.id) continue;

    // Every other platform this listing is still live on needs to be auto-delisted now that
    // it's sold elsewhere. Status only moves to DELISTED once removal is actually confirmed —
    // marking it SOLD (or DELISTED) on a failed/unattempted delist would hide a listing that's
    // still live and sellable, risking a double-sale. FAILED keeps it visible in "Needs
    // attention" and eligible for retry, exactly like a failed cross-post.
    if (platformListing.status !== "POSTED") continue;

    const adapter = getAdapter(platformListing.platform);
    const accountData = platformListing.externalId ? await getAccountData(userId, platformListing.platform) : null;

    if (!platformListing.externalId || !accountData?.accessToken || !adapter?.delist) {
      const reason = !platformListing.externalId
        ? "no listing URL was recorded for it"
        : !accountData?.accessToken
        ? "no connected account"
        : "this platform doesn't support automatic delisting yet";
      await prisma.platformListing.update({
        where: { id: platformListing.id },
        data: { status: "FAILED", errorMessage: `Sold elsewhere, but couldn't auto-delist: ${reason}.` },
      });
      await prisma.automationEvent.create({
        data: {
          userId,
          ruleType: DELIST_ON_SALE_RULE,
          listingId,
          platform: platformListing.platform,
          message: `"${listing.title}" sold, but couldn't auto-delist from ${platformListing.platform}: ${reason}`,
          success: false,
        },
      });
      continue;
    }

    try {
      const result = await adapter.delist(platformListing.externalId, accountData);
      results.push({ platform: platformListing.platform, ...result });
      if (!result.success) {
        await prisma.platformListing.update({
          where: { id: platformListing.id },
          data: { status: "FAILED", errorMessage: result.error || "Delist failed" },
        });
        await prisma.automationEvent.create({
          data: {
            userId,
            ruleType: DELIST_ON_SALE_RULE,
            listingId,
            platform: platformListing.platform,
            message: `"${listing.title}" sold, but delisting from ${adapter.name} failed: ${result.error || "unknown error"}`,
            success: false,
          },
        });
      } else {
        await prisma.platformListing.update({
          where: { id: platformListing.id },
          data: { status: "DELISTED", soldAt: new Date(), errorMessage: null },
        });
        await prisma.automationEvent.create({
          data: {
            userId,
            ruleType: DELIST_ON_SALE_RULE,
            listingId,
            platform: platformListing.platform,
            message: `"${listing.title}" sold — delisted from ${adapter.name}`,
            savedAmount: platformListing.price ?? listing.price,
          },
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delist error";
      results.push({ platform: platformListing.platform, success: false, error: message });
      await prisma.platformListing.update({
        where: { id: platformListing.id },
        data: { status: "FAILED", errorMessage: message },
      });
      await prisma.automationEvent.create({
        data: {
          userId,
          ruleType: DELIST_ON_SALE_RULE,
          listingId,
          platform: platformListing.platform,
          message: `"${listing.title}" sold, but delisting from ${adapter.name} threw an error: ${message}`,
          success: false,
        },
      });
    }
  }

  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/listings");
  revalidatePath("/analytics");
  return { success: true, results };
}

export async function getInventory(filters: { q?: string; missingCostOnly?: boolean; page?: number } = {}) {
  const { workspaceUserId: userId } = await requireWorkspace();
  const page = Math.max(1, filters.page ?? 1);

  const where: Prisma.ListingWhereInput = {
    userId,
    isDraft: false,
    ...(filters.missingCostOnly ? { cost: null } : {}),
    ...(filters.q?.trim()
      ? {
          OR: [
            { title: { contains: filters.q.trim(), mode: "insensitive" as const } },
            { sku: { contains: filters.q.trim(), mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  // Aggregates run over lean scalar-only rows (no photos/platformListings) so they don't pay
  // for relations they don't use -- the filtered, paginated query below loads full relations
  // only for the one page actually being displayed.
  const [totalCount, filteredCount, statRows, user] = await Promise.all([
    prisma.listing.count({ where: { userId, isDraft: false } }),
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where: { userId, isDraft: false },
      select: { quantity: true, price: true, cost: true },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: PLAN_ASSIGNMENT_SELECT }),
  ]);

  const plan = getEffectivePlan(user);
  const activeCount = statRows.filter((l) => l.quantity > 0).length;
  const totalValue = statRows.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const missingCostCount = statRows.filter((l) => l.cost === null).length;
  const costedRows = statRows.filter((l) => l.cost !== null);
  const costBasis = costedRows.reduce((sum, l) => sum + (l.cost ?? 0) * l.quantity, 0);
  const potentialProfit = costedRows.reduce((sum, l) => sum + (l.price - (l.cost ?? 0)) * l.quantity, 0);

  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);

  const listings = await prisma.listing.findMany({
    where,
    include: { photos: true, platformListings: true },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    skip: (clampedPage - 1) * PAGE_SIZE,
  });

  return {
    listings,
    totalCount,
    filteredCount,
    page: clampedPage,
    totalPages,
    plan,
    activeCount,
    activeLimit: plan.activeInventoryLimit,
    totalValue,
    missingCostCount,
    costBasis,
    potentialProfit,
  };
}

export type InventoryData = Awaited<ReturnType<typeof getInventory>>;
