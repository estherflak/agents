import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Placeholder builder — confirms the workflow + steps loaded after a scaffold
// is created. The real builder (editable step chain, runs) arrives in Prompt 8.
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

  const { data: steps } = await supabase
    .from("workflow_steps")
    .select("step_index, title, instructions")
    .eq("workflow_id", id)
    .order("step_index");

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 flex flex-col gap-6">
      <Link href="/" className="text-sm text-accent">
        ← Back to dashboard
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {workflow.title}
        </h1>
        <p className="text-muted">
          The editable builder lands in the next step. For now, here are the
          steps this workflow was created with:
        </p>
      </div>

      <ol className="flex flex-col gap-3">
        {(steps ?? []).map((step) => (
          <li
            key={step.step_index}
            className="rounded-2xl border border-black/8 bg-white p-5"
          >
            <div className="text-xs font-medium uppercase tracking-wide text-muted">
              Step {step.step_index + 1}
            </div>
            <div className="mt-1 font-medium">{step.title}</div>
            <p className="mt-1 text-sm text-muted">
              {step.instructions
                ? step.instructions
                : "No instructions yet — you'll write these in the builder."}
            </p>
          </li>
        ))}
      </ol>
    </main>
  );
}
