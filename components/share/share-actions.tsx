"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const subscribeNever = () => () => {};

/** navigator.share exists only on some browsers (mostly mobile); false during SSR. */
export function useCanShare(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );
}

export const BUTTON_SECONDARY =
  "rounded-full border border-ink-600 px-5 py-2.5 text-sm text-paper transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ink-600";

/**
 * Copies a URL to the clipboard. When the browser refuses (permissions, insecure context),
 * the URL is put in an off-screen input and selected so the user can press Ctrl/Cmd+C.
 */
export function CopyLinkButton({
  getUrl,
  disabled = false,
}: {
  getUrl: () => string;
  disabled?: boolean;
}) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state === "idle") return;
    const id = setTimeout(() => setState("idle"), 2500);
    return () => clearTimeout(id);
  }, [state]);

  async function copy() {
    const url = getUrl();
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      const el = inputRef.current;
      if (el) {
        el.value = url;
        el.focus();
        el.select();
      }
      setState("manual");
    }
  }

  return (
    <>
      <button type="button" onClick={copy} disabled={disabled} className={BUTTON_SECONDARY}>
        {state === "copied" ? "Copied!" : state === "manual" ? "Press Ctrl+C to copy" : "Copy link"}
      </button>
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
    </>
  );
}

export function NativeShareButton({
  getUrl,
  title,
  text,
  disabled = false,
}: {
  getUrl: () => string;
  title: string;
  text?: string;
  disabled?: boolean;
}) {
  const canShare = useCanShare();
  if (!canShare) return null;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={async () => {
        try {
          await navigator.share({ url: getUrl(), title, text });
        } catch {
          // Dismissed by the user, or blocked — nothing to report.
        }
      }}
      className={BUTTON_SECONDARY}
    >
      Share…
    </button>
  );
}

/** Actions on a shared review: answer it with your own review, or pass the link on. */
export function ShareActions({ reviewItHref, title }: { reviewItHref: string; title: string }) {
  const currentUrl = () => window.location.href;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={reviewItHref}
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink"
      >
        Review it yourself
      </Link>
      <CopyLinkButton getUrl={currentUrl} />
      <NativeShareButton getUrl={currentUrl} title={title} />
    </div>
  );
}
