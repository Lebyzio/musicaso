import { Fraunces, Geist, Geist_Mono, IBM_Plex_Sans_Thai } from "next/font/google";

// Web fonts for the UI. ImageResponse (OG / card PNG) loads its own TTFs in lib/fonts.ts —
// keep IBM Plex Sans Thai in sync there so Thai titles look the same on the page and the card.

export const fontDisplay = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
});

export const fontSans = Geist({
  variable: "--font-geist",
  subsets: ["latin", "latin-ext"],
});

export const fontMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Second in every font stack (see globals.css): Latin text uses the face before it, Thai glyphs
// fall through to this one. `subsets` only controls preloading — Latin is never needed from here.
export const fontThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai"],
  weight: ["400", "500", "600", "700"],
});

export const fontVariables = [fontDisplay, fontSans, fontMono, fontThai]
  .map((f) => f.variable)
  .join(" ");
