import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { processPendingCrossPostJobs } from "@/lib/jobs/crosspost-runner";
import { runStockSyncRule, runRelistStaleRule } from "@/lib/jobs/automation-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// This route processes up to 100 pending jobs sequentially, each with its own internal
// JOB_TIMEOUT_MS (60s) budget in crosspost-runner.ts -- a batch of more than one slow job could
// never finish inside a 60s function ceiling. Confirmed live in production: a job that was still
// executing when the old 60s ceiling killed the function was left orphaned in RUNNING status
// indefinitely (only ever reclaimed by the 5-minute stuck-job check, and then killed again on the
// next run if the batch was still long), which is exactly what a real stuck listing looked like.
// 300s is the actual maximum on Vercel's Hobby plan.
export const maxDuration = 300;

// Shared across every phase run in a single invocation (crosspost jobs, then stock-sync, then
// relist-stale) so a big crosspost batch can't eat the whole ceiling and leave the later phases
// no choice but to get killed mid-item too -- each phase just stops claiming new work once this
// is reached, leaving the rest for the next invocation instead of getting hard-killed mid-flight.
// 30s under the real 300s ceiling for response overhead.
const REQUEST_BUDGET_MS = 270 * 1000;

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

  const deadline = Date.now() + REQUEST_BUDGET_MS;
  const summary = await processPendingCrossPostJobs(listingId, deadline);
  const automation = listingId
    ? undefined
    : { stockSync: await runStockSyncRule(deadline), relist: await runRelistStaleRule(deadline) };
  return NextResponse.json({ success: true, ...summary, automation });
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedForCron(request)) return unauthorized();

  const deadline = Date.now() + REQUEST_BUDGET_MS;
  const summary = await processPendingCrossPostJobs(undefined, deadline);
  const automation = { stockSync: await runStockSyncRule(deadline), relist: await runRelistStaleRule(deadline) };
  return NextResponse.json({ success: true, ...summary, automation });
}
