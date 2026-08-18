import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { syncInventorySale } from "@/lib/jobs/inventory-sync";

function verifySignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  const secret = process.env.INVENTORY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-webhook-signature");

  if (!verifySignature(rawBody, signature, secret)) {
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

  const results = await syncInventorySale(params.platform, externalId);
  return NextResponse.json({ success: true, results });
}
