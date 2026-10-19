import { decompressFromEncodedURIComponent } from "lz-string";

/** Refuse to even try decompressing absurdly long segments. */
const MAX_ENCODED = 4000;

export type SegmentResult =
  { ok: true; data: unknown } | { ok: false; reason: "empty" | "corrupt" };

/**
 * A URL path segment back to JSON (lz-string). Never throws: a broken link is an expected input.
 * Shared by review links (/r) and list links (/l); each validates the JSON with its own schema.
 */
export function decodeSegment(encoded: string | undefined | null): SegmentResult {
  if (!encoded) return { ok: false, reason: "empty" };
  if (encoded.length > MAX_ENCODED) return { ok: false, reason: "corrupt" };

  // Route params can arrive still percent-encoded ("+" as "%2B"); the lz alphabet never contains "%".
  let raw = encoded;
  if (raw.includes("%")) {
    try {
      raw = decodeURIComponent(raw);
    } catch {
      return { ok: false, reason: "corrupt" };
    }
  }

  let json: string | null;
  try {
    json = decompressFromEncodedURIComponent(raw);
  } catch {
    json = null;
  }
  if (!json) return { ok: false, reason: "corrupt" };

  try {
    return { ok: true, data: JSON.parse(json) };
  } catch {
    return { ok: false, reason: "corrupt" };
  }
}

/** "unsupported_version" when the JSON names a version other than 1, else "invalid". */
export function invalidReason(data: unknown): "unsupported_version" | "invalid" {
  const version =
    typeof data === "object" && data !== null ? (data as { v?: unknown }).v : undefined;
  return version !== undefined && version !== 1 ? "unsupported_version" : "invalid";
}
