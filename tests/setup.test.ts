import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { describe, expect, it } from "vitest";
import { z } from "zod";

// Smoke test: toolchain + path alias + core deps resolve under Vitest.
describe("toolchain", () => {
  it("round-trips a zod-validated payload through lz-string", () => {
    const Schema = z.object({ v: z.literal(1), a: z.string() });
    const encoded = compressToEncodedURIComponent(JSON.stringify({ v: 1, a: "302127" }));
    const decoded = Schema.parse(JSON.parse(decompressFromEncodedURIComponent(encoded)));
    expect(decoded).toEqual({ v: 1, a: "302127" });
  });
});
