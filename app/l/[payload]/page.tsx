import type { Metadata } from "next";
import { SharedList } from "@/components/list/shared-list";
import { BrokenLink } from "@/components/share/broken-link";
import { getPageAccent } from "@/lib/accent";
import { leadCover, loadListView } from "@/lib/card/list-entries";
import { type Dictionary, getDictionary, isLocale } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { decodeList, encodeList } from "@/lib/share/list-codec";
import type { ListPayload } from "@/lib/share/list-schema";

/** Link previews speak the list author's language (the payload's), not the crawler's. */
function payloadDictionary(list: ListPayload): Dictionary {
  return getDictionary(isLocale(list.l) ? list.l : "en");
}

export async function generateMetadata({ params }: PageProps<"/l/[payload]">): Promise<Metadata> {
  const { payload } = await params;
  const decoded = decodeList(payload);
  if (!decoded.ok) {
    return { title: (await getT()).meta.brokenTitle, robots: { index: false } };
  }
  const list = decoded.payload;
  const t = payloadDictionary(list);
  const listTitle = list.t ?? t.list.fallbackTitle;
  const title = list.n ? `${listTitle} — ${t.list.by(list.n)}` : listTitle;
  const view = await loadListView(list);
  const titles = view
    .filter((e) => e.album)
    .slice(0, 5)
    .map((e) => `${e.rank}. ${e.album!.title}`)
    .join(", ");
  const description = t.list.metaDescription(titles);
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SharedListPage({ params }: PageProps<"/l/[payload]">) {
  const { payload } = await params;
  const decoded = decodeList(payload);
  if (!decoded.ok) return <BrokenLink reason={decoded.reason} />;

  const list = decoded.payload;
  const [view, t] = await Promise.all([loadListView(list), getT()]);
  const accent = await getPageAccent(leadCover(view));
  return (
    <SharedList
      title={list.t ?? t.list.fallbackTitle}
      name={list.n}
      entries={view}
      accent={accent}
      listPath={`/l/${encodeList(list)}`}
    />
  );
}
