"use client";

import Link from "next/link";
import { useEffect } from "react";

// App-wide error boundary. Catches render and server-action errors and shows a
// friendly message with a way forward — never a raw stack trace to the PMM.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface details in the console for debugging; keep the UI friendly.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="text-muted leading-relaxed">
        That didn&apos;t work as expected. You can try again, or head back to
        your dashboard.
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-black/10 px-5 py-2 text-sm font-medium transition-colors hover:bg-black/5"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
