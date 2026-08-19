import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { getAdapter } from "@/lib/marketplaces";
import { track } from "@/lib/analytics/track";
import { Photo } from "@prisma/client";

const PlatformListingStatus = {
  PENDING: "PENDING",
  POSTED: "POSTED",
  FAILED: "FAILED",
  DELISTED: "DELISTED",
  SOLD: "SOLD",
} as const;

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

    const account = await prisma.marketplaceAccount.findFirst({
      where: { userId: job.userId, platform: job.platform, isActive: true },
    });

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

    const accountData = account
      ? {
          accessToken: account.accessToken ? decrypt(account.accessToken) : null,
          refreshToken: account.refreshToken ? decrypt(account.refreshToken) : null,
          externalId: account.externalId,
          tokenExpiresAt: account.tokenExpiresAt,
          settings: account.settings ? JSON.parse(account.settings) : {},
        }
      : { accessToken: null };

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

      const priorSuccesses = await prisma.platformListing.count({
        where: { status: PlatformListingStatus.POSTED, listing: { userId: job.userId } },
      });

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
      if (priorSuccesses === 0) {
        await track("first_crosspost_completed", job.userId, { listingId: job.listingId, platform: job.platform });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await handleFailure(job.id, job.userId, job.listingId, job.platform, attempts, job.maxAttempts, message, summary);
    }
  }

  return summary;
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
