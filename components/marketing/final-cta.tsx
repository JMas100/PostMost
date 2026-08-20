"use client";

import { motion } from "framer-motion";
import { LogoMark } from "@/components/logo";
import { MarketingButton, reveal } from "@/components/marketing/motion-primitives";

export function FinalCta() {
  return (
    <motion.section
      id="start"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={reveal}
      className="relative overflow-hidden bg-[#090B0D] py-[140px]"
    >
      <LogoMark
        className="pointer-events-none absolute top-1/2 hidden -translate-y-1/2 opacity-[0.07] lg:block"
        style={{ right: -60, width: 620, height: 500 }}
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-[1280px] px-6 lg:px-[80px]">
        <h2 className="max-w-[600px] font-display text-[52px] font-extrabold leading-[1.02] tracking-[-0.035em] text-white sm:text-[64px]">
          Ready to sell everywhere?
        </h2>
        <p className="mt-5 max-w-[520px] text-[19px] leading-relaxed text-[#68727D]">
          Create your first listing and see how much simpler reselling can be.
        </p>
        <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <MarketingButton href="/login" variant="primary" size={54}>
            Start for free
          </MarketingButton>
          <span className="text-[14px] text-[#68727D]">No credit card required.</span>
        </div>
      </div>
    </motion.section>
  );
}
