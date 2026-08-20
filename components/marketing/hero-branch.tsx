"use client";

import { motion } from "framer-motion";
import { PLATFORMS } from "@/lib/marketplaces/platforms";
import { PlatformMark } from "@/components/platform-logo";
import { Eyebrow, MarketingButton, PulseNode, useMountedReducedMotion } from "@/components/marketing/motion-primitives";

const CHIP_ORDER = ["ebay", "poshmark", "mercari", "depop", "etsy", "whatnot"] as const;
const CHIP_TOPS = [36, 118, 200, 280, 362, 444];
const CHIP_Y = [58, 140, 222, 302, 384, 466];

const LOOP = 9;

export function HeroBranch() {
  const reduceMotion = useMountedReducedMotion();

  const chips = CHIP_ORDER.map((id) => PLATFORMS.find((p) => p.id === id)).filter(
    (p): p is (typeof PLATFORMS)[number] => !!p
  );

  return (
    <section className="bg-[#F7F8FA] pb-[88px] pt-24">
      <div className="mx-auto grid max-w-[1280px] items-center gap-20 px-6 lg:grid-cols-[520px_1fr] lg:px-[80px]">
        {/* Copy column */}
        <div>
          <Eyebrow>The modern way to sell everywhere</Eyebrow>
          <h1 className="mt-6 font-display text-[56px] font-extrabold leading-[0.97] tracking-[-0.035em] text-[#090B0D] sm:text-[72px] lg:text-[80px]">
            Post once.
            <br />
            Sell most.
          </h1>
          <p className="mt-6 max-w-[460px] text-[20px] leading-relaxed text-[#68727D]">
            Create your listing once and publish it across every marketplace you sell
            on—all from one simple workflow.
          </p>
          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <MarketingButton href="/login" variant="primary" size={52}>
              Start for free
            </MarketingButton>
            <MarketingButton href="#how" variant="secondary" size={52} arrow={false}>
              See how it works
            </MarketingButton>
          </div>
          <p className="mt-4 text-[13.5px] text-[#68727D]">No credit card required.</p>
        </div>

        {/* Visual: ONE → MANY diagram */}
        <div className="relative mx-auto h-[420px] w-full max-w-[640px] lg:h-[520px]">
          <svg
            viewBox="0 0 640 520"
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            aria-hidden="true"
          >
            <path
              d="M258,262 L300,262"
              fill="none"
              stroke="#B6F34A"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="240"
              className={reduceMotion ? undefined : "motion-draw-path"}
              style={
                reduceMotion
                  ? { strokeDashoffset: 0 }
                  : ({ animationDuration: `${LOOP}s`, "--draw-dash": 240 } as React.CSSProperties)
              }
            />
            {CHIP_Y.map((y, i) => (
              <path
                key={y}
                d={`M362,262 C400,262 400,${y} 440,${y}`}
                fill="none"
                stroke="#B6F34A"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="240"
                className={reduceMotion ? undefined : "motion-draw-path"}
                style={
                  reduceMotion
                    ? { strokeDashoffset: 0 }
                    : ({
                        animationDuration: `${LOOP}s`,
                        animationDelay: `${i * 0.1}s`,
                        "--draw-dash": 240,
                      } as React.CSSProperties)
                }
              />
            ))}
          </svg>

          {/* Listing card */}
          <motion.div
            className="absolute left-0 top-[118px] w-[258px] rounded-[12px] border border-[#E5E7EB] bg-white shadow-[0_10px_40px_rgba(9,11,13,.07)]"
            initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
            animate={
              reduceMotion
                ? { opacity: 1, y: 0 }
                : { opacity: [0, 0, 1, 1, 0], y: [14, 14, 0, 0, 14] }
            }
            transition={
              reduceMotion
                ? undefined
                : { duration: LOOP, repeat: Infinity, ease: "easeInOut", times: [0, 0.02, 0.1, 0.97, 1] }
            }
          >
            <div
              className="h-[132px] rounded-t-[12px]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(135deg, #F1F3F6 0 10px, #EAEDF1 10px 20px)",
              }}
            />
            <div className="p-4">
              <p className="font-heading text-[16px] font-bold text-[#090B0D]">Nike Air Max 90</p>
              <p className="mt-1 text-[13px] text-[#68727D]">Men&apos;s · Size 10</p>
              <p className="mt-2 font-heading text-[22px] font-bold text-[#090B0D]">$129.00</p>
              <div className="relative mt-3 h-[34px]">
                <motion.div
                  className="absolute inset-0 flex items-center gap-1.5 rounded-full bg-[#F7F8FA] px-3 text-[12px] font-medium text-[#68727D]"
                  animate={reduceMotion ? { opacity: 0 } : { opacity: [0, 1, 1, 0] }}
                  transition={
                    reduceMotion
                      ? undefined
                      : { duration: LOOP, repeat: Infinity, ease: "easeInOut", times: [0.1, 0.15, 0.54, 0.61] }
                  }
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
                  Ready to publish
                </motion.div>
                <motion.div
                  className="absolute inset-0 flex items-center gap-1.5 rounded-full bg-[#090B0D] px-3 text-[12px] font-medium text-[#B6F34A]"
                  animate={reduceMotion ? { opacity: 1 } : { opacity: [0, 0, 1, 1, 0] }}
                  transition={
                    reduceMotion
                      ? undefined
                      : { duration: LOOP, repeat: Infinity, ease: "easeInOut", times: [0.58, 0.61, 0.66, 0.94, 0.97] }
                  }
                >
                  ✓ Published everywhere
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Center hub */}
          <div className="absolute left-[300px] top-[232px]">
            <PulseNode reduceMotion={reduceMotion} duration={LOOP} />
          </div>

          {/* Marketplace chips */}
          {chips.map((platform, i) => (
            <motion.div
              key={platform.id}
              className="absolute flex h-11 w-[196px] items-center gap-2.5 rounded-[10px] border border-[#E5E7EB] bg-white px-3"
              style={{ left: 440, top: CHIP_TOPS[i] }}
              initial={reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -14 }}
              animate={reduceMotion ? { opacity: 1, x: 0 } : { opacity: [0, 0, 1], x: [-14, -14, 0] }}
              transition={
                reduceMotion
                  ? undefined
                  : {
                      duration: LOOP,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.1,
                      times: [0, 0.21, 0.3],
                    }
              }
            >
              <span className="flex h-6 flex-1 items-center overflow-hidden">
                <PlatformMark platformId={platform.id} className="h-5 w-auto max-w-full overflow-visible whitespace-nowrap" />
              </span>
              <motion.span
                className="relative h-[18px] w-[18px] shrink-0 rounded-full"
                initial={{ backgroundColor: "transparent", borderColor: "#E5E7EB" }}
                animate={
                  reduceMotion
                    ? { backgroundColor: "#22C55E" }
                    : {
                        backgroundColor: ["transparent", "transparent", "#22C55E"],
                        scale: [0.5, 0.5, 1],
                      }
                }
                transition={
                  reduceMotion
                    ? undefined
                    : {
                        duration: LOOP,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.1,
                        times: [0, 0.46, 0.55],
                      }
                }
                style={{ border: reduceMotion ? "none" : "1.5px solid #E5E7EB" }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
