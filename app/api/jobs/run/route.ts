import { NextRequest, NextResponse } from "next/server";
import { processPendingCrossPostJobs } from "@/lib/jobs/crosspost-runner";
import { runStockSyncRule, runRelistStaleRule } from "@/lib/jobs/automation-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: NextRequest) {
  const masterKey = request.headers.get("x-master-key");
  if (masterKey && process.env.MASTER_KEY && masterKey === process.env.MASTER_KEY) return true;

  // Vercel cron can only send an Authorization header.
  const bearer = request.headers.get("authorization");
  if (bearer && process.env.CRON_SECRET && bearer === `Bearer ${process.env.CRON_SECRET}`) return true;

  return false;
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();

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
  if (!isAuthorized(request)) return unauthorized();

  const listingId = request.nextUrl.searchParams.get("listingId") || undefined;
  const summary = await processPendingCrossPostJobs(listingId);
  const automation = listingId
    ? undefined
    : { stockSync: await runStockSyncRule(), relist: await runRelistStaleRule() };
  return NextResponse.json({ success: true, ...summary, automation });
}
