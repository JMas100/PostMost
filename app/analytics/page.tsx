import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { format } from "date-fns";
import { authOptions } from "@/lib/auth";
import { Shell } from "@/components/sidebar";
import { getAnalytics } from "@/lib/actions/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "SUCCESS" || status === "POSTED" || status === "SOLD"
      ? "default"
      : status === "FAILED"
      ? "destructive"
      : "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const data = await getAnalytics();
  const maxListingsPerDay = Math.max(...data.listingsByDay.map((d) => d.count), 1);
  const maxCategoryCount = Math.max(...data.categoryBreakdown.map((c) => c.count), 1);

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Track your listings and cross-post performance.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total listings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.totalListings}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Published</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.publishedListings}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Drafts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.draftListings}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Platform posts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.totalPlatformListings}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${data.financials.totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total profit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${data.financials.totalProfit.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">{data.financials.profitMargin.toFixed(1)}% margin</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Listings over the last 30 days</CardTitle>
            </CardHeader>
            <CardContent>
              {data.listingsByDay.length > 0 ? (
                <div className="flex h-40 items-end gap-1">
                  {data.listingsByDay.map((day) => (
                    <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
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
                <p className="text-muted-foreground">No listing activity in the last 30 days.</p>
              )}
            </CardContent>
          </Card>

          <Card>
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

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
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

          <Card>
            <CardHeader>
              <CardTitle>Platform breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {data.platformBreakdown.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Platform</th>
                        <th className="pb-2 font-medium">Total</th>
                        <th className="pb-2 font-medium">Posted</th>
                        <th className="pb-2 font-medium">Failed</th>
                        <th className="pb-2 font-medium">Sold</th>
                        <th className="pb-2 font-medium">Revenue</th>
                        <th className="pb-2 font-medium">Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.platformBreakdown.map((platform) => (
                        <tr key={platform.platform} className="border-b last:border-0">
                          <td className="py-2 font-medium">{platform.platform}</td>
                          <td className="py-2">{platform.total}</td>
                          <td className="py-2">{platform.posted}</td>
                          <td className="py-2 text-destructive">{platform.failed}</td>
                          <td className="py-2">{platform.sold}</td>
                          <td className="py-2">${platform.revenue.toFixed(2)}</td>
                          <td className="py-2">${platform.profit.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground">No platform posts yet.</p>
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
