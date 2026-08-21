"use client";

import { motion } from "framer-motion";
import { Check, Plus } from "lucide-react";
import { reveal } from "@/components/marketing/motion-primitives";

const BULLETS = [
  "One universal listing form formatted per marketplace on publish",
  "Drag and drop photos once, reuse them everywhere",
  "Category, condition, and attribute mapping handled for you",
];

export function CreateSection() {
  return (
    <motion.section
      id="features"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={reveal}
      className="bg-white py-[72px] lg:py-[88px] xl:py-32"
    >
      <div className="mx-auto grid max-w-[1440px] items-center gap-10 px-6 lg:grid-cols-2 lg:gap-14 lg:px-[48px] xl:gap-[88px] xl:px-[80px]">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#68727D]">01 — CREATE</p>
          <h2 className="mt-4 font-display text-[34px] font-bold leading-[1.08] tracking-[-0.03em] text-[#090B0D] lg:text-[40px] xl:text-[46px] xl:leading-[1.05]">
            Create once.
          </h2>
          <p className="mt-5 max-w-[460px] text-[17px] leading-relaxed text-[#68727D] lg:text-[18px] xl:text-[19px]">
            Everything starts with one listing. Add your photos and details once, then let
            PostMost handle the repetitive work.
          </p>
          <ul className="mt-8 flex flex-col gap-4">
            {BULLETS.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3 text-[15.5px] text-[#090B0D]">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] bg-[#B6F34A]">
                  <Check className="h-3 w-3 text-[#090B0D]" />
                </span>
                {bullet}
              </li>
            ))}
          </ul>
        </div>

        <div className="overflow-hidden rounded-[16px] shadow-[0_4px_24px_-8px_rgba(9,11,13,.08)]">
          <div className="flex h-[46px] items-center justify-between bg-[#F7F8FA] px-5">
            <span className="text-[13.5px] font-semibold text-[#090B0D]">Listing editor</span>
            <span className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-[#68727D]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
              Draft saved
            </span>
          </div>
          <div className="bg-white p-6">
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="aspect-square rounded-[8px]"
                  style={{ backgroundImage: "repeating-linear-gradient(135deg, #F1F3F6 0 8px, #EAEDF1 8px 16px)" }}
                />
              ))}
              <div className="flex aspect-square items-center justify-center rounded-[8px] border border-dashed border-[#E5E7EB]">
                <Plus className="h-4 w-4 text-[#68727D]" />
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#68727D]">Title</p>
                <div className="h-10 rounded-[8px] border border-[#E5E7EB] bg-[#F7F8FA] px-3 py-2 text-[13.5px] text-[#090B0D]">
                  Nike Air Max 90
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#68727D]">Description</p>
                <div className="h-16 rounded-[8px] border border-[#E5E7EB] bg-[#F7F8FA] px-3 py-2 text-[13.5px] text-[#68727D]">
                  Excellent condition. Worn a handful of times, no visible flaws.
                </div>
              </div>
              <div className="hidden grid-cols-3 gap-2 lg:grid">
                {["Condition", "Price", "Shipping"].map((label) => (
                  <div key={label}>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#68727D]">{label}</p>
                    <div className="h-10 rounded-[8px] border border-[#E5E7EB] bg-[#F7F8FA] px-2 py-2 text-[13px] text-[#090B0D]">
                      —
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden items-center justify-between rounded-[8px] bg-[#F7F8FA] px-3 py-2.5 text-[13px] text-[#68727D] lg:flex">
                <span>
                  Suggested category: <span className="font-semibold text-[#090B0D]">Men&apos;s → Shoes → Sneakers</span>
                </span>
                <button
                  type="button"
                  className="shrink-0 rounded-[6px] bg-[#090B0D] px-2.5 py-1 text-[11.5px] font-semibold text-[#B6F34A]"
                >
                  Accept
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
