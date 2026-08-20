"use client";

import { motion } from "framer-motion";
import { PLATFORMS } from "@/lib/marketplaces/platforms";
import { PlatformMark } from "@/components/platform-logo";
import { PulseNode, useMountedReducedMotion } from "@/components/marketing/motion-primitives";

const RADIAL_ORDER = ["ebay", "poshmark", "mercari", "depop", "etsy", "whatnot", "vinted", "grailed"] as const;

const CHIP_POS = [
  { left: 326, top: 28 },
  { left: 453, top: 102 },
  { left: 504, top: 228 },
  { left: 453, top: 355 },
  { left: 326, top: 406 },
  { left: 199, top: 355 },
  { left: 148, top: 228 },
  { left: 199, top: 102 },
];

const CENTER = { x: 400, y: 250 };
const RADIUS = 200;

function rayEndpoint(index: number) {
  const angle = (-90 + index * 45) * (Math.PI / 180);
  return {
    x: Math.round(CENTER.x + RADIUS * Math.cos(angle)),
    y: Math.round(CENTER.y + RADIUS * Math.sin(angle)),
  };
}

const LOOP = 9;

export function PublishRadial() {
  const reduceMotion = useMountedReducedMotion();
  const markets = RADIAL_ORDER.map((id) => PLATFORMS.find((p) => p.id === id)).filter(
    (p): p is (typeof PLATFORMS)[number] => !!p
  );

  return (
    <section className="bg-[#090B0D] py-32">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-[80px]">
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#68727D]">02 — PUBLISH</p>
        <h2 className="mt-4 font-display text-[46px] font-bold leading-[1.05] tracking-[-0.03em] text-white sm:text-[48px]">
          Sell everywhere.
        </h2>
        <p className="mt-5 max-w-[520px] text-[19px] leading-relaxed text-[#68727D]">
          Select your marketplaces once. PostMost handles the rest.
        </p>

        <div className="relative mx-auto mt-14 h-[380px] w-full max-w-[800px] lg:h-[520px]">
          <svg viewBox="0 0 800 520" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            <circle cx={CENTER.x} cy={CENTER.y} r={RADIUS} fill="none" stroke="#24282D" strokeWidth="1" />
            {markets.map((platform, i) => {
              const end = rayEndpoint(i);
              return (
                <path
                  key={platform.id}
                  d={`M${CENTER.x},${CENTER.y} L${end.x},${end.y}`}
                  fill="none"
                  stroke="#B6F34A"
                  strokeWidth="2"
                  strokeDasharray="210"
                  className={reduceMotion ? undefined : "motion-draw-path"}
                  style={
                    reduceMotion
                      ? { strokeDashoffset: 0 }
                      : ({
                          animationDuration: `${LOOP}s`,
                          animationDelay: `${i * 0.12}s`,
                          "--draw-dash": 210,
                        } as React.CSSProperties)
                  }
                />
              );
            })}
          </svg>

          <div className="absolute" style={{ left: CENTER.x - 40, top: CENTER.y - 40 }}>
            <PulseNode size={80} reduceMotion={reduceMotion} duration={LOOP} />
          </div>

          {markets.map((platform, i) => {
            const pos = CHIP_POS[i];
            return (
              <div
                key={platform.id}
                className="absolute flex h-11 w-[148px] items-center gap-2 rounded-[10px] border border-[#24282D] bg-[#15181C] px-2.5"
                style={{ left: pos.left, top: pos.top }}
              >
                <span className="flex h-[22px] w-auto min-w-[30px] shrink-0 items-center justify-center rounded-[5px] bg-white px-1">
                  <PlatformMark platformId={platform.id} className="h-3 w-auto overflow-visible whitespace-nowrap" />
                </span>
                <span className="truncate text-[12px] font-medium text-white">{platform.name}</span>
              </div>
            );
          })}

          <motion.div
            className="absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[#15181C] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#B6F34A]"
            animate={
              reduceMotion
                ? { opacity: 1 }
                : { opacity: [0, 0, 1, 1, 0] }
            }
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
    </section>
  );
}
