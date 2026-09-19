"use server";

import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/auth-helpers";

/** An "order" is a sold PlatformListing -- markListingSold() (lib/actions/inventory.ts) already
 *  writes soldAt/soldPrice/soldFees/soldShippingCost/profit for real, per platform, the moment a
 *  seller marks an item sold. There's no separate order record or external sync to build; this
 *  just reads the sale data that already exists. */
export async function getOrders() {
  const { workspaceUserId: userId } = await requireWorkspace();
  return prisma.platformListing.findMany({
    where: { status: "SOLD", listing: { userId } },
    include: {
      listing: { select: { id: true, title: true, photos: { take: 1, orderBy: { order: "asc" } } } },
    },
    orderBy: { soldAt: "desc" },
  });
}
