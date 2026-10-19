import { decompressFromEncodedURIComponent } from "lz-string";
import { type ReviewPayload, ReviewPayloadV1 } from "./schema";

// Encoding is zod-free so the editor can build links without shipping zod to the browser;
// it is re-exported here so server code can import everything from one place.
export * from "./encode";

/** Refuse to even try decompressing absurdly long segments. */
const MAX_ENCODED = 4000;

export type DecodeResult =
  | { ok: true; payload: ReviewPayload }
  | { ok: false; reason: "empty" | "corrupt" | "unsupported_version" | "invalid" };

/** Never throws: a broken link is an expected input, not an exception. */
export function decodePayload(encoded: string | undefined | null): DecodeResult {
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

  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, reason: "corrupt" };
  }

  const parsed = ReviewPayloadV1.safeParse(data);
  if (parsed.success) return { ok: true, payload: parsed.data };
  const version =
    typeof data === "object" && data !== null ? (data as { v?: unknown }).v : undefined;
  return {
    ok: false,
    reason: version !== undefined && version !== 1 ? "unsupported_version" : "invalid",
  };
}
