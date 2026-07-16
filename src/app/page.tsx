import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { scaffolds } from "@/lib/scaffolds";
import { createWorkflowFromScaffold, deleteWorkflow } from "./actions";

// One-line pitch per use case, shown on its card.
const USE_CASE_BLURBS: Record<string, string> = {
  competitive_intel: "Research a competitor and turn it into a sales battlecard.",
  launch_planning: "Turn a rough brief into a plan, timeline, and content calendar.",
  messaging: "Draft and pressure-test positioning and messaging pillars.",
  research_synthesis: "Cluster customer feedback into ranked, actionable insights.",
};

function prettyUseCase(useCase: string | null): string {
  if (!useCase) return "Custom";
  return useCase.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workflows } = await supabase
    .from("workflows")
    .select("id, title, use_case, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12 flex flex-col gap-12">
      {/* Start from a use case */}
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Start from a use case
          </h1>
          <p className="text-muted">
            Pick a workflow to build. You&apos;ll write the step instructions —
            we just give you the structure.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {scaffolds.map((scaffold) => (
            <form
              key={scaffold.id}
              action={createWorkflowFromScaffold.bind(null, scaffold.use_case)}
            >
              <button
                type="submit"
                className="group h-full w-full rounded-2xl border border-black/8 bg-white p-5 text-left transition-colors hover:border-accent/40"
              >
                <div className="font-semibold">{scaffold.title}</div>
                <p className="mt-1 text-sm text-muted">
                  {USE_CASE_BLURBS[scaffold.use_case]}
                </p>
                <div className="mt-3 text-xs text-muted">
                  {scaffold.steps.map((s) => s.title).join("  →  ")}
                </div>
                <span className="mt-4 inline-block text-sm font-medium text-accent">
                  Start →
                </span>
              </button>
            </form>
          ))}
        </div>
      </section>

      {/* Your saved workflows */}
      <section className="flex flex-col gap-5">
        <h2 className="text-2xl font-semibold tracking-tight">
          Your saved workflows
        </h2>

        {!workflows || workflows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-black/10 px-5 py-8 text-center text-muted">
            No saved workflows yet — start from a use case above.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {workflows.map((wf) => (
              <li
                key={wf.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-black/8 bg-white px-5 py-4"
              >
                <Link href={`/workflow/${wf.id}`} className="min-w-0 flex-1">
                  <div className="truncate font-medium">{wf.title}</div>
                  <div className="mt-0.5 text-sm text-muted">
                    {prettyUseCase(wf.use_case)} · updated{" "}
                    {formatDate(wf.updated_at)}
                  </div>
                </Link>
                <form action={deleteWorkflow.bind(null, wf.id)}>
                  <button
                    type="submit"
                    className="rounded-full border border-black/10 px-3 py-1.5 text-sm text-muted transition-colors hover:border-black/20 hover:text-foreground"
                  >
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
