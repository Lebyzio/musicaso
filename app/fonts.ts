import { Fraunces, Geist, Geist_Mono, IBM_Plex_Sans_Thai } from "next/font/google";

// Web fonts for the UI. ImageResponse (OG / card PNG) loads its own TTFs in lib/fonts.ts —
// keep IBM Plex Sans Thai in sync there so Thai titles look the same on the page and the card.

export const fontDisplay = Fraunces({
  variable: "--font-fraunces",
  // Latin only, no extra axes: the variable files with opsz/SOFT + latin-ext were ~500 KB and
  // delayed LCP on mobile (Lighthouse). Thai falls through to Plex anyway.
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const fontSans = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const fontMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false, // only scores use it; not needed for first paint
});

// Second in every font stack (see globals.css): Latin text uses the face before it, Thai glyphs
// fall through to this one. `subsets` only controls preloading — Latin is never needed from here.
export const fontThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai"],
  weight: ["400", "500", "600"],
});

export const fontVariables = [fontDisplay, fontSans, fontMono, fontThai]
  .map((f) => f.variable)
  .join(" ");
