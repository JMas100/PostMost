"use server";

import { prisma } from "@/lib/prisma";
import { BgRemovalTier, getEffectivePlan, meetsMinimumTier, PLAN_ASSIGNMENT_SELECT } from "@/lib/plans";
import { nearPlanLimitGroupKey, resolveNotificationGroup, upsertNearPlanLimitNotification } from "@/lib/notifications";

function getMonthWindow(now = new Date()): { start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

// upsert (INSERT ... ON CONFLICT under the hood on Postgres), not a find-then-create -- two
// concurrent calls for a brand-new user (no UserUsage row yet) both seeing null from a plain
// findUnique and both racing to create() would crash the loser on the userId unique constraint.
async function getOrCreateUsage(userId: string) {
  return prisma.userUsage.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

async function resetIfNeeded(userId: string) {
  const usage = await getOrCreateUsage(userId);
  const { start } = getMonthWindow();
  if (usage.resetAt < start) {
    const elapsedMonth = usage.resetAt.toISOString().slice(0, 7);
    await prisma.userUsage.update({
      where: { userId },
      data: {
        listingsThisMonth: 0,
        aiCreditsUsed: 0,
        bgRemovalsUsed: 0,
        studioBgRemovalsUsed: 0,
        resetAt: new Date(),
      },
    });
    // A new billing month is a clean slate -- any plan-limit warning from the month that just
    // elapsed no longer applies.
    await resolveNotificationGroup(userId, nearPlanLimitGroupKey(userId, elapsedMonth));
  }
}

export async function getUsage(userId: string) {
  await resetIfNeeded(userId);
  const usage = await getOrCreateUsage(userId);
  const plan = getEffectivePlan(
    await prisma.user.findUnique({ where: { id: userId }, select: PLAN_ASSIGNMENT_SELECT })
  );
  return {
    plan,
    listingsThisMonth: usage.listingsThisMonth,
    aiCreditsUsed: usage.aiCreditsUsed,
    bgRemovalsUsed: usage.bgRemovalsUsed,
    studioBgRemovalsUsed: usage.studioBgRemovalsUsed,
    listingsLimit: plan.listingsPerMonth,
    aiLimit: plan.aiCreditsPerMonth,
    bgRemovalsLimit: plan.bgRemovalsPerMonth,
    studioBgRemovalsLimit: plan.studioBgRemovalsPerMonth,
    resetAt: usage.resetAt,
  };
}

/** Atomically reserves one listing slot for this month -- the increment and the limit check
 *  happen in a single conditional UPDATE (WHERE listingsThisMonth < limit), instead of a separate
 *  read-then-write, so concurrent requests from the same user can't each pass a stale check and
 *  collectively exceed the limit. Reserve *before* the listing create that follows; if that create
 *  fails, call releaseListingUsage() so a failed attempt never permanently burns quota. */
export async function reserveListingUsage(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  await resetIfNeeded(userId);
  const before = await getOrCreateUsage(userId);
  const plan = getEffectivePlan(
    await prisma.user.findUnique({ where: { id: userId }, select: PLAN_ASSIGNMENT_SELECT })
  );
  const limit = plan.listingsPerMonth;

  if (limit === -1) {
    await prisma.userUsage.update({ where: { userId }, data: { listingsThisMonth: { increment: 1 } } });
    return { allowed: true };
  }

  const claim = await prisma.userUsage.updateMany({
    where: { userId, listingsThisMonth: { lt: limit } },
    data: { listingsThisMonth: { increment: 1 } },
  });
  if (claim.count === 0) {
    return { allowed: false, reason: `You have reached your ${limit} listing limit for the ${plan.name} plan.` };
  }

  const beforeCount = before.listingsThisMonth;
  const afterCount = beforeCount + 1;
  const warnAt = Math.ceil(limit * 0.8);
  // Only fires on the increment that newly crosses 80% or 100% -- not on every listing created
  // after the limit is already reached, or this would rewrite the same notification row every
  // time (see upsertNearPlanLimitNotification).
  const crossedWarn = beforeCount < warnAt && afterCount >= warnAt;
  const crossedLimit = beforeCount < limit && afterCount >= limit;
  if (crossedWarn || crossedLimit) {
    await upsertNearPlanLimitNotification(userId, afterCount, limit);
  }
  return { allowed: true };
}

/** Refunds a reservation from reserveListingUsage() when the listing create it was guarding
 *  ends up failing. */
export async function releaseListingUsage(userId: string) {
  await prisma.userUsage.update({ where: { userId }, data: { listingsThisMonth: { decrement: 1 } } });
}

/** Same atomic-reserve shape as reserveListingUsage() -- see that function's comment. Reserve
 *  before the AI call; call releaseAICredit() if the call fails, so a failed generation never
 *  burns quota. */
export async function reserveAICredit(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  await resetIfNeeded(userId);
  const plan = getEffectivePlan(
    await prisma.user.findUnique({ where: { id: userId }, select: PLAN_ASSIGNMENT_SELECT })
  );
  const limit = plan.aiCreditsPerMonth;

  if (limit === -1) {
    await prisma.userUsage.update({ where: { userId }, data: { aiCreditsUsed: { increment: 1 } } });
    return { allowed: true };
  }

  const claim = await prisma.userUsage.updateMany({
    where: { userId, aiCreditsUsed: { lt: limit } },
    data: { aiCreditsUsed: { increment: 1 } },
  });
  if (claim.count === 0) {
    return { allowed: false, reason: `You have used all ${limit} AI credits on the ${plan.name} plan.` };
  }
  return { allowed: true };
}

/** Refunds a reservation from reserveAICredit() when the AI call it was guarding ends up
 *  failing. */
export async function releaseAICredit(userId: string) {
  await prisma.userUsage.update({ where: { userId }, data: { aiCreditsUsed: { decrement: 1 } } });
}

export async function canRemoveBackground(
  userId: string,
  tier: BgRemovalTier = "standard"
): Promise<{ allowed: boolean; reason?: string }> {
  const usage = await getUsage(userId);
  const { plan } = usage;
  const limit = tier === "studio" ? plan.studioBgRemovalsPerMonth : plan.bgRemovalsPerMonth;
  const used = tier === "studio" ? usage.studioBgRemovalsUsed : usage.bgRemovalsUsed;
  const label = tier === "studio" ? "studio-quality background removals" : "background removals";

  if (limit === -1) return { allowed: true };
  if (limit === 0) {
    return { allowed: false, reason: `The ${plan.name} plan does not include ${label}. Upgrade to unlock them.` };
  }
  if (used >= limit) {
    return { allowed: false, reason: `You have used all ${limit} ${label} on the ${plan.name} plan.` };
  }
  return { allowed: true };
}

export async function canAddActiveInventory(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const { plan } = await getUsage(userId);
  if (plan.activeInventoryLimit === -1) return { allowed: true };
  const activeCount = await prisma.listing.count({ where: { userId, isDraft: false, quantity: { gt: 0 } } });
  if (activeCount >= plan.activeInventoryLimit) {
    return {
      allowed: false,
      reason: `You've reached your ${plan.activeInventoryLimit}-item active inventory limit on the ${plan.name} plan.`,
    };
  }
  return { allowed: true };
}

/** Same limit/count canAddActiveInventory() checks, but fetched once instead of per-row -- for a
 *  bulk caller (CSV import) that needs to track the running count itself across many rows rather
 *  than re-querying the DB before every single one. */
export async function getActiveInventoryStatus(userId: string): Promise<{ limit: number; count: number; planName: string }> {
  const { plan } = await getUsage(userId);
  if (plan.activeInventoryLimit === -1) return { limit: -1, count: 0, planName: plan.name };
  const count = await prisma.listing.count({ where: { userId, isDraft: false, quantity: { gt: 0 } } });
  return { limit: plan.activeInventoryLimit, count, planName: plan.name };
}

export async function canImportCSV(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const { plan } = await getUsage(userId);
  if (!meetsMinimumTier(plan.id, "grow")) {
    return {
      allowed: false,
      reason: `The ${plan.name} plan doesn't include CSV import. Upgrade to Grow or higher to unlock it.`,
    };
  }
  return { allowed: true };
}

export async function incrementBgRemovalUsage(userId: string, tier: BgRemovalTier = "standard") {
  await resetIfNeeded(userId);
  await prisma.userUsage.update({
    where: { userId },
    data:
      tier === "studio"
        ? { studioBgRemovalsUsed: { increment: 1 } }
        : { bgRemovalsUsed: { increment: 1 } },
  });
}
