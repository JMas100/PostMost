import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markListingSold } from "@/lib/actions/inventory";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const soldAt = typeof body.soldAt === "string" ? new Date(body.soldAt) : new Date();
    await prisma.platformListing.updateMany({
      where: { listingId, platform },
      data: { status: "SOLD", soldAt },
    });
    // Ensure listing is marked sold and trigger auto-delisting for API-connected platforms.
    await markListingSold(listingId);
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
