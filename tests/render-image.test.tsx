import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CARD_FONT, realFamily } from "@/lib/fonts";
import { mapFontFamilies, renderPng } from "@/lib/render-image";
import { woffToSfnt } from "@/lib/woff";

const font = (file: string) =>
  new Uint8Array(readFileSync(join(process.cwd(), "assets/fonts", file)));

function tags(sfnt: Uint8Array): string[] {
  const view = new DataView(sfnt.buffer, sfnt.byteOffset, sfnt.byteLength);
  return Array.from({ length: view.getUint16(4) }, (_, i) =>
    String.fromCharCode(...sfnt.subarray(12 + i * 16, 16 + i * 16)),
  );
}

describe("woffToSfnt", () => {
  it("unpacks every table of a real WOFF", () => {
    const woff = font("ibm-plex-sans-thai-thai-400-normal.woff");
    const sfnt = woffToSfnt(woff);
    const woffTables = new DataView(woff.buffer, woff.byteOffset).getUint16(12);
    expect(tags(sfnt)).toHaveLength(woffTables);
    expect(tags(sfnt)).toEqual(expect.arrayContaining(["cmap", "head", "name", "GPOS"]));
    expect(sfnt.length % 4).toBe(0);
  });

  it("rejects non-WOFF input", () => {
    expect(() => woffToSfnt(new Uint8Array(64))).toThrow("Not a WOFF");
  });
});

describe("font family mapping", () => {
  it("maps Satori names to the families stored in the files, by weight", () => {
    expect(realFamily("fraunces", 400)).toBe("Fraunces");
    expect(realFamily("fraunces", 600)).toBe("Fraunces SemiBold");
    expect(realFamily("plex thai", 400)).toBe("IBM Plex Sans Thai");
    expect(realFamily(" plex ", 400)).toBe("IBM Plex Sans Thai");
    expect(realFamily("Unknown", 400)).toBe("Unknown");
  });

  it("rewrites font-family attributes in Satori's SVG", () => {
    const svg =
      '<text font-weight="600" font-style="normal" font-size="96" font-family="fraunces,plex thai">8</text>' +
      '<text font-weight="normal" font-style="italic" font-size="40" font-family="plex,plex thai">x</text>';
    expect(mapFontFamilies(svg)).toBe(
      '<text font-weight="600" font-style="normal" font-size="96" font-family="Fraunces SemiBold, IBM Plex Sans Thai">8</text>' +
        '<text font-weight="normal" font-style="italic" font-size="40" font-family="IBM Plex Sans Thai">x</text>',
    );
  });
});

describe("renderPng", () => {
  it("renders Thai with stacked marks to a PNG of the requested size", async () => {
    const png = await renderPng(
      <div style={{ display: "flex", width: "100%", height: "100%", fontFamily: CARD_FONT.body }}>
        ที่นี่ ชื่อ ญี่ปุ่น — In Rainbows
      </div>,
      { width: 320, height: 80 },
    );
    const view = new DataView(png.buffer, png.byteOffset);
    expect([...png.subarray(1, 4)].map((c) => String.fromCharCode(c)).join("")).toBe("PNG");
    expect([view.getUint32(16), view.getUint32(20)]).toEqual([320, 80]);
  }, 20000);
});
