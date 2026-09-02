"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAdapter } from "@/lib/marketplaces";
import { PlatformListingStatus } from "@/lib/marketplaces/listing-status";
import { track } from "@/lib/analytics/track";
import { requireWorkspace } from "@/lib/auth-helpers";
import { triggerJobWorker } from "@/lib/jobs/trigger";
import { checkRateLimit } from "@/lib/rate-limit";

const CROSSPOST_WINDOW_MS = 5 * 60 * 1000;
const CROSSPOST_MAX_PER_WINDOW = 30;
const BULK_ACTION_WINDOW_MS = 5 * 60 * 1000;
const BULK_ACTION_MAX_PER_WINDOW = 20;
// Matches /api/v1/listings' MAX_ITEMS_PER_REQUEST -- an unbounded array here would let one call
// create an unbounded number of CrossPostJob rows in a single write.
const BULK_ACTION_MAX_LISTINGS = 100;

export async function crossPost(listingId: string, platformIds: string[]) {
  const { actingUserId, workspaceUserId: userId } = await requireWorkspace();

  const rateCheck = await checkRateLimit(`crosspost:${userId}`, { windowMs: CROSSPOST_WINDOW_MS, max: CROSSPOST_MAX_PER_WINDOW });
  if (!rateCheck.allowed) {
    return { error: "You're publishing too quickly. Please wait a bit and try again." };
  }

  const listing = await prisma.listing.findFirst({
    where: { id: listingId, userId },
    include: { photos: true },
  });
  if (!listing) return { error: "Listing not found" };

  await track("publish_started", actingUserId, { listingId, platformIds });

  const accounts = await prisma.marketplaceAccount.findMany({
    where: { userId, platform: { in: platformIds }, isActive: true },
  });
  const accountByPlatform = new Map(accounts.map((a) => [a.platform, a]));

  // Promise.all preserves input order in the results array regardless of completion order,
  // and each platform's writes are independent, so there's no need to await them one at a time.
  const results = await Promise.all(
    platformIds.map(async (platformId) => {
      const adapter = getAdapter(platformId);
      if (!adapter) {
        return { platformId, success: false, error: "Unsupported platform" };
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

      return {
        platformId,
        success: true,
        message: `Queued on ${adapter.name}${account ? "" : " (no account connected)"}`,
      };
    })
  );

  // Kicks the Inngest-triggered worker so this request returns immediately -- see
  // lib/jobs/trigger.ts for the durable-backstop cron this falls back on if the event send fails.
  triggerJobWorker(listingId);

  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/listings");
  return { success: true, results };
}

/** Queues a DELIST or RELIST job for every currently-POSTED platform on each selected listing.
 *  Ownership is verified via the listing query itself -- a listing id that isn't the caller's
 *  simply won't match and contributes zero jobs. */
async function queueBulkJob(listingIds: string[], type: "DELIST" | "RELIST") {
  const { workspaceUserId: userId } = await requireWorkspace();

  if (listingIds.length === 0) return { success: true, queued: 0 };
  if (listingIds.length > BULK_ACTION_MAX_LISTINGS) {
    return { error: `Select at most ${BULK_ACTION_MAX_LISTINGS} listings at a time` };
  }

  const rateCheck = await checkRateLimit(`bulk-crosspost:${userId}`, { windowMs: BULK_ACTION_WINDOW_MS, max: BULK_ACTION_MAX_PER_WINDOW });
  if (!rateCheck.allowed) {
    return { error: "You're doing that too quickly. Please wait a bit and try again." };
  }

  const listings = await prisma.listing.findMany({
    where: { id: { in: listingIds }, userId },
    include: { platformListings: { where: { status: PlatformListingStatus.POSTED } } },
  });

  const jobs = listings.flatMap((listing) =>
    listing.platformListings.map((platformListing) => ({
      userId,
      listingId: listing.id,
      platform: platformListing.platform,
      type,
      status: "PENDING",
    }))
  );
  const queued = jobs.length > 0 ? (await prisma.crossPostJob.createMany({ data: jobs })).count : 0;

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

/** Queues a REPRICE job for every currently-POSTED platform listing that (a) doesn't have its
 *  own per-marketplace price override -- PlatformListing.price set means the seller deliberately
 *  priced it differently there, and a base-price change shouldn't silently flatten that -- and
 *  (b) whose adapter actually supports automated price updates. Called after a base-price change
 *  lands in the DB (see bulkUpdatePrice in lib/actions/listings.ts) to push it out live. Ids not
 *  owned by the caller simply contribute zero jobs, same as queueBulkJob. */
export async function queueRepriceJobs(listingIds: string[]): Promise<{ success: true; queued: number } | { error: string }> {
  const { workspaceUserId: userId } = await requireWorkspace();
  if (listingIds.length === 0) return { success: true, queued: 0 };
  if (listingIds.length > BULK_ACTION_MAX_LISTINGS) {
    return { error: `Select at most ${BULK_ACTION_MAX_LISTINGS} listings at a time` };
  }

  const rateCheck = await checkRateLimit(`bulk-crosspost:${userId}`, { windowMs: BULK_ACTION_WINDOW_MS, max: BULK_ACTION_MAX_PER_WINDOW });
  if (!rateCheck.allowed) {
    return { error: "You're doing that too quickly. Please wait a bit and try again." };
  }

  const listings = await prisma.listing.findMany({
    where: { id: { in: listingIds }, userId },
    include: { platformListings: { where: { status: PlatformListingStatus.POSTED, price: null } } },
  });

  const jobs = listings.flatMap((listing) =>
    listing.platformListings
      .filter((platformListing) => Boolean(getAdapter(platformListing.platform)?.updatePrice))
      .map((platformListing) => ({
        userId,
        listingId: listing.id,
        platform: platformListing.platform,
        type: "REPRICE",
        status: "PENDING",
      }))
  );
  const queued = jobs.length > 0 ? (await prisma.crossPostJob.createMany({ data: jobs })).count : 0;

  if (queued > 0) triggerJobWorker();

  revalidatePath("/listings");
  for (const listing of listings) revalidatePath(`/listings/${listing.id}`);
  return { success: true, queued };
}

export async function getCrossPostJobs(listingId?: string) {
  const { workspaceUserId: userId } = await requireWorkspace();
  return prisma.crossPostJob.findMany({
    where: { userId, ...(listingId ? { listingId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
