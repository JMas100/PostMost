import { prisma } from "@/lib/prisma";
import { getAdapter } from "@/lib/marketplaces";
import { getAccountData } from "@/lib/marketplaces/account-data";
import { relistPlatformListing } from "@/lib/marketplaces/relist";
import { PlatformListingStatus } from "@/lib/marketplaces/listing-status";
import { track } from "@/lib/analytics/track";
import { Photo, Prisma } from "@prisma/client";
import type { MarketplaceAdapter } from "@/lib/marketplaces/types";

/** A RUNNING job whose lock is older than this is considered abandoned and is reclaimed. */
const STUCK_JOB_TIMEOUT_MS = 5 * 60 * 1000;
/** Maximum time a single adapter.post call may take before the job is failed/retried. */
const JOB_TIMEOUT_MS = 60 * 1000;
/** Backoff before attempt N+1, indexed by the attempt count that just failed. */
const RETRY_BACKOFF_MS = [60 * 1000, 5 * 60 * 1000, 15 * 60 * 1000];

export type CrossPostRunSummary = {
  processed: number;
  succeeded: number;
  failed: number;
  retried: number;
  reclaimed: number;
};

function backoffMs(attempts: number) {
  return RETRY_BACKOFF_MS[Math.min(attempts, RETRY_BACKOFF_MS.length) - 1] ?? RETRY_BACKOFF_MS[0];
}

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Reset jobs whose worker died mid-flight so they become eligible again. */
async function reclaimStuckJobs(listingId?: string) {
  const { count } = await prisma.crossPostJob.updateMany({
    where: {
      status: "RUNNING",
      lockedAt: { lt: new Date(Date.now() - STUCK_JOB_TIMEOUT_MS) },
      ...(listingId ? { listingId } : {}),
    },
    data: { status: "PENDING", lockedAt: null, nextRunAt: new Date() },
  });
  return count;
}

export async function processPendingCrossPostJobs(listingId?: string): Promise<CrossPostRunSummary> {
  const summary: CrossPostRunSummary = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    retried: 0,
    reclaimed: await reclaimStuckJobs(listingId),
  };

  const candidates = await prisma.crossPostJob.findMany({
    where: {
      status: "PENDING",
      nextRunAt: { lte: new Date() },
      ...(listingId ? { listingId } : {}),
    },
    include: { listing: { include: { photos: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  for (const job of candidates) {
    if (!job.listing) continue;

    // Atomic claim: only one worker can flip a PENDING row to RUNNING.
    const claim = await prisma.crossPostJob.updateMany({
      where: { id: job.id, status: "PENDING" },
      data: { status: "RUNNING", lockedAt: new Date(), startedAt: new Date() },
    });
    if (claim.count === 0) continue;

    summary.processed += 1;
    const attempts = job.attempts + 1;

    const adapter = getAdapter(job.platform);
    if (!adapter) {
      await handleFailure(job.id, job.userId, job.listingId, job.platform, attempts, job.maxAttempts, "Unsupported platform", summary);
      continue;
    }

    if (job.type === "DELIST") {
      await processDelistJob(job, adapter, attempts, summary);
      continue;
    }
    if (job.type === "RELIST") {
      await processRelistJob(job, attempts, summary);
      continue;
    }
    if (job.type === "REPRICE") {
      await processRepriceJob(job, adapter, attempts, summary);
      continue;
    }

    const listingData = {
      title: job.listing.title,
      description: job.listing.description,
      price: job.listing.price,
      quantity: job.listing.quantity,
      condition: job.listing.condition,
      category: job.listing.category,
      brand: job.listing.brand,
      size: job.listing.size,
      color: job.listing.color,
      material: job.listing.material,
      sku: job.listing.sku,
      tags: job.listing.tags ? job.listing.tags.split(",").map((t) => t.trim()) : undefined,
      photos: job.listing.photos.map((p: Photo) => p.url),
    };

    const accountData = (await getAccountData(job.userId, job.platform)) ?? { accessToken: null };

    try {
      const result = await withTimeout(
        adapter.post(listingData, accountData),
        JOB_TIMEOUT_MS,
        `Timed out after ${JOB_TIMEOUT_MS / 1000}s`
      );

      if (!result.success) {
        await handleFailure(
          job.id,
          job.userId,
          job.listingId,
          job.platform,
          attempts,
          job.maxAttempts,
          result.error || "Unknown error",
          summary,
          JSON.stringify(result)
        );
        continue;
      }

      await prisma.crossPostJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          result: JSON.stringify(result),
          error: null,
          attempts,
          lockedAt: null,
          completedAt: new Date(),
        },
      });
      await prisma.platformListing.update({
        where: { listingId_platform: { listingId: job.listingId, platform: job.platform } },
        data: {
          status: PlatformListingStatus.POSTED,
          externalId: result.externalId || null,
          externalUrl: result.externalUrl || null,
          errorMessage: null,
          postedAt: new Date(),
        },
      });
      await prisma.listing.update({
        where: { id: job.listingId },
        data: { status: "ACTIVE" },
      });
      summary.succeeded += 1;

      await track("publish_platform_succeeded", job.userId, { listingId: job.listingId, platform: job.platform });
      const claim = await prisma.user.updateMany({
        where: { id: job.userId, firstCrosspostAt: null },
        data: { firstCrosspostAt: new Date() },
      });
      if (claim.count === 1) {
        await track("first_crosspost_completed", job.userId, { listingId: job.listingId, platform: job.platform });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await handleFailure(job.id, job.userId, job.listingId, job.platform, attempts, job.maxAttempts, message, summary);
    }
  }

  return summary;
}

type JobWithListing = Prisma.CrossPostJobGetPayload<{ include: { listing: { include: { photos: true } } } }>;

async function processDelistJob(
  job: JobWithListing,
  adapter: MarketplaceAdapter,
  attempts: number,
  summary: CrossPostRunSummary
) {
  if (!adapter.delist) {
    await handleFailure(job.id, job.userId, job.listingId, job.platform, attempts, job.maxAttempts, `${adapter.name} doesn't support delisting`, summary);
    return;
  }

  const platformListing = await prisma.platformListing.findUnique({
    where: { listingId_platform: { listingId: job.listingId, platform: job.platform } },
  });
  if (!platformListing?.externalId) {
    await handleFailure(job.id, job.userId, job.listingId, job.platform, attempts, job.maxAttempts, "No listing URL recorded for this platform", summary);
    return;
  }

  const accountData = (await getAccountData(job.userId, job.platform)) ?? { accessToken: null };

  try {
    const result = await withTimeout(
      adapter.delist(platformListing.externalId, accountData),
      JOB_TIMEOUT_MS,
      `Timed out after ${JOB_TIMEOUT_MS / 1000}s`
    );

    if (!result.success) {
      await handleFailure(job.id, job.userId, job.listingId, job.platform, attempts, job.maxAttempts, result.error || "Unknown error", summary);
      return;
    }

    await prisma.crossPostJob.update({
      where: { id: job.id },
      data: { status: "COMPLETED", error: null, attempts, lockedAt: null, completedAt: new Date() },
    });
    await prisma.platformListing.update({
      where: { id: platformListing.id },
      data: { status: PlatformListingStatus.DELISTED, errorMessage: null },
    });
    summary.succeeded += 1;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await handleFailure(job.id, job.userId, job.listingId, job.platform, attempts, job.maxAttempts, message, summary);
  }
}

/** Pushes the listing's current base price (already written to Listing.price by whatever queued
 *  this job -- e.g. bulkUpdatePrice) out to one already-live platform listing. Never touches
 *  PlatformListing.price itself: null there means "follows the base price", which stays true
 *  after a successful push, and a non-null override is never queued for this job type in the
 *  first place (see queueRepriceJobs in lib/actions/crosspost.ts). */
async function processRepriceJob(
  job: JobWithListing,
  adapter: MarketplaceAdapter,
  attempts: number,
  summary: CrossPostRunSummary
) {
  if (!adapter.updatePrice) {
    await handleFailure(job.id, job.userId, job.listingId, job.platform, attempts, job.maxAttempts, `${adapter.name} doesn't support automated price updates`, summary);
    return;
  }

  const platformListing = await prisma.platformListing.findUnique({
    where: { listingId_platform: { listingId: job.listingId, platform: job.platform } },
  });
  if (!platformListing?.externalId) {
    await handleFailure(job.id, job.userId, job.listingId, job.platform, attempts, job.maxAttempts, "No listing URL recorded for this platform", summary);
    return;
  }

  const accountData = (await getAccountData(job.userId, job.platform)) ?? { accessToken: null };

  try {
    const result = await withTimeout(
      adapter.updatePrice(platformListing.externalId, job.listing.price, accountData, job.listing.sku),
      JOB_TIMEOUT_MS,
      `Timed out after ${JOB_TIMEOUT_MS / 1000}s`
    );

    if (!result.success) {
      await handleFailure(job.id, job.userId, job.listingId, job.platform, attempts, job.maxAttempts, result.error || "Unknown error", summary);
      return;
    }

    await prisma.crossPostJob.update({
      where: { id: job.id },
      data: { status: "COMPLETED", error: null, attempts, lockedAt: null, completedAt: new Date() },
    });
    await prisma.platformListing.update({
      where: { id: platformListing.id },
      data: { errorMessage: null },
    });
    summary.succeeded += 1;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await handleFailure(job.id, job.userId, job.listingId, job.platform, attempts, job.maxAttempts, message, summary);
  }
}

async function processRelistJob(job: JobWithListing, attempts: number, summary: CrossPostRunSummary) {
  const platformListing = await prisma.platformListing.findUnique({
    where: { listingId_platform: { listingId: job.listingId, platform: job.platform } },
  });

  const outcome = await withTimeout(
    relistPlatformListing({
      userId: job.userId,
      platform: job.platform,
      externalId: platformListing?.externalId ?? null,
      listingData: {
        title: job.listing.title,
        description: job.listing.description,
        price: job.listing.price,
        quantity: job.listing.quantity,
        condition: job.listing.condition,
        category: job.listing.category,
        brand: job.listing.brand,
        size: job.listing.size,
        color: job.listing.color,
        material: job.listing.material,
        sku: job.listing.sku,
        tags: job.listing.tags ? job.listing.tags.split(",").map((t) => t.trim()) : undefined,
        photos: job.listing.photos.map((p: Photo) => p.url),
      },
    }),
    JOB_TIMEOUT_MS * 2,
    `Timed out after ${(JOB_TIMEOUT_MS * 2) / 1000}s`
  ).catch((err) => ({ outcome: "delist_unconfirmed" as const, error: err instanceof Error ? err.message : "Unknown error" }));

  if (outcome.outcome === "relisted") {
    await prisma.crossPostJob.update({
      where: { id: job.id },
      data: { status: "COMPLETED", error: null, attempts, lockedAt: null, completedAt: new Date() },
    });
    if (platformListing) {
      await prisma.platformListing.update({
        where: { id: platformListing.id },
        data: {
          status: PlatformListingStatus.POSTED,
          externalId: outcome.externalId || null,
          externalUrl: outcome.externalUrl || null,
          postedAt: new Date(),
          errorMessage: null,
        },
      });
    }
    summary.succeeded += 1;
    return;
  }

  if (outcome.outcome === "stranded") {
    // Delisted for real, but the repost failed -- this genuinely needs attention. Not retried:
    // retrying would just attempt to post fresh, which is fine, but we want a human to know
    // this platform went down first.
    await prisma.crossPostJob.update({
      where: { id: job.id },
      data: { status: "FAILED", error: outcome.error, attempts, lockedAt: null, completedAt: new Date() },
    });
    if (platformListing) {
      await prisma.platformListing.update({
        where: { id: platformListing.id },
        data: {
          status: PlatformListingStatus.FAILED,
          externalId: null,
          externalUrl: null,
          errorMessage: `Relist failed after delist succeeded: ${outcome.error}`,
        },
      });
    }
    summary.failed += 1;
    return;
  }

  // "not_attempted" or "delist_unconfirmed" -- nothing was touched, the listing is exactly as
  // it was before. Retry with backoff like any transient failure, but never mark the
  // platformListing FAILED for this -- it's still genuinely live and fine.
  const message = outcome.outcome === "not_attempted" ? outcome.reason : `removal couldn't be confirmed: ${outcome.error}`;
  if (attempts < job.maxAttempts) {
    await prisma.crossPostJob.update({
      where: { id: job.id },
      data: { status: "PENDING", error: message, attempts, lockedAt: null, nextRunAt: new Date(Date.now() + backoffMs(attempts)) },
    });
    summary.retried += 1;
    return;
  }
  await prisma.crossPostJob.update({
    where: { id: job.id },
    data: { status: "FAILED", error: message, attempts, lockedAt: null, completedAt: new Date() },
  });
  summary.failed += 1;
}

async function handleFailure(
  jobId: string,
  userId: string,
  listingId: string,
  platform: string,
  attempts: number,
  maxAttempts: number,
  message: string,
  summary: CrossPostRunSummary,
  result?: string
) {
  if (attempts < maxAttempts) {
    await prisma.crossPostJob.update({
      where: { id: jobId },
      data: {
        status: "PENDING",
        error: message,
        result: result ?? null,
        attempts,
        lockedAt: null,
        nextRunAt: new Date(Date.now() + backoffMs(attempts)),
      },
    });
    summary.retried += 1;
    return;
  }

  await prisma.crossPostJob.update({
    where: { id: jobId },
    data: {
      status: "FAILED",
      error: message,
      result: result ?? null,
      attempts,
      lockedAt: null,
      completedAt: new Date(),
    },
  });
  await prisma.platformListing.update({
    where: { listingId_platform: { listingId, platform } },
    data: { status: PlatformListingStatus.FAILED, errorMessage: message },
  });
  summary.failed += 1;
  await track("publish_platform_failed", userId, { listingId, platform, error: message });
}
