"use server";

import { prisma } from "@/lib/prisma";
import { BgRemovalTier, getEffectivePlan, meetsMinimumTier, PLAN_ASSIGNMENT_SELECT } from "@/lib/plans";

function getMonthWindow(now = new Date()): { start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

async function getOrCreateUsage(userId: string) {
  let usage = await prisma.userUsage.findUnique({ where: { userId } });
  if (!usage) {
    usage = await prisma.userUsage.create({
      data: { userId },
    });
  }
  return usage;
}

async function resetIfNeeded(userId: string) {
  const usage = await getOrCreateUsage(userId);
  const { start } = getMonthWindow();
  if (usage.resetAt < start) {
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
  };
}

export async function canCreateListing(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const { plan, listingsThisMonth } = await getUsage(userId);
  if (plan.listingsPerMonth !== -1 && listingsThisMonth >= plan.listingsPerMonth) {
    return { allowed: false, reason: `You have reached your ${plan.listingsPerMonth} listing limit for the ${plan.name} plan.` };
  }
  return { allowed: true };
}

export async function incrementListingUsage(userId: string) {
  await resetIfNeeded(userId);
  await prisma.userUsage.update({
    where: { userId },
    data: { listingsThisMonth: { increment: 1 } },
  });
}

export async function canUseAI(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const { plan, aiCreditsUsed } = await getUsage(userId);
  if (plan.aiCreditsPerMonth !== -1 && aiCreditsUsed >= plan.aiCreditsPerMonth) {
    return { allowed: false, reason: `You have used all ${plan.aiCreditsPerMonth} AI credits on the ${plan.name} plan.` };
  }
  return { allowed: true };
}

export async function incrementAIUsage(userId: string) {
  await resetIfNeeded(userId);
  await prisma.userUsage.update({
    where: { userId },
    data: { aiCreditsUsed: { increment: 1 } },
  });
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
