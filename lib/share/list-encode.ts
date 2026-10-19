/**
 * Building top-list links — safe for the browser bundle (no zod). Decoding lives in list-codec.ts.
 */
import { compressToEncodedURIComponent } from "lz-string";
import type { Rating } from "../score";
import { type Fit, fitText, URL_LIMIT } from "./encode";
import { LIST_MAX, LIST_TITLE_MAX, NAME_MAX } from "./limits";
import type { ListItem, ListPayload } from "./list-schema";
import { encodeRatings, RATINGS_PATTERN } from "./ratings";
import type { ReviewPayload } from "./schema";

function clean(text: string | undefined, max: number): string | undefined {
  const trimmed = text?.trim();
  return trimmed ? [...trimmed].slice(0, max).join("") : undefined;
}

/** Fixed key order and no empty fields, so equal lists always produce the same URL. */
function normalizeList(p: ListPayload): ListPayload {
  const n = clean(p.n, NAME_MAX);
  const t = clean(p.t, LIST_TITLE_MAX);
  return {
    v: 1,
    ...(n && { n }),
    ...(t && { t }),
    ...(p.l && { l: p.l }),
    i: p.i.map((item) => ({
      s: item.s,
      a: item.a,
      k: item.k,
      r: item.r,
      ...(item.w && { w: 1 as const }),
    })),
  };
}

/** Same rules as ListPayloadV1, checked by hand to keep zod out of the browser bundle. */
function assertList(p: ListPayload): ListPayload {
  const keys = new Set(p.i.map((item) => `${item.s}:${item.a}`));
  const ok =
    p.v === 1 &&
    p.i.length >= 1 &&
    p.i.length <= LIST_MAX &&
    keys.size === p.i.length &&
    (p.l === undefined || /^[a-z]{2}$/.test(p.l)) &&
    p.i.every(
      (item) =>
        ["dz", "it", "mb"].includes(item.s) &&
        /^[A-Za-z0-9-]{1,64}$/.test(item.a) &&
        Number.isInteger(item.k) &&
        item.k >= 0 &&
        item.k <= 500 &&
        item.r.length <= 500 &&
        RATINGS_PATTERN.test(item.r),
    );
  if (!ok) throw new RangeError("Invalid list payload");
  return p;
}

export function encodeList(payload: ListPayload): string {
  return compressToEncodedURIComponent(JSON.stringify(assertList(normalizeList(payload))));
}

export function listPath(payload: ListPayload): string {
  return `/l/${encodeList(payload)}`;
}

/** The list URL, shortening the title if needed (ten 65-track albums still fit, ~1,000 chars). */
export function fitListUrl(
  origin: string,
  payload: ListPayload,
  limit = URL_LIMIT,
): Fit<ListPayload> {
  return fitText(payload, (p) => `${origin}${listPath(p)}`, limit);
}

export interface ListItemInput {
  source: ListItem["s"];
  albumId: string;
  ratings: readonly Rating[];
  weighted?: boolean;
}

export function buildList(input: {
  name?: string;
  title?: string;
  locale?: string;
  items: readonly ListItemInput[];
}): ListPayload {
  return normalizeList({
    v: 1,
    n: input.name,
    t: input.title,
    l: input.locale && input.locale !== "en" ? input.locale : undefined,
    i: input.items.map((item) => ({
      s: item.source,
      a: item.albumId,
      k: item.ratings.length,
      r: encodeRatings(item.ratings),
      w: item.weighted ? 1 : undefined,
    })),
  });
}

/** One entry of a list as a standalone review, by the list's author in the list's language. */
export function listItemReview(list: ListPayload, index: number): ReviewPayload {
  const item = list.i[index];
  return {
    v: 1,
    s: item.s,
    a: item.a,
    k: item.k,
    r: item.r,
    ...(list.n && { n: list.n }),
    ...(item.w && { w: 1 as const }),
    ...(list.l && { l: list.l }),
  };
}
