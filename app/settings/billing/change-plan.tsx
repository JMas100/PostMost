"use client";

import { useState } from "react";
import { PLANS, formatPrice, Plan } from "@/lib/plans";
import { PlanCheckoutButton } from "@/components/checkout-button";
import { cn } from "@/lib/utils";

export function ChangePlan({ currentPlan }: { currentPlan: Plan }) {
  const [interval, setInterval] = useState<"month" | "year">("month");

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <div className="inline-flex rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setInterval("month")}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition",
              interval === "month" ? "bg-background text-foreground shadow" : "text-muted-foreground"
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setInterval("year")}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition",
              interval === "year" ? "bg-background text-foreground shadow" : "text-muted-foreground"
            )}
          >
            Annual
          </button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLANS.map((p) => {
          const annualPrice = p.priceMonthly * 10;
          const price = interval === "year" ? annualPrice : p.priceMonthly;
          return (
            <div
              key={p.id}
              className={cn(
                "rounded-xl border p-4 transition",
                p.id === currentPlan.id && "border-primary bg-primary/10"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{p.name}</span>
                <span className="text-sm text-muted-foreground">
                  {formatPrice(price)}
                  {interval === "year" ? "/yr" : "/mo"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
              {interval === "year" && p.priceMonthly > 0 && (
                <p className="mt-1 text-xs text-primary">
                  2 months free (~{formatPrice(price / 12)}/mo)
                </p>
              )}
              {p.id === currentPlan.id ? (
                <p className="mt-4 text-sm font-medium text-primary">Current plan</p>
              ) : p.id === "free" ? (
                <p className="mt-4 text-sm text-muted-foreground">Free plan active by default</p>
              ) : p.id === "enterprise" ? (
                <p className="mt-4 text-sm text-muted-foreground">Contact sales</p>
              ) : (
                <PlanCheckoutButton planId={p.id} interval={interval} className="mt-4">
                  Choose {p.name}
                </PlanCheckoutButton>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
