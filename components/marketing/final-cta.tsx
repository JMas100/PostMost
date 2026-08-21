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
      className="relative overflow-hidden bg-[#090B0D] py-[88px] lg:py-[140px]"
    >
      <LogoMark
        className="pointer-events-none absolute opacity-[0.07] lg:hidden"
        style={{ right: -40, bottom: -20, width: 400, height: 323 }}
        aria-hidden="true"
      />
      <LogoMark
        className="pointer-events-none absolute top-1/2 hidden -translate-y-1/2 opacity-[0.07] lg:block"
        style={{ right: -60, width: 620, height: 500 }}
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-[1280px] px-6 lg:px-[80px]">
        <h2 className="max-w-[600px] font-display text-[42px] font-extrabold leading-[1.03] tracking-[-0.035em] text-white lg:text-[64px] lg:leading-[1.02]">
          Ready to sell everywhere?
        </h2>
        <p className="mt-5 max-w-[520px] text-[17px] leading-relaxed text-[#68727D] lg:text-[19px]">
          Create your first listing and see how much simpler reselling can be.
        </p>
        <div className="mt-9 flex flex-col items-center gap-4 lg:flex-row lg:items-center">
          <MarketingButton href="/login" variant="primary" size={54} fullWidth className="lg:w-auto">
            Start for free
          </MarketingButton>
          <span className="text-[14px] text-[#68727D]">No credit card required.</span>
        </div>
      </div>
    </motion.section>
  );
}
