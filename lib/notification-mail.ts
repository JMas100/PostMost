import { prisma } from "@/lib/prisma";
import { sendNotificationEmail } from "@/lib/mail";
import type { NotificationKind } from "@/lib/notifications";

function appOrigin(): string {
  return process.env.NEXTAUTH_URL || "https://postmost.co";
}

const EMAIL_FIELD: Record<NotificationKind, string> = {
  item_sold: "soldEmail",
  cross_post_failed: "crossPostFailedEmail",
  marketplace_signed_out: "marketplaceSignedOutEmail",
  automation_ran: "automationRanEmail",
  cross_post_succeeded: "crossPostSucceededEmail",
  near_plan_limit: "nearPlanLimitEmail",
};

// Matches NotificationPreference's schema defaults exactly -- used only when a user has no
// preference row yet (lazily created on first Settings → Notifications visit), so the very
// first event a brand-new user ever gets still emails (or doesn't) per the spec's stated
// defaults instead of silently going out based on an undefined value.
const DEFAULT_EMAIL_ENABLED: Record<NotificationKind, boolean> = {
  item_sold: true,
  cross_post_failed: true,
  marketplace_signed_out: true,
  automation_ran: false,
  cross_post_succeeded: false,
  near_plan_limit: false,
};

// Sold and the two needs-you kinds are time-sensitive enough that batching them into an 8am
// digest would defeat the point -- they always send immediately, ignoring digestMode entirely.
// The other three only send immediately when digestMode is off; when it's on, the daily digest
// cron picks them up instead (see app/api/notifications/digest/route.ts).
const ALWAYS_IMMEDIATE: NotificationKind[] = ["item_sold", "cross_post_failed", "marketplace_signed_out"];

/** Called right after a notification write. Resolves the right *Email preference for `kind`,
 *  respects digestMode for the three kinds that honor it, and sends via Resend if everything
 *  says go. Fire-and-forget from the caller's perspective -- a missing RESEND_API_KEY or a
 *  send failure here shouldn't fail the underlying notification write, so this never throws. */
export async function maybeSendNotificationEmail(
  userId: string,
  kind: NotificationKind,
  title: string,
  body: string,
  action?: { label: string; url: string }
) {
  try {
    const [user, pref] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
      prisma.notificationPreference.findUnique({ where: { userId } }),
    ]);
    if (!user?.email) return;

    const emailField = EMAIL_FIELD[kind];
    const enabled = pref ? (pref as unknown as Record<string, boolean>)[emailField] : DEFAULT_EMAIL_ENABLED[kind];
    if (!enabled) return;

    if (!ALWAYS_IMMEDIATE.includes(kind) && pref?.digestMode) return;

    const resolvedAction = action ? { label: action.label, url: new URL(action.url, appOrigin()).toString() } : undefined;
    await sendNotificationEmail(user.email, title, body, resolvedAction);
  } catch {
    // Email is best-effort -- the in-app notification is the source of truth.
  }
}
