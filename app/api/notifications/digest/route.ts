import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendNotificationDigestEmail } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Sold, cross_post_failed, and marketplace_signed_out are deliberately excluded -- they always
// send their own immediate email regardless of digestMode (see lib/notification-mail.ts), so
// they'd never have anything left to say here even for a digestMode user.
const DIGEST_KINDS = ["automation_ran", "cross_post_succeeded", "near_plan_limit"] as const;
type DigestKind = (typeof DIGEST_KINDS)[number];
const EMAIL_FIELD: Record<DigestKind, "automationRanEmail" | "crossPostSucceededEmail" | "nearPlanLimitEmail"> = {
  automation_ran: "automationRanEmail",
  cross_post_succeeded: "crossPostSucceededEmail",
  near_plan_limit: "nearPlanLimitEmail",
};

/** Constant-time string comparison -- matches the pattern in app/api/jobs/run/route.ts, which a
 *  shared helper isn't worth extracting for at two call sites. */
function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function isAuthorizedForCron(request: NextRequest) {
  const bearer = request.headers.get("authorization");
  return !!(bearer && process.env.CRON_SECRET && timingSafeEqualString(bearer, `Bearer ${process.env.CRON_SECRET}`));
}

/** Runs once a day at 8am (see vercel.json) and covers the full previous calendar day for every
 *  user who has opted into digestMode -- everyone else already got these three kinds (if they
 *  wanted them at all) as individual immediate emails from lib/notification-mail.ts. */
export async function GET(request: NextRequest) {
  if (!isAuthorizedForCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    const enabledKinds = DIGEST_KINDS.filter((kind) => pref[EMAIL_FIELD[kind]]);
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

  return NextResponse.json({ success: true, sent });
}
