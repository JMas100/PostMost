"use client";

import { motion } from "framer-motion";
import { reveal } from "@/components/marketing/motion-primitives";
import { cn } from "@/lib/utils";

const TIERS = [
  { value: "12", label: "listings", padding: "p-4 lg:p-6", numeral: "text-[28px] lg:text-[30px] xl:text-[34px]", fill: 12, fillColor: "#C9CFD6", dark: false },
  { value: "184", label: "listings", padding: "p-[18px] lg:p-7", numeral: "text-[32px] lg:text-[34px] xl:text-[40px]", fill: 34, fillColor: "#8b949e", dark: false },
  { value: "1,842", label: "listings", padding: "p-5 lg:p-8", numeral: "text-[34px] lg:text-[38px] xl:text-[46px]", fill: 66, fillColor: "#15181C", dark: false },
  { value: "10,000+", label: "listings", padding: "p-6 lg:p-9", numeral: "text-[34px] lg:text-[42px] xl:text-[52px]", fill: 100, fillColor: "#B6F34A", dark: true },
];

export function ScaleProgression() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={reveal}
      className="bg-[#F7F8FA] py-[72px] lg:py-[88px] xl:py-32"
    >
      <div className="mx-auto max-w-[1440px] px-6 lg:px-[48px] xl:px-[80px]">
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
          <h2 className="font-display text-[32px] font-bold leading-[1.12] tracking-[-0.03em] text-[#090B0D] lg:text-[40px] xl:text-[46px] xl:leading-[1.05]">
            Start small.
            <br />
            Scale without starting over.
          </h2>
          <p className="max-w-[480px] text-[17px] leading-relaxed text-[#68727D]">
            Whether you&apos;re selling a few items a month or running a full-time resale
            operation, PostMost grows with your workflow.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 items-end gap-3 lg:mt-14 lg:grid-cols-4 lg:gap-4">
          {TIERS.map((tier, i) => (
            <div
              key={tier.value}
              className={cn("rounded-[12px]", tier.padding)}
              style={{
                backgroundColor: tier.dark ? "#090B0D" : "white",
                border: tier.dark ? "none" : "1px solid #E5E7EB",
              }}
            >
              <p
                className={cn("font-display font-bold tracking-[-0.02em]", tier.numeral)}
                style={{ color: tier.dark ? "#B6F34A" : "#090B0D" }}
              >
                {tier.value}
              </p>
              <p className="mt-1 text-[13px]" style={{ color: tier.dark ? "#68727D" : "#68727D" }}>
                {tier.label}
              </p>
              <div className="mt-4 h-[5px] w-full overflow-hidden rounded-[3px] bg-[#E5E7EB]/60">
                <motion.div
                  className="h-full origin-left rounded-[3px]"
                  style={{ backgroundColor: tier.fillColor, width: `${tier.fill}%` }}
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: i * 0.15, ease: "easeOut" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
