"use client";

import { useEffect } from "react";
import Link from "next/link";
import Button, { buttonClasses } from "@/components/ui/Button";
import { Signpost } from "@/components/illustrations";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-dvh bg-canvas text-ink flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <Signpost className="mx-auto mb-6 text-ink" />
        <h1 className="font-serif text-title font-semibold">Something went wrong</h1>
        <p className="mt-2 text-ink-soft">Your work is saved. Try again, or head back to Today.</p>
        <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
          <Button variant="primary" icon="ti-refresh" onClick={reset}>
            Try again
          </Button>
          <Link href="/dashboard" className={buttonClasses({ variant: "quiet" })}>
            Back to Today
          </Link>
        </div>
      </div>
    </main>
  );
}
