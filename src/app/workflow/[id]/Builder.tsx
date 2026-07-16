"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { sandboxAssets } from "@/lib/sandbox";
import { MAX_INPUT_CHARS, MAX_RUNS_PER_DAY } from "@/lib/config";
import {
  completeRun,
  createRun,
  saveStepInstructions,
} from "./actions";

// ---------------------------------------------------------------------------
// Props: everything the server loaded for this workflow.
// ---------------------------------------------------------------------------

export type StepData = {
  id: string;
  step_index: number;
  title: string;
  instructions: string;
};

type BuilderProps = {
  workflowId: string;
  title: string;
  steps: StepData[];
  /** exampleInstructions per step (aligned by array position); "" if none. */
  examples: string[];
  /** Effective runs used today (already day-reset on the server). */
  initialRunsToday: number;
  /** The user's most recent run for this workflow, restored on load (or null). */
  initialRun: { id: string; input: string; complete: boolean } | null;
  /** Outputs from that run, keyed by step_index — rehydrates the cards. */
  initialOutputs: Record<number, StepOutput>;
  /** All runs for this workflow, newest first — feeds the "Past runs" links. */
  pastRuns: { id: string; createdAt: string; complete: boolean }[];
};

// e.g. "Jul 16, 2026, 3:42 PM"
function formatRunTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Per-step run state, keyed by step_index.
export type StepOutput =
  | { status: "running" }
  | { status: "ok"; output: string }
  | { status: "error"; error: string };

const PLACEHOLDER = "What should this step gather or produce?";
const CUSTOM = "__custom__";

async function postRunStep(payload: unknown): Promise<{
  status: number;
  output?: string;
  runsToday?: number;
  error?: string;
}> {
  let res: Response;
  try {
    res = await fetch("/api/run-step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Network error (offline, dropped connection) — never a stack trace.
    return {
      status: 0,
      error: "Couldn't reach the server. Check your connection and try again.",
    };
  }
  let data: { output?: string; runsToday?: number; error?: string } = {};
  try {
    data = await res.json();
  } catch {
    // Non-JSON (e.g. a gateway timeout page) — fall through with just status.
  }
  return { status: res.status, ...data };
}

export default function Builder({
  workflowId,
  title,
  steps,
  examples,
  initialRunsToday,
  initialRun,
  initialOutputs,
  pastRuns,
}: BuilderProps) {
  // --- Instructions (editable, autosaved) --------------------------------
  const [instr, setInstr] = useState<Record<string, string>>(() =>
    Object.fromEntries(steps.map((s) => [s.id, s.instructions])),
  );
  const [showExample, setShowExample] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">(
    "saved",
  );
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pending = useRef<Set<string>>(new Set());

  // --- Input panel -------------------------------------------------------
  // When restoring a past run, match its input_text back to a sandbox asset so
  // the picker reflects what was used; fall back to the custom paste box.
  const restoredInput = initialRun?.input ?? "";
  const restoredAssetId = initialRun
    ? (sandboxAssets.find((a) => a.text === restoredInput)?.id ?? CUSTOM)
    : (sandboxAssets[0]?.id ?? CUSTOM);
  const [assetId, setAssetId] = useState<string>(restoredAssetId);
  const [customText, setCustomText] = useState(
    initialRun && restoredAssetId === CUSTOM ? restoredInput : "",
  );

  const currentInput = () =>
    assetId === CUSTOM
      ? customText
      : sandboxAssets.find((a) => a.id === assetId)?.text ?? "";

  // --- Run state (seeded from the restored run, if any) ------------------
  const [run, setRun] = useState<{ id: string; input: string } | null>(
    initialRun ? { id: initialRun.id, input: initialRun.input } : null,
  );
  const [outputs, setOutputs] =
    useState<Record<number, StepOutput>>(initialOutputs);
  const [runComplete, setRunComplete] = useState(initialRun?.complete ?? false);
  const [busy, setBusy] = useState(false);
  const [capMessage, setCapMessage] = useState<string | null>(null);
  const [runsToday, setRunsToday] = useState(initialRunsToday);

  // Group sandbox assets by category for the dropdown's optgroups.
  const grouped = useMemo(() => {
    const map = new Map<string, typeof sandboxAssets>();
    for (const a of sandboxAssets) {
      if (!map.has(a.category)) map.set(a.category, []);
      map.get(a.category)!.push(a);
    }
    return [...map.entries()];
  }, []);

  const inputChars = currentInput().length;
  const inputTooLong = inputChars > MAX_INPUT_CHARS;

  // --- Autosave ----------------------------------------------------------
  async function flush(stepId: string, value: string) {
    delete timers.current[stepId];
    const res = await saveStepInstructions(workflowId, stepId, value);
    pending.current.delete(stepId);
    if ("error" in res) {
      setSaveStatus("unsaved");
    } else if (pending.current.size === 0) {
      setSaveStatus("saved");
    }
  }

  function onInstrChange(stepId: string, value: string) {
    setInstr((prev) => ({ ...prev, [stepId]: value }));
    setSaveStatus("saving");
    pending.current.add(stepId);
    clearTimeout(timers.current[stepId]);
    timers.current[stepId] = setTimeout(() => flush(stepId, value), 700);
  }

  async function saveNow() {
    // Flush any debounced-but-not-yet-sent edits immediately.
    const ids = [...pending.current];
    if (ids.length === 0) {
      setSaveStatus("saved");
      return;
    }
    setSaveStatus("saving");
    await Promise.all(
      ids.map((id) => {
        clearTimeout(timers.current[id]);
        return flush(id, instr[id] ?? "");
      }),
    );
  }

  // --- Running -----------------------------------------------------------
  async function ensureRun(): Promise<{ id: string; input: string }> {
    if (run) return run;
    const input = currentInput();
    const res = await createRun(workflowId, input);
    if ("error" in res) throw new Error(res.error);
    const r = { id: res.id, input };
    setRun(r);
    return r;
  }

  // Run one step. Returns the output on success; null on failure/cap (and sets
  // the appropriate UI state). `priors` are the outputs of steps 0..pos-1.
  async function executeStep(
    pos: number,
    runObj: { id: string; input: string },
    priors: string[],
  ): Promise<string | null> {
    const s = steps[pos];
    setOutputs((o) => ({ ...o, [s.step_index]: { status: "running" } }));

    const res = await postRunStep({
      runId: runObj.id,
      stepIndex: s.step_index,
      title: s.title,
      instructions: (instr[s.id] ?? "").trim(),
      inputText: runObj.input,
      priorStepOutputs: priors,
    });

    if (res.status === 200 && typeof res.output === "string") {
      const output = res.output;
      setOutputs((o) => ({ ...o, [s.step_index]: { status: "ok", output } }));
      if (typeof res.runsToday === "number") setRunsToday(res.runsToday);
      return output;
    }

    if (res.status === 429) {
      // Cap, not a step failure — clear the running state so it can retry
      // tomorrow, and surface a friendly banner.
      setCapMessage(
        res.error ??
          `You've reached the daily limit of ${MAX_RUNS_PER_DAY} runs. Try again tomorrow.`,
      );
      setOutputs((o) => {
        const next = { ...o };
        delete next[s.step_index];
        return next;
      });
      return null;
    }

    setOutputs((o) => ({
      ...o,
      [s.step_index]: {
        status: "error",
        error: res.error ?? "This step failed to run. Please try again.",
      },
    }));
    return null;
  }

  async function handleRunStep(pos: number) {
    setCapMessage(null);
    setBusy(true);
    try {
      const runObj = await ensureRun();
      const priors = steps
        .slice(0, pos)
        .map((s) => {
          const o = outputs[s.step_index];
          return o && o.status === "ok" ? o.output : "";
        });
      const output = await executeStep(pos, runObj, priors);
      if (output !== null && pos === steps.length - 1) {
        await completeRun(runObj.id);
        setRunComplete(true);
      }
    } catch (err) {
      setCapMessage(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleRunAll() {
    setCapMessage(null);
    setBusy(true);
    try {
      const runObj = await ensureRun();
      const priors: string[] = [];
      for (let pos = 0; pos < steps.length; pos++) {
        const s = steps[pos];
        if (!(instr[s.id] ?? "").trim()) {
          setCapMessage(
            `Add instructions to “${s.title}” before running the whole workflow.`,
          );
          break;
        }
        const output = await executeStep(pos, runObj, priors);
        if (output === null) break; // stop the chain on error or cap
        priors.push(output);
        if (pos === steps.length - 1) {
          await completeRun(runObj.id);
          setRunComplete(true);
        }
      }
    } catch (err) {
      setCapMessage(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  }

  function startNewRun() {
    setRun(null);
    setOutputs({});
    setCapMessage(null);
    setRunComplete(false);
  }

  // Run step `pos` is enabled once every prior step in this run has output.
  const priorsReady = (pos: number) =>
    steps.slice(0, pos).every((s) => outputs[s.step_index]?.status === "ok");

  const hasAnyOutput = Object.keys(outputs).length > 0;
  const atCap = runsToday >= MAX_RUNS_PER_DAY;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10 flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Link href="/" className="text-sm text-accent">
          ← Back to dashboard
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1 text-muted">
              Write what each step should do, feed it some material, and run the
              chain. Each step&apos;s output flows into the next.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <button
              type="button"
              onClick={saveNow}
              className="rounded-full border border-black/10 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-black/5"
            >
              Save
            </button>
            <span className="text-xs text-muted">
              {saveStatus === "saving"
                ? "Saving…"
                : saveStatus === "unsaved"
                  ? "Unsaved changes"
                  : "All changes saved"}
            </span>
          </div>
        </div>
      </div>

      {/* Input panel */}
      <section className="flex flex-col gap-3 rounded-2xl border border-black/8 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-semibold">Input</h2>
          <span className="text-xs text-muted">
            Source material every step reasons over
          </span>
        </div>

        <select
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
          className="w-full rounded-xl border border-black/10 bg-background px-3 py-2 text-sm"
        >
          {grouped.map(([category, assets]) => (
            <optgroup key={category} label={category}>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </optgroup>
          ))}
          <option value={CUSTOM}>Paste your own text…</option>
        </select>

        {assetId === CUSTOM ? (
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Paste interview notes, a brief, reviews — whatever this agent should work from."
            rows={6}
            className="w-full resize-y rounded-xl border border-black/10 bg-background px-3 py-2 text-sm leading-relaxed"
          />
        ) : (
          <pre className="max-h-52 overflow-auto whitespace-pre-wrap rounded-xl border border-black/10 bg-background px-3 py-2 text-xs leading-relaxed text-muted">
            {currentInput()}
          </pre>
        )}

        <div className="flex justify-between text-xs">
          <span className={inputTooLong ? "text-red-600" : "text-muted"}>
            {inputChars.toLocaleString()} characters
            {inputTooLong &&
              ` — trim to under ${MAX_INPUT_CHARS.toLocaleString()}`}
          </span>
        </div>
      </section>

      {/* Run controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRunAll}
            disabled={busy || inputTooLong || atCap}
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy ? "Running…" : "Run all"}
          </button>
          {hasAnyOutput && (
            <button
              type="button"
              onClick={startNewRun}
              disabled={busy}
              className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 disabled:opacity-40"
            >
              Start a new run
            </button>
          )}
        </div>
        <span className="text-xs text-muted">
          {runsToday} of {MAX_RUNS_PER_DAY} runs used today
        </span>
      </div>

      {runComplete && (
        <p className="text-xs text-muted">
          Showing your last run. Start a new run to run again with fresh input.
        </p>
      )}

      {capMessage && (
        <div className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {capMessage}
        </div>
      )}

      {/* Step chain */}
      <ol className="flex flex-col gap-5">
        {steps.map((step, pos) => {
          const out = outputs[step.step_index];
          const example = examples[pos] ?? "";
          const empty = !(instr[step.id] ?? "").trim();
          const enabled = !busy && !inputTooLong && !atCap && priorsReady(pos) && !empty;

          return (
            <li
              key={step.id}
              className="flex flex-col gap-3 rounded-2xl border border-black/8 bg-white p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted">
                    Step {pos + 1}
                  </div>
                  <div className="mt-0.5 font-semibold">{step.title}</div>
                </div>
                {example && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowExample((s) => ({
                        ...s,
                        [step.id]: !s[step.id],
                      }))
                    }
                    className="text-sm text-accent"
                  >
                    {showExample[step.id] ? "Hide example" : "See an example"}
                  </button>
                )}
              </div>

              <textarea
                value={instr[step.id] ?? ""}
                onChange={(e) => onInstrChange(step.id, e.target.value)}
                placeholder={PLACEHOLDER}
                rows={4}
                className="w-full resize-y rounded-xl border border-black/10 bg-background px-3 py-2 text-sm leading-relaxed"
              />

              {example && showExample[step.id] && (
                <div className="rounded-xl border border-dashed border-accent/30 bg-accent/5 px-3 py-2">
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-accent">
                    Example — for inspiration, not copied in
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
                    {example}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleRunStep(pos)}
                  disabled={!enabled}
                  className="rounded-full border border-accent/40 px-4 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/5 disabled:opacity-40"
                >
                  {out?.status === "running" ? "Running…" : "Run step"}
                </button>
                {empty ? (
                  <span className="text-xs text-muted">
                    Write instructions to run this step.
                  </span>
                ) : !priorsReady(pos) ? (
                  <span className="text-xs text-muted">
                    Run the steps before this one first.
                  </span>
                ) : null}
              </div>

              {out?.status === "ok" && <Output text={out.output} />}
              {out?.status === "error" && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {out.error}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* Past runs */}
      {pastRuns.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">Past runs</h2>
          <ul className="flex flex-col gap-2">
            {pastRuns.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/workflow/${workflowId}/run/${r.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-black/8 bg-white px-4 py-3 transition-colors hover:border-accent/40"
                >
                  <span className="text-sm">
                    {formatRunTime(r.createdAt)}
                    {run?.id === r.id && (
                      <span className="ml-2 text-xs text-muted">
                        (shown above)
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted">
                    {r.complete ? "Complete" : "In progress"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

// Read-only output block with a copy button.
function Output({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-black/8 bg-background px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Output
        </span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              // Clipboard blocked — no-op.
            }
          }}
          className="text-xs text-accent"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
    </div>
  );
}
