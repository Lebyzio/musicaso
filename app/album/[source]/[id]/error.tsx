"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function AlbumError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorState error={error} retry={retry} />;
}
