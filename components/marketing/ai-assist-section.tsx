"use client";

import { motion } from "framer-motion";
import { ImageIcon } from "lucide-react";
import { reveal } from "@/components/marketing/motion-primitives";

const ATTRIBUTES = [
  { label: "Category", value: "Sneakers" },
  { label: "Color", value: "Black / White" },
  { label: "Brand", value: "Nike" },
];

export function AiAssistSection() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={reveal}
      className="bg-[#F7F8FA] py-[72px] lg:py-[88px] xl:py-32"
    >
      <div className="mx-auto max-w-[1440px] px-6 lg:px-[48px] xl:px-[80px]">
        <h2 className="font-display text-[34px] font-bold leading-[1.08] tracking-[-0.03em] text-[#090B0D] lg:text-[40px] xl:text-[46px] xl:leading-[1.05]">
          Let PostMost do the busywork.
        </h2>
        <p className="mt-5 max-w-[560px] text-[17px] leading-relaxed text-[#68727D] lg:text-[18px] xl:text-[19px]">
          From photos to polished listings, PostMost can help turn the information you already
          have into marketplace-ready content.
        </p>

        <div className="mt-10 grid gap-8 lg:mt-14 xl:grid-cols-[300px_1fr]">
          <div className="flex flex-col gap-4">
            <div className="rounded-[16px] border border-[#E5E7EB] bg-white p-5">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#68727D]">Upload photo</p>
              <div
                className="flex h-[150px] items-center justify-center rounded-[10px]"
                style={{ backgroundImage: "repeating-linear-gradient(135deg, #F1F3F6 0 10px, #EAEDF1 10px 20px)" }}
              >
                <ImageIcon className="h-6 w-6 text-[#aab2ba]" />
              </div>
            </div>
            <div className="rounded-[16px] border border-[#E5E7EB] bg-white p-5 text-[13.5px] text-[#68727D]">
              PostMost reads the item—brand, category, color, and condition—straight from the
              photo.
            </div>
          </div>

          <div className="grid gap-0 overflow-hidden rounded-[16px] bg-white shadow-[0_4px_24px_-8px_rgba(9,11,13,.08)] lg:grid-cols-[1fr_260px]">
            <div className="p-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#68727D]">Suggested listing</p>
              <p className="mt-3 font-display text-[30px] font-bold text-[#090B0D]">Nike Air Max 90</p>
              <p className="mt-1 text-[14px] text-[#68727D]">Men&apos;s Size 10 · Excellent Condition</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {ATTRIBUTES.map((attr) => (
                  <span
                    key={attr.label}
                    className="rounded-full border border-[#E5E7EB] bg-[#F7F8FA] px-3 py-1.5 text-[12.5px] font-medium text-[#090B0D]"
                  >
                    {attr.label} <span className="text-[#68727D]">{attr.value}</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col justify-center gap-3 bg-[#090B0D] p-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#68727D]">Suggested price</p>
              <p className="font-display text-[34px] font-bold tracking-[-0.02em] text-[#B6F34A]">$129–$145</p>
              <p className="text-[13px] text-[#68727D]">Based on the details you provided.</p>
              <button
                type="button"
                className="mt-2 flex h-10 items-center justify-center rounded-[8px] bg-[#B6F34A] text-[13.5px] font-semibold text-[#090B0D] transition-colors hover:bg-[#c6f96c]"
              >
                Add to Listing
              </button>
              <p className="mt-1 text-[12.5px] text-[#68727D]">You approve every suggestion.</p>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
