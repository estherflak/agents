import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// A saved past run, read-only. Shows the input the run was fed and each step's
// instructions + output in order. Everything is loaded through the user-scoped
// Supabase client, so RLS guarantees the caller only ever sees their own run.
export default async function RunView({
  params,
}: {
  params: Promise<{ id: string; runId: string }>;
}) {
  const { id, runId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // The run itself (RLS-scoped). Also require it belong to this workflow so a
  // mismatched URL 404s rather than showing an unrelated run.
  const { data: run } = await supabase
    .from("runs")
    .select("id, workflow_id, input_text, status, created_at")
    .eq("id", runId)
    .maybeSingle();
  if (!run || run.workflow_id !== id) notFound();

  const { data: workflow } = await supabase
    .from("workflows")
    .select("title")
    .eq("id", id)
    .maybeSingle();

  // Ordered steps of this run, plus the workflow's step titles for nicer labels.
  const { data: runStepRows } = await supabase
    .from("run_steps")
    .select("step_index, instructions, output, status, error")
    .eq("run_id", runId)
    .order("step_index");
  const runSteps = runStepRows ?? [];

  const { data: stepDefs } = await supabase
    .from("workflow_steps")
    .select("step_index, title")
    .eq("workflow_id", id);
  const titleByIndex = new Map(
    (stepDefs ?? []).map((s) => [s.step_index, s.title]),
  );

  const when = new Date(run.created_at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10 flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Link href={`/workflow/${id}`} className="text-sm text-accent">
          ← Back to builder
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {workflow?.title ?? "Workflow"} — past run
          </h1>
          <p className="mt-1 text-muted">
            {when} · {run.status === "complete" ? "Complete" : "In progress"} ·
            read-only
          </p>
        </div>
      </div>

      {/* Input */}
      <section className="flex flex-col gap-2 rounded-2xl border border-black/8 bg-white p-5">
        <h2 className="font-semibold">Input</h2>
        {run.input_text ? (
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-black/10 bg-background px-3 py-2 text-xs leading-relaxed text-muted">
            {run.input_text}
          </pre>
        ) : (
          <p className="text-sm text-muted">No input was provided.</p>
        )}
      </section>

      {/* Steps */}
      {runSteps.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-black/10 px-5 py-8 text-center text-muted">
          This run has no saved steps.
        </p>
      ) : (
        <ol className="flex flex-col gap-5">
          {runSteps.map((rs, pos) => (
            <li
              key={rs.step_index}
              className="flex flex-col gap-3 rounded-2xl border border-black/8 bg-white p-5"
            >
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted">
                  Step {pos + 1}
                </div>
                <div className="mt-0.5 font-semibold">
                  {titleByIndex.get(rs.step_index) ??
                    `Step ${rs.step_index + 1}`}
                </div>
              </div>

              <div>
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
                  Instructions
                </div>
                {rs.instructions?.trim() ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {rs.instructions}
                  </p>
                ) : (
                  <p className="text-sm text-muted">No instructions recorded.</p>
                )}
              </div>

              <div>
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
                  Output
                </div>
                {rs.status === "error" ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {rs.error ?? "This step failed to run."}
                  </div>
                ) : rs.output ? (
                  <div className="rounded-xl border border-black/8 bg-background px-4 py-3">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {rs.output}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted">No output recorded.</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
