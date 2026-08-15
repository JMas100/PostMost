import { getBilling, updatePlan } from "@/lib/actions/billing";
import { formatPrice, PLANS } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { redirect } from "next/navigation";

function getLimitLabel(value: number, limit: number) {
  if (limit === -1) return "Unlimited";
  return `${value} / ${limit}`;
}

export default async function BillingPage() {
  const billing = await getBilling();
  if (!billing) redirect("/login");

  const { plan, usage } = billing;
  const resetAt = usage?.resetAt ? new Date(usage.resetAt) : new Date();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Billing & usage</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">{plan.name}</p>
          <p className="text-gray-600">{plan.description}</p>
          <p className="mt-2 text-2xl font-bold">{formatPrice(plan.priceMonthly)}<span className="text-base font-normal text-gray-500">/mo</span></p>
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
          <form action={updatePlan} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {PLANS.map((p) => (
                <label
                  key={p.id}
                  className={`cursor-pointer rounded-xl border p-4 transition hover:border-gray-400 ${p.id === plan.id ? "border-blue-600 bg-blue-50" : ""}`}
                >
                  <input
                    type="radio"
                    name="plan"
                    value={p.id}
                    defaultChecked={p.id === plan.id}
                    className="sr-only"
                  />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-sm text-gray-600">{formatPrice(p.priceMonthly)}/mo</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{p.description}</p>
                </label>
              ))}
            </div>
            <Button type="submit">Update plan</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
