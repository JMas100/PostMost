"use client";

import { motion } from "framer-motion";
import { PlatformMark } from "@/components/platform-logo";
import { getPlatform } from "@/lib/marketplaces/platforms";
import { reveal } from "@/components/marketing/motion-primitives";

const STATS = [
  { label: "Sales", value: "$12,482", delta: "+18.4%", tone: "success" as const },
  { label: "Active Listings", value: "1,284", delta: "+82 this week", tone: "success" as const },
  { label: "Sold", value: "143", delta: "+12%", tone: "success" as const },
  { label: "Attention", value: "7", delta: "Needs review", tone: "warning" as const },
];

const HEALTH = [
  { id: "ebay", status: "Connected", ok: true },
  { id: "poshmark", status: "Connected", ok: true },
  { id: "mercari", status: "Connected", ok: true },
  { id: "depop", status: "Connected", ok: true },
  { id: "etsy", status: "Needs attention", ok: false },
];

const ACTIVITY = [
  { item: "Nike Air Max 90", event: "Published to 6 marketplaces", lime: false, time: "2m ago" },
  { item: "Vintage Levi's 501", event: "Sold on eBay", lime: true, time: "18m ago" },
  { item: "Jordan 1 Retro", event: "Price updated", lime: false, time: "1h ago" },
];

export function ManageDashboard() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={reveal}
      className="bg-[#F7F8FA] py-32"
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-[80px]">
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#68727D]">03 — MANAGE</p>
        <h2 className="mt-4 font-display text-[46px] font-bold leading-[1.05] tracking-[-0.03em] text-[#090B0D] sm:text-[48px]">
          One inventory. Every marketplace.
        </h2>
        <p className="mt-5 max-w-[560px] text-[19px] leading-relaxed text-[#68727D]">
          Keep your listings, inventory, orders, and marketplace activity organized from one
          place.
        </p>

        <div className="mt-14 overflow-hidden rounded-[16px] border border-[#24282D] bg-[#090B0D] shadow-[0_20px_60px_rgba(9,11,13,.14)]">
          <div className="flex h-14 items-center gap-6 border-b border-[#24282D] px-6">
            {["Overview", "Listings", "Inventory", "Orders", "Analytics"].map((tab, i) => (
              <span key={tab} className={`text-[13px] ${i === 0 ? "font-semibold text-white" : "text-[#68727D]"}`}>
                {tab}
              </span>
            ))}
            <span className="ml-auto flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#B6F34A] text-[13px] font-bold text-[#090B0D]">
              J
            </span>
          </div>

          <div className="p-7">
            <p className="font-display text-[28px] font-bold tracking-[-0.02em] text-white">Good morning, Joe.</p>
            <p className="mt-1 text-[14px] text-[#68727D]">Here&apos;s what&apos;s happening with your business.</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[12px] border p-5"
                  style={{
                    backgroundColor: "#0E1114",
                    borderColor: stat.tone === "warning" ? "#F59E0B33" : "#24282D",
                  }}
                >
                  <p className="text-[12.5px] font-medium text-[#68727D]">{stat.label}</p>
                  <p
                    className="mt-1.5 font-display text-[26px] font-bold tracking-[-0.02em]"
                    style={{ color: stat.tone === "warning" ? "#F59E0B" : "white" }}
                  >
                    {stat.value}
                  </p>
                  <p
                    className="mt-1 text-[12px] font-medium"
                    style={{ color: stat.tone === "warning" ? "#F59E0B" : "#22C55E" }}
                  >
                    {stat.delta}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[380px_1fr]">
              <div className="rounded-[12px] border border-[#24282D] bg-[#0E1114] p-5">
                <p className="mb-4 text-[13px] font-semibold text-white">Marketplace Health</p>
                <div className="flex flex-col gap-3">
                  {HEALTH.map((row) => (
                    <div key={row.id} className="flex items-center gap-3">
                      <span className="flex h-[22px] w-auto min-w-[22px] shrink-0 items-center justify-center rounded-[5px] bg-white px-1">
                        <PlatformMark platformId={row.id} className="h-3 w-auto overflow-visible whitespace-nowrap" />
                      </span>
                      <span className="flex-1 text-[13px] text-white">{getPlatform(row.id)?.name}</span>
                      <span
                        className="flex items-center gap-1.5 text-[12px] font-medium"
                        style={{ color: row.ok ? "#22C55E" : "#F59E0B" }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: row.ok ? "#22C55E" : "#F59E0B" }} />
                        {row.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[12px] border border-[#24282D] bg-[#0E1114] p-5">
                <p className="mb-4 text-[13px] font-semibold text-white">Recent Activity</p>
                <div className="flex flex-col gap-3">
                  {ACTIVITY.map((row) => (
                    <div key={row.item} className="flex items-center gap-3">
                      <div
                        className="h-9 w-9 shrink-0 rounded-[6px]"
                        style={{ backgroundImage: "repeating-linear-gradient(135deg, #15181C 0 6px, #1b1f24 6px 12px)" }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-white">{row.item}</p>
                        <p className="truncate text-[12px]" style={{ color: row.lime ? "#B6F34A" : "#68727D" }}>
                          {row.event}
                        </p>
                      </div>
                      <span className="w-[88px] shrink-0 text-right text-[12px] text-[#68727D]">{row.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
