"use client";

import { motion } from "framer-motion";
import { reveal, useMountedReducedMotion } from "@/components/marketing/motion-primitives";

const STEPS = [
  "Item sells on eBay",
  "PostMost detects the sale",
  "Inventory updated",
  "Other listings updated",
];

const COLUMNS = [
  { title: "Delist", body: "Sold on one platform? Removed everywhere else automatically." },
  { title: "Relist", body: "Bring stale inventory back to the top with one click." },
  { title: "Update", body: "Edit price, description, or photos and push the change everywhere." },
  { title: "Sync", body: "Stock levels and status stay consistent across every marketplace." },
];

function Connector({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <svg width="52" height="12" viewBox="0 0 52 12" className="hidden shrink-0 self-center sm:block" aria-hidden="true">
      <path
        d="M0,6 L52,6"
        stroke="#B6F34A"
        strokeWidth="2"
        strokeDasharray="6 8"
        className={reduceMotion ? undefined : "motion-marching-ants"}
      />
    </svg>
  );
}

export function AutomationFlow() {
  const reduceMotion = useMountedReducedMotion();
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={reveal}
      className="bg-white py-32"
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-[80px]">
        <h2 className="font-display text-[46px] font-bold leading-[1.05] tracking-[-0.03em] text-[#090B0D] sm:text-[48px]">
          Post it. Then let PostMost work.
        </h2>
        <p className="mt-5 max-w-[520px] text-[19px] leading-relaxed text-[#68727D]">
          You shouldn&apos;t have to babysit your inventory.
        </p>

        <div className="mt-14 rounded-[16px] bg-[#090B0D] px-8 py-11 sm:px-10">
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-stretch">
            {STEPS.map((step, i) => (
              <motion.div
                key={`${step}-${reduceMotion}`}
                className="flex min-h-[104px] flex-1 flex-col justify-center gap-1.5 rounded-[10px] border bg-[#15181C] px-4 py-3"
                animate={
                  reduceMotion
                    ? { borderColor: "#B6F34A", opacity: 1 }
                    : { borderColor: ["#24282D", "#B6F34A", "#24282D"], opacity: [0.35, 1, 0.35] }
                }
                transition={
                  reduceMotion
                    ? undefined
                    : { duration: 6, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }
                }
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#68727D]">
                  STEP {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[14px] font-medium text-white">{step}</span>
              </motion.div>
            ))}
            <Connector reduceMotion={reduceMotion} />
            <div className="flex min-h-[104px] w-full shrink-0 items-center justify-center rounded-[10px] bg-[#B6F34A] px-4 py-3 text-[15px] font-semibold text-[#090B0D] sm:w-[150px]">
              You&apos;re done.
            </div>
          </div>

          <div className="mt-9 grid gap-8 border-t border-[#24282D] pt-9 sm:grid-cols-2 lg:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="text-[15px] font-semibold text-white">{col.title}</p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[#68727D]">{col.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
