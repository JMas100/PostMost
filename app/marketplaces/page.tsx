import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Shell } from "@/components/sidebar";
import { getMarketplaceAccounts } from "@/lib/actions/accounts";
import { PLATFORMS } from "@/lib/marketplaces/platforms";
import { MarketplaceAccountCard, type PlatformStats } from "@/components/marketplace-account-card";
import { PageHeader } from "@/components/page-header";

const CONNECTABLE_PLATFORMS = PLATFORMS.filter((p) => p.authType !== "none");

export default async function MarketplacesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [accounts, platformListings, soldPlatformListings] = await Promise.all([
    getMarketplaceAccounts(),
    prisma.platformListing.findMany({
      where: { listing: { userId } },
      select: { platform: true, status: true },
    }),
    prisma.platformListing.findMany({
      where: { listing: { userId }, status: "SOLD", profit: { not: null } },
      select: { platform: true, soldPrice: true },
    }),
  ]);

  const accountByPlatform = new Map(accounts.map((a) => [a.platform, a]));

  const statsByPlatform = new Map<string, PlatformStats>();
  for (const pl of platformListings) {
    const existing = statsByPlatform.get(pl.platform) || { posted: 0, failed: 0, sold: 0, revenue: 0 };
    if (pl.status === "POSTED") existing.posted += 1;
    if (pl.status === "FAILED") existing.failed += 1;
    if (pl.status === "SOLD") existing.sold += 1;
    statsByPlatform.set(pl.platform, existing);
  }
  for (const sale of soldPlatformListings) {
    const existing = statsByPlatform.get(sale.platform);
    if (existing) existing.revenue += sale.soldPrice ?? 0;
  }

  const connectedPlatforms = CONNECTABLE_PLATFORMS.filter((p) => accountByPlatform.has(p.id));
  const unconnectedPlatforms = CONNECTABLE_PLATFORMS.filter((p) => !accountByPlatform.has(p.id));

  return (
    <Shell>
      <div className="space-y-6">
        <PageHeader
          title="Marketplaces"
          description={`${connectedPlatforms.length} of ${CONNECTABLE_PLATFORMS.length} marketplaces connected. Connect, manage credentials, and see how each platform is performing.`}
        />

        {connectedPlatforms.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Connected</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {connectedPlatforms.map((platform) => (
                <MarketplaceAccountCard
                  key={platform.id}
                  platform={platform}
                  account={accountByPlatform.get(platform.id)}
                  stats={statsByPlatform.get(platform.id)}
                />
              ))}
            </div>
          </div>
        )}

        {unconnectedPlatforms.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Not connected</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {unconnectedPlatforms.map((platform) => (
                <MarketplaceAccountCard key={platform.id} platform={platform} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
