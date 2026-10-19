import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ImageResponse } from "next/og";

/**
 * Fonts for ImageResponse (OG image, PNG cards). Files live in assets/fonts — run `pnpm fonts`
 * to refresh them from @fontsource. Thai and Latin Plex are registered under separate names so
 * a font stack like "Fraunces, Plex Thai" picks Thai glyphs from the Thai subset.
 */
type FontSpec = {
  name: string;
  file: string;
  weight: 400 | 600;
  style: "normal" | "italic";
};

const SPECS: FontSpec[] = [
  { name: "Fraunces", file: "fraunces-latin-400-normal.woff", weight: 400, style: "normal" },
  { name: "Fraunces", file: "fraunces-latin-600-normal.woff", weight: 600, style: "normal" },
  { name: "Fraunces", file: "fraunces-latin-400-italic.woff", weight: 400, style: "italic" },
  { name: "Plex", file: "ibm-plex-sans-thai-latin-400-normal.woff", weight: 400, style: "normal" },
  { name: "Plex", file: "ibm-plex-sans-thai-latin-600-normal.woff", weight: 600, style: "normal" },
  {
    name: "Plex Thai",
    file: "ibm-plex-sans-thai-thai-400-normal.woff",
    weight: 400,
    style: "normal",
  },
  {
    name: "Plex Thai",
    file: "ibm-plex-sans-thai-thai-600-normal.woff",
    weight: 600,
    style: "normal",
  },
];

export const CARD_FONT = {
  display: "Fraunces, Plex Thai",
  body: "Plex, Plex Thai",
} as const;

type ImageResponseOptions = NonNullable<ConstructorParameters<typeof ImageResponse>[1]>;
type CardFonts = NonNullable<ImageResponseOptions["fonts"]>;

let fonts: Promise<CardFonts> | undefined;

/** Read once per server instance; fonts don't depend on the request. */
export function loadCardFonts(): Promise<CardFonts> {
  fonts ??= Promise.all(
    SPECS.map(async ({ name, file, weight, style }) => ({
      name,
      data: await readFile(join(process.cwd(), "assets", "fonts", file)),
      weight,
      style,
    })),
  );
  return fonts;
}
