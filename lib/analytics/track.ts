import { Prisma } from "@/lib/generated/prisma/client";
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
 * Activation funnel events, fired from:
 *   listing_started               — app/listings/new/page.tsx, fired client-side on mount
 *                                   (lib/actions/analytics.ts + components/track-on-mount.tsx)
 *                                   rather than during the server render, since Next.js
 *                                   prefetches the "Create listing" link from every page and
 *                                   would otherwise fire this on prefetch, not just real visits.
 *   listing_completed            — lib/actions/listings.ts (createListing, publishDraft)
 *   second_listing_created       — lib/actions/listings.ts, fires alongside the 2nd listing_completed
 *   publish_started              — lib/actions/crosspost.ts (crossPost), includes the selected platform list
 *   publish_platform_succeeded   — lib/jobs/crosspost-runner.ts, per platform once it posts
 *   publish_platform_failed      — lib/jobs/crosspost-runner.ts, per platform once retries are exhausted
 *   first_crosspost_completed    — lib/jobs/crosspost-runner.ts, fires alongside a user's first publish_platform_succeeded
 *
 * There's no separate marketplaces_selected event: the UI has no distinct
 * "confirm selection" step before publishing, so the chosen platforms are
 * just a property on publish_started instead.
 *
 * publish_success/publish_partial_success/publish_failed (aggregate,
 * per-click outcomes) were dropped: CrossPostJob rows aren't grouped by
 * batch, and a genuine failure can take ~21 minutes to go terminal, so
 * per-platform events are the honest signal rather than guessing when a
 * "batch" is done.
 */
