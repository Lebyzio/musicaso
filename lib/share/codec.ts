import { type ReviewPayload, ReviewPayloadV1 } from "./schema";
import { decodeSegment, invalidReason } from "./segment";

// Encoding is zod-free so the editor can build links without shipping zod to the browser;
// it is re-exported here so server code can import everything from one place.
export * from "./encode";

export type DecodeResult =
  | { ok: true; payload: ReviewPayload }
  | { ok: false; reason: "empty" | "corrupt" | "unsupported_version" | "invalid" };

/** Never throws: a broken link is an expected input, not an exception. */
export function decodePayload(encoded: string | undefined | null): DecodeResult {
  const segment = decodeSegment(encoded);
  if (!segment.ok) return segment;
  const parsed = ReviewPayloadV1.safeParse(segment.data);
  if (parsed.success) return { ok: true, payload: parsed.data };
  return { ok: false, reason: invalidReason(segment.data) };
}
