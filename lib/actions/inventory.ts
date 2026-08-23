"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { getAdapter } from "@/lib/marketplaces";
import { getPlan } from "@/lib/plans";
import { DELIST_ON_SALE_RULE } from "@/lib/automation/rule-types";

function getUserId(session: { user?: { id?: string } } | null) {
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function markListingSold(listingId: string, soldPlatform?: string, sale?: { soldPrice?: number; soldFees?: number; soldShippingCost?: number }) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);

  const listing = await prisma.listing.findFirst({
    where: { id: listingId, userId },
    include: { platformListings: true, shippingProfile: true },
  });
  if (!listing) return { error: "Listing not found" };

  await prisma.listing.update({
    where: { id: listingId },
    data: { status: "SOLD" },
  });

  const cost = listing.cost ?? 0;
  const platformToProfit = soldPlatform || listing.platformListings.find((p) => p.status === "POSTED")?.platform;
  let profitPlatformSet = false;

  const results = [];
  for (const platformListing of listing.platformListings) {
    const isSoldPlatform = platformListing.platform === platformToProfit && !profitPlatformSet;
    if (isSoldPlatform) profitPlatformSet = true;

    if (isSoldPlatform) {
      const soldPrice = sale?.soldPrice ?? platformListing.price ?? listing.price;
      const soldFees = sale?.soldFees ?? platformListing.fees ?? 0;
      const soldShippingCost = sale?.soldShippingCost ?? listing.shippingProfile?.cost ?? 0;
      const profit = soldPrice - cost - soldFees - soldShippingCost;

      await prisma.platformListing.update({
        where: { id: platformListing.id },
        data: { status: "SOLD", soldAt: new Date(), soldPrice, soldFees, soldShippingCost, profit },
      });
      continue;
    }

    // Every other platform this listing is still live on needs to be auto-delisted now that
    // it's sold elsewhere. Status only moves to DELISTED once removal is actually confirmed —
    // marking it SOLD (or DELISTED) on a failed/unattempted delist would hide a listing that's
    // still live and sellable, risking a double-sale. FAILED keeps it visible in "Needs
    // attention" and eligible for retry, exactly like a failed cross-post.
    if (platformListing.status !== "POSTED") continue;

    const adapter = getAdapter(platformListing.platform);
    const account = platformListing.externalId
      ? await prisma.marketplaceAccount.findFirst({
          where: { userId, platform: platformListing.platform, isActive: true },
        })
      : null;

    if (!platformListing.externalId || !account?.accessToken || !adapter?.delist) {
      const reason = !platformListing.externalId
        ? "no listing URL was recorded for it"
        : !account?.accessToken
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

    const accountData = {
      accessToken: decrypt(account.accessToken),
      refreshToken: account.refreshToken ? decrypt(account.refreshToken) : null,
      externalId: account.externalId,
      tokenExpiresAt: account.tokenExpiresAt,
      settings: account.settings ? JSON.parse(account.settings) : {},
    };
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

export async function getInventory(filters: { q?: string; missingCostOnly?: boolean } = {}) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");

  const [allListings, user] = await Promise.all([
    prisma.listing.findMany({
      where: { userId, isDraft: false },
      include: { photos: true, platformListings: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { plan: true } }),
  ]);

  const plan = getPlan(user?.plan);
  const activeCount = allListings.filter((l) => l.quantity > 0).length;
  const totalValue = allListings.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const missingCostCount = allListings.filter((l) => l.cost === null).length;

  const costedListings = allListings.filter((l) => l.cost !== null);
  const costBasis = costedListings.reduce((sum, l) => sum + (l.cost ?? 0) * l.quantity, 0);
  const potentialProfit = costedListings.reduce((sum, l) => sum + (l.price - (l.cost ?? 0)) * l.quantity, 0);

  const q = filters.q?.trim().toLowerCase();
  const listings = allListings.filter((l) => {
    if (filters.missingCostOnly && l.cost !== null) return false;
    if (q && !l.title.toLowerCase().includes(q) && !(l.sku ?? "").toLowerCase().includes(q)) return false;
    return true;
  });

  return {
    listings,
    totalCount: allListings.length,
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
