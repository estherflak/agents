"use server";

import { createClient } from "@/lib/supabase/server";

// Server actions backing the builder. All writes go through the user-scoped
// client so RLS enforces ownership — a bad id simply affects/returns nothing.

/**
 * Autosave a step's instructions (debounced on the client). Also bumps the
 * parent workflow's updated_at so the dashboard reflects recent edits.
 */
export async function saveStepInstructions(
  workflowId: string,
  stepId: string,
  instructions: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in." };

  const { error } = await supabase
    .from("workflow_steps")
    .update({ instructions })
    .eq("id", stepId);
  if (error) return { error: error.message };

  // Touch the workflow so "updated …" on the dashboard stays honest. Best
  // effort — a failure here shouldn't fail the save the user cares about.
  await supabase
    .from("workflows")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", workflowId);

  return { ok: true };
}

/**
 * Ensure a run exists for the current builder session. The client calls this
 * once — when the first step runs — then reuses the returned id for the rest of
 * the run. input_text is snapshotted here so every step of this run sees the
 * same source material.
 */
export async function createRun(
  workflowId: string,
  inputText: string,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in." };

  const { data, error } = await supabase
    .from("runs")
    .insert({
      workflow_id: workflowId,
      user_id: user.id,
      input_text: inputText.trim() ? inputText : null,
      status: "in_progress",
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not start run." };

  return { id: data.id };
}

/** Mark a run complete once its final step has produced output. */
export async function completeRun(
  runId: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in." };

  const { error } = await supabase
    .from("runs")
    .update({ status: "complete" })
    .eq("id", runId);
  if (error) return { error: error.message };

  return { ok: true };
}
