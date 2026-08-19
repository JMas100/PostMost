"use client";

import { useEffect, useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { PLATFORMS } from "@/lib/marketplaces/platforms";
import { LogoMark } from "@/components/logo";
import { PlatformLogo } from "@/components/platform-logo";

const FLOW_ORDER = [
  "ebay",
  "poshmark",
  "mercari",
  "depop",
  "etsy",
  "whatnot",
  "grailed",
  "vinted",
  "shopify",
] as const;

const VB_W = 640;
const VB_H = 420;
const CARD_X = 40;
const CARD_Y = 160;
const CARD_W = 170;
const CARD_H = 100;
const CENTER_X = 280;
const CENTER_Y = 210;
const CENTER_R = 30;
const NODES_X = 560;
const BADGE_W = 76;
const BADGE_H = 30;
const TOP_MARGIN = 24;
const BOTTOM_MARGIN = 40;
const NODE_SPACING = (VB_H - TOP_MARGIN - BOTTOM_MARGIN) / (FLOW_ORDER.length - 1);

const cardVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

const lineVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: { pathLength: 1, opacity: 1 },
};

const nodeVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: { scale: 1, opacity: 1 },
};

export function HeroFlow() {
  const shouldReduceMotion = useReducedMotion();
  // useReducedMotion() reads matchMedia, which isn't available during SSR —
  // its value can differ between the server render and the client's first
  // paint, which breaks hydration (both for conditionally-rendered elements
  // and for framer-motion's own inline styles like will-change). Only trust
  // it after mount, so SSR and the first client render always agree on the
  // "motion enabled" path, and the real preference applies a tick later.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const reduceMotion = mounted && shouldReduceMotion;
  const duration = reduceMotion ? 0 : 0.45;
  const nodeDuration = reduceMotion ? 0 : 0.35;
  const delayStep = reduceMotion ? 0 : 0.2;
  const gradientId = useId();
  const glowId = useId();

  const markets = FLOW_ORDER.map((id) => PLATFORMS.find((p) => p.id === id)).filter(
    (p): p is (typeof PLATFORMS)[number] => !!p
  );

  return (
    <div className="relative w-full max-w-3xl">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label="One listing flows through PostMost to every marketplace"
      >
        <defs>
          <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1={CENTER_X} y1={CENTER_Y} x2={NODES_X} y2={CENTER_Y}>
            <stop offset="0" stopColor="#b6f34a" />
            <stop offset=".78" stopColor="#b6f34a" />
            <stop offset=".89" stopColor="#a0e82c" />
            <stop offset="1" stopColor="#629118" />
          </linearGradient>
          <radialGradient id={glowId}>
            <stop offset="0%" stopColor="#b6f34a" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#b6f34a" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Listing card */}
        <motion.g
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          transition={{ duration, ease: "easeOut" }}
        >
          <rect
            x={CARD_X}
            y={CARD_Y}
            width={CARD_W}
            height={CARD_H}
            rx="12"
            style={{ fill: "hsl(var(--card))", stroke: "hsl(var(--border))" }}
            strokeWidth="1"
          />
          <rect
            x={CARD_X + 16}
            y={CARD_Y + 18}
            width={56}
            height={56}
            rx="8"
            style={{ fill: "hsl(var(--muted))" }}
          />
          <rect
            x={CARD_X + 84}
            y={CARD_Y + 24}
            width={68}
            height={8}
            rx="4"
            style={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <rect
            x={CARD_X + 84}
            y={CARD_Y + 42}
            width={48}
            height={6}
            rx="3"
            style={{ fill: "hsl(var(--muted-foreground))", opacity: 0.6 }}
          />
          <text
            x={CARD_X + CARD_W / 2}
            y={CARD_Y + CARD_H + 20}
            textAnchor="middle"
            style={{ fill: "hsl(var(--foreground))" }}
            className="text-[10px] font-semibold uppercase tracking-widest"
          >
            One listing
          </text>
        </motion.g>

        {/* AI-enrichment badge */}
        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 16, delay: duration * 1.05 }}
        >
          <circle cx={CARD_X + CARD_W - 6} cy={CARD_Y - 2} r="13" fill={`url(#${gradientId})`} />
          <path
            d="M0,-6 L1.6,-1.6 L6,0 L1.6,1.6 L0,6 L-1.6,1.6 L-6,0 L-1.6,-1.6 Z"
            fill="hsl(var(--obsidian))"
            transform={`translate(${CARD_X + CARD_W - 6}, ${CARD_Y - 2})`}
          />
        </motion.g>

        {/* Line to PostMost */}
        <motion.path
          d={`M${CARD_X + CARD_W} ${CENTER_Y} L${CENTER_X - CENTER_R} ${CENTER_Y}`}
          stroke="hsl(var(--border))"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          initial="hidden"
          animate="visible"
          variants={lineVariants}
          transition={{ duration: duration * 0.8, delay: duration * 0.6, ease: "easeInOut" }}
        />
        {!reduceMotion && (
          <motion.path
            d={`M${CARD_X + CARD_W} ${CENTER_Y} L${CENTER_X - CENTER_R} ${CENTER_Y}`}
            stroke="#b6f34a"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="3 9"
            fill="none"
            initial={{ opacity: 0, strokeDashoffset: 0 }}
            animate={{ opacity: 0.7, strokeDashoffset: -24 }}
            transition={{
              opacity: { duration: 0.4, delay: duration * 1.4 },
              strokeDashoffset: { duration: 1.2, repeat: Infinity, ease: "linear", delay: duration * 1.4 },
            }}
          />
        )}

        {/* Glow behind the hub */}
        <circle cx={CENTER_X} cy={CENTER_Y} r={CENTER_R + 60} fill={`url(#${glowId})`} />

        {/* Central PostMost node */}
        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: duration * 1.1 }}
        >
          <circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={CENTER_R + 4}
            style={{ fill: "hsl(var(--foreground))" }}
          />
          <LogoMark x={CENTER_X - 24} y={CENTER_Y - 24} width="48" height="48" />
          <text
            x={CENTER_X}
            y={CENTER_Y + CENTER_R + 22}
            textAnchor="middle"
            style={{ fill: "hsl(var(--foreground))" }}
            className="text-[11px] font-semibold"
          >
            PostMost
          </text>
        </motion.g>

        {/* Continuous sync pulse */}
        {!reduceMotion && (
          <motion.circle
            cx={CENTER_X}
            cy={CENTER_Y}
            fill="none"
            stroke="#b6f34a"
            strokeWidth="2"
            initial={{ r: CENTER_R + 4, opacity: 0 }}
            animate={{ r: [CENTER_R + 4, CENTER_R + 22], opacity: [0.5, 0] }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              repeatDelay: 0.6,
              ease: "easeOut",
              delay: duration * 1.6 + markets.length * delayStep + 0.6,
            }}
          />
        )}

        {/* Fan-out lines and marketplace badges */}
        {markets.map((platform, i) => {
          const y = TOP_MARGIN + i * NODE_SPACING;
          const delay = duration * 1.6 + i * delayStep;
          return (
            <motion.g key={platform.id}>
              <motion.path
                d={`M${CENTER_X + CENTER_R} ${CENTER_Y} L${NODES_X - BADGE_W / 2} ${y}`}
                stroke={`url(#${gradientId})`}
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
                initial="hidden"
                animate="visible"
                variants={lineVariants}
                transition={{ duration, delay, ease: "easeInOut" }}
              />
              {!reduceMotion && (
                <motion.path
                  d={`M${CENTER_X + CENTER_R} ${CENTER_Y} L${NODES_X - BADGE_W / 2} ${y}`}
                  stroke="#b6f34a"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeDasharray="3 9"
                  fill="none"
                  initial={{ opacity: 0, strokeDashoffset: 0 }}
                  animate={{ opacity: 0.5, strokeDashoffset: -24 }}
                  transition={{
                    opacity: { duration: 0.4, delay: delay + duration * 0.6 },
                    strokeDashoffset: { duration: 1.4, repeat: Infinity, ease: "linear", delay: delay + duration * 0.6 },
                  }}
                />
              )}
              <motion.g
                initial="hidden"
                animate="visible"
                variants={nodeVariants}
                transition={{ type: "spring", stiffness: 280, damping: 18, delay: delay + duration * 0.6 }}
              >
                <foreignObject x={NODES_X - BADGE_W / 2} y={y - BADGE_H / 2} width={BADGE_W} height={BADGE_H}>
                  <PlatformLogo platformId={platform.id} className="h-[30px] w-[76px]" />
                </foreignObject>
              </motion.g>
            </motion.g>
          );
        })}

        {/* Floating supporting chips */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: nodeDuration, delay: duration * 1.8 }}
        >
          <motion.foreignObject
            x={370}
            y={54}
            width={116}
            height={32}
            animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
            transition={reduceMotion ? undefined : { duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: duration * 1.8 }}
          >
            <div className="flex h-8 w-max items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-3 text-[11px] font-medium text-foreground shadow-medium">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
              Auto-synced
            </div>
          </motion.foreignObject>
        </motion.g>

        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: nodeDuration, delay: duration * 2.0 }}
        >
          <motion.foreignObject
            x={80}
            y={302}
            width={132}
            height={32}
            animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
            transition={reduceMotion ? undefined : { duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: duration * 2.2 }}
          >
            <div className="flex h-8 w-max items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-3 text-[11px] font-medium text-foreground shadow-medium">
              <TrendingUp className="h-3 w-3 shrink-0 text-primary" />
              Profit tracked
            </div>
          </motion.foreignObject>
        </motion.g>

        {/* Final success state */}
        <motion.text
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: nodeDuration, delay: duration * 1.6 + markets.length * delayStep + 0.4 }}
          x={NODES_X}
          y={VB_H - 8}
          textAnchor="middle"
          style={{ fill: "hsl(var(--success))" }}
          className="text-xs font-semibold"
        >
          ✓ Published everywhere
        </motion.text>
      </svg>
    </div>
  );
}
