import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { trackDashboardViewed } from "@/lib/actions/analytics";
import { getPlatform } from "@/lib/marketplaces/platforms";
import { getActivationState } from "@/lib/actions/activation";
import { getUsage } from "@/lib/actions/usage";
import { Shell } from "@/components/sidebar";
import { Progress } from "@/components/ui/progress";
import { TrackOnMount } from "@/components/track-on-mount";
import { ActivationChecklist } from "@/components/activation-checklist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatValue } from "@/components/stat-value";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Package, Activity, DollarSign, TrendingUp, TrendingDown, Store, AlertTriangle } from "lucide-react";

type AccountStatus = "connected" | "action_required" | "failed";

function accountStatus(a: { isActive: boolean; tokenExpiresAt: Date | null }): AccountStatus {
  if (!a.isActive) return "failed";
  if (a.tokenExpiresAt) {
    const msRemaining = a.tokenExpiresAt.getTime() - Date.now();
    if (msRemaining < 0) return "action_required";
    if (msRemaining < 1000 * 60 * 60 * 24 * 3) return "action_required";
  }
  return "connected";
}

const statusMeta: Record<AccountStatus, { label: string; variant: "success" | "warning" | "error" }> = {
  connected: { label: "Connected", variant: "success" },
  action_required: { label: "Action required", variant: "warning" },
  failed: { label: "Connection failed", variant: "error" },
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const now = new Date();
  const start30 = new Date(now);
  start30.setDate(start30.getDate() - 30);
  const start60 = new Date(now);
  start60.setDate(start60.getDate() - 60);

  const [
    listingCount,
    postedCount,
    failedCount,
    accounts,
    soldAgg,
    activationState,
    usage,
    platformListingsAll,
    listingsLast30,
    listingsPrev30,
    profitLast30Agg,
    profitPrev30Agg,
  ] = await Promise.all([
    prisma.listing.count({ where: { userId, isDraft: false } }),
    prisma.platformListing.count({
      where: { listing: { userId, isDraft: false }, status: "POSTED" },
    }),
    prisma.platformListing.count({
      where: { listing: { userId, isDraft: false }, status: "FAILED" },
    }),
    prisma.marketplaceAccount.findMany({
      where: { userId },
      select: { id: true, platform: true, displayName: true, isActive: true, tokenExpiresAt: true },
    }),
    prisma.platformListing.aggregate({
      where: { listing: { userId }, status: "SOLD" },
      _sum: { soldPrice: true, profit: true },
    }),
    getActivationState(userId),
    getUsage(userId),
    prisma.platformListing.findMany({
      where: { listing: { userId, isDraft: false } },
      select: { platform: true, status: true },
    }),
    prisma.listing.count({ where: { userId, isDraft: false, createdAt: { gte: start30 } } }),
    prisma.listing.count({ where: { userId, isDraft: false, createdAt: { gte: start60, lt: start30 } } }),
    prisma.platformListing.aggregate({
      where: { listing: { userId }, status: "SOLD", soldAt: { gte: start30 } },
      _sum: { profit: true },
    }),
    prisma.platformListing.aggregate({
      where: { listing: { userId }, status: "SOLD", soldAt: { gte: start60, lt: start30 } },
      _sum: { profit: true },
    }),
  ]);

  const recentListings = await prisma.listing.findMany({
    where: { userId, isDraft: false },
    include: { photos: true, platformListings: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const totalRevenue = soldAgg._sum.soldPrice ?? 0;
  const totalProfit = soldAgg._sum.profit ?? 0;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const accountCount = accounts.length;
  const accountsNeedingAttention = accounts.filter((a) => accountStatus(a) !== "connected");

  const listingsDelta = listingsLast30 - listingsPrev30;
  const profitLast30 = profitLast30Agg._sum.profit ?? 0;
  const profitPrev30 = profitPrev30Agg._sum.profit ?? 0;
  const profitDelta = profitLast30 - profitPrev30;

  const platformCounts = new Map<string, { live: number; sold: number }>();
  for (const pl of platformListingsAll) {
    const existing = platformCounts.get(pl.platform) ?? { live: 0, sold: 0 };
    if (pl.status === "POSTED") existing.live += 1;
    if (pl.status === "SOLD") existing.sold += 1;
    platformCounts.set(pl.platform, existing);
  }

  return (
    <Shell>
      <TrackOnMount action={trackDashboardViewed} />
      <div className="space-y-6">
        <PageHeader title="Overview" description={`Welcome back, ${session.user.name || session.user.email}.`} />

        <ActivationChecklist state={activationState} />

        {(failedCount > 0 || accountsNeedingAttention.length > 0) && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>
              {failedCount > 0 && accountsNeedingAttention.length > 0
                ? "Two things need you today"
                : "One thing needs you today"}
            </AlertTitle>
            <AlertDescription>
              <ul className="mt-1 space-y-1">
                {failedCount > 0 && (
                  <li>
                    {failedCount} cross-post{failedCount === 1 ? "" : "s"} failed.{" "}
                    <Link href="/listings" className="font-medium underline underline-offset-2">
                      Review {failedCount === 1 ? "it" : "them"}
                    </Link>
                  </li>
                )}
                {accountsNeedingAttention.length > 0 && (
                  <li>
                    {accountsNeedingAttention.length} marketplace connection
                    {accountsNeedingAttention.length === 1 ? "" : "s"} need{accountsNeedingAttention.length === 1 ? "s" : ""} attention.{" "}
                    <Link href="/settings" className="font-medium underline underline-offset-2">
                      Fix in Settings
                    </Link>
                  </li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Package className="h-4 w-4" /> Total listings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                <StatValue value={listingCount} />
              </div>
              {listingsDelta !== 0 && (
                <div
                  className={cn(
                    "mt-1 inline-flex items-center gap-1 text-xs font-semibold",
                    listingsDelta > 0 ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {listingsDelta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {listingsDelta > 0 ? "+" : ""}
                  {listingsDelta} vs prior 30 days
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Activity className="h-4 w-4" /> Live cross-posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                <StatValue value={postedCount} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Store className="h-4 w-4" /> Connected marketplaces
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold text-foreground">
                  <StatValue value={accountCount} />
                </div>
                {accountCount > 0 && (
                  <Badge variant="live" className="gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                    </span>
                    Live
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <DollarSign className="h-4 w-4" /> Total profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                <StatValue value={totalProfit} prefix="$" decimals={2} />
              </div>
              {profitMargin > 0 && (
                <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  <TrendingUp className="h-3 w-3" /> +{profitMargin.toFixed(1)}% margin
                </div>
              )}
              {profitDelta !== 0 && (
                <div
                  className={cn(
                    "mt-1 inline-flex items-center gap-1 text-xs font-semibold",
                    profitDelta > 0 ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {profitDelta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {profitDelta > 0 ? "+" : "-"}${Math.abs(profitDelta).toFixed(2)} vs prior 30 days
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Marketplace connections</h2>
            {accounts.length === 0 ? (
              <Alert>
                <Store />
                <AlertTitle>No marketplaces connected yet</AlertTitle>
                <AlertDescription>
                  Connect a marketplace to start cross-posting listings.{" "}
                  <Link href="/settings">Connect a marketplace</Link>
                </AlertDescription>
              </Alert>
            ) : (
              <Card>
                <CardContent className="divide-y p-0">
                  {accounts.map((account) => {
                    const status = accountStatus(account);
                    const meta = statusMeta[status];
                    const platformName = getPlatform(account.platform)?.name ?? account.platform;
                    const counts = platformCounts.get(account.platform) ?? { live: 0, sold: 0 };
                    return (
                      <div key={account.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Badge variant={meta.variant} className="gap-1.5 py-1">
                            {platformName}
                            <span className="opacity-80">· {meta.label}</span>
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {counts.live} live · {counts.sold} sold
                          </span>
                        </div>
                        {status !== "connected" && (
                          <Link href="/settings" className="text-xs font-medium text-primary hover:underline">
                            Fix
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Plan usage</h2>
            <Card>
              <CardContent className="space-y-3 pt-4">
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted-foreground">Listings</span>
                    <span>
                      {usage.listingsLimit === -1 ? "Unlimited" : `${usage.listingsThisMonth} / ${usage.listingsLimit}`}
                    </span>
                  </div>
                  {usage.listingsLimit > 0 && (
                    <Progress value={Math.min(100, (usage.listingsThisMonth / usage.listingsLimit) * 100)} />
                  )}
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted-foreground">AI credits</span>
                    <span>{usage.aiLimit === -1 ? "Unlimited" : `${usage.aiCreditsUsed} / ${usage.aiLimit}`}</span>
                  </div>
                  {usage.aiLimit > 0 && (
                    <Progress value={Math.min(100, (usage.aiCreditsUsed / usage.aiLimit) * 100)} />
                  )}
                </div>
                <Link href="/settings/billing" className="block text-xs font-medium text-primary hover:underline">
                  View billing
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Listings</h2>
          <Link href="/listings/new" className={buttonVariants()}>
            Create listing
          </Link>
        </div>

        {recentListings.length === 0 ? (
          <EmptyState
            variant="first-run"
            headline="No listings yet"
            body="Post an item once and it goes live everywhere you sell."
            primaryAction={{ label: "Create your first listing", href: "/listings/new" }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentListings.map((listing) => (
              <Link key={listing.id} href={`/listings/${listing.id}`}>
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardContent>
                    <div className="flex gap-4">
                      {listing.photos[0] && (
                        <img src={listing.photos[0].url} alt="" className="h-16 w-16 rounded-md object-cover" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium line-clamp-1">{listing.title}</p>
                        <p className="text-sm text-muted-foreground">${listing.price.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {listing.platformListings.length} platform listing(s)
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
