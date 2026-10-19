import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import type { Rating } from "../score";
import { encodeRatings, fitRatings } from "./ratings";
import { NAME_MAX, type ReviewPayload, ReviewPayloadV1, TEXT_MAX } from "./schema";

/** Share URLs longer than this get their review text shortened (AGENTS.md §5.2). */
export const URL_LIMIT = 1800;
/** Refuse to even try decompressing absurdly long segments. */
const MAX_ENCODED = 4000;

export type DecodeResult =
  | { ok: true; payload: ReviewPayload }
  | { ok: false; reason: "empty" | "corrupt" | "unsupported_version" | "invalid" };

function clean(text: string | undefined, max: number): string | undefined {
  const trimmed = text?.trim();
  return trimmed ? [...trimmed].slice(0, max).join("") : undefined;
}

/** Fixed key order and no empty fields, so equal reviews always produce the same URL. */
function normalize(p: ReviewPayload): ReviewPayload {
  const n = clean(p.n, NAME_MAX);
  const t = clean(p.t, TEXT_MAX);
  const refName = clean(p.ref?.n, NAME_MAX);
  return {
    v: 1,
    s: p.s,
    a: p.a,
    k: p.k,
    r: p.r,
    ...(n && { n }),
    ...(t && { t }),
    ...(p.f !== undefined && { f: p.f }),
    ...(p.th && { th: p.th }),
    ...(p.ref && { ref: { ...(refName && { n: refName }), r: p.ref.r } }),
  };
}

export function encodePayload(payload: ReviewPayload): string {
  return compressToEncodedURIComponent(JSON.stringify(ReviewPayloadV1.parse(normalize(payload))));
}

/** Never throws: a broken link is an expected input, not an exception. */
export function decodePayload(encoded: string | undefined | null): DecodeResult {
  if (!encoded) return { ok: false, reason: "empty" };
  if (encoded.length > MAX_ENCODED) return { ok: false, reason: "corrupt" };

  let json: string | null;
  try {
    json = decompressFromEncodedURIComponent(encoded);
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

export function sharePath(payload: ReviewPayload): string {
  return `/r/${encodePayload(payload)}`;
}

export interface FitResult {
  payload: ReviewPayload;
  url: string;
  /** The review text was shortened (or dropped) to keep the URL under the limit. */
  truncated: boolean;
  /** Still over the limit even without review text. */
  tooLong: boolean;
}

/** Build the share URL, shortening the review text if the URL would exceed `limit`. */
export function fitShareUrl(origin: string, payload: ReviewPayload, limit = URL_LIMIT): FitResult {
  const urlFor = (p: ReviewPayload) => `${origin}${sharePath(p)}`;
  const url = urlFor(payload);
  if (url.length <= limit) return { payload, url, truncated: false, tooLong: false };

  const bare: ReviewPayload = { ...payload };
  delete bare.t;
  const bareUrl = urlFor(bare);
  if (!payload.t || bareUrl.length > limit) {
    return { payload: bare, url: bareUrl, truncated: Boolean(payload.t), tooLong: true };
  }

  // Longest prefix of the text that still fits. Compression makes length only roughly
  // monotonic in text length, which is fine for a binary search over a ≤280 char string.
  const chars = [...payload.t];
  let best: FitResult = { payload: bare, url: bareUrl, truncated: true, tooLong: false };
  let lo = 1;
  let hi = chars.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const candidate = { ...payload, t: `${chars.slice(0, mid).join("").trimEnd()}…` };
    const candidateUrl = urlFor(candidate);
    if (candidateUrl.length <= limit) {
      best = { payload: candidate, url: candidateUrl, truncated: true, tooLong: false };
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

export interface PayloadInput {
  source: ReviewPayload["s"];
  albumId: string;
  ratings: readonly Rating[];
  name?: string;
  text?: string;
  favorite?: number;
  /** The review this one answers ("Review it yourself"). Its own reference is never carried over. */
  reference?: { name?: string; ratings: readonly Rating[] };
}

export function buildPayload(input: PayloadInput): ReviewPayload {
  const k = input.ratings.length;
  return normalize({
    v: 1,
    s: input.source,
    a: input.albumId,
    k,
    r: encodeRatings(input.ratings),
    n: input.name,
    t: input.text,
    f: input.favorite,
    ref: input.reference && {
      n: input.reference.name,
      r: encodeRatings(fitRatings(input.reference.ratings, k)),
    },
  });
}
