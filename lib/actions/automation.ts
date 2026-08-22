"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlan, meetsMinimumTier } from "@/lib/plans";
import { STOCK_SYNC_RULE, DELIST_ON_SALE_RULE } from "@/lib/automation/rule-types";

function getUserId(session: { user?: { id?: string } } | null) {
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function getAutomationOverview() {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);

  const [user, stockSyncRule, stockSyncCandidates, monthEvents, recentEvents, delistOnSaleEvents] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { plan: true } }),
    prisma.automationRule.findUnique({ where: { userId_ruleType: { userId, ruleType: STOCK_SYNC_RULE } } }),
    prisma.listing.count({
      where: {
        userId,
        isDraft: false,
        quantity: 0,
        platformListings: { some: { status: "POSTED" } },
      },
    }),
    prisma.automationEvent.count({
      where: { userId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.automationEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.automationEvent.aggregate({
      where: { userId, ruleType: DELIST_ON_SALE_RULE },
      _count: { _all: true },
      _sum: { savedAmount: true },
    }),
  ]);

  const plan = getPlan(user?.plan);

  return {
    plan,
    stockSyncEnabled: stockSyncRule?.enabled ?? false,
    stockSyncAvailable: meetsMinimumTier(plan.id, "pro"),
    stockSyncCandidates,
    relistAvailable: false,
    priceDropAvailable: false,
    actionsThisMonth: monthEvents,
    listingsPulledAfterSale: delistOnSaleEvents._count._all,
    amountSaved: delistOnSaleEvents._sum.savedAmount ?? 0,
    recentEvents,
  };
}

export async function setStockSyncEnabled(enabled: boolean) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  const plan = getPlan(user?.plan);
  if (!meetsMinimumTier(plan.id, "pro")) {
    return { error: `The ${plan.name} plan doesn't include stock sync automation. Upgrade to Pro or higher to unlock it.` };
  }

  await prisma.automationRule.upsert({
    where: { userId_ruleType: { userId, ruleType: STOCK_SYNC_RULE } },
    update: { enabled },
    create: { userId, ruleType: STOCK_SYNC_RULE, enabled },
  });

  revalidatePath("/automation");
  return { success: true };
}
