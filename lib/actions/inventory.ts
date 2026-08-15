"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { getAdapter } from "@/lib/marketplaces";

function getUserId(session: { user?: { id?: string } } | null) {
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function markListingSold(listingId: string) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);

  const listing = await prisma.listing.findFirst({
    where: { id: listingId, userId },
    include: { platformListings: true },
  });
  if (!listing) return { error: "Listing not found" };

  await prisma.listing.update({
    where: { id: listingId },
    data: { status: "SOLD" },
  });

  const results = [];
  for (const platformListing of listing.platformListings) {
    await prisma.platformListing.update({
      where: { id: platformListing.id },
      data: { status: "SOLD", soldAt: new Date() },
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
