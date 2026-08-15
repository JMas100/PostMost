"use server";

import { prisma } from "@/lib/prisma";
import { getPlan } from "@/lib/plans";

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
        resetAt: new Date(),
      },
    });
  }
}

export async function getUsage(userId: string) {
  await resetIfNeeded(userId);
  const usage = await getOrCreateUsage(userId);
  const plan = getPlan((await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } }))?.plan);
  return {
    plan,
    listingsThisMonth: usage.listingsThisMonth,
    aiCreditsUsed: usage.aiCreditsUsed,
    listingsLimit: plan.listingsPerMonth,
    aiLimit: plan.aiCreditsPerMonth,
  };
}

export async function canCreateListing(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  await resetIfNeeded(userId);
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
  await resetIfNeeded(userId);
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
