import { prisma } from "@/lib/prisma";
import { getAdapter } from "@/lib/marketplaces";
import { STOCK_SYNC_RULE } from "@/lib/automation/rule-types";
import { maybeSendNotificationEmail } from "@/lib/notification-mail";

export type NotificationCategory = "needs_you" | "sales" | "activity";
export type NotificationKind =
  | "cross_post_failed"
  | "cross_post_succeeded"
  | "marketplace_signed_out"
  | "item_sold"
  | "automation_ran"
  | "near_plan_limit";

export interface RenderedNotification {
  title: string;
  body: string;
  actionLabel?: string;
  actionHref?: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
}

export interface UpsertNotificationParams {
  userId: string;
  category: NotificationCategory;
  kind: NotificationKind;
  groupKey: string;
  /** A function of the FINAL merged targetIds (this call's ids unioned with whatever was
   *  already stored for this group), not just this call's own batch -- so copy like "Live in N
   *  places" or "8 listings failed" stays accurate as a group accumulates across multiple
   *  upserts (different invocations, different job batches), not just within one flush(). */
  render: (mergedTargetIds: string[]) => RenderedNotification;
  platform?: string;
  targetIds?: string[];
}

/** Upserts on (userId, groupKey) -- what makes repeated writes for the same cause become one row
 *  instead of a new insert. targetIds is UNIONED (not replaced) with whatever was already there,
 *  title/body/actions are regenerated from that final merged set via `render` (so counts stay
 *  accurate across invocations, not just within one batch), and resolvedAt/readAt both reset to
 *  null on update -- new information landing in an existing group is new information, so a fresh
 *  occurrence of an already-resolved or already-read cause reopens and re-surfaces it rather than
 *  staying silently marked done. */
export async function upsertNotification(params: UpsertNotificationParams) {
  const existing = await prisma.notification.findUnique({
    where: { userId_groupKey: { userId: params.userId, groupKey: params.groupKey } },
  });

  const mergedTargetIds = existing
    ? Array.from(new Set([...existing.targetIds, ...(params.targetIds ?? [])]))
    : (params.targetIds ?? []);

  const rendered = params.render(mergedTargetIds);
  const shared = {
    category: params.category,
    kind: params.kind,
    title: rendered.title,
    body: rendered.body,
    actionLabel: rendered.actionLabel,
    actionHref: rendered.actionHref,
    secondaryActionLabel: rendered.secondaryActionLabel,
    secondaryActionHref: rendered.secondaryActionHref,
    platform: params.platform,
    targetIds: mergedTargetIds,
  };

  const result = await prisma.notification.upsert({
    where: { userId_groupKey: { userId: params.userId, groupKey: params.groupKey } },
    create: { userId: params.userId, groupKey: params.groupKey, ...shared },
    update: { ...shared, resolvedAt: null, readAt: null },
  });

  const action = rendered.actionLabel && rendered.actionHref ? { label: rendered.actionLabel, url: rendered.actionHref } : undefined;
  await maybeSendNotificationEmail(params.userId, params.kind, rendered.title, rendered.body, action);

  return result;
}

/** Fully resolves a group in one shot (as opposed to resolveCrossPostFailure's per-target
 *  shrinking) -- for causes where fixing the underlying problem clears everything in the group
 *  at once rather than one listing at a time: reconnecting a marketplace account fixes every
 *  listing that was waiting on it, and a new billing month clears a plan-limit warning outright.
 *  No-ops silently if the group doesn't exist or is already resolved. */
export async function resolveNotificationGroup(userId: string, groupKey: string) {
  await prisma.notification.updateMany({
    where: { userId, groupKey, resolvedAt: null },
    data: { resolvedAt: new Date() },
  });
}

/** Shared by the writer and the resolver so they can never drift apart on what a given month's
 *  groupKey actually is. `month` is a "yyyy-mm" string, not a Date -- callers already have one
 *  (the current month when writing, the just-elapsed month's resetAt when resolving). */
export function nearPlanLimitGroupKey(userId: string, month: string): string {
  return `limit:${userId}:${month}`;
}

/** Called only on the increment that newly crosses the 80% or 100% threshold this month (see
 *  incrementListingUsage) -- not on every increment once already over, so this doesn't rewrite
 *  the same row on every listing created past the limit. A plain upsert rather than the
 *  merge-union `render` pattern above: near_plan_limit has no per-target list to accumulate,
 *  just a single current usage snapshot that should fully replace the previous one each time. */
export async function upsertNearPlanLimitNotification(userId: string, used: number, limit: number) {
  const month = new Date().toISOString().slice(0, 7);
  const groupKey = nearPlanLimitGroupKey(userId, month);
  const atLimit = used >= limit;
  const title = atLimit ? "Plan limit reached" : "Approaching your plan limit";
  const body = atLimit
    ? `You've used all ${limit} listings included in your plan this month. Upgrade to keep creating new ones.`
    : `You've used ${used} of ${limit} listings included in your plan this month.`;

  await prisma.notification.upsert({
    where: { userId_groupKey: { userId, groupKey } },
    create: {
      userId,
      groupKey,
      category: "needs_you",
      kind: "near_plan_limit",
      title,
      body,
      actionLabel: "Upgrade plan",
      actionHref: "/settings/billing",
    },
    update: { title, body, resolvedAt: null, readAt: null },
  });

  await maybeSendNotificationEmail(userId, "near_plan_limit", title, body, {
    label: "Upgrade plan",
    url: "/settings/billing",
  });
}

/** Text-match heuristic for classifying a cross-post failure as "the marketplace signed you
 *  out" rather than a generic failure -- there's no real auth-state signal in the codebase today
 *  (a failed job doesn't flip MarketplaceAccount.isActive), so this is the same style of
 *  heuristic attemptLogin's own CREDENTIAL_ERROR_PHRASES already uses elsewhere. A real but
 *  honest limitation: a failure message that doesn't happen to use one of these words won't be
 *  classified as signed-out even if that's genuinely what happened. */
const SIGNED_OUT_PHRASES = [
  "sign in",
  "signed out",
  "log in",
  "login",
  "session",
  "not authenticated",
  "authenticate",
  "password field",
  "credentials",
];

function looksLikeSignedOut(message: string): boolean {
  const lower = message.toLowerCase();
  return SIGNED_OUT_PHRASES.some((phrase) => lower.includes(phrase));
}

function renderCrossPostFailed(platform: string, errorMessage: string, targetIds: string[]): RenderedNotification {
  const count = targetIds.length;
  const platformName = getAdapter(platform)?.name ?? platform;
  return {
    title: `${count} listing${count === 1 ? "" : "s"} failed on ${platformName}`,
    body: errorMessage,
    actionLabel: count === 1 ? "Fix" : `Fix all ${count}`,
    actionHref: "/listings?tab=attention",
    secondaryActionLabel: "See listings",
    secondaryActionHref: "/listings?tab=attention",
  };
}

function renderSignedOut(platform: string, targetIds: string[]): RenderedNotification {
  const count = targetIds.length;
  const platformName = getAdapter(platform)?.name ?? platform;
  return {
    title: `${platformName} signed you out`,
    body: `${count} listing${count === 1 ? " is" : "s are"} waiting to post. Sign back in and we'll finish automatically.`,
    actionLabel: `Reconnect ${platformName}`,
    actionHref: "/marketplaces",
  };
}

interface FailureEntry {
  userId: string;
  platform: string;
  errorMessage: string;
  listingIds: Set<string>;
  isSignedOut: boolean;
}

interface SuccessEntry {
  userId: string;
  listingId: string;
  listingTitle: string;
  platforms: Set<string>;
}

/** Accumulates outcomes during a job-runner loop and writes notifications only once, after the
 *  loop ends -- the runner has a real time budget and can end a batch mid-flight by design, so
 *  notifying per-job would tell a seller about a failure at the exact moment a retry might still
 *  have fixed it. One flush() call per phase per invocation. */
export class NotificationCollector {
  private failures = new Map<string, FailureEntry>();
  private successes = new Map<string, SuccessEntry>();

  /** Call only for a job's FINAL failure (attempts exhausted) -- never for a failure that's
   *  still going to retry, or the collector would notify about something that might self-heal
   *  on the very next attempt. */
  recordFailure(userId: string, listingId: string, platform: string, errorMessage: string) {
    const isSignedOut = looksLikeSignedOut(errorMessage);
    const key = `${userId}:${platform}:${isSignedOut ? "signed_out" : errorMessage}`;
    const entry = this.failures.get(key) ?? { userId, platform, errorMessage, listingIds: new Set<string>(), isSignedOut };
    entry.listingIds.add(listingId);
    this.failures.set(key, entry);
  }

  recordSuccess(userId: string, listingId: string, listingTitle: string, platform: string) {
    const key = `${userId}:${listingId}`;
    const entry = this.successes.get(key) ?? { userId, listingId, listingTitle, platforms: new Set<string>() };
    entry.platforms.add(platform);
    this.successes.set(key, entry);
  }

  async flush() {
    for (const entry of this.failures.values()) {
      const targetIds = Array.from(entry.listingIds);
      if (entry.isSignedOut) {
        await upsertNotification({
          userId: entry.userId,
          category: "needs_you",
          kind: "marketplace_signed_out",
          groupKey: `mso:${entry.userId}:${entry.platform}`,
          render: (merged) => renderSignedOut(entry.platform, merged),
          platform: entry.platform,
          targetIds,
        });
      } else {
        await upsertNotification({
          userId: entry.userId,
          category: "needs_you",
          kind: "cross_post_failed",
          groupKey: `cpf:${entry.userId}:${entry.platform}:${entry.errorMessage}`,
          render: (merged) => renderCrossPostFailed(entry.platform, entry.errorMessage, merged),
          platform: entry.platform,
          targetIds,
        });
      }
    }

    for (const entry of this.successes.values()) {
      // targetIds here holds platform names (this listing's own groupKey already scopes it to
      // one listing) so "Live in N places" accumulates correctly if a later invocation posts
      // this same listing to yet another platform, rather than resetting to this batch's count.
      await upsertNotification({
        userId: entry.userId,
        category: "activity",
        kind: "cross_post_succeeded",
        groupKey: `cps:${entry.userId}:${entry.listingId}`,
        render: (merged) => ({
          title: `Live in ${merged.length} place${merged.length === 1 ? "" : "s"}`,
          body: entry.listingTitle,
          actionHref: `/listings/${entry.listingId}`,
        }),
        targetIds: Array.from(entry.platforms),
      });
    }
  }
}

/** Called from the POST success path so any cross_post_failed/marketplace_signed_out group this
 *  platform listing was part of shrinks and eventually self-resolves -- "reading" a needs-you
 *  notification never resolves it, only the underlying state actually clearing does. Looked up
 *  by (userId, platform, targetIds contains listingId) instead of a known groupKey, since a
 *  success event has no way to know what a *prior* failure's exact error text was -- the
 *  groupKey for cross_post_failed is built from that text, so it can't be reconstructed here.
 *  Each matched group's own stored `body` (the original error message, for cross_post_failed)
 *  is what re-renders its title/body correctly as it shrinks. */
export async function resolveCrossPostFailure(userId: string, listingId: string, platform: string) {
  const open = await prisma.notification.findMany({
    where: {
      userId,
      platform,
      kind: { in: ["cross_post_failed", "marketplace_signed_out"] },
      resolvedAt: null,
      targetIds: { has: listingId },
    },
  });

  for (const notification of open) {
    const remaining = notification.targetIds.filter((id) => id !== listingId);
    const rendered =
      remaining.length === 0
        ? null
        : notification.kind === "marketplace_signed_out"
          ? renderSignedOut(platform, remaining)
          : renderCrossPostFailed(platform, notification.body, remaining);

    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        targetIds: remaining,
        resolvedAt: remaining.length === 0 ? new Date() : null,
        ...(rendered
          ? { title: rendered.title, body: rendered.body, actionLabel: rendered.actionLabel, actionHref: rendered.actionHref }
          : {}),
      },
    });
  }
}

/** Written synchronously right from `markListingSold`, not batch-collected like the job-runner
 *  kinds above -- a sale is a single discrete event with nothing to accumulate across calls, so
 *  there's no upsert/grouping: each sale gets its own row, and groupKey is timestamped only to
 *  satisfy the unique constraint, not to merge repeat calls. Gated on `soldApp` (default true) --
 *  the only one of the six kinds with a real app-level toggle, since sold is welcome news a
 *  seller might still reasonably want to mute, unlike the two locked "needs you" kinds where the
 *  app is the only place to act on them at all. */
export async function writeItemSoldNotification(params: {
  userId: string;
  listingId: string;
  listingTitle: string;
  platform?: string;
  soldPrice?: number;
}) {
  const pref = await prisma.notificationPreference.findUnique({ where: { userId: params.userId } });
  if (pref && !pref.soldApp) return;

  const platformName = params.platform ? (getAdapter(params.platform)?.name ?? params.platform) : undefined;
  const title = "Sold!";
  const body =
    platformName && params.soldPrice != null
      ? `"${params.listingTitle}" sold on ${platformName} for $${params.soldPrice.toFixed(2)}`
      : `"${params.listingTitle}" sold`;
  const actionHref = `/listings/${params.listingId}`;

  await prisma.notification.create({
    data: {
      userId: params.userId,
      category: "sales",
      kind: "item_sold",
      groupKey: `sold:${params.userId}:${params.listingId}:${Date.now()}`,
      title,
      body,
      actionHref,
      platform: params.platform,
      targetIds: [params.listingId],
    },
  });

  await maybeSendNotificationEmail(params.userId, "item_sold", title, body, { label: "View listing", url: actionHref });
}

function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

// Each target token is "platform::platformListingId" rather than a bare id -- automation_ran is
// an "activity" notification (never shrunk/self-resolved the way needs_you groups are), so
// targetIds here is just a token list this render step parses back apart, not a real id lookup.
function platformsFromTokens(tokens: string[]): string[] {
  return Array.from(new Set(tokens.map((t) => t.split("::")[0]))).map((p) => getAdapter(p)?.name ?? p);
}

function renderStockSyncRan(tokens: string[]): RenderedNotification {
  const count = tokens.length;
  return {
    title: "Automation ran",
    body: `Delisted ${count} sold-out item${count === 1 ? "" : "s"} on ${joinWithAnd(platformsFromTokens(tokens))}`,
    actionHref: "/automation",
  };
}

function renderRelistRan(tokens: string[]): RenderedNotification {
  const count = tokens.length;
  return {
    title: "Automation ran",
    body: `Relisted ${count} stale item${count === 1 ? "" : "s"} on ${joinWithAnd(platformsFromTokens(tokens))}`,
    actionHref: "/automation",
  };
}

/** One `automation_ran` upsert per user per rule per day (groupKey embeds the date) -- called
 *  once after a rule's whole loop finishes, with every platform-listing it actually touched
 *  (successes only). No-ops when nothing happened, since an automation run with zero effect
 *  isn't news. `render` recomputes copy from the FINAL merged token list (see upsertNotification),
 *  so a second same-day invocation accumulates into one accurate count instead of overwriting it
 *  with just that invocation's own smaller batch. */
export async function upsertAutomationRanNotification(userId: string, ruleType: string, tokens: string[]) {
  if (tokens.length === 0) return;
  const day = new Date().toISOString().slice(0, 10);
  await upsertNotification({
    userId,
    category: "activity",
    kind: "automation_ran",
    groupKey: `auto:${userId}:${ruleType}:${day}`,
    render: ruleType === STOCK_SYNC_RULE ? renderStockSyncRan : renderRelistRan,
    targetIds: tokens,
  });
}
