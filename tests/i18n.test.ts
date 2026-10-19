import { describe, expect, it } from "vitest";
import { DICTIONARIES, isLocale, pickLocale } from "@/lib/i18n";

describe("pickLocale", () => {
  it("uses a valid cookie first", () => {
    expect(pickLocale("th", "en-US,en;q=0.9")).toBe("th");
    expect(pickLocale("en", "th-TH,th;q=0.9")).toBe("en");
  });

  it("ignores an unknown cookie", () => {
    expect(pickLocale("fr", "th-TH")).toBe("th");
  });

  it("follows Accept-Language by q-value, then order", () => {
    expect(pickLocale(undefined, "th-TH,th;q=0.9,en-US;q=0.8")).toBe("th");
    expect(pickLocale(undefined, "en-US,en;q=0.9,th;q=0.8")).toBe("en");
    expect(pickLocale(undefined, "en;q=0.5,th;q=0.8")).toBe("th");
    expect(pickLocale(undefined, "ja-JP,th;q=0.7")).toBe("th");
  });

  it("falls back to English", () => {
    expect(pickLocale(undefined, null)).toBe("en");
    expect(pickLocale(undefined, "ja,fr;q=0.9")).toBe("en");
    expect(pickLocale(undefined, "th;q=0")).toBe("en");
    expect(pickLocale(undefined, "*")).toBe("en");
  });
});

describe("isLocale", () => {
  it("accepts only supported languages", () => {
    expect(isLocale("th")).toBe(true);
    expect(isLocale("TH")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});

/** Every leaf path with its kind, so a Thai entry can't silently be a string where English has a function. */
function shape(value: unknown, path = ""): string[] {
  if (typeof value === "function") return [`${path}:fn${value.length}`];
  if (typeof value === "string") return [`${path}:str`];
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    shape(v, `${path}.${k}`),
  );
}

describe("dictionaries", () => {
  it("have the same keys and kinds in every language", () => {
    expect(shape(DICTIONARIES.th)).toEqual(shape(DICTIONARIES.en));
  });

  it("have no empty strings", () => {
    for (const dict of Object.values(DICTIONARIES)) {
      const empty = shape(dict).filter((leaf) => leaf.endsWith(":str"));
      for (const leaf of empty) {
        const value = leaf
          .slice(1, -4)
          .split(".")
          .reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], dict);
        if (leaf.includes("verdictOf")) continue; // "before"/"after" may be empty by design
        expect(value, leaf).not.toBe("");
      }
    }
  });
});
