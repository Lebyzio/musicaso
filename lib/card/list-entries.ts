import type { ListCardEntry } from "@/components/card/list-card";
import { coverDataUri } from "../cover-image";
import type { Dictionary } from "../i18n";
import { loadAlbum } from "../music";
import type { ListPayload } from "../share/list-schema";
import { type ListEntryView, listView } from "../share/list-view";

/** Every album of a list, loaded in parallel (each through the Data Cache). */
export async function loadListView(list: ListPayload): Promise<ListEntryView[]> {
  const albums = await Promise.all(list.i.map((item) => loadAlbum(item.s, item.a)));
  return listView(list, albums);
}

/** The cover of the best-ranked album that loaded — the list's colour comes from it. */
export function leadCover(entries: ListEntryView[]): string {
  return entries.find((e) => e.album?.coverUrl)?.album?.coverUrl ?? "";
}

/** What a list card or OG image draws per entry, covers fetched at the drawn size. */
export function listCardEntries(
  entries: ListEntryView[],
  coverPx: number,
  t: Dictionary,
): Promise<ListCardEntry[]> {
  return Promise.all(
    entries.map(async (e) => ({
      rank: e.rank,
      title: e.album?.title ?? t.image.missingAlbum,
      artist: e.album?.artist ?? "",
      year: e.album?.year,
      score: e.review?.score ?? null,
      cover: e.album ? await coverDataUri(e.album.coverUrl, coverPx) : null,
    })),
  );
}
