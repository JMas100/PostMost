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
import { PLANS } from "@/lib/plans";
import { Shell } from "@/components/sidebar";
import { Progress } from "@/components/ui/progress";
import { TrackOnMount } from "@/components/track-on-mount";
import { ActivationChecklist } from "@/components/activation-checklist";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { StatValue } from "@/components/stat-value";
import { PageHeader } from "@/components/page-header";
import { PlatformLogo } from "@/components/platform-logo";
import { ListingDeleteButton } from "@/components/listing-delete-button";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Package2, Plus } from "lucide-react";
import { PlatformTileRow } from "@/components/platform-tile-row";

/** The relist-stale cron runs once daily at 4:13 UTC (vercel.json) -- this is the next
 *  occurrence of that, expressed relatively so it's honest without exposing a UTC clock time
 *  that wouldn't mean anything relative to the viewer's own timezone. */
function nextRelistRun(): Date {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 4, 13, 0));
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

export default async function DashboardPage(props: { searchParams: Promise<{ period?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const { workspaceUserId, role } = await requireWorkspace();
  const canDelete = role !== "MEMBER";

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

  const listingsPct = usage.listingsLimit > 0 ? (usage.listingsThisMonth / usage.listingsLimit) * 100 : 0;
  const listingsLeft = usage.listingsLimit === -1 ? null : Math.max(0, usage.listingsLimit - usage.listingsThisMonth);
  const daysToGo = Math.max(0, Math.ceil((usage.resetAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
  const nextPlan = PLANS[PLANS.findIndex((p) => p.id === usage.plan.id) + 1];

  return (
    <Shell>
      <TrackOnMount action={trackDashboardViewed} />
      <div className="space-y-6">
        <PageHeader
          title="Overview"
          description={`${todayLabel}.${alertSubhead}`}
          actions={
            <>
              <div className="flex overflow-hidden rounded-md border bg-muted">
                <Link
                  href="/dashboard?period=30d"
                  className={cn("px-3 py-1.5 text-sm font-medium", period === "30d" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  30 days
                </Link>
                <Link
                  href="/dashboard?period=all"
                  className={cn("px-3 py-1.5 text-sm font-medium", period === "all" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  All time
                </Link>
              </div>
              <Link href="/listings/new" className={buttonVariants()}>
                <Plus className="mr-1 h-4 w-4" />
                Create listing
              </Link>
            </>
          }
        />

        <ActivationChecklist state={activationState} />

        {data.alerts.map((alert, i) => (
          <Card key={alert.id} className="border-warning/40">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                <div>
                  <p className="font-medium">{alert.title}</p>
                  <p className="text-sm text-muted-foreground">{alert.body}</p>
                </div>
              </div>
              <Link href={alert.actionHref} className={buttonVariants({ variant: i === 0 ? "default" : "outline", size: "sm" })}>
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
              <div className="tnum font-heading text-3xl font-bold text-foreground">
                <StatValue value={data.revenue} prefix="$" />
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
              <div className="flex items-baseline gap-2">
                <div className="tnum font-heading text-3xl font-bold text-foreground">
                  <StatValue value={data.profit} prefix="$" />
                </div>
                {data.revenue > 0 && (
                  <span className="text-sm font-semibold text-success">{Math.round((data.profit / data.revenue) * 100)}%</span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">after fees, shipping and cost</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Package2 className="h-4 w-4" /> Live listings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="tnum font-heading text-3xl font-bold text-foreground">
                  <StatValue value={data.liveListingCount} />
                </div>
                <span className="text-sm text-muted-foreground">on {data.liveSlots} marketplace slots</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{data.slotsPerListing.toFixed(1)} marketplaces per item</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" /> Sold
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="tnum font-heading text-3xl font-bold text-foreground">
                  <StatValue value={data.soldCount} />
                </div>
                <span className="text-sm text-muted-foreground">items</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.avgDaysToSell !== null ? `avg ${data.avgDaysToSell.toFixed(0)} days to sell` : "no sales yet"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
                <CardDescription>Everything, newest first</CardDescription>
              </CardHeader>
              <CardContent className={data.activity.length === 0 ? "p-0" : "px-4 py-5"}>
                {data.activity.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">
                    Nothing yet — sales, publishes, and automation will show up here.
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {data.activity.map((entry, i) => (
                      <div
                        key={entry.id}
                        className={cn(
                          "relative flex gap-3 border-l pl-4",
                          i < data.activity.length - 1 ? "pb-4" : ""
                        )}
                      >
                        <span
                          className={cn(
                            "absolute -left-[4.5px] top-1 h-[9px] w-[9px] rounded-full",
                            entry.success ? "bg-success" : "bg-warning"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">{entry.text}</p>
                          {entry.detail && <p className="mt-0.5 text-xs text-muted-foreground">{entry.detail}</p>}
                        </div>
                        <div className="flex shrink-0 items-center">
                          {entry.actionHref ? (
                            <Link href={entry.actionHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
                              {entry.actionLabel}
                            </Link>
                          ) : (
                            <span className="text-xs whitespace-nowrap text-muted-foreground">
                              {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Recent listings</CardTitle>
                <Link href="/listings" className="text-xs font-medium text-primary hover:underline">
                  All {data.liveListingCount + data.soldCount}
                </Link>
              </CardHeader>
              <CardContent className={recentListings.length === 0 ? undefined : "space-y-2"}>
                {recentListings.length === 0 ? (
                  <EmptyState
                    variant="first-run"
                    headline="No listings yet"
                    body="Post an item once and it goes live everywhere you sell."
                    primaryAction={{ label: "Create your first listing", href: "/listings/new" }}
                  />
                ) : (
                  recentListings.map((listing) => {
                    const failed = listing.platformListings.find((pl) => pl.status === "FAILED");
                    return (
                      <div key={listing.id} className="flex items-center gap-3 rounded-md transition-colors hover:bg-muted/50">
                        <Link href={`/listings/${listing.id}`} className="flex min-w-0 flex-1 items-center gap-4 py-2">
                          {listing.photos[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={listing.photos[0].url} alt="" className="h-12 w-12 rounded-md object-cover" />
                          ) : (
                            <div className="h-12 w-12 rounded-md bg-muted" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 font-medium">{listing.title}</p>
                            <p className="tnum text-sm text-muted-foreground">{formatCurrency(listing.price)}</p>
                          </div>
                          {listing.status === "SOLD" ? (
                            <Badge variant="live" className="shrink-0">
                              Sold
                            </Badge>
                          ) : failed ? (
                            <Badge variant="warningTint" className="shrink-0">
                              Needs attention
                            </Badge>
                          ) : (
                            <PlatformTileRow platformListings={listing.platformListings} max={3} />
                          )}
                        </Link>
                        {canDelete && <ListingDeleteButton id={listing.id} title={listing.title} variant="ghost" size="icon" />}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {(data.connections.length > 0 || data.unconnected.length > 0) && (
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle>Marketplaces</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {data.connections.length} of {data.connections.length + data.unconnected.length}
                  </span>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {data.connections.map((c) => (
                      <div key={c.id} className={cn("flex items-center justify-between gap-3 px-4 py-3", c.needsAttention && "bg-warning/5")}>
                        <div className="flex items-center gap-2.5">
                          <PlatformLogo platform={c.platform} size={24} onDark showLabel={false} />
                          <div>
                            <p className="text-sm font-medium">{c.name}</p>
                            <p className={cn("text-xs", c.needsAttention ? "text-warning" : "text-muted-foreground")}>
                              {c.needsAttention ? c.attentionReason : `${c.live} live · ${c.sold} sold`}
                            </p>
                          </div>
                        </div>
                        {c.needsAttention ? (
                          <Link href="/marketplaces" className="text-xs font-medium text-primary hover:underline">
                            Fix
                          </Link>
                        ) : (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                        )}
                      </div>
                    ))}
                  </div>
                  {data.unconnected.length > 0 && (
                    <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
                      <div className="flex items-center gap-1">
                        {data.unconnected.slice(0, 4).map((u) => (
                          // onDark forces the compact white-tile treatment regardless of the
                          // card's actual (light) background -- without it, platforms with no
                          // logo asset (Poshmark, Facebook, Craigslist...) fall back to full
                          // brand-name text, which doesn't fit this compressed row at all.
                          <PlatformLogo key={u.platform} platform={u.platform} size={22} onDark showLabel={false} className="opacity-40" />
                        ))}
                      </div>
                      <Link href="/marketplaces" className="text-xs font-medium text-primary hover:underline">
                        Connect {data.unconnected.length} more
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {data.sellThrough.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Where sales come from</CardTitle>
                  <CardDescription>Percentages are sell-through</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 py-4">
                  {data.sellThrough.map((row) => (
                    <div key={row.platform} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span>{row.name}</span>
                        <span className="tnum text-muted-foreground">
                          {formatCurrency(row.revenue)} · {row.rate.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, row.rate)}%` }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Plan usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{usage.plan.name} plan</span>
                  {listingsPct >= 80 && (
                    <Badge variant={listingsPct >= 100 ? "error" : "warning"}>
                      {Math.round(listingsPct)}%
                    </Badge>
                  )}
                </div>

                {usage.listingsLimit === -1 ? (
                  <p className="mt-3 text-xs text-muted-foreground">Unlimited listings this month.</p>
                ) : (
                  <>
                    <div className="mt-3">
                      <div className="mb-1.5 flex justify-between text-xs">
                        <span className="text-muted-foreground">Listings this month</span>
                        <span className="tnum">{usage.listingsThisMonth} / {usage.listingsLimit}</span>
                      </div>
                      <Progress
                        value={Math.min(100, listingsPct)}
                        indicatorClassName={listingsPct >= 100 ? "bg-destructive" : listingsPct >= 80 ? "bg-warning" : undefined}
                      />
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      {listingsLeft} left, {daysToGo} day{daysToGo === 1 ? "" : "s"} to go.
                      {nextPlan && ` ${nextPlan.name} raises it to ${nextPlan.listingsPerMonth === -1 ? "unlimited" : nextPlan.listingsPerMonth}.`}
                    </p>
                    {nextPlan && (
                      <Link href="/settings/billing#change-plan" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3 w-full")}>
                        See {nextPlan.name}
                      </Link>
                    )}
                  </>
                )}

                <Link href="/settings/billing" className="mt-3 block text-xs font-medium text-primary hover:underline">
                  View billing
                </Link>
              </CardContent>
            </Card>

            {(data.missingCostCount > 0 || data.draftCount > 0 || data.relistCandidateCount > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle>Needs a decision</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
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
                      {data.relistCandidateCount} item{data.relistCandidateCount === 1 ? "" : "s"} relist{" "}
                      {formatDistanceToNow(nextRelistRun(), { addSuffix: true })}
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Delta({ pct, suffix }: { pct: number; suffix: string }) {
  return (
    <div className={cn("mt-1 inline-flex items-center gap-1 text-xs font-semibold", pct >= 0 ? "text-success" : "text-destructive")}>
      {pct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {pct >= 0 ? "+" : ""}
      {pct.toFixed(0)}% {suffix}
    </div>
  );
}
