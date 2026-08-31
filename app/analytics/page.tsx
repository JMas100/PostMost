import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { format } from "date-fns";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { Shell } from "@/components/sidebar";
import { getAnalytics } from "@/lib/actions/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/components/ui/button";
import { AlertCircle, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "SUCCESS" || status === "POSTED" || status === "SOLD"
      ? "default"
      : status === "FAILED"
      ? "destructive"
      : "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}

export default async function AnalyticsPage(
  props: {
    searchParams: Promise<{ range?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const range = searchParams.range === "7d" ? "7d" : "30d";
  const days = range === "7d" ? 7 : 30;
  const data = await getAnalytics(range);
  const maxListingsPerDay = Math.max(...data.listingsByDay.map((d) => d.count), 1);
  const maxCategoryCount = Math.max(...data.categoryBreakdown.map((c) => c.count), 1);

  return (
    <Shell>
      <div className="space-y-6">
        <PageHeader
          title="Analytics"
          description="Track your listings and cross-post performance."
          actions={
            <a href="/api/analytics/export" className={buttonVariants({ variant: "outline" })}>
              <Download className="h-4 w-4" />
              Export CSV
            </a>
          }
        />

        {data.failures.total > 0 && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
                <div>
                  <p className="font-medium">
                    {data.failures.total} platform post{data.failures.total === 1 ? "" : "s"} failed and need
                    {data.failures.total === 1 ? "s" : ""} attention
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {data.failures.listings.map((l) => l.title).join(", ")}
                    {data.failures.total > data.failures.listings.length ? ", and more" : ""}
                  </p>
                </div>
              </div>
              <Link href="/listings?tab=attention" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Review
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${data.financials.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">from {data.soldListings} sale{data.soldListings === 1 ? "" : "s"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${data.financials.totalProfit.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">{data.financials.profitMargin.toFixed(1)}% after fees, shipping and cost</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Published listings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.publishedListings}</div>
              <p className="text-xs text-muted-foreground">{data.draftListings} draft{data.draftListings === 1 ? "" : "s"} not counted</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cross-posts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.totalPlatformListings}</div>
              <p className="text-xs text-muted-foreground">
                {data.publishedListings > 0 ? (data.totalPlatformListings / data.publishedListings).toFixed(1) : "0"} per item
                {data.failures.total > 0 && <span className="text-destructive"> · {data.failures.total} failed and unresolved</span>}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid min-w-0 gap-6 lg:grid-cols-3">
          <Card className="min-w-0 lg:col-span-2">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <CardTitle className="min-w-0">Listings over the last {days} days</CardTitle>
              <div className="flex flex-none items-center gap-1 rounded-md border p-0.5 text-xs">
                {(["7d", "30d"] as const).map((r) => (
                  <Link
                    key={r}
                    href={`/analytics?range=${r}`}
                    className={cn(
                      "rounded-[5px] px-2 py-1 font-medium transition-colors",
                      range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {r === "7d" ? "7 days" : "30 days"}
                  </Link>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {data.listingsByDay.length > 0 ? (
                <div className="flex h-40 items-end gap-1">
                  {data.listingsByDay.map((day) => (
                    <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t bg-primary"
                        style={{ height: `${(day.count / maxListingsPerDay) * 100}%`, minHeight: day.count > 0 ? "4px" : "0" }}
                        title={`${day.count} on ${format(new Date(day.date), "MMM d")}`}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(day.date), "d")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No listing activity in the last {days} days.</p>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Plan usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{data.usage.plan.name}</span>
                  <span className="text-muted-foreground">
                    {data.usage.listingsLimit === -1 ? "Unlimited" : `${data.usage.listingsThisMonth} / ${data.usage.listingsLimit}`}
                  </span>
                </div>
                {data.usage.listingsLimit > 0 && (
                  <Progress value={Math.min((data.usage.listingsThisMonth / data.usage.listingsLimit) * 100, 100)} />
                )}
              </div>
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span>AI credits</span>
                  <span className="text-muted-foreground">
                    {data.usage.aiLimit === -1 ? "Unlimited" : `${data.usage.aiCreditsUsed} / ${data.usage.aiLimit}`}
                  </span>
                </div>
                {data.usage.aiLimit > 0 && (
                  <Progress value={Math.min((data.usage.aiCreditsUsed / data.usage.aiLimit) * 100, 100)} />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.categoryBreakdown.length > 0 ? (
                data.categoryBreakdown.map((category) => (
                  <div key={category.category} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{category.category}</span>
                      <span className="text-muted-foreground">{category.count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${(category.count / maxCategoryCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No published listings yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Marketplace performance</CardTitle>
              <p className="text-sm text-muted-foreground">
                Sorted by profit. This table is the answer to &quot;where should I post next?&quot;
              </p>
            </CardHeader>
            <CardContent>
              {data.platformBreakdown.some((p) => p.sold > 0) ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Platform</th>
                        <th className="pb-2 font-medium">Posted</th>
                        <th className="pb-2 font-medium">Sold</th>
                        <th className="pb-2 font-medium">Failed</th>
                        <th className="pb-2 font-medium">Revenue</th>
                        <th className="pb-2 font-medium">Profit</th>
                        <th className="pb-2 font-medium">Sell-through</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.platformBreakdown.map((platform) => (
                        <tr key={platform.platform} className="border-b last:border-0">
                          <td className="py-2 font-medium">{platform.platform}</td>
                          <td className="py-2">{platform.posted}</td>
                          <td className="py-2">{platform.sold}</td>
                          <td className={platform.failed > 0 ? "py-2 text-destructive" : "py-2"}>{platform.failed}</td>
                          <td className="py-2">${platform.revenue.toFixed(2)}</td>
                          <td className="py-2">${platform.profit.toFixed(2)}</td>
                          <td className="py-2">{platform.sellThrough.toFixed(0)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground">No sales yet — this table ranks marketplaces once something sells.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent cross-post jobs</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentJobs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Listing</th>
                      <th className="pb-2 font-medium">Platform</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentJobs.map((job) => (
                      <tr key={job.id} className="border-b last:border-0">
                        <td className="py-2">{job.listing?.title || "Untitled"}</td>
                        <td className="py-2">{job.platform}</td>
                        <td className="py-2">
                          <StatusBadge status={job.status} />
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {format(new Date(job.createdAt), "MMM d, h:mm a")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground">No cross-post jobs yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
