"use client";

import { motion } from "framer-motion";
import { PLATFORMS } from "@/lib/marketplaces/platforms";
import { PlatformLogo } from "@/components/platform-logo";
import {
  Eyebrow,
  GrowBar,
  MarketingButton,
  PulseNode,
  useMountedReducedMotion,
} from "@/components/marketing/motion-primitives";

const CHIP_ORDER = ["ebay", "poshmark", "mercari", "depop", "etsy", "whatnot"] as const;
const CHIP_TOPS = [36, 118, 200, 280, 362, 444];
const CHIP_Y = [58, 140, 222, 302, 384, 466];
const MOBILE_CHIP_TOPS = [76, 138, 200, 262, 324, 386];
const MOBILE_STUB_TOPS = [101, 163, 225, 287, 349, 411];
const TABLET_CHIP_TOPS = [12, 88, 164, 240, 316, 392];
const TABLET_CHIP_Y = [34, 110, 186, 262, 338, 414];

const LOOP = 9;

function ListingCardStatus({ reduceMotion, preTimes, postTimes }: { reduceMotion: boolean; preTimes: number[]; postTimes: number[] }) {
  return (
    <div className="relative mt-3 h-[34px]">
      <motion.div
        key={`pre-${reduceMotion}`}
        className="absolute inset-0 flex items-center gap-1.5 rounded-full bg-[#F7F8FA] px-3 text-[12px] font-medium text-[#68727D]"
        animate={reduceMotion ? { opacity: 0 } : { opacity: [0, 1, 1, 0] }}
        transition={reduceMotion ? undefined : { duration: LOOP, repeat: Infinity, ease: "easeInOut", times: preTimes }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
        Ready to publish
      </motion.div>
      <motion.div
        key={`post-${reduceMotion}`}
        className="absolute inset-0 flex items-center gap-1.5 rounded-full bg-[#090B0D] px-3 text-[12px] font-medium text-[#B6F34A]"
        animate={reduceMotion ? { opacity: 1 } : { opacity: [0, 0, 1, 1, 0] }}
        transition={reduceMotion ? undefined : { duration: LOOP, repeat: Infinity, ease: "easeInOut", times: postTimes }}
      >
        ✓ Published everywhere
      </motion.div>
    </div>
  );
}

export function HeroBranch() {
  const reduceMotion = useMountedReducedMotion();

  const chips = CHIP_ORDER.map((id) => PLATFORMS.find((p) => p.id === id)).filter(
    (p): p is (typeof PLATFORMS)[number] => !!p
  );

  return (
    <section className="bg-[#F7F8FA] pb-12 pt-9 lg:pb-16 lg:pt-[72px] min-[1400px]:pb-[88px] min-[1400px]:pt-24">
      <div className="mx-auto grid max-w-[1440px] items-center gap-10 px-6 lg:grid-cols-[400px_1fr] lg:gap-12 lg:px-[48px] min-[1400px]:grid-cols-[520px_1fr] min-[1400px]:gap-20 min-[1400px]:px-[80px]">
        {/* Copy column */}
        <div>
          <Eyebrow>The modern way to sell everywhere</Eyebrow>
          <h1 className="mt-6 font-display text-[48px] font-extrabold leading-[0.98] tracking-[-0.035em] text-[#090B0D] lg:text-[64px] min-[1400px]:text-[80px] min-[1400px]:leading-[0.97]">
            Post once.
            <br />
            Sell most.
          </h1>
          <p className="mt-6 max-w-[460px] text-[17px] leading-relaxed text-[#68727D] lg:text-[18px] min-[1400px]:text-[20px]">
            Create your listing once and publish it across every marketplace you sell
            on—all from one simple workflow.
          </p>
          <div className="mt-8 flex flex-col items-stretch gap-2.5 lg:flex-row lg:items-center lg:gap-4">
            <MarketingButton href="/login" variant="primary" fullWidth className="h-[54px] lg:h-[52px] lg:w-auto">
              Start for free
            </MarketingButton>
            <MarketingButton
              href="#how"
              variant="secondary"
              arrow={false}
              fullWidth
              className="h-[54px] lg:h-[52px] lg:w-auto"
            >
              See how it works
            </MarketingButton>
          </div>
          <p className="mt-4 text-center text-[13.5px] text-[#68727D] lg:text-left">No credit card required.</p>
        </div>

        {/* Mobile: full-width listing card, connector bar, vertical branch */}
        <div className="lg:hidden">
          <motion.div
            key={`mobile-card-${reduceMotion}`}
            className="w-full rounded-[12px] border border-[#E5E7EB] bg-white shadow-[0_10px_40px_rgba(9,11,13,.07)]"
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={reduceMotion ? { opacity: 1, y: 0 } : { opacity: [0, 0, 1, 1, 0], y: [14, 14, 0, 0, 14] }}
            transition={
              reduceMotion ? undefined : { duration: LOOP, repeat: Infinity, ease: "easeInOut", times: [0, 0.02, 0.1, 0.97, 1] }
            }
          >
            <div className="h-[150px] overflow-hidden rounded-t-[12px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/marketing/phantom-gx-wide.jpg" alt="" className="h-full w-full object-cover" />
            </div>
            <div className="p-4">
              <p className="font-heading text-[19px] font-bold text-[#090B0D]">Nike Phantom GX Elite FG</p>
              <p className="mt-1 text-[13px] text-[#68727D]">Men&apos;s · Size 10</p>
              <p className="mt-2 font-heading text-[24px] font-bold text-[#090B0D]">$165.00</p>
              <ListingCardStatus
                reduceMotion={reduceMotion}
                preTimes={[0.1, 0.15, 0.58, 0.64]}
                postTimes={[0.62, 0.64, 0.7, 0.94, 0.97]}
              />
            </div>
          </motion.div>

          <div className="flex justify-center py-3">
            <GrowBar axis="y" reduceMotion={reduceMotion} duration={LOOP} delay={2} className="w-[2px] rounded-full bg-[#B6F34A]" style={{ height: 28 }} />
          </div>

          <div className="relative" style={{ height: 438 }}>
            <div className="absolute left-0 top-0">
              <PulseNode size={56} reduceMotion={reduceMotion} duration={LOOP} />
            </div>

            <GrowBar
              axis="y"
              reduceMotion={reduceMotion}
              duration={LOOP}
              delay={2}
              className="absolute rounded-full bg-[#B6F34A]"
              style={{ left: 27, top: 56, width: 2, height: 356 }}
            />

            {MOBILE_STUB_TOPS.map((top, i) => (
              <GrowBar
                key={top}
                axis="x"
                reduceMotion={reduceMotion}
                duration={LOOP}
                delay={2.6 + i * 0.07}
                className="absolute rounded-full bg-[#B6F34A]"
                style={{ left: 29, top, width: 27, height: 2 }}
              />
            ))}

            {chips.map((platform, i) => (
              <motion.div
                key={`${platform.id}-${reduceMotion}`}
                className="absolute flex h-[52px] items-center gap-2.5 rounded-[10px] border border-[#E5E7EB] bg-white px-3"
                style={{ left: 56, right: 0, top: MOBILE_CHIP_TOPS[i] }}
                initial={reduceMotion ? false : { opacity: 0, y: -10 }}
                animate={reduceMotion ? { opacity: 1, y: 0 } : { opacity: [0, 0, 1], y: [-10, -10, 0] }}
                transition={
                  reduceMotion
                    ? undefined
                    : { duration: LOOP, repeat: Infinity, ease: "easeInOut", delay: i * 0.07, times: [0, 0.21, 0.32] }
                }
              >
                <PlatformLogo platform={platform.id} size={50} className="h-6 flex-1 overflow-hidden" />
                <motion.span
                  className="relative h-5 w-5 shrink-0 rounded-full"
                  initial={{ backgroundColor: "transparent" }}
                  animate={
                    reduceMotion
                      ? { backgroundColor: "#22C55E" }
                      : { backgroundColor: ["transparent", "transparent", "#22C55E"], scale: [0.5, 0.5, 1] }
                  }
                  transition={
                    reduceMotion
                      ? undefined
                      : { duration: LOOP, repeat: Infinity, ease: "easeInOut", delay: i * 0.07, times: [0, 0.5, 0.58] }
                  }
                  style={{ border: reduceMotion ? "none" : "1.5px solid #E5E7EB" }}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Tablet: compact horizontal ONE → MANY diagram */}
        <div className="relative mx-auto hidden h-[460px] w-full max-w-[480px] lg:block min-[1400px]:hidden">
          <svg
            viewBox="0 0 480 460"
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            aria-hidden="true"
          >
            <path
              d="M200,230 L240,230"
              fill="none"
              stroke="#B6F34A"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="200"
              className={reduceMotion ? undefined : "motion-draw-path"}
              style={
                reduceMotion
                  ? { strokeDashoffset: 0 }
                  : ({ animationDuration: `${LOOP}s`, "--draw-dash": 200 } as React.CSSProperties)
              }
            />
            {TABLET_CHIP_Y.map((y, i) => (
              <path
                key={y}
                d={`M294,230 C314,230 314,${y} 330,${y}`}
                fill="none"
                stroke="#B6F34A"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="200"
                className={reduceMotion ? undefined : "motion-draw-path"}
                style={
                  reduceMotion
                    ? { strokeDashoffset: 0 }
                    : ({
                        animationDuration: `${LOOP}s`,
                        animationDelay: `${i * 0.1}s`,
                        "--draw-dash": 200,
                      } as React.CSSProperties)
                }
              />
            ))}
          </svg>

          {/* Listing card */}
          <motion.div
            key={`tablet-card-${reduceMotion}`}
            className="absolute left-0 top-24 w-[200px] rounded-[12px] border border-[#E5E7EB] bg-white shadow-[0_10px_40px_rgba(9,11,13,.07)]"
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
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
            <div className="h-[110px] overflow-hidden rounded-t-[12px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/marketing/phantom-gx-wide.jpg" alt="" className="h-full w-full object-cover" />
            </div>
            <div className="p-3">
              <p className="font-heading text-[15px] font-bold text-[#090B0D]">Nike Phantom GX Elite FG</p>
              <p className="mt-1 text-[12px] text-[#68727D]">Men&apos;s · Size 10</p>
              <p className="mt-1.5 font-heading text-[20px] font-bold text-[#090B0D]">$165.00</p>
              <div className="relative mt-2.5 h-8">
                <motion.div
                  key={`tablet-pre-${reduceMotion}`}
                  className="absolute inset-0 flex items-center gap-1.5 rounded-full bg-[#F7F8FA] px-2.5 text-[11px] font-medium text-[#68727D]"
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
                  key={`tablet-post-${reduceMotion}`}
                  className="absolute inset-0 flex items-center gap-1.5 rounded-full bg-[#090B0D] px-2.5 text-[11px] font-medium text-[#B6F34A]"
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
          <div className="absolute left-60 top-[203px]">
            <PulseNode size={54} reduceMotion={reduceMotion} duration={LOOP} />
          </div>

          {/* Marketplace chips — no text labels at this size, per spec */}
          {chips.map((platform, i) => (
            <motion.div
              key={`tablet-${platform.id}-${reduceMotion}`}
              className="absolute flex h-11 w-[150px] items-center rounded-[10px] border border-[#E5E7EB] bg-white px-3"
              style={{ left: 330, top: TABLET_CHIP_TOPS[i] }}
              initial={reduceMotion ? false : { opacity: 0, x: -14 }}
              animate={reduceMotion ? { opacity: 1, x: 0 } : { opacity: [0, 0, 1], x: [-14, -14, 0] }}
              transition={
                reduceMotion
                  ? undefined
                  : { duration: LOOP, repeat: Infinity, ease: "easeInOut", delay: i * 0.1, times: [0, 0.21, 0.3] }
              }
            >
              <PlatformLogo platform={platform.id} size={45} className="h-5 flex-1 overflow-hidden" />
              <motion.span
                className="relative h-[18px] w-[18px] shrink-0 rounded-full"
                initial={{ backgroundColor: "transparent", borderColor: "#E5E7EB" }}
                animate={
                  reduceMotion
                    ? { backgroundColor: "#22C55E" }
                    : { backgroundColor: ["transparent", "transparent", "#22C55E"], scale: [0.5, 0.5, 1] }
                }
                transition={
                  reduceMotion
                    ? undefined
                    : { duration: LOOP, repeat: Infinity, ease: "easeInOut", delay: i * 0.1, times: [0, 0.46, 0.55] }
                }
                style={{ border: reduceMotion ? "none" : "1.5px solid #E5E7EB" }}
              />
            </motion.div>
          ))}
        </div>

        {/* Desktop: horizontal ONE → MANY diagram */}
        <div className="relative mx-auto hidden h-[520px] w-full max-w-[640px] min-[1400px]:block">
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
            key={`desktop-card-${reduceMotion}`}
            className="absolute left-0 top-[118px] w-[258px] rounded-[12px] border border-[#E5E7EB] bg-white shadow-[0_10px_40px_rgba(9,11,13,.07)]"
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
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
            <div className="h-[132px] overflow-hidden rounded-t-[12px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/marketing/phantom-gx-wide.jpg" alt="" className="h-full w-full object-cover" />
            </div>
            <div className="p-4">
              <p className="font-heading text-[16px] font-bold text-[#090B0D]">Nike Phantom GX Elite FG</p>
              <p className="mt-1 text-[13px] text-[#68727D]">Men&apos;s · Size 10</p>
              <p className="mt-2 font-heading text-[22px] font-bold text-[#090B0D]">$165.00</p>
              <ListingCardStatus
                reduceMotion={reduceMotion}
                preTimes={[0.1, 0.15, 0.54, 0.61]}
                postTimes={[0.58, 0.61, 0.66, 0.94, 0.97]}
              />
            </div>
          </motion.div>

          {/* Center hub */}
          <div className="absolute left-[300px] top-[232px]">
            <PulseNode reduceMotion={reduceMotion} duration={LOOP} />
          </div>

          {/* Marketplace chips */}
          {chips.map((platform, i) => (
            <motion.div
              key={`${platform.id}-${reduceMotion}`}
              className="absolute flex h-11 w-[196px] items-center gap-2.5 rounded-[10px] border border-[#E5E7EB] bg-white px-3"
              style={{ left: 440, top: CHIP_TOPS[i] }}
              initial={reduceMotion ? false : { opacity: 0, x: -14 }}
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
              <PlatformLogo platform={platform.id} size={50} className="h-6 flex-1 overflow-hidden" />
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
