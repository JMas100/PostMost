"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUsage } from "@/lib/actions/usage";

export async function getAnalytics() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");

  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const [
    totalListings,
    publishedListings,
    draftListings,
    soldListings,
    platformListings,
    recentJobs,
    categoryGroups,
    listingsByDay,
    usage,
  ] = await Promise.all([
    prisma.listing.count({ where: { userId } }),
    prisma.listing.count({ where: { userId, isDraft: false } }),
    prisma.listing.count({ where: { userId, isDraft: true } }),
    prisma.listing.count({ where: { userId, status: "SOLD" } }),
    prisma.platformListing.findMany({
      where: { listing: { userId } },
      select: { platform: true, status: true },
    }),
    prisma.crossPostJob.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { listing: { select: { title: true } } },
    }),
    prisma.listing.groupBy({
      by: ["category"],
      where: { userId, isDraft: false },
      _count: { _all: true },
    }),
    prisma.listing.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    getUsage(userId),
  ]);

  const dayCounts = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayCounts.set(d.toISOString().slice(0, 10), 0);
  }
  for (const listing of listingsByDay) {
    const key = listing.createdAt.toISOString().slice(0, 10);
    dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
  }
  const listingsByDaySorted = Array.from(dayCounts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const platformBreakdown = new Map<
    string,
    { total: number; posted: number; failed: number; pending: number; delisted: number; sold: number }
  >();
  for (const pl of platformListings) {
    const existing = platformBreakdown.get(pl.platform) || {
      total: 0,
      posted: 0,
      failed: 0,
      pending: 0,
      delisted: 0,
      sold: 0,
    };
    existing.total += 1;
    if (pl.status === "POSTED") existing.posted += 1;
    if (pl.status === "FAILED") existing.failed += 1;
    if (pl.status === "PENDING") existing.pending += 1;
    if (pl.status === "DELISTED") existing.delisted += 1;
    if (pl.status === "SOLD") existing.sold += 1;
    platformBreakdown.set(pl.platform, existing);
  }
  const platformBreakdownArray = Array.from(platformBreakdown.entries()).map(([platform, counts]) => ({
    platform,
    ...counts,
  }));

  const categoryBreakdown = categoryGroups
    .map((group) => ({ category: group.category, count: group._count._all }))
    .sort((a, b) => b.count - a.count);

  return {
    totalListings,
    publishedListings,
    draftListings,
    soldListings,
    totalPlatformListings: platformListings.length,
    platformBreakdown: platformBreakdownArray,
    recentJobs,
    listingsByDay: listingsByDaySorted,
    categoryBreakdown,
    usage,
  };
}

export type AnalyticsData = Awaited<ReturnType<typeof getAnalytics>>;
