import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { woffToSfnt } from "./woff";

/**
 * Fonts for server-rendered images (OG image, PNG cards). Files live in assets/fonts — run
 * `pnpm fonts` to refresh them from @fontsource.
 *
 * Two names per font:
 * - `name`: what Satori and our styles use. Thai and Latin Plex need different names because
 *   Satori does not merge same-named fonts, so "Fraunces, Plex Thai" falls through to Thai.
 * - `family`: the family name stored inside the file, which is what resvg matches when it draws
 *   the text (see lib/render-image.ts).
 */
interface FontSpec {
  name: string;
  family: string;
  file: string;
  weight: 400 | 600;
  style: "normal" | "italic";
}

const SPECS: FontSpec[] = [
  {
    name: "Fraunces",
    family: "Fraunces",
    file: "fraunces-latin-400-normal.woff",
    weight: 400,
    style: "normal",
  },
  {
    name: "Fraunces",
    family: "Fraunces",
    file: "fraunces-latin-400-italic.woff",
    weight: 400,
    style: "italic",
  },
  {
    name: "Fraunces",
    family: "Fraunces SemiBold",
    file: "fraunces-latin-600-normal.woff",
    weight: 600,
    style: "normal",
  },
  {
    name: "Plex",
    family: "IBM Plex Sans Thai",
    file: "ibm-plex-sans-thai-latin-400-normal.woff",
    weight: 400,
    style: "normal",
  },
  {
    name: "Plex Thai",
    family: "IBM Plex Sans Thai",
    file: "ibm-plex-sans-thai-thai-400-normal.woff",
    weight: 400,
    style: "normal",
  },
];

/** Card text uses Plex at 400 only: resvg can't fall back between same-family subsets by weight. */
export const CARD_FONT = {
  display: "Fraunces, Plex Thai",
  body: "Plex, Plex Thai",
} as const;

export const DEFAULT_FAMILY = "IBM Plex Sans Thai";

export interface SatoriFont {
  name: string;
  data: Buffer;
  weight: 400 | 600;
  style: "normal" | "italic";
}

export interface CardFonts {
  /** WOFF data for Satori's layout pass. */
  satori: SatoriFont[];
  /** Raw sfnt data for resvg, which draws (and shapes) the text. */
  sfnt: Uint8Array[];
}

/** Map a Satori font name + weight to the family name resvg sees in the file. */
export function realFamily(name: string, weight: number): string {
  const bold = weight >= 600;
  const matches = SPECS.filter((s) => s.name.toLowerCase() === name.trim().toLowerCase());
  const spec = matches.find((s) => s.weight >= 600 === bold) ?? matches[0];
  return spec?.family ?? name.trim();
}

let fonts: Promise<CardFonts> | undefined;

/** Read once per server instance; fonts don't depend on the request. */
export function loadCardFonts(): Promise<CardFonts> {
  fonts ??= Promise.all(
    SPECS.map(async (spec) => ({
      spec,
      data: await readFile(join(process.cwd(), "assets", "fonts", spec.file)),
    })),
  ).then((loaded) => ({
    satori: loaded.map(({ spec, data }) => ({
      name: spec.name,
      data,
      weight: spec.weight,
      style: spec.style,
    })),
    sfnt: loaded.map(({ data }) => woffToSfnt(data)),
  }));
  return fonts;
}
