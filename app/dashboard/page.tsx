import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/auth-helpers";
import { trackDashboardViewed } from "@/lib/actions/analytics";
import { getActivationState } from "@/lib/actions/activation";
import { getUsage } from "@/lib/actions/usage";
import { getDashboardData, type DashboardPeriod } from "@/lib/actions/dashboard";
import { Shell } from "@/components/sidebar";
import { Progress } from "@/components/ui/progress";
import { TrackOnMount } from "@/components/track-on-mount";
import { ActivationChecklist } from "@/components/activation-checklist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { StatValue } from "@/components/stat-value";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, XCircle, Package2 } from "lucide-react";

export default async function DashboardPage(props: { searchParams: Promise<{ period?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const { workspaceUserId } = await requireWorkspace();

  const period: DashboardPeriod = searchParams.period === "all" ? "all" : "30d";

  const [data, activationState, usage] = await Promise.all([
    getDashboardData(period),
    getActivationState(workspaceUserId),
    getUsage(workspaceUserId),
  ]);

  const recentListings = await prisma.listing.findMany({
    where: { userId: workspaceUserId, isDraft: false },
    include: { photos: true, platformListings: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const todayLabel = format(new Date(), "EEEE d MMMM");
  const alertSubhead =
    data.alerts.length === 0
      ? ""
      : data.alerts.length === 1
        ? " One thing needs you today."
        : ` ${data.alerts.length === 2 ? "Two" : data.alerts.length} things need you today.`;

  return (
    <Shell>
      <TrackOnMount action={trackDashboardViewed} />
      <div className="space-y-6">
        <PageHeader
          title="Overview"
          description={`${todayLabel}.${alertSubhead}`}
          actions={
            <>
              <div className="flex overflow-hidden rounded-md border">
                <Link
                  href="/dashboard?period=30d"
                  className={cn("px-3 py-1.5 text-sm font-medium", period === "30d" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
                >
                  30 days
                </Link>
                <Link
                  href="/dashboard?period=all"
                  className={cn("px-3 py-1.5 text-sm font-medium", period === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
                >
                  All time
                </Link>
              </div>
              <Link href="/listings/new" className={buttonVariants()}>
                Create listing
              </Link>
            </>
          }
        />

        <ActivationChecklist state={activationState} />

        {data.alerts.map((alert) => (
          <Card key={alert.id} className="border-destructive/40">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div>
                  <p className="font-medium">{alert.title}</p>
                  <p className="text-sm text-muted-foreground">{alert.body}</p>
                </div>
              </div>
              <Link href={alert.actionHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
                {alert.actionLabel}
              </Link>
            </CardContent>
          </Card>
        ))}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <DollarSign className="h-4 w-4" /> Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                <StatValue value={data.revenue} prefix="$" decimals={2} />
              </div>
              {data.revenueDeltaPct !== null && (
                <Delta pct={data.revenueDeltaPct} suffix="vs last 30 days" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <TrendingUp className="h-4 w-4" /> Profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                <StatValue value={data.profit} prefix="$" decimals={2} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">after fees, shipping and cost</p>
              {data.profitDeltaPct !== null && <Delta pct={data.profitDeltaPct} suffix="vs last 30 days" />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Package2 className="h-4 w-4" /> Live listings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                <StatValue value={data.liveListingCount} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                on {data.liveSlots} marketplace slots · {data.slotsPerListing.toFixed(1)} per item
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" /> Sold
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                <StatValue value={data.soldCount} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.avgDaysToSell !== null ? `avg ${data.avgDaysToSell.toFixed(0)} days to sell` : "no sales yet"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <div className="space-y-3">
              <div>
                <h2 className="text-sm font-medium text-muted-foreground">Recent activity</h2>
                <p className="text-xs text-muted-foreground">Everything, newest first</p>
              </div>
              <Card>
                <CardContent className="divide-y p-0">
                  {data.activity.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground">
                      Nothing yet — sales, publishes, and automation will show up here.
                    </div>
                  ) : (
                    data.activity.map((entry) => (
                      <div key={entry.id} className="flex items-start justify-between gap-3 px-4 py-3">
                        <div className="flex items-start gap-3">
                          {entry.success ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                          ) : (
                            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                          )}
                          <div>
                            <p className="text-sm">{entry.text}</p>
                            {entry.detail && <p className="text-xs text-muted-foreground">{entry.detail}</p>}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {entry.actionHref && (
                            <Link href={entry.actionHref} className="text-xs font-medium text-primary hover:underline">
                              {entry.actionLabel}
                            </Link>
                          )}
                          <span className="text-xs whitespace-nowrap text-muted-foreground">
                            {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-muted-foreground">Recent listings</h2>
                <Link href="/listings" className="text-xs font-medium text-primary hover:underline">
                  All {data.liveListingCount + data.soldCount}
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
                <div className="space-y-2">
                  {recentListings.map((listing) => {
                    const live = listing.platformListings.filter((pl) => pl.status === "POSTED").length;
                    const total = listing.platformListings.length;
                    const failed = listing.platformListings.find((pl) => pl.status === "FAILED");
                    return (
                      <Link key={listing.id} href={`/listings/${listing.id}`}>
                        <Card className="transition-colors hover:bg-muted/50">
                          <CardContent className="flex items-center gap-4 py-3">
                            {listing.photos[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={listing.photos[0].url} alt="" className="h-12 w-12 rounded-md object-cover" />
                            ) : (
                              <div className="h-12 w-12 rounded-md bg-muted" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-1 font-medium">{listing.title}</p>
                              <p className="text-sm text-muted-foreground">
                                ${listing.price.toFixed(2)}
                                {listing.status === "SOLD" ? " · sold" : total > 0 ? ` · live on ${live} of ${total}` : ""}
                              </p>
                            </div>
                            {failed && (
                              <Badge variant="error" className="shrink-0">
                                Needs attention
                              </Badge>
                            )}
                            {listing.status === "SOLD" && (
                              <Badge variant="success" className="shrink-0">
                                Sold
                              </Badge>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Marketplaces</h2>
              {data.connections.length === 0 && data.unconnected.length === 0 ? null : (
                <Card>
                  <CardContent className="divide-y p-0">
                    {data.connections.map((c) => (
                      <div key={c.id} className={cn("flex items-center justify-between gap-3 px-4 py-3", c.needsAttention && "bg-warning/5")}>
                        <div>
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className={cn("text-xs", c.needsAttention ? "text-warning" : "text-muted-foreground")}>
                            {c.needsAttention ? c.attentionReason : `${c.live} live · ${c.sold} sold`}
                          </p>
                        </div>
                        {c.needsAttention && (
                          <Link href="/settings" className="text-xs font-medium text-primary hover:underline">
                            Fix
                          </Link>
                        )}
                      </div>
                    ))}
                    {data.unconnected.length > 0 && (
                      <div className="flex items-center justify-between gap-3 px-4 py-3 opacity-60">
                        <p className="text-sm">
                          {data.unconnected.length} more marketplace{data.unconnected.length === 1 ? "" : "s"} available
                        </p>
                        <Link href="/marketplaces" className="text-xs font-medium text-primary hover:underline">
                          Connect
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {data.sellThrough.length > 0 && (
              <div className="space-y-3">
                <div>
                  <h2 className="text-sm font-medium text-muted-foreground">Where sales come from</h2>
                  <p className="text-xs text-muted-foreground">Percentages are sell-through</p>
                </div>
                <Card>
                  <CardContent className="space-y-2 py-4">
                    {data.sellThrough.map((row) => (
                      <div key={row.platform} className="flex items-center justify-between text-sm">
                        <span>{row.name}</span>
                        <span className="text-muted-foreground">
                          ${row.revenue.toFixed(0)} · {row.rate.toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {(data.missingCostCount > 0 || data.draftCount > 0 || data.relistCandidateCount > 0) && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">Needs a decision</h2>
                <Card>
                  <CardContent className="space-y-2 py-4 text-sm">
                    {data.missingCostCount > 0 && (
                      <Link href="/inventory?filter=missing-cost" className="block hover:underline">
                        {data.missingCostCount} item{data.missingCostCount === 1 ? "" : "s"} with no cost — profit can&apos;t be calculated
                      </Link>
                    )}
                    {data.draftCount > 0 && (
                      <Link href="/listings?tab=drafts" className="block hover:underline">
                        {data.draftCount} draft{data.draftCount === 1 ? "" : "s"}
                        {data.oldestDraftAgeDays !== null && data.oldestDraftAgeDays > 0
                          ? `, oldest started ${data.oldestDraftAgeDays} day${data.oldestDraftAgeDays === 1 ? "" : "s"} ago`
                          : ""}
                      </Link>
                    )}
                    {data.relistCandidateCount > 0 && (
                      <Link href="/automation" className="block hover:underline">
                        {data.relistCandidateCount} listing{data.relistCandidateCount === 1 ? "" : "s"} eligible to relist
                      </Link>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

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
        </div>
      </div>
    </Shell>
  );
}

function Delta({ pct, suffix }: { pct: number; suffix: string }) {
  return (
    <div className={cn("mt-1 inline-flex items-center gap-1 text-xs font-semibold", pct >= 0 ? "text-primary" : "text-muted-foreground")}>
      {pct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {pct >= 0 ? "+" : ""}
      {pct.toFixed(0)}% {suffix}
    </div>
  );
}
