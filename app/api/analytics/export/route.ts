import { NextResponse } from "next/server";
import { unparse } from "papaparse";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const FIELDS = [
  "Title",
  "SKU",
  "Category",
  "Status",
  "Price",
  "Cost",
  "Quantity",
  "Platforms",
  "Sold Price",
  "Profit",
  "Created At",
];
const BATCH_SIZE = 500;

// A listing's title/SKU/category are seller-supplied (and can even arrive via CSV/URL import
// from a third party). Opening the export in Excel/Sheets treats any cell starting with
// =, +, -, or @ as a formula -- a poisoned value like `=HYPERLINK(...)` would run on whoever
// opens it. Prefixing with a single quote is the standard mitigation (OWASP's CSV Injection
// guidance): Excel treats a leading `'` as "force text" rather than a formula trigger.
function csvSafe(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // Fetches and writes one page at a time (cursor-paginated by id) instead of loading the
  // account's entire listing history into memory before building the CSV -- keeps memory and
  // time-to-first-byte flat regardless of how many listings the account has.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(unparse([FIELDS]) + "\r\n"));

      let cursor: string | undefined;
      for (;;) {
        const batch = await prisma.listing.findMany({
          where: { userId, isDraft: false },
          include: { platformListings: true },
          orderBy: { id: "asc" },
          take: BATCH_SIZE,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
        if (batch.length === 0) break;

        const rows = batch.map((listing) => {
          const soldPlatform = listing.platformListings.find((pl) => pl.profit !== null);
          return [
            csvSafe(listing.title),
            csvSafe(listing.sku || ""),
            csvSafe(listing.category),
            listing.status,
            listing.price.toFixed(2),
            listing.cost !== null ? listing.cost.toFixed(2) : "",
            listing.quantity,
            listing.platformListings.map((pl) => `${pl.platform}:${pl.status}`).join("; "),
            soldPlatform?.soldPrice?.toFixed(2) ?? "",
            soldPlatform?.profit?.toFixed(2) ?? "",
            listing.createdAt.toISOString().slice(0, 10),
          ];
        });
        controller.enqueue(encoder.encode(unparse(rows, { header: false }) + "\r\n"));

        cursor = batch[batch.length - 1].id;
        if (batch.length < BATCH_SIZE) break;
      }
      controller.close();
    },
  });

  const filename = `postmost-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
