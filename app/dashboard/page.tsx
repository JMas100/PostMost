import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { trackDashboardViewed } from "@/lib/actions/analytics";
import { getPlatform } from "@/lib/marketplaces/platforms";
import { getActivationState } from "@/lib/actions/activation";
import { Shell } from "@/components/sidebar";
import { TrackOnMount } from "@/components/track-on-mount";
import { ActivationChecklist } from "@/components/activation-checklist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatValue } from "@/components/stat-value";
import Link from "next/link";
import { Package, Activity, DollarSign, TrendingUp, Store } from "lucide-react";

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

  const [listingCount, postedCount, accounts, soldAgg, activationState] = await Promise.all([
    prisma.listing.count({ where: { userId: session.user.id, isDraft: false } }),
    prisma.platformListing.count({
      where: { listing: { userId: session.user.id, isDraft: false }, status: "POSTED" },
    }),
    prisma.marketplaceAccount.findMany({
      where: { userId: session.user.id },
      select: { id: true, platform: true, displayName: true, isActive: true, tokenExpiresAt: true },
    }),
    prisma.platformListing.aggregate({
      where: { listing: { userId: session.user.id }, status: "SOLD" },
      _sum: { soldPrice: true, profit: true },
    }),
    getActivationState(session.user.id),
  ]);

  const recentListings = await prisma.listing.findMany({
    where: { userId: session.user.id, isDraft: false },
    include: { photos: true, platformListings: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const totalRevenue = soldAgg._sum.soldPrice ?? 0;
  const totalProfit = soldAgg._sum.profit ?? 0;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const accountCount = accounts.length;

  return (
    <Shell>
      <TrackOnMount action={trackDashboardViewed} />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground">Welcome back, {session.user.name || session.user.email}.</p>
        </div>

        <ActivationChecklist state={activationState} />

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
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                    </span>
                    Live
                  </span>
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
                  <TrendingUp className="h-3 w-3" /> +{profitMargin.toFixed(1)}%
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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
            <div className="flex flex-wrap gap-2">
              {accounts.map((account) => {
                const status = accountStatus(account);
                const meta = statusMeta[status];
                const platformName = getPlatform(account.platform)?.name ?? account.platform;
                return (
                  <Badge key={account.id} variant={meta.variant} className="gap-1.5 py-1">
                    {platformName}
                    <span className="opacity-80">· {meta.label}</span>
                  </Badge>
                );
              })}
            </div>
          )}
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
