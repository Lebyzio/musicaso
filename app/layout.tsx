import type { Metadata, Viewport } from "next";
import { SiteFooter } from "@/components/ui/site-footer";
import { SiteHeader } from "@/components/ui/site-header";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "musicaso — rate albums track by track",
    template: "%s · musicaso",
  },
  description:
    "Rate every track, get the album score, and share your review as a link or an image card. No sign-up.",
};

export const viewport: Viewport = {
  themeColor: "#0c0b0a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontVariables} h-full`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only rounded-full bg-accent px-4 py-2 text-accent-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 sm:px-8">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
