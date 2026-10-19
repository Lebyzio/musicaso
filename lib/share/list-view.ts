import type { AlbumResult } from "../music";
import type { Album } from "../music/types";
import { sharePath } from "./encode";
import { listItemReview } from "./list-encode";
import type { ListPayload } from "./list-schema";
import { type ReviewView, reviewView } from "./review-view";

/** One ranked entry of a shared list, as the page, OG image and cards draw it. */
export interface ListEntryView {
  rank: number;
  /** null when the album couldn't be loaded (removed from the catalogue, or the source is busy). */
  album: Album | null;
  review: ReviewView | null;
  /** The entry as a standalone review link (/r/…). */
  reviewPath: string;
}

export function listView(list: ListPayload, albums: readonly AlbumResult[]): ListEntryView[] {
  return list.i.map((_, index) => {
    const payload = listItemReview(list, index);
    const result = albums[index];
    const album = result?.ok ? result.album : null;
    return {
      rank: index + 1,
      album,
      review: album ? reviewView(album, payload) : null,
      reviewPath: sharePath(payload),
    };
  });
}
