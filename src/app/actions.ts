"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { scaffolds } from "@/lib/scaffolds";
import type { UseCase } from "@/lib/types";

// Create a new workflow from a use-case scaffold: insert the workflow, then its
// (empty-instruction) steps, then drop the PMM into the builder. All writes go
// through the user-scoped client so RLS enforces ownership.
export async function createWorkflowFromScaffold(useCase: UseCase) {
  const scaffold = scaffolds.find((s) => s.use_case === useCase);
  if (!scaffold) throw new Error(`Unknown use case: ${useCase}`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workflow, error: wfError } = await supabase
    .from("workflows")
    .insert({
      user_id: user.id,
      title: scaffold.title,
      use_case: scaffold.use_case,
    })
    .select("id")
    .single();
  if (wfError || !workflow) {
    throw new Error(wfError?.message ?? "Could not create workflow.");
  }

  const stepRows = scaffold.steps.map((step, index) => ({
    workflow_id: workflow.id,
    step_index: index,
    title: step.title,
    instructions: step.instructions, // empty by design
  }));
  const { error: stepsError } = await supabase
    .from("workflow_steps")
    .insert(stepRows);
  if (stepsError) throw new Error(stepsError.message);

  redirect(`/workflow/${workflow.id}`);
}

// Delete a workflow the current user owns. RLS scopes the delete, so a bad id
// simply affects no rows.
export async function deleteWorkflow(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("workflows").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/");
}
