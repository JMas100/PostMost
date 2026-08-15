import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { getAdapter } from "@/lib/marketplaces";
import { Photo } from "@prisma/client";

const PlatformListingStatus = {
  PENDING: "PENDING",
  POSTED: "POSTED",
  FAILED: "FAILED",
  DELISTED: "DELISTED",
  SOLD: "SOLD",
} as const;

export async function processPendingCrossPostJobs(listingId?: string) {
  const jobs = await prisma.crossPostJob.findMany({
    where: {
      status: "PENDING",
      ...(listingId ? { listingId } : {}),
    },
    include: { listing: { include: { photos: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  for (const job of jobs) {
    if (!job.listing) continue;

    await prisma.crossPostJob.update({
      where: { id: job.id },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    const adapter = getAdapter(job.platform);
    if (!adapter) {
      await failJob(job.id, job.listingId, job.platform, "Unsupported platform");
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
      const result = await adapter.post(listingData, accountData);
      await prisma.crossPostJob.update({
        where: { id: job.id },
        data: {
          status: result.success ? "COMPLETED" : "FAILED",
          result: JSON.stringify(result),
          error: result.error || null,
          completedAt: new Date(),
        },
      });
      await prisma.platformListing.update({
        where: { listingId_platform: { listingId: job.listingId, platform: job.platform } },
        data: {
          status: result.success ? PlatformListingStatus.POSTED : PlatformListingStatus.FAILED,
          externalId: result.externalId || null,
          externalUrl: result.externalUrl || null,
          errorMessage: result.error || null,
          postedAt: result.success ? new Date() : null,
        },
      });
      if (result.success) {
        await prisma.listing.update({
          where: { id: job.listingId },
          data: { status: "ACTIVE" },
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await failJob(job.id, job.listingId, job.platform, message);
    }
  }
}

async function failJob(jobId: string, listingId: string, platform: string, message: string) {
  await prisma.crossPostJob.update({
    where: { id: jobId },
    data: { status: "FAILED", error: message, completedAt: new Date() },
  });
  await prisma.platformListing.update({
    where: { listingId_platform: { listingId, platform } },
    data: { status: PlatformListingStatus.FAILED, errorMessage: message },
  });
}
