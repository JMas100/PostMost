"use client";

import { useState } from "react";
import { PLANS, formatPrice, Plan } from "@/lib/plans";
import { PlanCheckoutButton } from "@/components/checkout-button";

export function ChangePlan({ currentPlan }: { currentPlan: Plan }) {
  const [interval, setInterval] = useState<"month" | "year">("month");

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <div className="inline-flex rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setInterval("month")}
            className={`rounded-md px-3 py-1 text-sm font-medium transition ${
              interval === "month" ? "bg-white text-gray-900 shadow" : "text-gray-600"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setInterval("year")}
            className={`rounded-md px-3 py-1 text-sm font-medium transition ${
              interval === "year" ? "bg-white text-gray-900 shadow" : "text-gray-600"
            }`}
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
              className={`rounded-xl border p-4 transition ${p.id === currentPlan.id ? "border-blue-600 bg-blue-50" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{p.name}</span>
                <span className="text-sm text-gray-600">
                  {formatPrice(price)}
                  {interval === "year" ? "/yr" : "/mo"}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">{p.description}</p>
              {interval === "year" && p.priceMonthly > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  2 months free (~{formatPrice(price / 12)}/mo)
                </p>
              )}
              {p.id === currentPlan.id ? (
                <p className="mt-4 text-sm font-medium text-blue-600">Current plan</p>
              ) : p.id === "free" ? (
                <p className="mt-4 text-sm text-gray-500">Free plan active by default</p>
              ) : p.id === "enterprise" ? (
                <p className="mt-4 text-sm text-gray-500">Contact sales</p>
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
