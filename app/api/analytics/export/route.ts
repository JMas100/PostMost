import { NextResponse } from "next/server";
import { unparse } from "papaparse";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const listings = await prisma.listing.findMany({
    where: { userId: session.user.id, isDraft: false },
    include: { platformListings: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = listings.map((listing) => {
    const soldPlatform = listing.platformListings.find((pl) => pl.profit !== null);
    return {
      Title: listing.title,
      SKU: listing.sku || "",
      Category: listing.category,
      Status: listing.status,
      Price: listing.price.toFixed(2),
      Cost: listing.cost !== null ? listing.cost.toFixed(2) : "",
      Quantity: listing.quantity,
      Platforms: listing.platformListings.map((pl) => `${pl.platform}:${pl.status}`).join("; "),
      "Sold Price": soldPlatform?.soldPrice?.toFixed(2) ?? "",
      Profit: soldPlatform?.profit?.toFixed(2) ?? "",
      "Created At": listing.createdAt.toISOString().slice(0, 10),
    };
  });

  const csv = unparse(rows);
  const filename = `postmost-analytics-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
