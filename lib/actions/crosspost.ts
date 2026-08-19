"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAdapter } from "@/lib/marketplaces";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { track } from "@/lib/analytics/track";

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

  await track("publish_started", userId, { listingId, platformIds });

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

  // Kick the worker in a separate invocation so this request returns immediately.
  // The Vercel cron on /api/jobs/run is the durable backstop if this trigger fails.
  triggerJobWorker(listingId);

  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/listings");
  return { success: true, results };
}

function triggerJobWorker(listingId: string) {
  const baseUrl = process.env.APP_URL || process.env.NEXTAUTH_URL;
  const masterKey = process.env.MASTER_KEY;
  if (!baseUrl || !masterKey) return;

  void fetch(`${baseUrl.replace(/\/$/, "")}/api/jobs/run`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-master-key": masterKey },
    body: JSON.stringify({ listingId }),
    cache: "no-store",
  }).catch(() => {
    // Best-effort trigger; the cron will pick the jobs up regardless.
  });
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
