"use client";

import { useEffect, useState } from "react";

// A one-screen intro shown on first load, dismissed for good via localStorage.
// Explains in plain terms what "building an agent" means here.
const DISMISS_KEY = "agents_intro_dismissed_v1";

export default function IntroBanner() {
  // Start hidden so we never flash the banner for returning users during
  // hydration; reveal only after we've checked localStorage on the client.
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(localStorage.getItem(DISMISS_KEY) !== "1");
  }, []);

  if (!show) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-accent/20 bg-accent/5 px-6 py-6">
      <h2 className="text-lg font-semibold tracking-tight">
        New here? An agent is just a few clear steps.
      </h2>
      <p className="text-muted leading-relaxed">
        You build an agent by writing a short chain of steps yourself — research,
        draft, refine. Run it on Ridgeline&apos;s sample company data or your own
        pasted text, and each step&apos;s output flows into the next. Everything
        saves, so you can reopen a workflow and its past runs anytime.
      </p>
      <div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Got it
        </button>
      </div>
    </section>
  );
}
