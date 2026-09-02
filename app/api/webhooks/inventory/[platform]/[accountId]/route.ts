import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { syncInventorySale } from "@/lib/jobs/inventory-sync";

/** Constant-time string comparison -- matches the pattern in app/api/jobs/run/route.ts. */
function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifySignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return timingSafeEqualString(expected, signature);
}

/** One webhook secret per connected MarketplaceAccount (see getInventoryWebhookConfig in
 *  lib/actions/accounts.ts), not one shared secret for the whole app -- a leaked secret only
 *  ever lets someone forge sale events for that one account's own listings. The account id is
 *  part of the URL rather than the payload so it can't be swapped out by anyone who doesn't
 *  already hold that specific account's secret. */
export async function POST(request: NextRequest, props: { params: Promise<{ platform: string; accountId: string }> }) {
  const params = await props.params;

  const account = await prisma.marketplaceAccount.findFirst({
    where: { id: params.accountId, platform: params.platform },
    select: { userId: true, webhookSecret: true },
  });
  if (!account) {
    return NextResponse.json({ error: "Unknown webhook" }, { status: 404 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-webhook-signature");

  if (!verifySignature(rawBody, signature, account.webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: { externalId?: string; event?: string };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const externalId = body.externalId;
  const event = body.event || "SOLD";
  if (!externalId) {
    return NextResponse.json({ error: "Missing externalId" }, { status: 400 });
  }

  if (event !== "SOLD") {
    return NextResponse.json({ success: true, message: "Event ignored" });
  }

  const results = await syncInventorySale(params.platform, externalId, account.userId);
  return NextResponse.json({ success: true, results });
}
