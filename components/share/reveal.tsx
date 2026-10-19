"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { type ReactNode, useEffect } from "react";
import { roundScore } from "@/lib/score";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The verdict score counts up from 0 on arrival. The server renders the final value (no-JS,
 * crawlers, screen readers); the fade-in hides it until the count starts on hydration.
 */
export function ScoreCountUp({ score, className }: { score: number | null; className?: string }) {
  const reduced = useReducedMotion();
  const value = useMotionValue(score ?? 0);
  const text = useTransform(value, (n) => roundScore(n).toFixed(1));

  useEffect(() => {
    if (score === null || reduced) return;
    value.set(0);
    const controls = animate(value, score, { duration: 1.1, ease: EASE });
    return () => controls.stop();
  }, [score, reduced, value]);

  if (score === null) return <span className={className}>–</span>;
  return (
    <motion.span
      className={className}
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      aria-label={roundScore(score).toFixed(1)}
    >
      {text}
    </motion.span>
  );
}

/** A tracklist row that fades up the first time it scrolls into view. */
export function RevealItem({
  index,
  className,
  children,
}: {
  index: number;
  className?: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.li
      className={className}
      initial={reduced ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -40px 0px" }}
      // Stagger only within a screenful so long albums don't queue up seconds of delay.
      transition={{ duration: 0.45, delay: (index % 10) * 0.04, ease: EASE }}
    >
      {children}
    </motion.li>
  );
}

/** Score bar that grows from 0 when it enters the viewport. */
export function RevealBar({ pct, className }: { pct: number; className: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { width: 0 }}
      whileInView={{ width: `${pct}%` }}
      viewport={{ once: true }}
      style={reduced ? { width: `${pct}%` } : undefined}
      transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
    />
  );
}
