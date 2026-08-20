"use client";

import { motion } from "framer-motion";
import { LogoMark } from "@/components/logo";
import { reveal } from "@/components/marketing/motion-primitives";

const TRADITIONAL_ROWS = [
  "Create listing",
  "Copy photos",
  "Copy title",
  "Copy description",
  "Set price",
  "Choose category",
  "Repeat",
  "Repeat",
  "Repeat",
];

const REPEAT_COLORS = ["#68727D", "#8b949e", "#aab2ba"];

export function ProblemCompare() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={reveal}
      className="bg-[#F7F8FA] py-[120px]"
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-[80px]">
        <h2 className="max-w-[760px] font-display text-[46px] font-bold leading-[1.05] tracking-[-0.03em] text-[#090B0D] sm:text-[48px]">
          Selling everywhere shouldn&apos;t mean doing everything twice.
        </h2>
        <p className="mt-5 max-w-[620px] text-[19px] leading-relaxed text-[#68727D]">
          Every marketplace has its own forms, categories, requirements, and workflows.
          PostMost turns all of that repetition into one streamlined process.
        </p>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[16px] bg-white p-8 shadow-[0_4px_24px_-8px_rgba(9,11,13,.08)]">
            <p className="mb-5 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#68727D]">Traditional</p>
            <div className="flex flex-col gap-2">
              {TRADITIONAL_ROWS.map((row, i) => {
                const repeatIndex = i - (TRADITIONAL_ROWS.length - 3);
                const color = repeatIndex >= 0 ? REPEAT_COLORS[repeatIndex] : "#090B0D";
                return (
                  <div
                    key={`${row}-${i}`}
                    className="flex h-[38px] items-center rounded-[8px] border border-[#E5E7EB] bg-[#F7F8FA] px-4 text-[14px] font-medium"
                    style={{ color }}
                  >
                    {row}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[16px] border border-[#24282D] bg-[#090B0D] p-8">
            <p className="mb-5 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#68727D]">PostMost</p>
            <div className="flex flex-col gap-3.5">
              <div className="flex h-14 items-center rounded-[10px] bg-[#15181C] px-4 text-[15px] font-semibold text-white">
                Create once
              </div>
              <div className="flex h-14 items-center gap-2 rounded-[10px] bg-[#15181C] px-4 text-[15px] font-semibold text-white">
                <LogoMark className="h-[18px] w-[22px]" />
                PostMost
              </div>
              <div className="flex h-14 items-center rounded-[10px] bg-[#B6F34A] px-4 text-[15px] font-semibold text-[#090B0D]">
                Publish everywhere
              </div>
            </div>
            <p className="mt-5 text-[14px] text-[#68727D]">
              Three steps instead of nine, however many marketplaces you sell on.
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
