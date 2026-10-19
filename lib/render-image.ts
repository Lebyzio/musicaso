import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import type { ReactNode } from "react";
import satori from "satori";
import { DEFAULT_FAMILY, loadCardFonts, realFamily } from "./fonts";

/**
 * Server-side PNG rendering for OG images and cards.
 *
 * Why not next/og's ImageResponse: Satori draws glyphs itself and drops the second of two
 * stacked Thai marks (ที่ → ที, ชื่อ → ชือ, ปู่ → ปู). Here Satori only does layout and emits
 * <text> (embedFont: false); resvg then shapes and draws the text with a HarfBuzz-style
 * shaper, which places Thai vowels and tone marks correctly.
 */

// initWasm may run only once per process — keep the promise on globalThis to survive HMR.
const WASM_KEY = Symbol.for("musicaso.resvg-wasm");
type WasmGlobal = typeof globalThis & { [WASM_KEY]?: Promise<void> };

function ensureResvg(): Promise<void> {
  const g = globalThis as WasmGlobal;
  g[WASM_KEY] ??= readFile(
    join(process.cwd(), "node_modules", "@resvg", "resvg-wasm", "index_bg.wasm"),
  ).then((wasm) => initWasm(wasm));
  return g[WASM_KEY];
}

/**
 * Satori writes our font names (lower-cased) into font-family; resvg needs the family names
 * stored in the font files, which also differ by weight ("Fraunces" vs "Fraunces SemiBold").
 */
export function mapFontFamilies(svg: string): string {
  return svg.replace(
    /font-weight="(\w+)"( font-style="\w+" font-size="[^"]+") font-family="([^"]*)"/g,
    (_, weight: string, middle: string, families: string) => {
      const numeric = weight === "bold" ? 700 : Number(weight) || 400;
      const names = [...new Set(families.split(",").map((f) => realFamily(f, numeric)))];
      return `font-weight="${weight}"${middle} font-family="${names.join(", ")}"`;
    },
  );
}

export async function renderPng(
  node: ReactNode,
  size: { width: number; height: number },
): Promise<Uint8Array> {
  const [fonts] = await Promise.all([loadCardFonts(), ensureResvg()]);
  const svg = await satori(node, { ...size, fonts: fonts.satori, embedFont: false });
  const resvg = new Resvg(mapFontFamilies(svg), {
    fitTo: { mode: "original" },
    font: { fontBuffers: fonts.sfnt, defaultFontFamily: DEFAULT_FAMILY },
  });
  return resvg.render().asPng();
}

export function pngResponse(png: Uint8Array, headers: Record<string, string> = {}): Response {
  return new Response(png as BodyInit, {
    headers: { "Content-Type": "image/png", ...headers },
  });
}
