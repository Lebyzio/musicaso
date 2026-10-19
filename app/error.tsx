"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <ErrorState
      error={error}
      retry={retry}
      body="This page hit an unexpected error. Any ratings you started are saved in this browser."
    />
  );
}
