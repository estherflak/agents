"use client";

import { useFormStatus } from "react-dom";

// The clickable use-case card on the dashboard. Rendered inside a <form> whose
// action creates the workflow; useFormStatus lets it show a pending state while
// that server action runs and redirects into the builder.
export default function ScaffoldCard({
  title,
  blurb,
  steps,
}: {
  title: string;
  blurb: string;
  steps: string[];
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`group h-full w-full rounded-2xl border border-black/8 bg-white p-5 text-left transition-colors hover:border-accent/40 disabled:cursor-default ${
        pending ? "opacity-60" : ""
      }`}
    >
      <div className="font-semibold">{title}</div>
      <p className="mt-1 text-sm text-muted">{blurb}</p>
      <div className="mt-3 text-xs text-muted">{steps.join("  →  ")}</div>
      <span className="mt-4 inline-block text-sm font-medium text-accent">
        {pending ? "Starting…" : "Start →"}
      </span>
    </button>
  );
}
