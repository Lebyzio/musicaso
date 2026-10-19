import Link from "next/link";

export function SiteHeader() {
  return (
    <header
      className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-8"
      style={{ viewTransitionName: "site-header" }}
    >
      <Link
        href="/"
        className="font-display text-2xl tracking-tight italic [font-variation-settings:'SOFT'_100]"
      >
        musicaso<span className="text-accent">.</span>
      </Link>
      <p className="hidden text-xs tracking-[0.2em] text-paper-mute uppercase sm:block">
        Track-by-track album reviews
      </p>
    </header>
  );
}
