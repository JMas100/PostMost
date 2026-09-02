import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markListingSold } from "@/lib/actions/inventory";
import { checkRateLimit } from "@/lib/rate-limit";

const SYNC_WINDOW_MS = 10 * 60 * 1000;
const SYNC_MAX_PER_WINDOW = 120;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateCheck = await checkRateLimit(`extension-sync:${userId}`, { windowMs: SYNC_WINDOW_MS, max: SYNC_MAX_PER_WINDOW });
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: "Too many sync requests. Please wait a bit and try again." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = body.type;
  const listingId = typeof body.listingId === "string" ? body.listingId : "";
  const platform = typeof body.platform === "string" ? body.platform : "";

  if (!["posted", "sold"].includes(type as string) || !listingId || !platform) {
    return NextResponse.json({ error: "Missing type, listingId, or platform" }, { status: 400 });
  }

  const listing = await prisma.listing.findFirst({
    where: { id: listingId, userId },
    include: { platformListings: true },
  });
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  if (type === "sold") {
    const soldPrice = typeof body.soldPrice === "number" ? body.soldPrice : undefined;
    const soldFees = typeof body.soldFees === "number" ? body.soldFees : undefined;
    const soldShippingCost = typeof body.soldShippingCost === "number" ? body.soldShippingCost : undefined;
    const sale = soldPrice !== undefined ? { soldPrice, soldFees, soldShippingCost } : undefined;
    await markListingSold(listingId, platform, sale);
    return NextResponse.json({ success: true, type: "sold" });
  }

  // type === "posted"
  const externalUrl = typeof body.externalUrl === "string" ? body.externalUrl : "";
  const externalId = typeof body.externalId === "string" ? body.externalId : null;

  if (!externalUrl) {
    return NextResponse.json({ error: "Missing externalUrl for posted event" }, { status: 400 });
  }

  const existing = listing.platformListings.find((p) => p.platform === platform);
  if (existing) {
    await prisma.platformListing.update({
      where: { id: existing.id },
      data: {
        status: "POSTED",
        externalUrl,
        externalId,
        postedAt: new Date(),
      },
    });
  } else {
    await prisma.platformListing.create({
      data: {
        listingId,
        platform,
        externalUrl,
        externalId,
        status: "POSTED",
        price: listing.price,
        postedAt: new Date(),
      },
    });
  }

  return NextResponse.json({ success: true, type: "posted" });
}
