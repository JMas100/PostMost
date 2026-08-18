"use client";

import { motion, useReducedMotion } from "framer-motion";
import { PLATFORMS } from "@/lib/marketplaces/platforms";
import { LogoMark } from "@/components/logo";

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

const VB_W = 720;
const VB_H = 420;
const CARD_X = 40;
const CARD_Y = 160;
const CARD_W = 170;
const CARD_H = 100;
const CENTER_X = 300;
const CENTER_Y = 210;
const CENTER_R = 30;
const NODES_X = 620;
const NODE_R = 12;
const TOP_MARGIN = 24;
const NODE_SPACING = (VB_H - TOP_MARGIN * 2) / (FLOW_ORDER.length - 1);

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

const labelVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0 },
};

export function HeroFlow() {
  const shouldReduceMotion = useReducedMotion();
  const duration = shouldReduceMotion ? 0 : 0.45;
  const nodeDuration = shouldReduceMotion ? 0 : 0.35;
  const delayStep = shouldReduceMotion ? 0 : 0.22;

  const markets = FLOW_ORDER.map((id) => PLATFORMS.find((p) => p.id === id)).filter(
    (p): p is (typeof PLATFORMS)[number] => !!p
  );

  return (
    <div className="relative w-full max-w-3xl">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-auto w-full"
        role="img"
        aria-label="One listing flows through PostMost to every marketplace"
      >
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 L0,0" fill="hsl(var(--muted-foreground))" />
          </marker>
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

        {/* Line to PostMost */}
        <motion.path
          d={`M${CARD_X + CARD_W} ${CENTER_Y} L${CENTER_X - CENTER_R} ${CENTER_Y}`}
          stroke="hsl(var(--border))"
          strokeWidth="2"
          strokeLinecap="round"
          markerEnd="url(#arrow)"
          fill="none"
          initial="hidden"
          animate="visible"
          variants={lineVariants}
          transition={{ duration: duration * 0.8, delay: duration * 0.6, ease: "easeInOut" }}
        />

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
            style={{ fill: "hsl(var(--obsidian))" }}
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

        {/* Fan-out lines and marketplace nodes */}
        {markets.map((platform, i) => {
          const y = TOP_MARGIN + i * NODE_SPACING;
          const delay = duration * 1.6 + i * delayStep;
          return (
            <motion.g key={platform.id}>
              <motion.path
                d={`M${CENTER_X + CENTER_R} ${CENTER_Y} L${NODES_X - NODE_R} ${y}`}
                stroke="hsl(var(--border))"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
                initial="hidden"
                animate="visible"
                variants={lineVariants}
                transition={{ duration, delay, ease: "easeInOut" }}
              />
              <motion.g
                initial="hidden"
                animate="visible"
                variants={nodeVariants}
                transition={{ type: "spring", stiffness: 280, damping: 18, delay: delay + duration * 0.6 }}
              >
                <circle
                  cx={NODES_X}
                  cy={y}
                  r={NODE_R}
                  fill={platform.color}
                  stroke="hsl(var(--border))"
                  strokeWidth="1"
                />
                <motion.text
                  x={NODES_X + NODE_R + 12}
                  y={y + 4}
                  style={{ fill: "hsl(var(--foreground))" }}
                  className="text-[11px] font-medium"
                  initial="hidden"
                  animate="visible"
                  variants={labelVariants}
                  transition={{ duration: nodeDuration, delay: delay + duration * 0.9 }}
                >
                  {platform.name}
                </motion.text>
              </motion.g>
            </motion.g>
          );
        })}

        {/* Final success state */}
        <motion.g
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: nodeDuration, delay: duration * 1.6 + markets.length * delayStep + 0.4 }}
        >
          <circle cx={NODES_X + 18} cy={CENTER_Y - 12} r="5" style={{ fill: "hsl(var(--success))" }} />
          <text
            x={NODES_X + 32}
            y={CENTER_Y - 7}
            style={{ fill: "hsl(var(--success))" }}
            className="text-xs font-semibold"
          >
            Published everywhere
          </text>
        </motion.g>
      </svg>
    </div>
  );
}
