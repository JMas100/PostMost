"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAdapter } from "@/lib/marketplaces";
import { PlatformListingStatus } from "@/lib/marketplaces/listing-status";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { track } from "@/lib/analytics/track";
import { getUserId } from "@/lib/auth-helpers";

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

function triggerJobWorker(listingId?: string) {
  const baseUrl = process.env.APP_URL || process.env.NEXTAUTH_URL;
  const masterKey = process.env.MASTER_KEY;
  if (!baseUrl || !masterKey) return;

  void fetch(`${baseUrl.replace(/\/$/, "")}/api/jobs/run`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-master-key": masterKey },
    body: JSON.stringify(listingId ? { listingId } : {}),
    cache: "no-store",
  }).catch(() => {
    // Best-effort trigger; the cron will pick the jobs up regardless.
  });
}

/** Queues a DELIST or RELIST job for every currently-POSTED platform on each selected listing.
 *  Ownership is verified via the listing query itself -- a listing id that isn't the caller's
 *  simply won't match and contributes zero jobs. */
async function queueBulkJob(listingIds: string[], type: "DELIST" | "RELIST") {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);

  if (listingIds.length === 0) return { success: true, queued: 0 };

  const listings = await prisma.listing.findMany({
    where: { id: { in: listingIds }, userId },
    include: { platformListings: { where: { status: PlatformListingStatus.POSTED } } },
  });

  let queued = 0;
  for (const listing of listings) {
    for (const platformListing of listing.platformListings) {
      await prisma.crossPostJob.create({
        data: {
          userId,
          listingId: listing.id,
          platform: platformListing.platform,
          type,
          status: "PENDING",
        },
      });
      queued += 1;
    }
  }

  if (queued > 0) triggerJobWorker();

  revalidatePath("/listings");
  for (const listing of listings) revalidatePath(`/listings/${listing.id}`);
  return { success: true, queued };
}

export async function bulkDelist(listingIds: string[]) {
  return queueBulkJob(listingIds, "DELIST");
}

export async function bulkRelist(listingIds: string[]) {
  return queueBulkJob(listingIds, "RELIST");
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
