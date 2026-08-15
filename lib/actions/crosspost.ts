"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAdapter } from "@/lib/marketplaces";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { processPendingCrossPostJobs } from "@/lib/jobs/crosspost-runner";

const PlatformListingStatus = {
  PENDING: "PENDING",
  POSTED: "POSTED",
  FAILED: "FAILED",
  DELISTED: "DELISTED",
  SOLD: "SOLD",
} as const;

function getUserId(session: { user?: { id?: string } } | null) {
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function crossPost(listingId: string, platformIds: string[]) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);

  const listing = await prisma.listing.findFirst({
    where: { id: listingId, userId },
    include: { photos: true },
  });
  if (!listing) return { error: "Listing not found" };

  const accounts = await prisma.marketplaceAccount.findMany({
    where: { userId, platform: { in: platformIds }, isActive: true },
  });
  const accountByPlatform = new Map(accounts.map((a) => [a.platform, a]));

  const results = [];
  for (const platformId of platformIds) {
    const adapter = getAdapter(platformId);
    if (!adapter) {
      results.push({ platformId, success: false, error: "Unsupported platform" });
      continue;
    }

    const account = accountByPlatform.get(platformId);

    await prisma.platformListing.upsert({
      where: { listingId_platform: { listingId, platform: platformId } },
      create: {
        listingId,
        platform: platformId,
        status: PlatformListingStatus.PENDING,
      },
      update: {
        status: PlatformListingStatus.PENDING,
        errorMessage: null,
      },
    });

    await prisma.crossPostJob.create({
      data: {
        userId,
        listingId,
        platform: platformId,
        status: "PENDING",
        payload: JSON.stringify({ listingId, platformId, accountId: account?.id }),
      },
    });

    results.push({
      platformId,
      success: true,
      message: `Queued on ${adapter.name}${account ? "" : " (no account connected)"}`,
    });
  }

  // Process the jobs in the background so the UI returns immediately.
  void processPendingCrossPostJobs(listingId);

  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/listings");
  return { success: true, results };
}

export async function getCrossPostJobs(listingId?: string) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  return prisma.crossPostJob.findMany({
    where: { userId, ...(listingId ? { listingId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
