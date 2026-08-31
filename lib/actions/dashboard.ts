"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-helpers";
import { getPlatform } from "@/lib/marketplaces/platforms";
import { RELIST_STALE_DAYS } from "@/lib/automation/rule-types";

export type DashboardPeriod = "30d" | "all";

export interface DashboardAlert {
  id: string;
  title: string;
  body: string;
  actionLabel: string;
  actionHref: string;
}

export interface ActivityEntry {
  id: string;
  timestamp: Date;
  success: boolean;
  text: string;
  detail?: string;
  actionLabel?: string;
  actionHref?: string;
}

export interface ConnectionRow {
  id: string;
  platform: string;
  name: string;
  connected: true;
  needsAttention: boolean;
  attentionReason?: string;
  live: number;
  sold: number;
}

export interface UnconnectedRow {
  platform: string;
  name: string;
  connected: false;
}

/** A connection whose token expires within this window surfaces its own alert, not just a
 *  dimmed badge -- matching the design's "your Etsy connection expires in 2 days" treatment. */
const EXPIRING_SOON_MS = 1000 * 60 * 60 * 24 * 3;

function accountNeedsAttention(a: { isActive: boolean; tokenExpiresAt: Date | null }): { needs: boolean; reason?: string } {
  if (!a.isActive) return { needs: true, reason: "Connection failed" };
  if (a.tokenExpiresAt) {
    const msRemaining = a.tokenExpiresAt.getTime() - Date.now();
    if (msRemaining < 0) return { needs: true, reason: "Connection expired" };
    if (msRemaining < EXPIRING_SOON_MS) {
      const days = Math.max(1, Math.round(msRemaining / (1000 * 60 * 60 * 24)));
      return { needs: true, reason: `Expires in ${days} day${days === 1 ? "" : "s"}` };
    }
  }
  return { needs: false };
}

/** Groups CrossPostJob rows for the same listing that completed within a few minutes of each
 *  other into one feed entry (e.g. "Published to 4 marketplaces") instead of one line per
 *  platform -- a bulk push or a single publish both fan out to N per-platform jobs, and the
 *  feed should read the way the design spec's does: as one action, not N. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

function groupJobsByListingAndTime<T extends { listingId: string; completedAt: Date | null; platform: string }>(
  jobs: T[]
): T[][] {
  const sorted = [...jobs].sort((a, b) => (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0));
  const groups: T[][] = [];
  for (const job of sorted) {
    const last = groups[groups.length - 1];
    const lastJob = last?.[last.length - 1];
    if (
      last &&
      lastJob.listingId === job.listingId &&
      lastJob.completedAt &&
      job.completedAt &&
      job.completedAt.getTime() - lastJob.completedAt.getTime() < GROUP_WINDOW_MS
    ) {
      last.push(job);
    } else {
      groups.push([job]);
    }
  }
  return groups;
}

export async function getDashboardData(period: DashboardPeriod) {
  const userId = await requireUserId();
  const now = new Date();
  const start30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const start60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const periodStart = period === "30d" ? start30 : undefined;
  const priorStart = period === "30d" ? start60 : undefined;
  const priorEnd = period === "30d" ? start30 : undefined;
  const staleBefore = new Date(now.getTime() - RELIST_STALE_DAYS * 24 * 60 * 60 * 1000);

  const [
    accounts,
    platformListingsAll,
    revenueAgg,
    profitAgg,
    revenuePriorAgg,
    profitPriorAgg,
    liveListingCount,
    soldPlatformListings,
    failedPlatformListings,
    missingCostCount,
    draftCount,
    oldestDraft,
    relistCandidateCount,
    automationEvents,
    completedJobs,
    failedJobs,
  ] = await Promise.all([
    prisma.marketplaceAccount.findMany({
      where: { userId },
      select: { id: true, platform: true, isActive: true, tokenExpiresAt: true },
    }),
    prisma.platformListing.findMany({
      where: { listing: { userId, isDraft: false } },
      select: { platform: true, status: true, soldPrice: true },
    }),
    prisma.platformListing.aggregate({
      where: { listing: { userId }, status: "SOLD", ...(periodStart ? { soldAt: { gte: periodStart } } : {}) },
      _sum: { soldPrice: true },
    }),
    prisma.platformListing.aggregate({
      where: { listing: { userId }, status: "SOLD", ...(periodStart ? { soldAt: { gte: periodStart } } : {}) },
      _sum: { profit: true },
    }),
    period === "30d"
      ? prisma.platformListing.aggregate({
          where: { listing: { userId }, status: "SOLD", soldAt: { gte: priorStart, lt: priorEnd } },
          _sum: { soldPrice: true },
        })
      : Promise.resolve(null),
    period === "30d"
      ? prisma.platformListing.aggregate({
          where: { listing: { userId }, status: "SOLD", soldAt: { gte: priorStart, lt: priorEnd } },
          _sum: { profit: true },
        })
      : Promise.resolve(null),
    prisma.listing.count({
      where: { userId, isDraft: false, platformListings: { some: { status: "POSTED" } } },
    }),
    prisma.platformListing.findMany({
      where: { listing: { userId }, status: "SOLD", ...(periodStart ? { soldAt: { gte: periodStart } } : {}) },
      select: { id: true, platform: true, soldPrice: true, profit: true, soldAt: true, listing: { select: { id: true, title: true, createdAt: true } } },
      orderBy: { soldAt: "desc" },
    }),
    prisma.platformListing.findMany({
      where: { listing: { userId, isDraft: false }, status: "FAILED" },
      select: { id: true, platform: true, errorMessage: true, listing: { select: { id: true, title: true } } },
    }),
    prisma.listing.count({ where: { userId, isDraft: false, cost: null } }),
    prisma.listing.count({ where: { userId, isDraft: true } }),
    prisma.listing.findFirst({ where: { userId, isDraft: true }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    prisma.platformListing.count({
      where: { status: "POSTED", postedAt: { lt: staleBefore }, listing: { userId, isDraft: false, quantity: { gt: 0 } } },
    }),
    prisma.automationEvent.findMany({
      where: { userId, createdAt: { gte: periodStart ?? new Date(0) } },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.crossPostJob.findMany({
      where: { userId, status: "COMPLETED", completedAt: { gte: periodStart ?? new Date(0) } },
      select: { id: true, listingId: true, platform: true, type: true, completedAt: true, listing: { select: { title: true } } },
      orderBy: { completedAt: "desc" },
      take: 60,
    }),
    prisma.crossPostJob.findMany({
      where: { userId, status: "FAILED", type: "POST", completedAt: { gte: periodStart ?? new Date(0) } },
      select: { id: true, listingId: true, platform: true, error: true, completedAt: true, listing: { select: { title: true } } },
      orderBy: { completedAt: "desc" },
      take: 15,
    }),
  ]);

  // ---- Metrics ----
  const revenue = revenueAgg._sum.soldPrice ?? 0;
  const profit = profitAgg._sum.profit ?? 0;
  const revenuePrior = revenuePriorAgg?._sum.soldPrice ?? 0;
  const profitPrior = profitPriorAgg?._sum.profit ?? 0;
  const revenueDeltaPct = revenuePrior > 0 ? ((revenue - revenuePrior) / revenuePrior) * 100 : null;
  const profitDeltaPct = profitPrior > 0 ? ((profit - profitPrior) / profitPrior) * 100 : null;

  const liveSlots = platformListingsAll.filter((pl) => pl.status === "POSTED").length;
  const slotsPerListing = liveListingCount > 0 ? liveSlots / liveListingCount : 0;

  const soldCount = soldPlatformListings.length;
  const daysToSell = soldPlatformListings
    .filter((s) => s.soldAt && s.listing)
    .map((s) => (s.soldAt!.getTime() - s.listing!.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const avgDaysToSell = daysToSell.length > 0 ? daysToSell.reduce((a, b) => a + b, 0) / daysToSell.length : null;

  // ---- Connections rail ----
  const platformCounts = new Map<string, { live: number; sold: number; revenue: number }>();
  for (const pl of platformListingsAll) {
    const existing = platformCounts.get(pl.platform) ?? { live: 0, sold: 0, revenue: 0 };
    if (pl.status === "POSTED") existing.live += 1;
    if (pl.status === "SOLD") {
      existing.sold += 1;
      existing.revenue += pl.soldPrice ?? 0;
    }
    platformCounts.set(pl.platform, existing);
  }

  const connections: ConnectionRow[] = accounts.map((a) => {
    const attention = accountNeedsAttention(a);
    const counts = platformCounts.get(a.platform) ?? { live: 0, sold: 0, revenue: 0 };
    return {
      id: a.id,
      platform: a.platform,
      name: getPlatform(a.platform)?.name ?? a.platform,
      connected: true,
      needsAttention: attention.needs,
      attentionReason: attention.reason,
      live: counts.live,
      sold: counts.sold,
    };
  });
  const connectedPlatformIds = new Set(accounts.map((a) => a.platform));
  const CONNECTABLE_PLATFORMS = ["ebay", "etsy", "poshmark", "mercari", "depop", "facebook", "craigslist", "offerup", "vinted", "grailed"];
  const unconnected: UnconnectedRow[] = CONNECTABLE_PLATFORMS.filter((p) => !connectedPlatformIds.has(p)).map((p) => ({
    platform: p,
    name: getPlatform(p)?.name ?? p,
    connected: false,
  }));

  // ---- Sell-through by marketplace ----
  const sellThrough = Array.from(platformCounts.entries())
    .map(([platform, c]) => ({
      platform,
      name: getPlatform(platform)?.name ?? platform,
      revenue: c.revenue,
      rate: c.live + c.sold > 0 ? (c.sold / (c.live + c.sold)) * 100 : 0,
    }))
    .filter((row) => row.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // ---- Alerts (above the fold, one per real problem) ----
  const alerts: DashboardAlert[] = [];
  if (failedPlatformListings.length > 0) {
    const messages = new Set(failedPlatformListings.map((f) => f.errorMessage).filter(Boolean));
    const body = messages.size === 1 ? Array.from(messages)[0]! : "See each listing for its specific error.";
    alerts.push({
      id: "failed-jobs",
      title: `${failedPlatformListings.length} cross-post${failedPlatformListings.length === 1 ? "" : "s"} failed and ${failedPlatformListings.length === 1 ? "is" : "are"} waiting on you`,
      body,
      actionLabel: `Fix all ${failedPlatformListings.length}`,
      actionHref: "/listings?tab=attention",
    });
  }
  for (const conn of connections.filter((c) => c.needsAttention)) {
    alerts.push({
      id: `expiring-${conn.id}`,
      title: `Your ${conn.name} connection ${conn.attentionReason?.toLowerCase()}`,
      body: conn.live > 0 ? `${conn.live} listing${conn.live === 1 ? "" : "s"} stop syncing when it does. Nothing gets delisted — updates just stop.` : "Reconnect to keep cross-posting to this marketplace.",
      actionLabel: `Reconnect ${conn.name}`,
      actionHref: "/settings",
    });
  }

  // ---- Activity feed ----
  const entries: ActivityEntry[] = [];

  for (const s of soldPlatformListings) {
    if (!s.listing) continue;
    entries.push({
      id: `sold-${s.id}`,
      timestamp: s.soldAt!,
      success: true,
      text: `Sold on ${getPlatform(s.platform)?.name ?? s.platform} — ${s.listing.title}, $${(s.soldPrice ?? 0).toFixed(2)}`,
      detail: s.profit != null ? `$${s.profit.toFixed(2)} profit` : undefined,
    });
  }

  for (const e of automationEvents) {
    entries.push({
      id: `auto-${e.id}`,
      timestamp: e.createdAt,
      success: e.success,
      text: e.message,
    });
  }

  const completedPosts = completedJobs.filter((j) => j.type === "POST" && j.completedAt);
  for (const group of groupJobsByListingAndTime(completedPosts)) {
    const title = group[0].listing?.title ?? "a listing";
    const names = group.map((j) => getPlatform(j.platform)?.name ?? j.platform);
    entries.push({
      id: `post-${group[0].id}`,
      timestamp: group[0].completedAt!,
      success: true,
      text: group.length === 1 ? `Published to ${names[0]} — ${title}` : `Published to ${group.length} marketplaces — ${title}`,
      detail: group.length > 1 ? names.join(", ") : undefined,
    });
  }

  const completedRelists = completedJobs.filter((j) => j.type === "RELIST" && j.completedAt);
  for (const group of groupJobsByListingAndTime(completedRelists)) {
    const title = group[0].listing?.title ?? "a listing";
    entries.push({
      id: `relist-${group[0].id}`,
      timestamp: group[0].completedAt!,
      success: true,
      text: group.length === 1 ? `Relisted — ${title}` : `Relisted ${group.length} listings`,
      detail: group.length === 1 ? title : undefined,
    });
  }

  for (const j of failedJobs) {
    if (!j.completedAt) continue;
    entries.push({
      id: `failed-${j.id}`,
      timestamp: j.completedAt,
      success: false,
      text: `${getPlatform(j.platform)?.name ?? j.platform} publish failed — ${j.listing?.title ?? "a listing"}`,
      detail: j.error ?? undefined,
      actionLabel: "Fix",
      actionHref: `/listings/${j.listingId}`,
    });
  }

  entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return {
    period,
    revenue,
    revenueDeltaPct,
    profit,
    profitDeltaPct,
    liveListingCount,
    liveSlots,
    slotsPerListing,
    soldCount,
    avgDaysToSell,
    connections,
    unconnected,
    sellThrough,
    alerts,
    activity: entries.slice(0, 20),
    missingCostCount,
    draftCount,
    oldestDraftAgeDays: oldestDraft ? Math.floor((now.getTime() - oldestDraft.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : null,
    relistCandidateCount,
  };
}
