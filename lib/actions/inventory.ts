"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { getAdapter } from "@/lib/marketplaces";
import { getPlan } from "@/lib/plans";

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

    const soldPrice = sale?.soldPrice ?? platformListing.price ?? listing.price;
    const soldFees = sale?.soldFees ?? platformListing.fees ?? 0;
    const soldShippingCost = sale?.soldShippingCost ?? listing.shippingProfile?.cost ?? 0;
    const profit = isSoldPlatform ? soldPrice - cost - soldFees - soldShippingCost : null;

    await prisma.platformListing.update({
      where: { id: platformListing.id },
      data: {
        status: "SOLD",
        soldAt: new Date(),
        ...(isSoldPlatform ? { soldPrice, soldFees, soldShippingCost, profit } : {}),
      },
    });

    if (platformListing.status === "POSTED" && platformListing.externalId) {
      const account = await prisma.marketplaceAccount.findFirst({
        where: { userId, platform: platformListing.platform, isActive: true },
      });
      if (account?.accessToken) {
        const adapter = getAdapter(platformListing.platform);
        if (adapter?.delist) {
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
                data: { errorMessage: result.error || "Delist failed" },
              });
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : "Delist error";
            results.push({ platform: platformListing.platform, success: false, error: message });
          }
        }
      }
    }
  }

  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/listings");
  revalidatePath("/analytics");
  return { success: true, results };
}

export async function getInventory() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");

  const [listings, user] = await Promise.all([
    prisma.listing.findMany({
      where: { userId, isDraft: false },
      include: { photos: true, platformListings: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { plan: true } }),
  ]);

  const plan = getPlan(user?.plan);
  const activeCount = listings.filter((l) => l.quantity > 0).length;
  const totalValue = listings.reduce((sum, l) => sum + l.price * l.quantity, 0);

  return {
    listings,
    plan,
    activeCount,
    activeLimit: plan.activeInventoryLimit,
    totalValue,
  };
}

export type InventoryData = Awaited<ReturnType<typeof getInventory>>;
