"use client";

import "./globals.css";

/**
 * Last-resort boundary: replaces the root layout when it fails, so it brings its own <html>
 * and only relies on the global stylesheet (no web fonts, no layout components).
 */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-start justify-center gap-5 px-6 py-20 sm:px-16">
        <p className="text-xs tracking-[0.25em] text-accent uppercase">musicaso</p>
        <h1 className="text-4xl font-semibold sm:text-5xl">Something went wrong.</h1>
        <p className="max-w-md text-paper-dim">
          The app couldn’t load. Your ratings are saved in this browser — try again in a moment.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
