"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Plus } from "lucide-react";
import { PLATFORMS } from "@/lib/marketplaces/platforms";
import { PlatformMark } from "@/components/platform-logo";
import { reveal } from "@/components/marketing/motion-primitives";

const DEMO_MARKETS = ["ebay", "poshmark", "mercari", "depop", "etsy", "whatnot"] as const;
const STEP_MS = 460;
const FIRST_DELAY_MS = 420;

type Phase = "idle" | "publishing" | "done";

const FIELDS = [
  { label: "DESCRIPTION", value: "Excellent condition. Worn a handful of times, no visible flaws. Original box included." },
  { label: "CATEGORY", value: "Men's → Shoes → Sneakers" },
  { label: "CONDITION", value: "Excellent" },
  { label: "SHIPPING", value: "✓ Calculated automatically" },
];

export function PublishDemo() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [published, setPublished] = useState(-1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const markets = DEMO_MARKETS.map((id) => PLATFORMS.find((p) => p.id === id)).filter(
    (p): p is (typeof PLATFORMS)[number] => !!p
  );

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  function handlePublish() {
    clearTimers();
    setPublished(-1);
    setPhase("publishing");
    markets.forEach((_, i) => {
      const t = setTimeout(() => setPublished(i), FIRST_DELAY_MS + i * STEP_MS);
      timers.current.push(t);
    });
    const doneTimer = setTimeout(
      () => setPhase("done"),
      FIRST_DELAY_MS + markets.length * STEP_MS
    );
    timers.current.push(doneTimer);
  }

  useEffect(() => clearTimers, []);

  const counterText =
    phase === "idle" ? `${markets.length} selected` : phase === "publishing" ? "Publishing…" : `${markets.length} of ${markets.length} published`;
  const buttonText =
    phase === "idle"
      ? `Publish to ${markets.length} marketplaces`
      : phase === "publishing"
        ? "Publishing…"
        : "Publish again";

  return (
    <motion.section
      id="how"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={reveal}
      className="bg-[#090B0D] py-[72px] lg:py-32"
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-[80px]">
        <h2 className="font-display text-[34px] font-bold leading-[1.1] tracking-[-0.03em] text-white lg:text-[46px] lg:leading-[1.05]">
          One listing.
          <br />
          Everywhere you sell.
        </h2>
        <p className="mt-5 max-w-[560px] text-[17px] leading-relaxed text-[#68727D] lg:text-[19px]">
          Build your listing once. PostMost handles the marketplace-specific details behind
          the scenes.
        </p>

        {/* Mobile: cropped to the publish panel */}
        <div className="mt-10 overflow-hidden rounded-[16px] border border-[#24282D] bg-[#0E1114] lg:hidden">
          <div className="flex h-12 items-center justify-between border-b border-[#24282D] bg-[#15181C] px-4">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#24282D]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#24282D]" />
              </div>
              <span className="text-[13px] font-semibold text-white">New Listing</span>
            </div>
            <button
              type="button"
              className="text-[12px] font-medium text-[#68727D] transition-colors hover:text-white"
            >
              Save Draft
            </button>
          </div>

          <div className="flex items-center gap-3 border-b border-[#24282D] p-4">
            <div
              className="h-14 w-14 shrink-0 rounded-[8px]"
              style={{ backgroundImage: "repeating-linear-gradient(135deg, #15181C 0 8px, #1b1f24 8px 16px)" }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14.5px] font-semibold text-white">Nike Air Max 90</p>
              <p className="mt-0.5 truncate text-[12.5px] text-[#68727D]">Men&apos;s · Size 10 · Excellent</p>
            </div>
            <p className="shrink-0 font-display text-[16px] font-bold text-[#B6F34A]">$129</p>
          </div>

          <div className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-white">Publish to</p>
              <p aria-live="polite" className="text-[12px] font-medium text-[#68727D]">
                {counterText}
              </p>
            </div>
            <PublishRows markets={markets} phase={phase} published={published} />
            <button
              type="button"
              onClick={handlePublish}
              disabled={phase === "publishing"}
              className="mt-4 flex h-[54px] w-full items-center justify-center gap-2 rounded-[8px] bg-[#B6F34A] text-[15px] font-semibold text-[#090B0D] transition-colors hover:bg-[#c6f96c] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {buttonText}
              {phase !== "publishing" && <ArrowRight className="h-4 w-4" />}
            </button>
            <p className="mt-4 text-[13px] leading-relaxed text-[#68727D]">
              Tap to see it run. Every cross-post is queued and retried until it lands.
            </p>
          </div>
        </div>

        {/* Desktop: full app window */}
        <div className="mt-14 hidden overflow-hidden rounded-[16px] border border-[#24282D] bg-[#0E1114] lg:block">
          {/* Title bar */}
          <div className="flex h-[52px] items-center justify-between border-b border-[#24282D] bg-[#15181C] px-5">
            <div className="flex items-center gap-4">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#24282D]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#24282D]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#24282D]" />
              </div>
              <span className="text-[13.5px] font-semibold text-white">New Listing</span>
            </div>
            <button
              type="button"
              className="h-8 rounded-[6px] border border-[#24282D] px-3 text-[12.5px] font-medium text-[#68727D] transition-colors hover:text-white"
            >
              Save Draft
            </button>
          </div>

          {/* Body */}
          <div className="grid lg:grid-cols-[1fr_380px]">
            <div className="border-b border-[#24282D] p-8 lg:border-b-0 lg:border-r">
              <div className="flex flex-col gap-6 sm:flex-row">
                <div className="flex shrink-0 flex-col gap-2">
                  <div
                    className="h-[220px] w-[220px] rounded-[10px]"
                    style={{ backgroundImage: "repeating-linear-gradient(135deg, #15181C 0 10px, #1b1f24 10px 20px)" }}
                  />
                  <div className="flex gap-2">
                    <div className="h-[60px] w-[60px] rounded-[8px] bg-[#15181C]" />
                    <div className="h-[60px] w-[60px] rounded-[8px] bg-[#15181C]" />
                    <div className="flex h-[60px] w-[60px] items-center justify-center rounded-[8px] border border-dashed border-[#24282D]">
                      <Plus className="h-4 w-4 text-[#68727D]" />
                    </div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[26px] font-bold text-white">Nike Air Max 90</p>
                  <p className="mt-1 font-display text-[22px] font-bold text-[#B6F34A]">$129.00</p>
                  <div className="mt-5 flex flex-col gap-3">
                    {FIELDS.map((field) => (
                      <div key={field.label}>
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#68727D]">
                          {field.label}
                        </p>
                        <div className="flex min-h-10 items-center rounded-[8px] border border-[#24282D] bg-[#15181C] px-3 py-2 text-[13.5px] text-white">
                          {field.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[13.5px] font-semibold text-white">Publish to</p>
                <p aria-live="polite" className="text-[12.5px] font-medium text-[#68727D]">
                  {counterText}
                </p>
              </div>
              <PublishRows markets={markets} phase={phase} published={published} />
              <button
                type="button"
                onClick={handlePublish}
                disabled={phase === "publishing"}
                className="mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-[8px] bg-[#B6F34A] text-[15px] font-semibold text-[#090B0D] transition-colors hover:bg-[#c6f96c] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {buttonText}
                {phase !== "publishing" && <ArrowRight className="h-4 w-4" />}
              </button>
              <p className="mt-4 text-[13px] leading-relaxed text-[#68727D]">
                Every cross-post is queued and retried until it lands—nothing is fired and
                forgotten.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function PublishRows({
  markets,
  phase,
  published,
}: {
  markets: (typeof PLATFORMS)[number][];
  phase: Phase;
  published: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      {markets.map((platform, i) => {
        const isPublished = phase === "done" || (phase === "publishing" && published >= i);
        return (
          <div
            key={platform.id}
            className="flex h-[52px] items-center gap-3 rounded-[10px] border border-[#24282D] bg-[#15181C] px-3"
          >
            <span className="flex h-7 w-auto min-w-[36px] shrink-0 items-center justify-center rounded-[6px] bg-white px-1.5">
              <PlatformMark platformId={platform.id} className="h-4 w-auto overflow-visible whitespace-nowrap" />
            </span>
            <span className="flex-1 truncate text-[13.5px] font-medium text-white">{platform.name}</span>
            <span
              className="shrink-0 text-[12.5px] font-semibold text-[#B6F34A] transition-opacity"
              style={{ opacity: isPublished ? 1 : 0 }}
            >
              ✓ Published
            </span>
          </div>
        );
      })}
    </div>
  );
}
