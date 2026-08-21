"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/logo";

/**
 * useReducedMotion() reads matchMedia, which isn't available during SSR — its
 * value can differ between the server render and the client's first paint,
 * which breaks hydration. Only trust it after mount (same pattern as the
 * pre-existing hero-flow.tsx / solution-flow.tsx).
 */
export function useMountedReducedMotion() {
  const shouldReduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!shouldReduceMotion;
}

export const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-[8px] text-[15px] font-semibold transition-colors";

const buttonVariants = {
  primary: "bg-[#B6F34A] text-[#090B0D] hover:bg-[#c6f96c]",
  secondary: "border border-[#E5E7EB] bg-white text-[#090B0D] hover:border-[#68727D]",
  "outline-dark": "border border-[#24282D] bg-[#15181C] text-white hover:border-[#68727D]",
} as const;

const buttonSizes = {
  44: "h-11 px-5",
  52: "h-[52px] px-6",
  54: "h-[54px] px-7",
} as const;

export function MarketingButton({
  href,
  variant = "primary",
  size = 52,
  arrow = true,
  fullWidth = false,
  className,
  children,
}: {
  href: string;
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  arrow?: boolean;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], fullWidth && "w-full", className)}
    >
      {children}
      {arrow && <ArrowRight className="h-4 w-4" />}
    </Link>
  );
}

export function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-[6px] border px-3 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em]",
        dark ? "border-[#24282D] bg-[#15181C] text-[#B6F34A]" : "border-[#E5E7EB] bg-white text-[#68727D]"
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#B6F34A]" />
      {children}
    </div>
  );
}

/** The pulse-ring hub node shared by the hero ONE→MANY diagram and the PUBLISH radial. */
export function PulseNode({
  size = 62,
  duration = 2.4,
  delay = 0,
  reduceMotion,
}: {
  size?: number;
  duration?: number;
  delay?: number;
  reduceMotion: boolean;
}) {
  return (
    <div
      className="relative flex shrink-0 items-center justify-center rounded-[16px] bg-[#090B0D]"
      style={{ width: size, height: size }}
    >
      <LogoMark style={{ width: size * 0.48, height: size * 0.4 }} />
      {!reduceMotion && (
        <span
          className="motion-pulse-ring pointer-events-none absolute inset-0 rounded-[16px] border-[1.5px] border-[#B6F34A]"
          style={{ animationDuration: `${duration}s`, animationDelay: `${delay}s` }}
        />
      )}
    </div>
  );
}

/** Solid-bar equivalent of DrawPath for the mobile hero's vertical spine/stubs. */
export function GrowBar({
  axis,
  delay = 0,
  duration = 9,
  reduceMotion,
  className,
  style,
}: {
  axis: "y" | "x";
  delay?: number;
  duration?: number;
  reduceMotion: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={cn("block", reduceMotion ? undefined : axis === "y" ? "motion-grow-y" : "motion-grow-x", className)}
      style={{
        ...style,
        transform: reduceMotion ? (axis === "y" ? "scaleY(1)" : "scaleX(1)") : undefined,
        animationDuration: reduceMotion ? undefined : `${duration}s`,
        animationDelay: reduceMotion ? undefined : `${delay}s`,
      }}
    />
  );
}

/** A connector line that draws in via stroke-dashoffset, looping on a shared clock. */
export function DrawPath({
  d,
  delay = 0,
  duration = 9,
  reduceMotion,
  strokeWidth = 2.5,
  dashLength = 240,
}: {
  d: string;
  delay?: number;
  duration?: number;
  reduceMotion: boolean;
  strokeWidth?: number;
  dashLength?: number;
}) {
  return (
    <path
      d={d}
      fill="none"
      stroke="#B6F34A"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeDasharray={dashLength}
      className={reduceMotion ? undefined : "motion-draw-path"}
      style={
        reduceMotion
          ? { strokeDashoffset: 0 }
          : ({
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              "--draw-dash": dashLength,
            } as React.CSSProperties)
      }
    />
  );
}
