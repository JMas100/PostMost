"use server";

import { prisma } from "@/lib/prisma";

export interface ActivationState {
  connectedAny: boolean;
  publishedFirst: boolean;
  connectedSecond: boolean;
  soldFirst: boolean;
  complete: boolean;
}

export async function getActivationState(userId: string): Promise<ActivationState> {
  const [accountCount, everPublishedCount, soldCount] = await Promise.all([
    prisma.marketplaceAccount.count({ where: { userId } }),
    prisma.platformListing.count({
      where: { listing: { userId }, status: { in: ["POSTED", "DELISTED", "SOLD"] } },
    }),
    prisma.platformListing.count({ where: { listing: { userId }, status: "SOLD" } }),
  ]);

  const connectedAny = accountCount > 0;
  const publishedFirst = everPublishedCount > 0;
  const connectedSecond = accountCount > 1;
  const soldFirst = soldCount > 0;

  return {
    connectedAny,
    publishedFirst,
    connectedSecond,
    soldFirst,
    complete: connectedAny && publishedFirst && connectedSecond && soldFirst,
  };
}
