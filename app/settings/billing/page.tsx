import { getBilling } from "@/lib/actions/billing";
import { formatPrice } from "@/lib/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BillingPortalButton } from "@/components/billing-portal-button";
import { ChangePlan } from "./change-plan";
import { redirect } from "next/navigation";

function getLimitLabel(value: number, limit: number) {
  if (limit === -1) return "Unlimited";
  return `${value} / ${limit}`;
}

export default async function BillingPage({ searchParams }: { searchParams: { success?: string; canceled?: string } }) {
  const billing = await getBilling();
  if (!billing) redirect("/login");

  const { plan, usage, stripeCustomerId, subscriptionStatus } = billing;
  const resetAt = usage?.resetAt ? new Date(usage.resetAt) : new Date();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Billing & usage</h1>

      {searchParams?.success && (
        <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-700">
          Payment successful. Your subscription is being processed.
        </div>
      )}
      {searchParams?.canceled && (
        <div className="mb-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
          Checkout canceled. You can try again when you&apos;re ready.
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-semibold">{plan.name}</p>
              <p className="text-gray-600">{plan.description}</p>
              <p className="mt-2 text-2xl font-bold">
                {formatPrice(plan.priceMonthly)}
                <span className="text-base font-normal text-gray-500">/mo</span>
              </p>
              {subscriptionStatus && (
                <p className="mt-1 text-sm text-gray-500">Stripe status: {subscriptionStatus}</p>
              )}
            </div>
            {stripeCustomerId && <BillingPortalButton />}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Usage this month</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span>Listings</span>
              <span>{getLimitLabel(usage?.listingsThisMonth ?? 0, plan.listingsPerMonth)}</span>
            </div>
            {plan.listingsPerMonth > 0 && (
              <Progress value={Math.min(100, ((usage?.listingsThisMonth ?? 0) / plan.listingsPerMonth) * 100)} />
            )}
          </div>
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span>AI photo analyses</span>
              <span>{getLimitLabel(usage?.aiCreditsUsed ?? 0, plan.aiCreditsPerMonth)}</span>
            </div>
            {plan.aiCreditsPerMonth > 0 && (
              <Progress value={Math.min(100, ((usage?.aiCreditsUsed ?? 0) / plan.aiCreditsPerMonth) * 100)} />
            )}
          </div>
          <p className="text-xs text-gray-500">Resets {resetAt.toLocaleDateString()}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change plan</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePlan currentPlan={plan} />
        </CardContent>
      </Card>
    </main>
  );
}
