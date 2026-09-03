import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markListingSold } from "@/lib/actions/inventory";
import { checkRateLimit } from "@/lib/rate-limit";

const SYNC_WINDOW_MS = 10 * 60 * 1000;
const SYNC_MAX_PER_WINDOW = 120;

// soldPrice/soldFees/soldShippingCost are inherently client-observed (scraped off the marketplace
// page, no ground-truth API to check them against for most platforms) and only ever affect the
// reporting user's own analytics -- ownership scoping (the listing lookup below) already prevents
// this from touching anyone else's data. This is just a sanity bound against garbage/hostile
// values (negative, NaN/Infinity, or absurd) corrupting one's own profit numbers, not an attempt
// at real verification.
const MAX_SANE_PRICE = 1_000_000;
function sanePrice(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= MAX_SANE_PRICE ? value : undefined;
}

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
    const soldPrice = sanePrice(body.soldPrice);
    const soldFees = sanePrice(body.soldFees);
    const soldShippingCost = sanePrice(body.soldShippingCost);
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
