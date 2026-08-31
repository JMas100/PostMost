import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Shell } from "@/components/sidebar";
import { getMarketplaceAccounts } from "@/lib/actions/accounts";
import { PLATFORMS } from "@/lib/marketplaces/platforms";
import { MarketplaceAccountCard, type PlatformStats } from "@/components/marketplace-account-card";
import { MarketplaceConnectTile } from "@/components/marketplace-connect-tile";
import { ExtensionStatusFooter } from "@/components/extension-status-footer";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

const CONNECTABLE_PLATFORMS = PLATFORMS.filter((p) => p.authType !== "none");
const DIRECT_API_PLATFORMS = PLATFORMS.filter((p) => p.authType === "oauth");
const BROWSER_PLATFORMS = PLATFORMS.filter((p) => p.authType === "manual");
const NOT_AVAILABLE_PLATFORMS = PLATFORMS.filter((p) => p.authType === "none");

// The four that compress into a tile grid when unconnected, per the design handoff -- the other
// browser-mechanism platforms (Poshmark, Mercari, Depop, Vinted) are the ones this session has
// real automation/session-connect built and tested for, so they stay full rows even unconnected.
const TILE_WHEN_UNCONNECTED = new Set(["facebook", "offerup", "grailed", "craigslist"]);

function accountNeedsAttention(a: { isActive: boolean; tokenExpiresAt: Date | null }): { needs: boolean; reason?: string } {
  if (!a.isActive) return { needs: true, reason: "Signed out" };
  if (a.tokenExpiresAt) {
    const msRemaining = a.tokenExpiresAt.getTime() - Date.now();
    if (msRemaining < 0) return { needs: true, reason: "Token expired" };
    if (msRemaining < 1000 * 60 * 60 * 24 * 3) {
      const days = Math.max(1, Math.round(msRemaining / (1000 * 60 * 60 * 24)));
      return { needs: true, reason: `Token expires in ${days} day${days === 1 ? "" : "s"}` };
    }
  }
  return { needs: false };
}

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

  // "Platform listings live" is named rather than "listings synced" because it counts one row
  // per marketplace per item, so it sums the stat rows exactly and never disagrees with them.
  const liveSlots = platformListings.filter((pl) => pl.status === "POSTED").length;
  const needsAttentionAccounts = accounts.filter((a) => accountNeedsAttention(a).needs);

  return (
    <Shell>
      <div className="space-y-6">
        <PageHeader title="Marketplaces" description="Twelve places to sell. How each one connects depends on what it lets us do." />

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">Connected</p>
              <p className="text-2xl font-bold">
                {accounts.length} <span className="text-sm font-normal text-muted-foreground">of {CONNECTABLE_PLATFORMS.length} available</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">Platform listings live</p>
              <p className="text-2xl font-bold">
                {liveSlots} <span className="text-sm font-normal text-muted-foreground">across {accounts.length} connected marketplaces</span>
              </p>
            </CardContent>
          </Card>
          <Card className={needsAttentionAccounts.length > 0 ? "border-warning/40" : undefined}>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">Needs attention</p>
              <p className="text-2xl font-bold">
                {needsAttentionAccounts.length}{" "}
                {needsAttentionAccounts.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {needsAttentionAccounts.map((a) => PLATFORMS.find((p) => p.id === a.platform)?.name ?? a.platform).join(", ")}
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {needsAttentionAccounts.length > 0 && (
          <Card className="border-warning/40 bg-warning/5">
            <CardContent className="flex items-start gap-3 py-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
              <div>
                <p className="font-medium">
                  {needsAttentionAccounts.length === 1 ? "One connection needs you" : `${needsAttentionAccounts.length} connections need you`}
                </p>
                <p className="text-sm text-muted-foreground">
                  Nothing gets delisted while a connection is down — updates just stop flowing.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Direct API</h2>
            <p className="text-sm text-muted-foreground">These authorise once and run on their own, whether or not your browser is open.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {DIRECT_API_PLATFORMS.map((platform) => (
              <MarketplaceAccountCard
                key={platform.id}
                platform={platform}
                account={accountByPlatform.get(platform.id)}
                stats={statsByPlatform.get(platform.id)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Through your browser</h2>
            <p className="text-sm text-muted-foreground">
              These have no public API, so the extension posts as you, in your own signed-in session. We never see
              or type your password — which is also how Mercari works at all, since its login is behind a CAPTCHA
              no automation can pass.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {BROWSER_PLATFORMS.filter((p) => !TILE_WHEN_UNCONNECTED.has(p.id) || accountByPlatform.has(p.id)).map((platform) => (
              <MarketplaceAccountCard
                key={platform.id}
                platform={platform}
                account={accountByPlatform.get(platform.id)}
                stats={statsByPlatform.get(platform.id)}
              />
            ))}
          </div>
          {(() => {
            const tiles = BROWSER_PLATFORMS.filter((p) => TILE_WHEN_UNCONNECTED.has(p.id) && !accountByPlatform.has(p.id));
            return tiles.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {tiles.map((platform) => (
                  <MarketplaceConnectTile key={platform.id} platform={platform} />
                ))}
              </div>
            ) : null;
          })()}
          <ExtensionStatusFooter />
        </div>

        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Not available yet</h2>
            <p className="text-sm text-muted-foreground">Listed so you know where they stand, not to pad the count.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {NOT_AVAILABLE_PLATFORMS.map((platform) => (
              <div key={platform.id} className="flex items-start gap-3 rounded-lg border p-4 opacity-75">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{platform.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {platform.id === "whatnot"
                      ? "In review — our API application is with the marketplace. We'll email you the day it opens."
                      : "In development — your own storefront rather than a marketplace, so it needs a different sync model. Not connectable today."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
