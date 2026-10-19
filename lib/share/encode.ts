/**
 * Building share links — safe for the browser bundle (no zod). Decoding lives in codec.ts.
 */
import { compressToEncodedURIComponent } from "lz-string";
import type { Rating } from "../score";
import { encodeRatings, fitRatings } from "./ratings";
import { NAME_MAX, TEXT_MAX } from "./limits";
import { RATINGS_PATTERN } from "./ratings";
import type { ReviewPayload } from "./schema";

/** Share URLs longer than this get their review text shortened (AGENTS.md §5.2). */
export const URL_LIMIT = 1800;

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
    ...(p.w && { w: 1 as const }),
    ...(p.th && { th: p.th }),
    ...(p.l && { l: p.l }),
    ...(p.ref && { ref: { ...(refName && { n: refName }), r: p.ref.r } }),
  };
}

/**
 * Same rules as ReviewPayloadV1 (lib/share/schema.ts), checked by hand so the browser bundle
 * doesn't need zod just to build a link. Decoding (server side) still validates with zod.
 */
function assertEncodable(p: ReviewPayload): ReviewPayload {
  const ratingsOk = (r: string) => r.length <= 500 && RATINGS_PATTERN.test(r);
  const ok =
    p.v === 1 &&
    ["dz", "it", "mb"].includes(p.s) &&
    /^[A-Za-z0-9-]{1,64}$/.test(p.a) &&
    Number.isInteger(p.k) &&
    p.k >= 0 &&
    p.k <= 500 &&
    ratingsOk(p.r) &&
    (p.f === undefined || (Number.isInteger(p.f) && p.f >= 0)) &&
    (p.th === undefined || /^[a-z0-9-]{1,20}$/.test(p.th)) &&
    (p.l === undefined || /^[a-z]{2}$/.test(p.l)) &&
    (p.ref === undefined || ratingsOk(p.ref.r));
  if (!ok) throw new RangeError("Invalid review payload");
  return p;
}

export function encodePayload(payload: ReviewPayload): string {
  return compressToEncodedURIComponent(JSON.stringify(assertEncodable(normalize(payload))));
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
  weighted?: boolean;
  /** Card theme id; the default ("sleeve") is left out to keep links short. */
  theme?: string;
  /** UI language of the reviewer, used for the card and OG image; English is left out. */
  locale?: string;
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
    w: input.weighted ? 1 : undefined,
    th: input.theme && input.theme !== "sleeve" ? input.theme : undefined,
    l: input.locale && input.locale !== "en" ? input.locale : undefined,
    ref: input.reference && {
      n: input.reference.name,
      r: encodeRatings(fitRatings(input.reference.ratings, k)),
    },
  });
}
