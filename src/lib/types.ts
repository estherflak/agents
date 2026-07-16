// Application types mirroring the Supabase schema in
// supabase/migrations/0001_init.sql. Keep these in sync with that migration.

/** Workflow use-case keys (workflows.use_case). */
export type UseCase =
  | "competitive_intel"
  | "launch_planning"
  | "messaging"
  | "research_synthesis"
  | "custom";

/** Lifecycle of a single run (runs.status). */
export type RunStatus = "in_progress" | "complete";

/** Per-step outcome within a run (run_steps.status). */
export type RunStepStatus = "ok" | "error";

// ---------------------------------------------------------------------------
// Row types — the shape returned when you SELECT a full row.
// ---------------------------------------------------------------------------

/** public.profiles — one row per authenticated user, with a daily run counter. */
export interface Profile {
  id: string; // uuid, references auth.users(id)
  email: string | null;
  display_name: string | null;
  runs_today: number;
  runs_day: string; // date (ISO 'YYYY-MM-DD')
  created_at: string; // timestamptz (ISO)
}

/** public.workflows — an agent a PMM has built (or a copy of a scaffold). */
export interface Workflow {
  id: string; // uuid
  user_id: string; // uuid, references profiles(id)
  title: string;
  use_case: UseCase | null;
  description: string | null;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

/** public.workflow_steps — the ordered chain of steps defining the agent. */
export interface WorkflowStep {
  id: string; // uuid
  workflow_id: string; // uuid, references workflows(id)
  step_index: number; // 0-based order; unique per (workflow_id, step_index)
  title: string;
  instructions: string; // defaults to ''
  created_at: string; // timestamptz
}

/** public.runs — one execution of a workflow. */
export interface Run {
  id: string; // uuid
  workflow_id: string; // uuid, references workflows(id)
  user_id: string; // uuid, references profiles(id)
  input_text: string | null;
  status: RunStatus;
  created_at: string; // timestamptz
}

/** public.run_steps — the input/output for each step of a run. */
export interface RunStep {
  id: string; // uuid
  run_id: string; // uuid, references runs(id)
  step_index: number; // unique per (run_id, step_index)
  instructions: string | null; // snapshot of the step instructions used
  output: string | null; // Claude's output for this step
  status: RunStepStatus;
  error: string | null; // error message when status = 'error'
  created_at: string; // timestamptz
}

// ---------------------------------------------------------------------------
// Insert types — columns you provide on INSERT. Columns with DB defaults
// (id, created_at, updated_at, and counters) are optional.
// ---------------------------------------------------------------------------

export interface ProfileInsert {
  id: string;
  email?: string | null;
  display_name?: string | null;
  runs_today?: number;
  runs_day?: string;
  created_at?: string;
}

export interface WorkflowInsert {
  id?: string;
  user_id: string;
  title: string;
  use_case?: UseCase | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface WorkflowStepInsert {
  id?: string;
  workflow_id: string;
  step_index: number;
  title: string;
  instructions?: string;
  created_at?: string;
}

export interface RunInsert {
  id?: string;
  workflow_id: string;
  user_id: string;
  input_text?: string | null;
  status?: RunStatus;
  created_at?: string;
}

export interface RunStepInsert {
  id?: string;
  run_id: string;
  step_index: number;
  instructions?: string | null;
  output?: string | null;
  status?: RunStepStatus;
  error?: string | null;
  created_at?: string;
}
