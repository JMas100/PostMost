"use client";

import { motion } from "framer-motion";
import { Network, Code2, Activity, UserCog, LayoutGrid, BarChart3 } from "lucide-react";
import { reveal } from "@/components/marketing/motion-primitives";

const CARDS = [
  {
    icon: Network,
    title: "Publishing that keeps trying",
    body: "Cross-posts are queued and retried until they land. If a marketplace is slow or briefly down, your listing still goes up.",
  },
  {
    icon: Code2,
    title: "A real public API",
    body: "Create and manage listings programmatically. Wire PostMost into your own tools instead of being boxed into ours.",
  },
  {
    icon: Activity,
    title: "Inventory that hears you first",
    body: "Signed webhooks let your POS or warehouse tell PostMost the moment something sells. No polling, no delay.",
  },
  {
    icon: UserCog,
    title: "Team accounts with roles",
    body: "Bring on staff with admin or member access. One shared inventory, not one login passed around.",
  },
  {
    icon: LayoutGrid,
    title: "New marketplaces plug in",
    body: "Each marketplace is its own module, so adding the next one doesn't disturb the ones you already sell on.",
  },
  {
    icon: BarChart3,
    title: "Profit, not just revenue",
    body: "Track what you paid, what you sold it for, and what you actually kept—per item and per marketplace.",
  },
];

export function InfrastructureGrid() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={reveal}
      className="bg-[#090B0D] py-[72px] lg:py-32"
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-[80px]">
        <h2 className="max-w-[720px] font-display text-[32px] font-bold leading-[1.15] tracking-[-0.03em] text-white lg:text-[46px] lg:leading-[1.05]">
          Built like infrastructure, not a browser plugin.
        </h2>
        <p className="mt-5 max-w-[600px] text-[17px] leading-relaxed text-[#68727D] lg:text-[19px]">
          Most of this you&apos;ll never have to think about. It&apos;s the reason listings
          land, inventory stays honest, and a growing operation doesn&apos;t outgrow the tool.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3">
          {CARDS.map((card) => (
            <div key={card.title} className="rounded-[12px] border border-[#24282D] bg-[#0E1114] p-7">
              <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[8px] border border-[#24282D] bg-[#15181C]">
                <card.icon className="h-[17px] w-[17px] text-[#B6F34A]" strokeWidth={1.75} />
              </div>
              <p className="mt-4 text-[17px] font-semibold text-white">{card.title}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-[#68727D]">{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
