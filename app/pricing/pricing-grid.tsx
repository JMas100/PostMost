"use client";

import { useState } from "react";
import { PLANS, formatPrice, Plan } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlanCheckoutButton } from "@/components/checkout-button";
import { Check } from "lucide-react";
import Link from "next/link";

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
      className={`rounded-2xl border p-6 shadow-sm flex flex-col bg-card ${
        isPro ? "border-primary ring-1 ring-primary/20" : "border-border"
      }`}
    >
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">{plan.name}</h3>
          {isPro && <Badge>Most popular</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{plan.description}</p>
      </div>
      <div className="mb-6">
        <span className="text-3xl font-bold">{formatPrice(price)}</span>
        <span className="text-muted-foreground">{period}</span>
        {isAnnual && plan.priceMonthly > 0 && (
          <p className="text-xs text-primary mt-1">
            2 months free (~{formatPrice(price / 12)}/mo)
          </p>
        )}
      </div>
      <ul className="mb-6 flex-1 space-y-2">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {current ? (
        <Button disabled className="w-full">
          Current plan
        </Button>
      ) : plan.id === "free" ? (
        <Link href="/settings/billing" className="w-full">
          <Button className="w-full">Get started</Button>
        </Link>
      ) : plan.id === "enterprise" ? (
        <Button disabled className="w-full">
          Contact sales
        </Button>
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
      <div className="mb-8 flex justify-center">
        <div className="inline-flex rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setInterval("month")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              interval === "month" ? "bg-background text-foreground shadow" : "text-muted-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setInterval("year")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              interval === "year" ? "bg-background text-foreground shadow" : "text-muted-foreground"
            }`}
          >
            Annual
          </button>
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} current={plan.id === currentPlanId} interval={interval} />
        ))}
      </div>
    </>
  );
}
