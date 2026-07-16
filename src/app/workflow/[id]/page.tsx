import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { scaffolds } from "@/lib/scaffolds";
import Builder, { type StepData, type StepOutput } from "./Builder";

// The builder: loads a workflow, its ordered steps, and the user's daily run
// count, then hands them to the client <Builder> for editing and running.
export default async function WorkflowBuilder({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workflow } = await supabase
    .from("workflows")
    .select("id, title, use_case")
    .eq("id", id)
    .maybeSingle();
  if (!workflow) notFound();

  const { data: stepRows } = await supabase
    .from("workflow_steps")
    .select("id, step_index, title, instructions")
    .eq("workflow_id", id)
    .order("step_index");
  const steps = (stepRows ?? []) as StepData[];

  // Align each step to its scaffold's worked example (by position). Custom
  // workflows (no matching scaffold) simply get no examples.
  const scaffold = scaffolds.find((s) => s.use_case === workflow.use_case);
  const examples = steps.map(
    (s) => scaffold?.steps[s.step_index]?.exampleInstructions ?? "",
  );

  // Effective runs used today: the stored counter is stale if runs_day isn't
  // today (the DB resets it inline on the next claim), so show 0 in that case.
  const { data: profile } = await supabase
    .from("profiles")
    .select("runs_today, runs_day")
    .eq("id", user.id)
    .maybeSingle();
  const today = new Date().toISOString().slice(0, 10);
  const initialRunsToday =
    profile && profile.runs_day === today ? profile.runs_today : 0;

  // Load this workflow's runs, newest first: the most recent one seeds the
  // builder (so a refresh restores its outputs), and the full list feeds the
  // "Past runs" links. RLS scopes these to the current user.
  const { data: runRows } = await supabase
    .from("runs")
    .select("id, input_text, status, created_at")
    .eq("workflow_id", id)
    .order("created_at", { ascending: false });
  const runs = runRows ?? [];
  const latestRun = runs[0] ?? null;

  const pastRuns = runs.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    complete: r.status === "complete",
  }));

  let initialRun: {
    id: string;
    input: string;
    complete: boolean;
  } | null = null;
  const initialOutputs: Record<number, StepOutput> = {};

  if (latestRun) {
    initialRun = {
      id: latestRun.id,
      input: latestRun.input_text ?? "",
      complete: latestRun.status === "complete",
    };

    const { data: runStepRows } = await supabase
      .from("run_steps")
      .select("step_index, output, status, error")
      .eq("run_id", latestRun.id);

    for (const rs of runStepRows ?? []) {
      if (rs.status === "ok" && rs.output != null) {
        initialOutputs[rs.step_index] = { status: "ok", output: rs.output };
      } else if (rs.status === "error") {
        initialOutputs[rs.step_index] = {
          status: "error",
          error: rs.error ?? "This step failed to run.",
        };
      }
    }
  }

  return (
    <Builder
      workflowId={workflow.id}
      title={workflow.title}
      steps={steps}
      examples={examples}
      initialRunsToday={initialRunsToday}
      initialRun={initialRun}
      initialOutputs={initialOutputs}
      pastRuns={pastRuns}
    />
  );
}
