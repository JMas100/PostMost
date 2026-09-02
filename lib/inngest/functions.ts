import { inngest } from "@/lib/inngest/client";
import { processPendingCrossPostJobs } from "@/lib/jobs/crosspost-runner";
import { runStockSyncRule, runRelistStaleRule } from "@/lib/jobs/automation-runner";
import { createBrowserJobBudget } from "@/lib/jobs/browser-job-budget";
import { prisma } from "@/lib/prisma";
import { sendNotificationDigestEmail } from "@/lib/mail";

/** Same 100-job batch loop as before (see crosspost-runner.ts), now triggered two ways instead
 *  of one Vercel cron: "crosspost/trigger" is the fast path (sent right after jobs are queued --
 *  see lib/jobs/trigger.ts), and the cron below is the durable backstop, running every 5 minutes
 *  regardless of Vercel plan tier (the old Vercel cron was capped to once/day on Hobby).
 *
 *  concurrency: 3 lets up to three invocations run in parallel across different pending jobs --
 *  this is the actual fix for "one slow job starves the batch": a slow job only blocks its own
 *  invocation's loop, not the other concurrent invocations working through different jobs.
 *  browser-job-budget.ts's per-invocation cap of 1 manual-adapter job stays underneath this
 *  unchanged, so the two together bound total concurrent Chromium processes app-wide to 3 --
 *  something the old single-invocation model had no way to express at all. */
export const processCrossPostJobs = inngest.createFunction(
  {
    id: "process-crosspost-jobs",
    concurrency: { limit: 3 },
    triggers: [{ event: "crosspost/trigger" }, { cron: "*/5 * * * *" }],
  },
  async ({ event, step }) => {
    // The cron trigger's synthetic event carries no `listingId` -- undefined here correctly
    // means "process the whole pending queue," which is exactly what the backstop sweep wants.
    const data = event?.data as { listingId?: string } | undefined;
    const listingId = data?.listingId;
    return step.run("process-batch", () => processPendingCrossPostJobs(listingId, undefined, createBrowserJobBudget()));
  }
);

/** Stock-sync and relist-stale used to share the crosspost cron's invocation and browser budget
 *  (both ran inside the same /api/jobs/run call). They're their own Inngest function now, so
 *  each phase gets its own fresh budget rather than fighting the crosspost batch for the same
 *  one-browser-job-per-invocation allowance. Internal execution (still an inline per-listing
 *  loop, not queued CrossPostJob rows) is unchanged from before -- only the trigger moved. */
export const runAutomationRules = inngest.createFunction(
  { id: "run-automation-rules", triggers: [{ cron: "13 4 * * *" }] },
  async ({ step }) => {
    const stockSync = await step.run("stock-sync", () => runStockSyncRule(undefined, createBrowserJobBudget()));
    const relist = await step.run("relist-stale", () => runRelistStaleRule(undefined, createBrowserJobBudget()));
    return { stockSync, relist };
  }
);

// Sold, cross_post_failed, and marketplace_signed_out are deliberately excluded -- they always
// send their own immediate email regardless of digestMode (see lib/notification-mail.ts), so
// they'd never have anything left to say here even for a digestMode user.
const DIGEST_KINDS = ["automation_ran", "cross_post_succeeded", "near_plan_limit"] as const;
type DigestKind = (typeof DIGEST_KINDS)[number];
const DIGEST_EMAIL_FIELD: Record<DigestKind, "automationRanEmail" | "crossPostSucceededEmail" | "nearPlanLimitEmail"> = {
  automation_ran: "automationRanEmail",
  cross_post_succeeded: "crossPostSucceededEmail",
  near_plan_limit: "nearPlanLimitEmail",
};

/** Covers the full previous calendar day for every user who's opted into digestMode -- everyone
 *  else already got these three kinds (if they wanted them) as individual immediate emails. Was
 *  a Vercel-cron route gated to once/day on Hobby, same limitation as the job worker; moved here
 *  once the Inngest scaffolding existed anyway. */
export const sendNotificationDigest = inngest.createFunction(
  { id: "send-notification-digest", triggers: [{ cron: "0 8 * * *" }] },
  async ({ step }) => {
    return step.run("send", async () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const appUrl = `${process.env.NEXTAUTH_URL || "https://postmost.co"}/notifications`;

      const prefs = await prisma.notificationPreference.findMany({
        where: { digestMode: true },
        include: { user: { select: { id: true, email: true } } },
      });

      let sent = 0;
      for (const pref of prefs) {
        if (!pref.user.email) continue;
        const enabledKinds = DIGEST_KINDS.filter((kind) => pref[DIGEST_EMAIL_FIELD[kind]]);
        if (enabledKinds.length === 0) continue;

        const items = await prisma.notification.findMany({
          where: { userId: pref.user.id, kind: { in: enabledKinds }, createdAt: { gte: start, lt: end } },
          orderBy: { createdAt: "asc" },
        });
        if (items.length === 0) continue;

        await sendNotificationDigestEmail(
          pref.user.email,
          items.map((n) => ({ title: n.title, body: n.body })),
          appUrl
        );
        sent += 1;
      }

      return { sent };
    });
  }
);
