import { getT } from "@/lib/i18n/server";

export async function SiteFooter() {
  const t = await getT();
  return (
    <footer className="mx-auto w-full max-w-6xl border-t border-ink-700 px-4 py-8 text-sm text-paper-mute sm:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>{t.footer.noDatabase}</p>
        <p>{t.footer.data}</p>
      </div>
    </footer>
  );
}
