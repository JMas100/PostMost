"use client";

import { motion } from "framer-motion";
import { reveal } from "@/components/marketing/motion-primitives";

const TIERS = [
  { value: "12", label: "listings", padding: 24, numeral: 34, fill: 12, fillColor: "#C9CFD6", dark: false },
  { value: "184", label: "listings", padding: 28, numeral: 40, fill: 34, fillColor: "#8b949e", dark: false },
  { value: "1,842", label: "listings", padding: 32, numeral: 46, fill: 66, fillColor: "#15181C", dark: false },
  { value: "10,000+", label: "listings", padding: 36, numeral: 52, fill: 100, fillColor: "#B6F34A", dark: true },
];

export function ScaleProgression() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={reveal}
      className="bg-[#F7F8FA] py-32"
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-[80px]">
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
          <h2 className="font-display text-[46px] font-bold leading-[1.05] tracking-[-0.03em] text-[#090B0D] sm:text-[48px]">
            Start small.
            <br />
            Scale without starting over.
          </h2>
          <p className="max-w-[480px] text-[17px] leading-relaxed text-[#68727D]">
            Whether you&apos;re selling a few items a month or running a full-time resale
            operation, PostMost grows with your workflow.
          </p>
        </div>

        <div className="mt-14 grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier, i) => (
            <div
              key={tier.value}
              className="rounded-[12px]"
              style={{
                padding: tier.padding,
                backgroundColor: tier.dark ? "#090B0D" : "white",
                border: tier.dark ? "none" : "1px solid #E5E7EB",
              }}
            >
              <p
                className="font-display font-bold tracking-[-0.02em]"
                style={{ fontSize: tier.numeral, color: tier.dark ? "#B6F34A" : "#090B0D" }}
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
