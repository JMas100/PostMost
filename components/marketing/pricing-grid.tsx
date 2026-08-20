"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { PLANS, formatPrice, getPlan } from "@/lib/plans";
import { reveal } from "@/components/marketing/motion-primitives";
import { cn } from "@/lib/utils";

const LIMITS: Record<string, string[]> = {
  free: [
    `${getPlan("free").listingsPerMonth} new listings/mo`,
    `${getPlan("free").activeInventoryLimit} active items`,
    `${getPlan("free").marketplaces} marketplaces`,
  ],
  launch: [
    `${getPlan("launch").listingsPerMonth}/mo`,
    `${getPlan("launch").activeInventoryLimit} active`,
    `${getPlan("launch").marketplaces} marketplaces`,
    `${getPlan("launch").aiCreditsPerMonth} AI credits`,
  ],
  grow: [
    `${getPlan("grow").listingsPerMonth}/mo`,
    `${getPlan("grow").activeInventoryLimit.toLocaleString()} active`,
    "10+ marketplaces",
    `${getPlan("grow").aiCreditsPerMonth} AI credits`,
  ],
  pro: [
    `${getPlan("pro").listingsPerMonth}/mo`,
    `${getPlan("pro").activeInventoryLimit.toLocaleString()} active`,
    "All marketplaces",
    `${getPlan("pro").aiCreditsPerMonth} AI credits`,
  ],
  scale: [
    `${getPlan("scale").listingsPerMonth.toLocaleString()} listings/mo`,
    "Unlimited active items",
    "All marketplaces",
    "Team accounts · API access",
  ],
  enterprise: [
    "Volume publishing",
    "Webhooks & API access",
    "Roles & permissions",
    "Priority support",
  ],
};

const CTA_LABEL: Record<string, string> = {
  free: "Start free",
  launch: "Choose Launch",
  grow: "Choose Grow",
  pro: "Start with Pro",
  scale: "Choose Scale",
  enterprise: "Talk to us",
};

export function PricingGrid() {
  return (
    <motion.section
      id="pricing"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={reveal}
      className="bg-white py-32"
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-[80px]">
        <h2 className="font-display text-[46px] font-bold leading-[1.05] tracking-[-0.03em] text-[#090B0D] sm:text-[48px]">
          Start free.
          <br />
          Upgrade when you grow.
        </h2>
        <p className="mt-5 text-[19px] leading-relaxed text-[#68727D]">
          Choose the plan that fits your resale business.
        </p>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const isPro = plan.id === "pro";
            const isEnterprise = plan.id === "enterprise";
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative rounded-[12px] border p-7",
                  isPro
                    ? "border-[1.5px] border-[#B6F34A] bg-[#090B0D] p-8 shadow-[0_10px_40px_rgba(9,11,13,.16)]"
                    : "border-[#E5E7EB] bg-white"
                )}
              >
                {isPro && (
                  <span className="absolute -top-[11px] left-7 rounded-[6px] bg-[#B6F34A] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#090B0D]">
                    Most Popular
                  </span>
                )}
                <p
                  className={cn(
                    "text-[12px] font-semibold uppercase tracking-[0.12em]",
                    isPro ? "text-[#B6F34A]" : "text-[#68727D]"
                  )}
                >
                  {plan.name}
                </p>
                <p
                  className={cn(
                    "mt-2 font-display font-bold tracking-[-0.02em]",
                    isPro ? "text-[44px] text-white" : "text-[40px] text-[#090B0D]"
                  )}
                >
                  {isEnterprise ? "Custom" : formatPrice(plan.priceMonthly)}
                  {!isEnterprise && (
                    <span className={cn("text-[15px] font-normal", isPro ? "text-[#68727D]" : "text-[#68727D]")}>/mo</span>
                  )}
                </p>
                <p className={cn("mt-2 text-[15px]", isPro ? "text-[#aab2ba]" : "text-[#68727D]")}>{plan.description}</p>

                <Link
                  href={isEnterprise ? "mailto:hello@postmost.co" : "/login"}
                  className={cn(
                    "mt-6 flex h-11 items-center justify-center rounded-[8px] text-[14.5px] font-semibold transition-colors",
                    isPro
                      ? "bg-[#B6F34A] text-[#090B0D] hover:bg-[#c6f96c]"
                      : isEnterprise
                        ? "border border-[#090B0D] text-[#090B0D] hover:bg-[#090B0D] hover:text-white"
                        : "border border-[#E5E7EB] text-[#090B0D] hover:border-[#68727D]"
                  )}
                >
                  {CTA_LABEL[plan.id]}
                </Link>

                <ul className={cn("mt-6 flex flex-col gap-1", isPro ? "text-[#aab2ba]" : "text-[#68727D]")}>
                  {LIMITS[plan.id]?.map((limit) => (
                    <li key={limit} className="text-[13.5px] leading-[1.9]">
                      {limit}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
