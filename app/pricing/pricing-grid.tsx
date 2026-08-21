"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANS, formatPrice, Plan } from "@/lib/plans";
import { PlanCheckoutButton } from "@/components/checkout-button";
import { cn } from "@/lib/utils";

const WHO_FOR: Record<string, string> = {
  pro: "For serious resellers.",
};

const ROWS: Record<string, [string, string, string, string]> = {
  free: ["25/mo", "50", "3", "10"],
  launch: ["100/mo", "500", "5", "50"],
  grow: ["300/mo", "2,000", "10+", "100"],
  pro: ["750/mo", "5,000", "All", "500"],
  scale: ["2,000/mo", "Unlimited", "All", "3 seats"],
  enterprise: ["Unlimited", "Unlimited", "All", "Unlimited"],
};

const ROW_LABELS = ["Listings", "Active inventory", "Marketplaces", "AI credits"];
const ROW_LABELS_SEATS = ["Listings", "Active inventory", "Marketplaces", "Team seats"];

const PROSE: Record<string, string> = {
  free: "Basic crosslisting, listing templates, manual delist/relist, basic analytics, and the mobile app.",
  launch: "Everything in Free, plus unlimited crossposting, inventory syncing, auto-delisting, and bulk editing.",
  grow: "Everything in Launch, plus AI listing generation, pricing suggestions, CSV import/export, and advanced analytics.",
  pro: "Everything in Grow, plus marketplace-specific optimization, automated pricing, and profit tracking.",
  scale: "Everything in Pro, plus team seats, API access, advanced automation, and dedicated onboarding.",
  enterprise: "Everything in Scale, plus unlimited seats, custom integrations, and a dedicated account manager.",
};

const MOBILE_ORDER = ["pro", "free", "launch", "grow", "scale", "enterprise"];

function annualMonthlyEquivalent(priceMonthly: number) {
  return Math.round((priceMonthly * 10) / 12);
}

function PriceBlock({ plan, isAnnual, big }: { plan: Plan; isAnnual: boolean; big: boolean }) {
  const isFree = plan.id === "free";
  const displayCents = isFree ? 0 : isAnnual ? annualMonthlyEquivalent(plan.priceMonthly) : plan.priceMonthly;
  const subLine = isFree
    ? "Free forever"
    : isAnnual
      ? `${formatPrice(plan.priceMonthly * 10)} billed yearly`
      : "Billed monthly";

  return (
    <div>
      <p className={cn("font-display font-bold tracking-[-0.025em]", big ? "text-[46px] text-white" : "text-[34px] text-[#090B0D] xl:text-[42px]")}>
        {formatPrice(displayCents)}
        <span className={cn("text-[15px] font-normal", big ? "text-[#68727D]" : "text-[#68727D]")}>/mo</span>
      </p>
      <p className={cn("mt-1 text-[12.5px]", big ? "text-[#68727D]" : "text-[#68727D]")}>{subLine}</p>
    </div>
  );
}

function PlanRows({ plan, isPro }: { plan: Plan; isPro: boolean }) {
  const labels = plan.id === "scale" || plan.id === "enterprise" ? ROW_LABELS_SEATS : ROW_LABELS;
  const values = ROWS[plan.id] ?? ["—", "—", "—", "—"];
  return (
    <ul className={cn("mt-6 flex flex-col gap-2 border-t pt-6", isPro ? "border-[#24282D]" : "border-[#E5E7EB]")}>
      {labels.map((label, i) => (
        <li key={label} className="flex items-center justify-between text-[13.5px]">
          <span className={isPro ? "text-[#8b949e]" : "text-[#68727D]"}>{label}</span>
          <span className={cn("font-semibold", isPro ? "text-white" : "text-[#15181C]")}>{values[i]}</span>
        </li>
      ))}
    </ul>
  );
}

function PlanButton({ plan, isPro, interval }: { plan: Plan; isPro: boolean; interval: "month" | "year" }) {
  const isFree = plan.id === "free";
  const isEnterprise = plan.id === "enterprise";
  const base = "flex h-[46px] items-center justify-center rounded-[8px] text-[14.5px] font-semibold transition-colors";

  if (isEnterprise) {
    return (
      <Link
        href="#contact"
        className={cn(base, "border border-[#090B0D] text-[#090B0D] hover:bg-[#090B0D] hover:text-white")}
      >
        Talk to Sales
      </Link>
    );
  }
  if (isFree) {
    return (
      <Link href="/login" className={cn(base, "border border-[#E5E7EB] text-[#090B0D] hover:border-[#68727D]")}>
        Start free
      </Link>
    );
  }
  return (
    <PlanCheckoutButton
      planId={plan.id}
      interval={interval}
      buttonClassName={cn(
        "h-[46px] rounded-[8px] text-[14.5px] font-semibold",
        isPro
          ? "h-[48px] border-transparent bg-[#B6F34A] text-[#090B0D] hover:bg-[#c6f96c]"
          : "border border-[#E5E7EB] bg-transparent text-[#090B0D] hover:border-[#68727D] hover:bg-transparent"
      )}
    >
      Choose {plan.name}
    </PlanCheckoutButton>
  );
}

export function PricingGrid({ currentPlanId }: { currentPlanId: string }) {
  const [interval, setInterval] = useState<"month" | "year">("month");
  const isAnnual = interval === "year";
  const mobilePlans = MOBILE_ORDER.map((id) => PLANS.find((p) => p.id === id)).filter((p): p is Plan => !!p);

  return (
    <section className="bg-white py-[72px] lg:py-[88px] xl:py-32">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-[48px] xl:px-[80px]">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-[42px] font-extrabold leading-[1.03] tracking-[-0.035em] text-[#090B0D] xl:text-[64px]">
              Grow into your plan.
            </h1>
            <p className="mt-4 max-w-[520px] text-[17px] leading-relaxed text-[#68727D] xl:text-[20px]">
              Start free. Upgrade when PostMost becomes part of your business.
            </p>
          </div>

          <div className="shrink-0">
            <div className="inline-flex rounded-[10px] border border-[#E5E7EB] bg-white p-1">
              <button
                type="button"
                onClick={() => setInterval("month")}
                className={cn(
                  "flex h-10 items-center rounded-[7px] px-4 text-[14px] font-semibold transition-colors",
                  !isAnnual ? "bg-[#090B0D] text-white" : "text-[#68727D]"
                )}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setInterval("year")}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-[7px] px-4 text-[14px] font-semibold transition-colors",
                  isAnnual ? "bg-[#090B0D] text-white" : "text-[#68727D]"
                )}
              >
                Annual
                <span className="rounded-[5px] bg-[#B6F34A] px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#090B0D]">
                  Save 2 months
                </span>
              </button>
            </div>
            <p className="mt-2 text-right text-[13px] text-[#68727D]">Cancel anytime. No card required to start.</p>
          </div>
        </div>

        <p aria-live="polite" className="sr-only">
          {isAnnual ? "Showing annual pricing, billed yearly." : "Showing monthly pricing."}
        </p>

        {/* Mobile: Pro first, then stacked */}
        <div className="mt-10 flex flex-col gap-4 lg:hidden">
          {mobilePlans.map((plan) => {
            const isPro = plan.id === "pro";
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative rounded-[12px] border p-6",
                  isPro ? "border-[1.5px] border-[#B6F34A] bg-[#090B0D] shadow-[0_10px_40px_rgba(9,11,13,.16)]" : "border-[#E5E7EB] bg-white"
                )}
              >
                {isPro && (
                  <span className="absolute -top-[11px] left-[22px] rounded-[6px] bg-[#B6F34A] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#090B0D]">
                    Most Popular
                  </span>
                )}
                <p className={cn("text-[12px] font-semibold uppercase tracking-[0.12em]", isPro ? "text-[#B6F34A]" : "text-[#68727D]")}>
                  {plan.name}
                </p>
                <p className={cn("mt-1 text-[15px]", isPro ? "text-white" : "text-[#15181C]")}>{WHO_FOR[plan.id] ?? plan.description}</p>
                <div className="mt-3">
                  <PriceBlock plan={plan} isAnnual={isAnnual} big={isPro} />
                </div>
                <div className="mt-5">
                  <PlanButton plan={plan} isPro={isPro} interval={interval} />
                </div>
                {currentPlanId === plan.id && (
                  <p className="mt-3 text-center text-[12.5px] font-medium text-[#68727D]">Current plan</p>
                )}
                <PlanRows plan={plan} isPro={isPro} />
                <p className={cn("mt-5 text-[13px] leading-[1.7]", isPro ? "text-[#8b949e]" : "text-[#68727D]")}>{PROSE[plan.id]}</p>
              </div>
            );
          })}
        </div>

        {/* Desktop / tablet: 3x2 grid */}
        <div className="mt-14 hidden gap-[14px] lg:grid lg:grid-cols-3 xl:gap-4">
          {PLANS.map((plan) => {
            const isPro = plan.id === "pro";
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-[12px] border p-6 xl:p-7",
                  isPro
                    ? "border-[1.5px] border-[#B6F34A] bg-[#090B0D] shadow-[0_10px_40px_rgba(9,11,13,.16)] xl:p-8"
                    : "items-start border-[#E5E7EB] bg-white"
                )}
              >
                {isPro && (
                  <span className="absolute -top-[11px] left-7 rounded-[6px] bg-[#B6F34A] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#090B0D]">
                    Most Popular
                  </span>
                )}
                <p className={cn("text-[12px] font-semibold uppercase tracking-[0.12em]", isPro ? "text-[#B6F34A]" : "text-[#68727D]")}>
                  {plan.name}
                </p>
                <p className={cn("mt-1 text-[15px]", isPro ? "text-white" : "text-[#15181C]")}>{WHO_FOR[plan.id] ?? plan.description}</p>
                <div className="mt-3">
                  <PriceBlock plan={plan} isAnnual={isAnnual} big={isPro} />
                </div>
                <div className="mt-5">
                  <PlanButton plan={plan} isPro={isPro} interval={interval} />
                </div>
                {currentPlanId === plan.id && (
                  <p className="mt-3 text-center text-[12.5px] font-medium text-[#68727D]">Current plan</p>
                )}
                <PlanRows plan={plan} isPro={isPro} />
                <p className={cn("mt-5 text-[13px] leading-[1.7]", isPro ? "text-[#8b949e]" : "text-[#68727D]")}>{PROSE[plan.id]}</p>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-[12.5px] text-[#68727D]">Prices in USD. Annual plans are billed yearly and save two months.</p>
      </div>
    </section>
  );
}
