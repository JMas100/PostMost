"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAdapter } from "@/lib/marketplaces";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Photo } from "@prisma/client";

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
    const listingData = {
      title: listing.title,
      description: listing.description,
      price: listing.price,
      quantity: listing.quantity,
      condition: listing.condition,
      category: listing.category,
      brand: listing.brand,
      size: listing.size,
      color: listing.color,
      material: listing.material,
      sku: listing.sku,
      tags: listing.tags ? listing.tags.split(",").map((t) => t.trim()) : undefined,
      photos: listing.photos.map((p: Photo) => p.url),
    };

    const payload = JSON.stringify({ listingId, platformId, accountId: account?.id });
    const job = await prisma.crossPostJob.create({
      data: {
        userId,
        listingId,
        platform: platformId,
        status: "PENDING",
        payload,
      },
    });

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

    const accountData = account
      ? {
          accessToken: account.accessToken,
          refreshToken: account.refreshToken,
          externalId: account.externalId,
          settings: account.settings ? JSON.parse(account.settings) : {},
        }
      : { accessToken: null };

    // Run async so the UI gets immediate feedback.
    (async () => {
      await prisma.crossPostJob.update({
        where: { id: job.id },
        data: { status: "RUNNING", startedAt: new Date() },
      });
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
          where: { listingId_platform: { listingId, platform: platformId } },
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
            where: { id: listingId },
            data: { status: "ACTIVE" },
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        await prisma.crossPostJob.update({
          where: { id: job.id },
          data: { status: "FAILED", error: message, completedAt: new Date() },
        });
        await prisma.platformListing.update({
          where: { listingId_platform: { listingId, platform: platformId } },
          data: { status: PlatformListingStatus.FAILED, errorMessage: message },
        });
      }
    })();

    results.push({
      platformId,
      success: true,
      message: `Queued on ${adapter.name}${account ? "" : " (no account connected)"}`,
    });
  }

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
