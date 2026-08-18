"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

export function StatValue({
  value,
  prefix = "",
  decimals = 0,
  className,
}: {
  value: number;
  prefix?: string;
  decimals?: number;
  className?: string;
}) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => `${prefix}${v.toFixed(decimals)}`);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) {
      motionValue.set(value);
      return;
    }
    hasAnimated.current = true;
    const controls = animate(motionValue, value, { duration: 0.8, ease: "easeOut" });
    return controls.stop;
  }, [value, motionValue]);

  return <motion.span className={className}>{rounded}</motion.span>;
}
