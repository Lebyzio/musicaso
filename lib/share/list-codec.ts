import { type ListPayload, ListPayloadV1 } from "./list-schema";
import { decodeSegment, invalidReason } from "./segment";

export * from "./list-encode";

export type ListDecodeResult =
  | { ok: true; payload: ListPayload }
  | { ok: false; reason: "empty" | "corrupt" | "unsupported_version" | "invalid" };

/** Never throws: a broken link is an expected input, not an exception. */
export function decodeList(encoded: string | undefined | null): ListDecodeResult {
  const segment = decodeSegment(encoded);
  if (!segment.ok) return segment;
  const parsed = ListPayloadV1.safeParse(segment.data);
  if (!parsed.success) return { ok: false, reason: invalidReason(segment.data) };
  // The same album twice would rank it against itself.
  const keys = new Set(parsed.data.i.map((item) => `${item.s}:${item.a}`));
  if (keys.size !== parsed.data.i.length) return { ok: false, reason: "invalid" };
  return { ok: true, payload: parsed.data };
}
