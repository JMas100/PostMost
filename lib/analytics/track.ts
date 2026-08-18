import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function track(
  name: string,
  userId?: string | null,
  properties?: Record<string, unknown>
) {
  try {
    await prisma.event.create({
      data: {
        name,
        userId: userId ?? null,
        properties: properties as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    // Analytics must never break the calling flow.
    console.error(`[track] failed to record event "${name}"`, err);
  }
}

/**
 * TODO (future phase — listing/cross-post UI rework): wire up
 *   listing_started, listing_completed, marketplaces_selected,
 *   publish_started, publish_partial_success, publish_success,
 *   publish_failed, first_crosspost_completed, second_listing_created
 * once those flows are being touched.
 */
