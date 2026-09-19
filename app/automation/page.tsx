import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Shell } from "@/components/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StockSyncToggle } from "@/components/automation/stock-sync-toggle";
import { RelistToggle } from "@/components/automation/relist-toggle";
import { getAutomationOverview } from "@/lib/actions/automation";
import { PlatformLogo } from "@/components/platform-logo";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, RefreshCw, TrendingDown, Repeat, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { STOCK_SYNC_RULE, DELIST_ON_SALE_RULE, RELIST_STALE_RULE, nextRelistRun } from "@/lib/automation/rule-types";
import { RelistConfigPills } from "@/components/automation/relist-config-pills";

const RULE_LABEL: Record<string, { done: string; failed: string }> = {
  [DELIST_ON_SALE_RULE]: { done: "Delisted", failed: "Couldn't delist" },
  [RELIST_STALE_RULE]: { done: "Relisted", failed: "Couldn't relist" },
  [STOCK_SYNC_RULE]: { done: "Synced", failed: "Couldn't sync" },
};

function EventStatusPill({ ruleType, success }: { ruleType: string; success: boolean }) {
  const label = RULE_LABEL[ruleType];
  if (!label) return null;
  // Solid fill is reserved for the one urgent state on this page too -- a failed automated action
  // is exactly that, everything else (a successful delist/relist/sync) is tinted.
  return success ? (
    <Badge variant="live" className="shrink-0">
      {label.done}
    </Badge>
  ) : (
    <Badge variant="warning" className="shrink-0">
      {label.failed}
    </Badge>
  );
}

function parseEventMessage(message: string) {
  const [rest, screenshotPart] = message.split(" | Screenshot: ");
  const [text, stepsPart] = rest.split(" | Steps: ");
  return {
    text,
    steps: stepsPart,
    screenshotUrl: screenshotPart,
  };
}

/** "ALL PLANS" is a neutral fact, not an upsell -- it stays gray. GROW/PRO are lime-tinted tags
 *  precisely because they're doing upsell work; using the same treatment for both erases that
 *  distinction. */
function TierBadge({ label }: { label: "ALL PLANS" | "GROW" | "PRO" }) {
  if (label === "ALL PLANS") return <Badge variant="secondary">{label}</Badge>;
  return <Badge variant="live">{label}</Badge>;
}

function RuleIcon({ icon: Icon, tone }: { icon: LucideIcon; tone: "success" | "primary" | "muted" }) {
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
        tone === "success" && "bg-success/10 text-success",
        tone === "primary" && "bg-primary/10 text-primary",
        tone === "muted" && "bg-muted text-muted-foreground"
      )}
    >
      <Icon className="h-4.5 w-4.5" />
    </span>
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
        <PageHeader
          title="Automation"
          description="Set rules that relist, delist, price, and sync without you."
          actions={
            <Link href="#activity" className={buttonVariants({ variant: "outline" })}>
              Activity log
            </Link>
          }
        />

        {hasActivity && (
          <Card>
            <CardContent className="grid gap-6 py-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Actions this month</p>
                <div className="tnum text-2xl font-bold">{overview.actionsThisMonth}</div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Listings pulled after a sale</p>
                <div className="tnum text-2xl font-bold">{overview.listingsPulledAfterSale}</div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Double-sale exposure avoided</p>
                <div className="tnum text-2xl font-bold text-success">{formatCurrency(overview.amountSaved)}</div>
              </div>
              <p className="col-span-full text-xs text-muted-foreground">Every action is reversible from the activity log.</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          <Card>
            <CardContent className="space-y-3 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <RuleIcon icon={CheckCircle2} tone="success" />
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
              </div>
              {overview.delistPlatforms.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pl-12">
                  {overview.delistPlatforms.map((p) => (
                    <span
                      key={p.id}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs",
                        p.needsExtension ? "border-dashed text-warning" : "text-muted-foreground"
                      )}
                    >
                      <PlatformLogo platform={p.id} size={16} onDark showLabel={false} />
                      {p.name}
                      {p.needsExtension && " — needs the extension running"}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                <RuleIcon icon={RefreshCw} tone="primary" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">Relist stale items</p>
                    <TierBadge label="GROW" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {overview.relistAvailable
                      ? "Delists and reposts anything still live with no sale. Removal is confirmed before we repost — if we can't confirm it came down, we leave it alone rather than risk a duplicate."
                      : "Upgrade to Grow to automatically refresh stale listings."}
                  </p>
                  {overview.relistAvailable && (
                    <div className="mt-2">
                      <RelistConfigPills
                        staleDays={overview.relistStaleDays}
                        maxPerDay={overview.relistMaxPerDay}
                        staleDaysOptions={overview.relistStaleDaysOptions}
                        maxPerDayOptions={overview.relistMaxPerDayOptions}
                      />
                    </div>
                  )}
                  {overview.relistAvailable && overview.relistCandidates > 0 && (
                    <div className="mt-2 flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-2.5 text-xs">
                      <span>
                        Next run {formatDistanceToNow(nextRelistRun(), { addSuffix: true })} ·{" "}
                        <span className="font-medium text-foreground">
                          {overview.relistCandidates} item{overview.relistCandidates === 1 ? "" : "s"} qualif{overview.relistCandidates === 1 ? "ies" : "y"}
                        </span>
                      </span>
                      <Link href="/listings" className="shrink-0 font-medium text-primary hover:underline">
                        View {overview.relistCandidates}
                      </Link>
                    </div>
                  )}
                  {overview.relistAvailable && (
                    <p className="mt-2 text-xs text-warning">
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
              <div className="flex items-center gap-3">
                <RuleIcon icon={TrendingDown} tone="muted" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">Drop the price on its own</p>
                    <TierBadge label="GROW" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Not yet available as an automatic rule — but you can already push a price change to every live
                    marketplace at once from Listings&apos; bulk Edit price.
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-xs font-medium text-muted-foreground">Coming soon</span>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                <RuleIcon icon={Repeat} tone="muted" />
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
        </div>

        <div id="activity" className="space-y-3 scroll-mt-6">
          <h2 className="text-sm font-medium text-muted-foreground">Recent automation activity — last 24 hours</h2>
          {hasActivity ? (
            <Card>
              <CardContent className="divide-y p-0">
                {overview.recentEvents.map((event) => {
                  const { text, steps, screenshotUrl } = parseEventMessage(event.message);
                  return (
                    <div key={event.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-4 px-4 py-3 text-sm">
                      <div>
                        <span>{text}</span>
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
                      <EventStatusPill ruleType={event.ruleType} success={event.success} />
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
