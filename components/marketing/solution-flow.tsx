"use client";

import { motion } from "framer-motion";
import { ImageIcon } from "lucide-react";
import { PLATFORMS } from "@/lib/marketplaces/platforms";
import { PlatformMark } from "@/components/platform-logo";

const SOLUTION_MARKETS = ["ebay", "poshmark", "mercari", "depop", "etsy", "whatnot"] as const;

const targets = [
  { left: "72%", top: "15%" },
  { left: "82%", top: "35%" },
  { left: "84%", top: "55%" },
  { left: "78%", top: "75%" },
  { left: "66%", top: "88%" },
  { left: "58%", top: "70%" },
];

export function SolutionFlow() {
  const markets = SOLUTION_MARKETS.map((id) => PLATFORMS.find((p) => p.id === id)).filter(
    (p): p is (typeof PLATFORMS)[number] => !!p
  );

  return (
    <div className="relative h-80 w-full overflow-hidden rounded-2xl border bg-card">
      {/* Source listing card */}
      <motion.div
        className="absolute flex flex-col gap-2 rounded-xl border bg-background p-4 shadow-sm"
        initial={{ left: "15%", top: "50%", x: "-50%", y: "-50%", opacity: 0 }}
        animate={{ left: "42%", top: "50%", opacity: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1.5">
            <div className="h-2.5 w-28 rounded-full bg-muted" />
            <div className="h-2 w-16 rounded-full bg-muted/70" />
          </div>
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">One listing</div>
      </motion.div>

      {/* PostMost hub */}
      <motion.div
        className="absolute flex items-center justify-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
        initial={{ left: "42%", top: "50%", x: "-50%", y: "-50%", scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
      >
        PostMost
      </motion.div>

      {/* Marketplace destinations */}
      {markets.map((platform, i) => {
        const target = targets[i % targets.length];
        return (
          <motion.div
            key={platform.id}
            className="absolute flex items-center justify-center rounded-lg border bg-background px-3 py-2 shadow-sm"
            initial={{ left: "42%", top: "50%", x: "-50%", y: "-50%", opacity: 0, scale: 0.6 }}
            animate={{ left: target.left, top: target.top, opacity: 1, scale: 1 }}
            transition={{
              delay: 0.8 + i * 0.12,
              type: "spring",
              stiffness: 200,
              damping: 18,
            }}
          >
            <PlatformMark platformId={platform.id} className="h-4 w-16" />
          </motion.div>
        );
      })}
    </div>
  );
}
