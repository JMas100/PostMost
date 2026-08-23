import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Shell } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StockSyncToggle } from "@/components/automation/stock-sync-toggle";
import { RelistToggle } from "@/components/automation/relist-toggle";
import { getAutomationOverview } from "@/lib/actions/automation";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

function parseEventMessage(message: string) {
  const [rest, screenshotPart] = message.split(" | Screenshot: ");
  const [text, stepsPart] = rest.split(" | Steps: ");
  return {
    text,
    steps: stepsPart,
    screenshotUrl: screenshotPart,
  };
}

function TierBadge({ label }: { label: string }) {
  return (
    <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
      {label}
    </Badge>
  );
}

export default async function AutomationPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const overview = await getAutomationOverview();
  const hasActivity = overview.recentEvents.length > 0;

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automation</h1>
          <p className="text-muted-foreground">Set rules that relist, delist, price, and sync without you.</p>
        </div>

        {hasActivity && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Actions this month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.actionsThisMonth}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Listings pulled after a sale
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.listingsPulledAfterSale}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Double-sale exposure avoided</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${overview.amountSaved.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="space-y-3">
          <Card>
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">Delist everywhere when it sells</p>
                    <TierBadge label="ALL PLANS" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    When it sells anywhere, we remove it everywhere else — automatic, always on.
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-xs font-medium text-muted-foreground">Always on</span>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">Keep stock levels in step</p>
                    <TierBadge label="PRO" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {overview.stockSyncAvailable
                      ? overview.stockSyncCandidates > 0
                        ? `${overview.stockSyncCandidates} item${overview.stockSyncCandidates === 1 ? "" : "s"} at zero quantity would be delisted on the next run.`
                        : "When an item's quantity hits zero, delist it everywhere it's still live."
                      : "Upgrade to Pro to automatically delist sold-out items."}
                  </p>
                </div>
              </div>
              {overview.stockSyncAvailable ? (
                <StockSyncToggle initialEnabled={overview.stockSyncEnabled} />
              ) : (
                <span className="shrink-0 text-xs font-medium text-muted-foreground">Locked</span>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">Relist stale items</p>
                    <TierBadge label="GROW" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {overview.relistAvailable
                      ? overview.relistCandidates > 0
                        ? `${overview.relistCandidates} listing${overview.relistCandidates === 1 ? "" : "s"} posted over ${overview.relistStaleDays} days ago would be taken down and reposted fresh on the next run.`
                        : `Delists and reposts anything still live after ${overview.relistStaleDays} days. Removal is confirmed before we repost — if we can't confirm it came down, we leave it alone rather than risk a duplicate.`
                      : "Upgrade to Grow to automatically refresh stale listings."}
                  </p>
                  {overview.relistAvailable && (
                    <p className="mt-1 text-xs text-warning">
                      Solid on eBay and Etsy. Best-effort on the rest for now — those removal steps haven&apos;t
                      been verified against live accounts yet, so start with a listing you don&apos;t mind
                      watching closely.
                    </p>
                  )}
                </div>
              </div>
              {overview.relistAvailable ? (
                <RelistToggle initialEnabled={overview.relistEnabled} />
              ) : (
                <span className="shrink-0 text-xs font-medium text-muted-foreground">Locked</span>
              )}
            </CardContent>
          </Card>

          <Card className="opacity-60">
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">Drop the price on its own</p>
                  <TierBadge label="GROW" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Not yet available — none of our marketplace integrations currently support updating a live
                  listing&apos;s price.
                </p>
              </div>
              <span className="shrink-0 text-xs font-medium text-muted-foreground">Coming soon</span>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Recent automation activity</h2>
          {hasActivity ? (
            <Card>
              <CardContent className="divide-y p-0">
                {overview.recentEvents.map((event) => {
                  const { text, steps, screenshotUrl } = parseEventMessage(event.message);
                  return (
                    <div key={event.id} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                      <div className="flex items-start gap-2">
                        {!event.success && <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
                        <div>
                          <span className={cn(!event.success && "text-destructive")}>{text}</span>
                          {(steps || screenshotUrl) && (
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              {steps && <span className="max-w-md truncate" title={steps}>{steps}</span>}
                              {screenshotUrl && (
                                <Link href={screenshotUrl} target="_blank" className="font-medium text-primary hover:underline">
                                  View screenshot
                                </Link>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDistanceToNow(event.createdAt, { addSuffix: true })}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              variant="first-run"
              headline="Nothing to automate yet"
              body="Once you make your first sale, delisting-on-sale kicks in automatically and shows up here."
              primaryAction={{ label: "View listings", href: "/listings" }}
            />
          )}
        </div>
      </div>
    </Shell>
  );
}
