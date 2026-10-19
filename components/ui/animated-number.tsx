"use client";

import { useLayoutEffect, useRef } from "react";
import { usePrefersReducedMotion } from "./use-reduced-motion";

const DURATION_MS = 450;
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));

/**
 * Tweens between values; renders instantly when the user prefers reduced motion.
 * Hand-rolled (requestAnimationFrame) to keep the motion library out of the editor bundle —
 * it was most of the page's JavaScript for one number.
 */
export function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);

  // Layout effect: runs before paint, so the re-render never flashes the final value first.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = shown.current;
    if (reduced || from === value) {
      shown.current = value;
      el.textContent = format(value);
      return;
    }
    el.textContent = format(from); // React already wrote the target; show the start before paint
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      shown.current = from + (value - from) * easeOutExpo(t);
      el.textContent = format(shown.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced, format]);

  // The text is driven imperatively between renders; React only sets the initial value.
  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}
