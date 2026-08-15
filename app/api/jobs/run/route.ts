import { NextRequest, NextResponse } from "next/server";
import { processPendingCrossPostJobs } from "@/lib/jobs/crosspost-runner";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: NextRequest) {
  const masterKey = request.headers.get("x-master-key");
  if (!masterKey || masterKey !== process.env.MASTER_KEY) {
    return unauthorized();
  }

  let listingId: string | undefined;
  try {
    const body = (await request.json()) as { listingId?: string };
    listingId = body.listingId;
  } catch {
    // body is optional
  }

  await processPendingCrossPostJobs(listingId);
  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  const masterKey = request.headers.get("x-master-key");
  if (!masterKey || masterKey !== process.env.MASTER_KEY) {
    return unauthorized();
  }

  const listingId = request.nextUrl.searchParams.get("listingId") || undefined;
  await processPendingCrossPostJobs(listingId);
  return NextResponse.json({ success: true });
}
