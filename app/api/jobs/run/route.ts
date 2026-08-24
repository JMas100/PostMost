import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { processPendingCrossPostJobs } from "@/lib/jobs/crosspost-runner";
import { runStockSyncRule, runRelistStaleRule } from "@/lib/jobs/automation-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Constant-time string comparison -- a plain === leaks how many leading bytes matched via
 *  response timing, which matters for secrets checked on every request like these. */
function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function isAuthorizedForTrigger(request: NextRequest) {
  const masterKey = request.headers.get("x-master-key");
  return !!(masterKey && process.env.MASTER_KEY && timingSafeEqualString(masterKey, process.env.MASTER_KEY));
}

function isAuthorizedForCron(request: NextRequest) {
  // Vercel cron always sends a GET request with only an Authorization header -- this is the
  // one caller of GET, so GET accepts nothing else (no listingId targeting, no master key).
  const bearer = request.headers.get("authorization");
  return !!(bearer && process.env.CRON_SECRET && timingSafeEqualString(bearer, `Bearer ${process.env.CRON_SECRET}`));
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedForTrigger(request)) return unauthorized();

  let listingId: string | undefined;
  try {
    const body = (await request.json()) as { listingId?: string };
    listingId = body.listingId;
  } catch {
    // body is optional
  }

  const summary = await processPendingCrossPostJobs(listingId);
  const automation = listingId
    ? undefined
    : { stockSync: await runStockSyncRule(), relist: await runRelistStaleRule() };
  return NextResponse.json({ success: true, ...summary, automation });
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedForCron(request)) return unauthorized();

  const summary = await processPendingCrossPostJobs();
  const automation = { stockSync: await runStockSyncRule(), relist: await runRelistStaleRule() };
  return NextResponse.json({ success: true, ...summary, automation });
}
