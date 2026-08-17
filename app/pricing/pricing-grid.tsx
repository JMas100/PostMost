"use client";

import { useState } from "react";
import { PLANS, formatPrice, Plan } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlanCheckoutButton } from "@/components/checkout-button";
import { Check } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

function PlanCard({
  plan,
  current,
  interval,
}: {
  plan: Plan;
  current: boolean;
  interval: "month" | "year";
}) {
  const annualPrice = plan.priceMonthly * 10;
  const isAnnual = interval === "year";
  const price = isAnnual ? annualPrice : plan.priceMonthly;
  const period = isAnnual ? "/yr" : "/mo";
  const isPro = plan.id === "pro";

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md",
        isPro
          ? "border-primary ring-2 ring-primary/20 bg-gradient-to-b from-primary/[0.05] to-card"
          : "border-border"
      )}
    >
      {isPro && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="px-3 py-1 text-sm font-semibold shadow-sm">Most popular</Badge>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-xl font-semibold">{plan.name}</h3>
        <p className="text-sm text-muted-foreground">{plan.description}</p>
      </div>

      <div className="mb-6">
        <span className="text-3xl font-bold tracking-tight">{formatPrice(price)}</span>
        <span className="text-sm text-muted-foreground">{period}</span>
        {isAnnual && plan.priceMonthly > 0 && (
          <p className="mt-1 text-xs font-medium text-primary">
            2 months free (~{formatPrice(price / 12)}/mo)
          </p>
        )}
      </div>

      <ul className="mb-6 flex-1 space-y-2">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      {current ? (
        <div className="w-full rounded-lg bg-muted px-4 py-2 text-center text-sm font-medium text-muted-foreground">
          Current plan
        </div>
      ) : plan.id === "free" ? (
        <Link href="/settings/billing" className="w-full">
          <Button className="w-full">Get started</Button>
        </Link>
      ) : plan.id === "enterprise" ? (
        <div className="w-full rounded-lg border px-4 py-2 text-center text-sm font-medium text-muted-foreground">
          Contact sales
        </div>
      ) : (
        <PlanCheckoutButton planId={plan.id} interval={interval} className="w-full">
          Choose {plan.name}
        </PlanCheckoutButton>
      )}
    </div>
  );
}

export function PricingGrid({ currentPlanId }: { currentPlanId: string }) {
  const [interval, setInterval] = useState<"month" | "year">("month");

  return (
    <>
      <div className="mb-10 flex justify-center">
        <div className="inline-flex rounded-lg bg-muted p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setInterval("month")}
            className={cn(
              "rounded-md px-5 py-2 text-sm font-medium transition-all",
              interval === "month"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setInterval("year")}
            className={cn(
              "rounded-md px-5 py-2 text-sm font-medium transition-all",
              interval === "year"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Annual
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} current={plan.id === currentPlanId} interval={interval} />
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-muted-foreground">
        Prices in USD. Annual plans are billed yearly and save 2 months.
      </p>
    </>
  );
}
