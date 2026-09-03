import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Thin JSON wrapper around the same query getMarketplaceAccounts() (lib/actions/accounts.ts) runs
// -- that's a server action and can't be called cross-origin from the extension's popup, so this
// exists purely to expose the same data as a fetchable route, same auth pattern as
// app/api/extension/sync/route.ts.
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.marketplaceAccount.findMany({
    where: { userId, isActive: true },
    select: { platform: true, displayName: true, authMethod: true },
    orderBy: { platform: "asc" },
  });

  return NextResponse.json({ accounts });
}
