"use client";

import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect } from "react";

/** Springs between values; renders instantly when the user prefers reduced motion. */
export function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const spring = useSpring(value, { stiffness: 140, damping: 22, mass: 0.6 });
  const display = useTransform(spring, format);

  useEffect(() => {
    if (reduced) spring.jump(value);
    else spring.set(value);
  }, [spring, value, reduced]);

  if (reduced) return <span className={className}>{format(value)}</span>;
  return <motion.span className={className}>{display}</motion.span>;
}
