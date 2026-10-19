"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const subscribeNever = () => () => {};

/** navigator.share exists only on some (mostly mobile) browsers; false during SSR. */
export function useCanShare(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );
}

/** Copy to clipboard. Resolves false when the browser refuses, so callers can offer a manual copy. */
export function useCopy() {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  useEffect(() => {
    if (state === "idle") return;
    const id = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(id);
  }, [state]);

  async function copy(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
      return true;
    } catch {
      setState("manual");
      return false;
    }
  }
  return { state, copy };
}

export async function shareLink(url: string, title: string, text?: string) {
  try {
    await navigator.share({ url, title, text });
  } catch {
    // Dismissed by the user, or blocked — nothing to report.
  }
}

interface ShareActionsProps {
  reviewItHref: string;
  title: string;
}

/** Actions on a shared review: answer it with your own review, or pass the link on. */
export function ShareActions({ reviewItHref, title }: ShareActionsProps) {
  const canShare = useCanShare();
  const inputRef = useRef<HTMLInputElement>(null);
  const { state, copy } = useCopy();
  const currentUrl = () => window.location.href;

  async function copyLink() {
    const url = currentUrl();
    if (await copy(url)) return;
    const el = inputRef.current;
    if (!el) return;
    el.value = url;
    el.focus();
    el.select();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={reviewItHref}
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink"
      >
        Review it yourself
      </Link>
      <button
        type="button"
        onClick={copyLink}
        className="rounded-full border border-ink-600 px-5 py-2.5 text-sm text-paper transition-colors hover:border-accent"
      >
        {state === "copied" ? "Copied!" : state === "manual" ? "Press Ctrl+C to copy" : "Copy link"}
      </button>
      {canShare && (
        <button
          type="button"
          onClick={() => shareLink(currentUrl(), title)}
          className="rounded-full border border-ink-600 px-5 py-2.5 text-sm text-paper transition-colors hover:border-accent"
        >
          Share…
        </button>
      )}
      {/* Off-screen target for the manual-copy fallback. */}
      <input
        ref={inputRef}
        readOnly
        aria-hidden
        tabIndex={-1}
        defaultValue=""
        className="sr-only"
      />
      <span aria-live="polite" className="sr-only">
        {state === "copied" ? "Link copied" : ""}
      </span>
    </div>
  );
}
