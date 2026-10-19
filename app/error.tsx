"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorState error={error} retry={retry} />;
}
