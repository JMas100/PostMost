"use client";

import { motion } from "framer-motion";
import { Check, TriangleAlert } from "lucide-react";
import { PLATFORMS } from "@/lib/marketplaces/platforms";
import { reveal } from "@/components/marketing/motion-primitives";

const PUBLISHED = ["ebay", "poshmark", "mercari", "depop", "etsy"] as const;

export function PartialFailure() {
  const published = PUBLISHED.map((id) => PLATFORMS.find((p) => p.id === id)).filter(
    (p): p is (typeof PLATFORMS)[number] => !!p
  );

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={reveal}
      className="bg-[#F7F8FA] py-[72px] lg:py-[120px]"
    >
      <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-6 lg:grid-cols-[1fr_480px] lg:gap-20 lg:px-[80px]">
        <div>
          <h2 className="font-display text-[32px] font-bold leading-[1.15] tracking-[-0.03em] text-[#090B0D] lg:text-[42px] lg:leading-[1.1]">
            PostMost doesn&apos;t make you start over when one marketplace needs attention.
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-[#68727D] lg:text-[19px]">
            Marketplaces have their own rules, and sometimes one of them wants something extra.
            The five that went through stay published. You fix the one that didn&apos;t and it
            joins them.
          </p>
        </div>

        <div className="rounded-[16px] bg-white p-[26px] shadow-[0_4px_24px_-8px_rgba(9,11,13,.08)]">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[15px] font-semibold text-[#090B0D]">Publish results</p>
            <span className="rounded-full bg-[#FEF9EF] px-2.5 py-1 text-[12px] font-semibold text-[#B4740A]">
              5 of 6 published
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {published.map((platform) => (
              <div
                key={platform.id}
                className="flex h-11 items-center justify-between rounded-[8px] border border-[#E5E7EB] px-3 text-[13.5px] font-medium text-[#090B0D]"
              >
                {platform.name}
                <Check className="h-4 w-4 text-[#22C55E]" />
              </div>
            ))}
            <div className="rounded-[8px] border border-[#F59E0B] bg-[#FEF9EF] p-3.5">
              <div className="flex items-center justify-between text-[13.5px] font-medium text-[#090B0D]">
                Whatnot
                <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#B4740A]">
                  <TriangleAlert className="h-3.5 w-3.5" />
                  Needs attention
                </span>
              </div>
              <p className="mt-1.5 text-[12.5px] text-[#B4740A]">Category required for this item type.</p>
              <button
                type="button"
                className="mt-3 rounded-[6px] bg-[#090B0D] px-3 py-1.5 text-[12.5px] font-semibold text-[#B6F34A]"
              >
                Fix Listing
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
