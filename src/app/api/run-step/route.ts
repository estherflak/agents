import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runStep } from "@/lib/claude";
import { MAX_INPUT_CHARS, MAX_RUNS_PER_DAY } from "@/lib/config";

// A single Claude generation can exceed Vercel's default serverless timeout and
// would otherwise 504. 60s gives it room.
export const maxDuration = 60;

type Body = {
  runId?: string;
  stepIndex?: number;
  title?: string;
  instructions?: string;
  inputText?: string;
  priorStepOutputs?: string[];
};

export async function POST(request: Request) {
  // 1. Authenticate. getUser() revalidates the token server-side; getSession()
  //    is not safe for authorization.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { runId, stepIndex, title, instructions, inputText, priorStepOutputs } =
    body;

  if (
    !runId ||
    typeof stepIndex !== "number" ||
    typeof title !== "string" ||
    typeof instructions !== "string"
  ) {
    return NextResponse.json(
      { error: "Missing or invalid fields." },
      { status: 400 },
    );
  }

  const priors = Array.isArray(priorStepOutputs) ? priorStepOutputs : [];
  const admin = createAdminClient();

  // 2. Authorize the run. The admin client bypasses RLS, so we MUST verify the
  //    caller owns this run before any privileged write.
  const { data: run, error: runError } = await admin
    .from("runs")
    .select("user_id")
    .eq("id", runId)
    .maybeSingle();

  if (runError) {
    return NextResponse.json({ error: "Could not load run." }, { status: 500 });
  }
  if (!run || run.user_id !== user.id) {
    // Same response for missing and not-owned so we don't leak run existence.
    return NextResponse.json({ error: "Run not found." }, { status: 403 });
  }

  // 3. Enforce the per-call input budget (bounds input token cost).
  const inputChars =
    (inputText?.length ?? 0) +
    priors.reduce((sum, s) => sum + (s?.length ?? 0), 0);
  if (inputChars > MAX_INPUT_CHARS) {
    return NextResponse.json(
      {
        error: `That input is too long (${inputChars.toLocaleString()} characters). Please trim it to under ${MAX_INPUT_CHARS.toLocaleString()}.`,
      },
      { status: 413 },
    );
  }

  // 4. Atomically claim a run slot (resets the day inline). NULL => over cap.
  const { data: runsToday, error: claimError } = await admin.rpc(
    "claim_run_slot",
    { p_user_id: user.id, p_max: MAX_RUNS_PER_DAY },
  );

  if (claimError) {
    return NextResponse.json(
      { error: "Could not check your daily limit." },
      { status: 500 },
    );
  }
  if (runsToday === null) {
    return NextResponse.json(
      {
        error: `You've reached the daily limit of ${MAX_RUNS_PER_DAY} runs. Try again tomorrow.`,
      },
      { status: 429 },
    );
  }

  // 5. Call Claude. On failure, refund the claimed slot and record an honest
  //    error row so "Run all" history stays truthful.
  let output: string;
  try {
    output = await runStep({ title, instructions, inputText, priorStepOutputs: priors });
  } catch (err) {
    await admin.rpc("refund_run_slot", { p_user_id: user.id });

    const message =
      err instanceof Error ? err.message : "The model call failed.";
    await admin.from("run_steps").upsert(
      {
        run_id: runId,
        step_index: stepIndex,
        instructions,
        output: null,
        status: "error",
        error: message,
      },
      { onConflict: "run_id,step_index" },
    );

    return NextResponse.json(
      { error: "The step failed to run. Please try again." },
      { status: 502 },
    );
  }

  // 6. Persist the successful output (ownership already verified in step 2).
  const { error: upsertError } = await admin.from("run_steps").upsert(
    {
      run_id: runId,
      step_index: stepIndex,
      instructions,
      output,
      status: "ok",
      error: null,
    },
    { onConflict: "run_id,step_index" },
  );

  if (upsertError) {
    return NextResponse.json(
      { error: "The step ran but could not be saved." },
      { status: 500 },
    );
  }

  // 7. Return the output (plus the running count for the cap indicator).
  return NextResponse.json({ output, runsToday });
}
