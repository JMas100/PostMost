import Link from "next/link";
import { getBilling } from "@/lib/actions/billing";
import { formatPrice, PLANS } from "@/lib/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BillingPortalButton } from "@/components/billing-portal-button";
import { buttonVariants } from "@/components/ui/button";
import { ChangePlan } from "./change-plan";
import { redirect } from "next/navigation";
import { Shell } from "@/components/sidebar";
import { AlertTriangle } from "lucide-react";

function getLimitLabel(value: number, limit: number) {
  if (limit === -1) return "Unlimited";
  return `${value} / ${limit}`;
}

function usagePct(value: number, limit: number) {
  if (limit <= 0) return 0;
  return (value / limit) * 100;
}

function indicatorColor(pct: number) {
  if (pct >= 100) return "bg-destructive";
  if (pct >= 80) return "bg-warning";
  return undefined;
}

export default async function BillingPage({ searchParams }: { searchParams: { success?: string; canceled?: string } }) {
  const billing = await getBilling();
  if (!billing) redirect("/login");

  const { plan, usage, stripeCustomerId, subscriptionStatus } = billing;
  const resetAt = usage?.resetAt ? new Date(usage.resetAt) : new Date();

  const meters = [
    { label: "listings", value: usage?.listingsThisMonth ?? 0, limit: plan.listingsPerMonth },
    { label: "AI photo analyses", value: usage?.aiCreditsUsed ?? 0, limit: plan.aiCreditsPerMonth },
    { label: "background removals", value: usage?.bgRemovalsUsed ?? 0, limit: plan.bgRemovalsPerMonth },
    { label: "studio-quality removals", value: usage?.studioBgRemovalsUsed ?? 0, limit: plan.studioBgRemovalsPerMonth },
  ];
  const closestToLimit = meters
    .filter((m) => m.limit > 0)
    .map((m) => ({ ...m, pct: usagePct(m.value, m.limit) }))
    .sort((a, b) => b.pct - a.pct)[0];
  const nextPlan = PLANS[PLANS.findIndex((p) => p.id === plan.id) + 1];
  const showUpgradePrompt = closestToLimit && closestToLimit.pct >= 80 && nextPlan;

  return (
    <Shell>
      <main className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & usage</h1>
          <p className="text-muted-foreground">Manage your plan and track usage.</p>
        </div>

        {searchParams?.success && (
          <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success">
            Payment successful. Your subscription is being processed.
          </div>
        )}
        {searchParams?.canceled && (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            Checkout canceled. You can try again when you&apos;re ready.
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Current plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-semibold">{plan.name}</p>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {formatPrice(plan.priceMonthly)}
                  <span className="text-base font-normal text-muted-foreground">/mo</span>
                </p>
                {subscriptionStatus && (
                  <p className="mt-1 text-sm text-muted-foreground">Stripe status: {subscriptionStatus}</p>
                )}
              </div>
              {stripeCustomerId && <BillingPortalButton />}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage this month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-muted-foreground">Listings</span>
                <span>{getLimitLabel(usage?.listingsThisMonth ?? 0, plan.listingsPerMonth)}</span>
              </div>
              {plan.listingsPerMonth > 0 && (
                <Progress
                  value={Math.min(100, usagePct(usage?.listingsThisMonth ?? 0, plan.listingsPerMonth))}
                  indicatorClassName={indicatorColor(usagePct(usage?.listingsThisMonth ?? 0, plan.listingsPerMonth))}
                />
              )}
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-muted-foreground">AI photo analyses</span>
                <span>{getLimitLabel(usage?.aiCreditsUsed ?? 0, plan.aiCreditsPerMonth)}</span>
              </div>
              {plan.aiCreditsPerMonth > 0 && (
                <Progress
                  value={Math.min(100, usagePct(usage?.aiCreditsUsed ?? 0, plan.aiCreditsPerMonth))}
                  indicatorClassName={indicatorColor(usagePct(usage?.aiCreditsUsed ?? 0, plan.aiCreditsPerMonth))}
                />
              )}
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-muted-foreground">Background removals</span>
                <span>{getLimitLabel(usage?.bgRemovalsUsed ?? 0, plan.bgRemovalsPerMonth)}</span>
              </div>
              {plan.bgRemovalsPerMonth > 0 && (
                <Progress
                  value={Math.min(100, usagePct(usage?.bgRemovalsUsed ?? 0, plan.bgRemovalsPerMonth))}
                  indicatorClassName={indicatorColor(usagePct(usage?.bgRemovalsUsed ?? 0, plan.bgRemovalsPerMonth))}
                />
              )}
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-muted-foreground">Studio-quality removals</span>
                <span>
                  {plan.studioBgRemovalsPerMonth === 0
                    ? "Not included"
                    : getLimitLabel(usage?.studioBgRemovalsUsed ?? 0, plan.studioBgRemovalsPerMonth)}
                </span>
              </div>
              {plan.studioBgRemovalsPerMonth > 0 && (
                <Progress
                  value={Math.min(100, usagePct(usage?.studioBgRemovalsUsed ?? 0, plan.studioBgRemovalsPerMonth))}
                  indicatorClassName={indicatorColor(usagePct(usage?.studioBgRemovalsUsed ?? 0, plan.studioBgRemovalsPerMonth))}
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground">Resets {resetAt.toLocaleDateString()}</p>
          </CardContent>
        </Card>

        {showUpgradePrompt && (
          <Card className="border-warning/40">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
                <div>
                  <p className="text-sm font-medium">
                    You&apos;re close to your {closestToLimit.label} limit ({closestToLimit.value} of{" "}
                    {closestToLimit.limit})
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Upgrade to {nextPlan.name} for more room.
                  </p>
                </div>
              </div>
              <Link href="#change-plan" className={buttonVariants({ variant: "outline" })}>
                View plans
              </Link>
            </CardContent>
          </Card>
        )}

        <Card id="change-plan">
          <CardHeader>
            <CardTitle>Change plan</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePlan currentPlan={plan} />
          </CardContent>
        </Card>
      </main>
    </Shell>
  );
}
