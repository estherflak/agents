# Agent-Building POC — Full Build Spec & Claude Code Prompts

**Product:** Interactive web app that teaches product marketers (PMMs) to build and run AI agents by doing — assembling a multi-step workflow (research → draft → refine), not writing one big prompt.
**Audience for the POC:** ~5 PMM friends/peers.
**Practice data:** the fictional company **Ridgeline** (see the sandbox content spec).
**Timeline:** 1 week to a usable POC.
**Stack (locked):** Next.js (App Router) on Vercel · Supabase (magic-link auth + Postgres) · Claude API server-side via a single shared key.

This document is the build plan. Part A is the spec (architecture, data model, auth, backend, frontend). Part B is a sequence of ~10 phase-based prompts to paste into Claude Code, in order. Each prompt is self-contained and ends with a check so you know the phase worked before moving on.

---

## How to use this document

1. Read Part A once end-to-end so you know the shape of the thing.
2. Do the one-time setup in **Prompt 0** (accounts, keys) yourself — Claude Code can't create your Supabase project or Vercel account.
3. Then paste Prompts 1 → 10 into Claude Code one at a time. After each, run the "Check" step. Don't move on until it passes.
4. Keep this file open; the schema and API contracts here are the source of truth if Claude Code and you ever disagree.

A note on the auth decision: you chose **open magic-link signup** (anyone with the link can sign up) over an invite-only allowlist. That's simpler to build and share, but it means your shared Anthropic key sits behind a public URL. The spec below therefore includes two cheap guardrails — a per-user daily run cap enforced in the database, and a hard monthly spend limit set on the Anthropic key itself. Build both; they're the difference between a fun POC and a surprise bill.

---

# PART A — SPECIFICATION

## 1. Architecture overview

A single Next.js project does both frontend and backend, deployed as one unit to Vercel.

```
Browser (PMM)
   │  React UI: workflow builder, run view, saved workflows
   ▼
Next.js App (Vercel)
   ├─ App Router pages/components  ........ the UI
   ├─ Server Actions / Route Handlers  .... the "backend"
   │     ├─ /api/run-step  ............... calls Claude API (server-side key)
   │     └─ auth callbacks  ............... Supabase magic-link exchange
   ▼
Supabase
   ├─ Auth (magic link / OTP email)
   └─ Postgres (users, workflows, steps, runs, run_steps) + Row Level Security
   ▼
Anthropic Claude API  (single shared key, server-side only, monthly cap)
```

Key decisions and why:

- **One Next.js app, not separate frontend/backend.** Auth, persistence, and a stateful multi-step builder need real routes and server code. Co-locating them is the fastest path for a 1-week build and a single Vercel deploy.
- **Claude key never touches the browser.** All model calls go through a server route handler that reads `ANTHROPIC_API_KEY` from an env var. The client sends step instructions + input text; the server returns the model output.
- **Supabase for both auth and data.** One service, free tier, Postgres you can query directly. Row Level Security (RLS) guarantees each PMM only ever sees their own workflows and runs.
- **No live external data.** Agents reason only over sandbox text or whatever the PMM pastes in. No web search, no scraping — keeps scope and cost tight.

### Request flow for running one step

1. User clicks "Run step" in the builder.
2. Client calls `POST /api/run-step` with `{ runId, stepIndex, instructions, inputText, priorStepOutputs }` and the user's Supabase access token.
3. Server verifies the token (Supabase), checks the user's daily run quota, then calls Claude with a composed prompt.
4. Server writes the output to `run_steps` and returns it.
5. Client renders the output and unlocks the next step.

---

## 2. Data model (Supabase Postgres)

Five tables. `profiles` mirrors `auth.users` (Supabase's built-in auth table) so we can attach app data and quotas. Workflows own an ordered list of steps (the agent definition). Runs are executions of a workflow; `run_steps` hold each step's actual input/output for that run.

```
auth.users (managed by Supabase)
   1───1  profiles
              1───*  workflows
                        1───*  workflow_steps   (the agent's step definitions, ordered)
                        1───*  runs
                                  1───*  run_steps  (per-execution input/output)
```

### 2.1 Schema (SQL)

```sql
-- 1. Profiles: one row per authenticated user, plus a daily run counter for abuse control.
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  display_name  text,
  runs_today    int  not null default 0,
  runs_day      date not null default current_date,
  created_at    timestamptz not null default now()
);

-- 2. Workflows: an agent a PMM has built (or a copy of a use-case scaffold).
create table public.workflows (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  title        text not null,
  use_case     text,              -- 'competitive_intel' | 'launch_planning' | 'messaging' | 'research_synthesis' | 'custom'
  description  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 3. Workflow steps: the ordered chain of steps that defines the agent.
create table public.workflow_steps (
  id            uuid primary key default gen_random_uuid(),
  workflow_id   uuid not null references public.workflows(id) on delete cascade,
  step_index    int  not null,          -- 0-based order
  title         text not null,          -- e.g. "Research"
  instructions  text not null default '',-- what the PMM wrote for this step
  created_at    timestamptz not null default now(),
  unique (workflow_id, step_index)
);

-- 4. Runs: one execution of a workflow.
create table public.runs (
  id           uuid primary key default gen_random_uuid(),
  workflow_id  uuid not null references public.workflows(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  input_text   text,               -- the source material the PMM fed in (sandbox or pasted)
  status       text not null default 'in_progress', -- 'in_progress' | 'complete'
  created_at   timestamptz not null default now()
);

-- 5. Run steps: the input/output for each step of a run.
create table public.run_steps (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid not null references public.runs(id) on delete cascade,
  step_index   int  not null,
  instructions text,               -- snapshot of the step instructions used
  output       text,               -- Claude's output for this step
  status       text not null default 'ok', -- 'ok' | 'error' (honest history when a step fails mid "Run all")
  error        text,               -- error message if status = 'error'
  created_at   timestamptz not null default now(),
  unique (run_id, step_index)
);

-- Helper: keep updated_at fresh on workflows.
create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger workflows_touch
  before update on public.workflows
  for each row execute function public.touch_updated_at();

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### 2.2 Row Level Security

Every app table is owner-scoped. Enable RLS and add policies so a user can only touch their own rows. Child tables (`workflow_steps`, `run_steps`) are scoped via their parent.

```sql
alter table public.profiles       enable row level security;
alter table public.workflows      enable row level security;
alter table public.workflow_steps enable row level security;
alter table public.runs           enable row level security;
alter table public.run_steps      enable row level security;

-- profiles: a user sees/edits only their own row.
create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- workflows: owner-scoped.
create policy "own workflows" on public.workflows
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- workflow_steps: scoped through the parent workflow.
create policy "own workflow_steps" on public.workflow_steps
  for all using (
    exists (select 1 from public.workflows w
            where w.id = workflow_id and w.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.workflows w
            where w.id = workflow_id and w.user_id = auth.uid())
  );

-- runs: owner-scoped.
create policy "own runs" on public.runs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- run_steps: scoped through the parent run.
create policy "own run_steps" on public.run_steps
  for all using (
    exists (select 1 from public.runs r
            where r.id = run_id and r.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.runs r
            where r.id = run_id and r.user_id = auth.uid())
  );
```

Note: the model-calling API route uses the **service role** key server-side to increment `runs_today` and write outputs, so it isn't blocked by RLS. Because the service role bypasses RLS entirely, the route **must** manually verify the caller owns the target `run` (`runs.user_id == auth user id`) before writing — RLS will not do this for you (see §4.1, step 2). The service role key lives only in server env vars, never in the client.

---

## 3. Authentication

**Method:** Supabase email magic link (OTP). No passwords. The user enters their email, gets a link, clicks it, lands back in the app logged in.

**Model:** open signup — any email can request a link. (You chose this over an allowlist.)

**Flow:**

1. `/login` — email input → `supabase.auth.signInWithOtp({ email })`.
2. Supabase emails a magic link pointing at `/auth/callback`.
3. `/auth/callback` exchanges the code for a session (via `@supabase/ssr`), sets cookies, redirects to `/`.
4. Middleware protects app routes: no session → redirect to `/login`.
5. `profiles` row is auto-created by the `handle_new_user` trigger on first sign-in.

**Abuse guardrails (required because signup is open):**

- **Per-user daily run cap.** Before each model call, the server atomically claims a run slot in a single SQL `update … returning` (resets the day inline when `runs_day < current_date`; see §4.1 step 4). Do **not** implement this as a read-then-increment in app code — concurrent requests would each read under-cap and all call Claude. Zero rows returned → 429, don't call Claude. Note this counts *steps*, not workflows (a 4-step "Run all" burns 4).
- **Per-call input cap.** `MAX_TOKENS` bounds only the *output*; a user pasting a huge document sends unbounded input tokens. Reject/truncate `inputText` above `MAX_INPUT_CHARS` (~50k) in the route.
- **Hard monthly cap on the Anthropic key.** In the Anthropic Console, set a monthly spend limit on the key used for this project. This is your real backstop if the link leaks.
- **Email-domain gate (recommended ON for this POC).** For a 5-peer demo behind a shared billable key, default the allowlist ON (your peers' domains) — reject signups whose email domain isn't listed, in the callback. The monthly cap is the hard backstop; the domain gate stops the link leaking into open signup. Flip off only if you deliberately want anyone-with-the-link signup.

---

## 4. Backend / API

The "backend" is Next.js route handlers and server actions inside the same project. Two responsibilities: talk to Claude, and read/write Supabase.

### 4.1 The one model endpoint

`POST /api/run-step`

Request body:
```json
{
  "runId": "uuid",
  "stepIndex": 0,
  "title": "Research",
  "instructions": "…what the PMM wrote for this step…",
  "inputText": "…source material (sandbox or pasted)…",
  "priorStepOutputs": ["output of step 0", "output of step 1"]
}
```

Server logic:
1. **Authenticate:** call `supabase.auth.getUser()` (never `getSession()` for authz — it isn't revalidated server-side). No user → 401.
2. **Authorize the run:** `select user_id from runs where id = runId`. Missing row or `user_id != user.id` → 403. The admin client used below bypasses RLS, so this manual ownership check is mandatory before any write.
3. **Enforce input budget:** if `inputText` + `priorStepOutputs` exceed `MAX_INPUT_CHARS`, return 413 with a friendly message (bounds per-call input cost).
4. **Atomically claim a run slot** (resets the day inline; avoids the read-modify-write race):
   ```sql
   update profiles
     set runs_today = case when runs_day < current_date then 1
                           else runs_today + 1 end,
         runs_day = current_date
     where id = $userId
       and (runs_day < current_date or runs_today < MAX_RUNS_PER_DAY)
     returning runs_today;
   ```
   Zero rows returned → 429 (over cap); do **not** call Claude.
5. Compose the Claude prompt (see 4.2) and call Claude (`claude-sonnet-5` is a good default for quality/cost; make the model a single constant so it's easy to change). On failure, optionally decrement `runs_today` to refund the slot.
6. Upsert the result into `run_steps` (`unique (run_id, step_index)`) using the admin client (ownership already verified in step 2).
7. Return `{ output }`.

Guidance for Claude Code: keep model config (`MODEL`, `MAX_TOKENS`, `MAX_RUNS_PER_DAY`, `MAX_INPUT_CHARS`) in one `lib/config.ts` so they're trivial to tune. Add `export const maxDuration = 60;` to the route file — a single Claude generation exceeds Vercel's default serverless timeout and will otherwise 504. Use the official `@anthropic-ai/sdk`. Stream if easy; if streaming adds time, return the full response — streaming is a nice-to-have, not a POC requirement.

### 4.2 Prompt composition (the heart of the "agent")

Each step's Claude call is built from three parts, in this order:

1. **System framing** — a short fixed instruction: "You are executing one step of a multi-step marketing workflow that a product marketer designed. Follow the step instructions exactly. Output only what the step asks for."
2. **Context** — the run's `inputText` (source material) and the outputs of prior steps, clearly labelled (`--- SOURCE MATERIAL ---`, `--- OUTPUT OF STEP 1: Research ---`, etc.).
3. **The step's own instructions** — verbatim what the PMM typed.

This is deliberately simple and transparent — the PMM's own words drive the model, and they can see exactly how each step's output feeds the next. That visibility is the teaching goal.

### 4.3 Data mutations

Use server actions (or thin route handlers) for: create workflow (optionally from a scaffold), update a step's instructions, rename/delete a workflow, create a run, and list a user's workflows/runs. All go through the user-scoped Supabase client so RLS applies. No custom authorization logic needed beyond RLS.

---

## 5. Frontend

Next.js App Router, React, Tailwind for speed. Keep it clean and obvious — the audience is non-technical and easily intimidated, so the UI itself should model "an agent is just a few clear steps."

### 5.1 Routes

| Route | Purpose |
|---|---|
| `/login` | Email input for magic link |
| `/auth/callback` | Session exchange, then redirect |
| `/` (dashboard) | "Start from a use case" (4 cards) + "Your saved workflows" list |
| `/workflow/[id]` | The builder: edit steps, run the workflow, see outputs |
| `/workflow/[id]/run/[runId]` | A saved past run (read-only view of inputs/outputs) |

### 5.2 The builder (`/workflow/[id]`) — the core screen

Left: the **step chain**. Each step is a card with its title (e.g. "Research") and a textarea for instructions, pre-seeded with placeholder guidance ("What should this step gather or produce?") but **empty by default** — the PMM writes the real instructions. This is the scaffolded-but-blank design: structure is given, content is theirs.

- Per use-case, a **"See an example" toggle** reveals a worked version of the instructions for inspiration, without overwriting their empty step. A peek, not a crutch.
- An **input panel** where the PMM either picks a sandbox asset (dropdown of Ridgeline materials) or pastes/uploads their own text.
- A **"Run step"** button on each step, enabled once prior steps have run. Output renders under the step. A **"Run all"** convenience runs them in sequence.
- **Save** persists the workflow (steps + instructions). Runs auto-save to `runs`/`run_steps` so they can return later.

### 5.3 The four use-case scaffolds

Each opens the builder pre-structured with 2–4 empty steps:

1. **Competitive intel & battlecards** — Research competitor → Compare vs. Ridgeline → Draft battlecard.
2. **Launch/campaign planning** — Digest brief → Build plan & timeline → Draft content calendar.
3. **Messaging & positioning** — Extract inputs → Draft value props/pillars → Refine & pressure-test.
4. **Customer research synthesis** — Cluster feedback → Rank themes by impact → Summarize insights.

Step titles and the "See an example" content are defined in code (a `scaffolds.ts` constant), so the DB stays generic — a scaffold just creates a workflow + its steps.

### 5.4 Sandbox data in the UI

Ship the Ridgeline sandbox as static content (a `sandbox.ts` / MDX constants file) that populates the input dropdown: company overview, product & pricing, the three competitors, the customer-feedback batch, the past Approvals launch, and the upcoming AI Assist brief. The PMM picks an asset to drop into a step's input, mirroring "where would this come from at my real job."

### 5.5 Look & feel

Plain, friendly, uncluttered. One accent color, generous whitespace, big readable type. Every screen should make the next action obvious. Avoid jargon in the UI copy — match Ridgeline's own plain-spoken brand voice as a bonus.

---

# PART B — CLAUDE CODE BUILD PROMPTS

Run these in order. Each is written to paste directly into Claude Code. After each, do the **Check**. The prompts assume you completed Prompt 0 first.

---

### Prompt 0 — One-time setup (you do this, not Claude Code)

Before any coding:

1. **Supabase:** create a free project. Copy the Project URL, the `anon` public key, and the `service_role` key (Settings → API). In Authentication → Providers, ensure Email is on with "magic link" enabled. In Authentication → URL Configuration, add your local (`http://localhost:3000`) and later your Vercel URL to the redirect allowlist.
2. **Anthropic:** create an API key in the Console. **Set a monthly spend limit on it now** (Billing → Limits). This is your leak backstop.
3. **Vercel:** create an account (you'll connect the repo in Prompt 10).
4. Have these five secrets ready to paste when asked: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, and pick a value for `MAX_RUNS_PER_DAY` (e.g. 40).

---

### Prompt 1 — Scaffold the project

```
Create a new Next.js 14+ app using the App Router and TypeScript, with Tailwind CSS configured. Use the `src/` directory. Set up the folder structure I'll use for a PMM agent-building app:

- src/app            (routes)
- src/components     (UI components)
- src/lib            (supabase clients, config, claude client, scaffolds, sandbox data)

Create src/lib/config.ts exporting constants: MODEL = "claude-sonnet-5", MAX_TOKENS = 4000 (2000 truncates long outputs like battlecards and content calendars), MAX_RUNS_PER_DAY = 40, MAX_INPUT_CHARS = 50000 (bounds per-call input cost).

Create a .env.local.example listing: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY.

Add a clean, minimal home page placeholder. Make sure `npm run dev` starts with no errors. Use a plain, friendly visual style: one accent color, lots of whitespace, large readable type.
```

**Check:** `npm run dev` runs, `http://localhost:3000` loads the placeholder with no console errors.

---

### Prompt 2 — Supabase clients + env wiring

```
Install @supabase/supabase-js and @supabase/ssr. Create three Supabase client helpers in src/lib/supabase/:

- client.ts   — browser client (uses NEXT_PUBLIC_ env vars) via createBrowserClient
- server.ts   — server client for Server Components / route handlers, reading cookies via createServerClient and @supabase/ssr
- admin.ts    — a service-role client using SUPABASE_SERVICE_ROLE_KEY, for server-only privileged writes. Never import this into any client component.

Create src/middleware.ts that refreshes the Supabase session on each request and redirects unauthenticated users to /login for any route except /login and /auth/callback.

Copy .env.local.example to .env.local and I will fill in the real values.
```

**Check:** app still builds. Fill in `.env.local` with your real secrets before continuing.

---

### Prompt 3 — Database schema + RLS

```
I have a Supabase project. Produce a single SQL migration file at supabase/migrations/0001_init.sql that creates this schema exactly, then I'll run it in the Supabase SQL editor.

[PASTE the SQL from spec section 2.1 here — profiles, workflows, workflow_steps, runs, run_steps, the touch_updated_at trigger, and the handle_new_user trigger.]

Then append the Row Level Security setup from spec section 2.2 (enable RLS on all five tables and add the owner-scoped policies, with child tables scoped through their parent).

Also generate src/lib/types.ts with TypeScript types matching these tables.
```

**Check:** run the SQL in Supabase's SQL editor with no errors. In Table editor you see all five tables. Auth → create a test user and confirm a `profiles` row appears automatically.

---

### Prompt 4 — Magic-link auth

```
Build email magic-link authentication using the Supabase clients already set up.

- src/app/login/page.tsx: a simple centered form with one email field and a "Send me a link" button. On submit call supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: <origin>/auth/callback } }). Show a "check your email" confirmation state.
- src/app/auth/callback/route.ts: exchange the code for a session using @supabase/ssr, then redirect to /.
- Add a sign-out action and a small header showing the logged-in email with a sign-out button.

Confirm the middleware from Prompt 2 protects all app routes and lets /login and /auth/callback through.
```

**Check:** open an incognito window → `/` redirects to `/login` → enter your email → click the emailed link → land on `/` logged in. Sign out works.

---

### Prompt 5 — The step engine + Claude API route

```
Build the server-side model endpoint and its prompt composition.

Create src/lib/claude.ts: a helper that calls the Anthropic API using @anthropic-ai/sdk with ANTHROPIC_API_KEY, MODEL and MAX_TOKENS from config. Export a function runStep({ title, instructions, inputText, priorStepOutputs }) that composes the prompt in THREE labelled parts:
  1. System framing: "You are executing one step of a multi-step marketing workflow that a product marketer designed. Follow the step instructions exactly. Output only what the step asks for."
  2. Context: the inputText under "--- SOURCE MATERIAL ---" and each prior output under "--- OUTPUT OF STEP n: <title> ---".
  3. The step's own instructions, verbatim.
Return the text output.

Create src/app/api/run-step/route.ts (POST). Add `export const maxDuration = 60;` at the top — a single Claude call exceeds Vercel's default timeout and would otherwise 504.
  1. Authenticate with supabase.auth.getUser() (NOT getSession() — it isn't revalidated server-side and is spoofable for authz). No user → 401.
  2. Authorize the run: select user_id from runs where id = runId. Missing row or user_id != user.id → 403. (The admin client below bypasses RLS, so this manual ownership check is mandatory before any write.)
  3. Enforce input budget: if inputText + priorStepOutputs exceed MAX_INPUT_CHARS, return 413 with a friendly message.
  4. Atomically claim a run slot in ONE statement (resets the day inline; do not read-then-increment in app code):
       update profiles
         set runs_today = case when runs_day < current_date then 1 else runs_today + 1 end,
             runs_day = current_date
         where id = <user id>
           and (runs_day < current_date or runs_today < MAX_RUNS_PER_DAY)
         returning runs_today;
     Zero rows returned → 429; do not call Claude.
  5. Call runStep(...). On failure, optionally decrement runs_today to refund the slot, and record status='error' + error on the run_step.
  6. Using the admin client, upsert into run_steps (unique on run_id+step_index) the instructions, output, and status (ownership already verified in step 2).
  7. Return { output }.
Body shape: { runId, stepIndex, title, instructions, inputText, priorStepOutputs }.
```

**Check:** with a valid session and a run you OWN, `curl`/Postman a POST to `/api/run-step` returns a sensible `{ output }`. A runId belonging to ANOTHER user → 403. No session → 401. Over-cap → 429. Oversized input → 413.

---

### Prompt 6 — Scaffolds + sandbox data as constants

```
Create two data files.

src/lib/scaffolds.ts: export the 4 use-case scaffolds. Each has an id, title, use_case key, and an ordered steps array; each step has a title, an empty default instructions string, and an exampleInstructions string (the "see an example" worked version). Use these:
  1. competitive_intel — "Competitive Intel & Battlecard": steps "Research competitor", "Compare vs. Ridgeline", "Draft battlecard".
  2. launch_planning — "Launch/Campaign Plan": steps "Digest the brief", "Build plan & timeline", "Draft content calendar".
  3. messaging — "Messaging & Positioning": steps "Extract the inputs", "Draft value props & pillars", "Refine & pressure-test".
  4. research_synthesis — "Customer Research Synthesis": steps "Cluster the feedback", "Rank themes by impact", "Summarize insights".
Write a genuinely useful exampleInstructions for each step (a few sentences a PMM could learn from).

src/lib/sandbox.ts: export the Ridgeline sandbox assets as an array of { id, label, category, text }. I will paste the content; create the structure with these labels: "Company overview", "Product & pricing", "Competitor: Corkboard", "Competitor: Fluxio", "Competitor: Inkwell", "Customer feedback batch", "Past launch: Approvals", "Upcoming launch: AI Assist brief".
```

**Check:** files compile; importing them in a temp page logs 4 scaffolds and 8 sandbox assets. (You'll paste the actual Ridgeline text from the sandbox spec into `sandbox.ts`.)

---

### Prompt 7 — Dashboard: use-case cards + saved workflows

```
Build the dashboard at src/app/page.tsx (server component, requires auth).

Top section "Start from a use case": render the 4 scaffolds from scaffolds.ts as cards. Clicking a card runs a server action that:
  - inserts a workflows row (title from scaffold, use_case set, user_id = current user),
  - inserts its workflow_steps (from the scaffold, instructions empty),
  - redirects to /workflow/[newId].

Below it "Your saved workflows": list the current user's workflows (title, use_case, updated_at) newest first, each linking to /workflow/[id], with a delete button (server action, RLS-scoped).

Keep the styling plain and friendly, consistent with the rest of the app.
```

**Check:** logged in, the 4 cards show; clicking one creates a workflow and lands you in the builder; it then appears under "Your saved workflows"; delete removes it.

---

### Prompt 8 — The builder screen

```
Build the core builder at src/app/workflow/[id]/page.tsx plus client components.

Load the workflow and its workflow_steps (ordered) for the current user.

Left/main column — the step chain: one card per step showing the step title and a textarea for instructions (seeded with placeholder text "What should this step gather or produce?", but empty by default). A "See an example" toggle per step reveals that step's exampleInstructions (from scaffolds.ts) in a read-only panel without overwriting the textarea. Editing a textarea autosaves instructions to workflow_steps (debounced server action).

Input panel: a dropdown of sandbox assets (from sandbox.ts) plus a textarea to paste/upload custom text. The chosen text becomes the run's inputText.

Running:
  - "Run step" on each card: enabled once all prior steps in this run have output. On click, ensure a runs row exists for this session (create one with the current inputText if not), then POST to /api/run-step with { runId, stepIndex, title, instructions, inputText, priorStepOutputs }. Render the returned output under the card.
  - "Run all": runs steps 0..n sequentially, stopping on error.
  - When the last step finishes, mark the run status 'complete'.

Save button persists nothing extra (autosave handles steps); it just confirms saved state. Show the daily run count / cap somewhere subtle, and surface a friendly message on 429.
```

**Check:** open a scaffolded workflow, type instructions into each step, pick a Ridgeline sandbox asset, Run step by step (and Run all). Outputs appear and chain correctly (step 2 clearly uses step 1's output). Refreshing the page keeps your instructions.

---

### Prompt 9 — Saved runs (persistence & history)

```
Add run history so PMMs can return to past outputs.

- On the builder, show a small "Past runs" list for this workflow (from runs, newest first), each linking to /workflow/[id]/run/[runId].
- Build src/app/workflow/[id]/run/[runId]/page.tsx: a read-only view showing the run's inputText and each run_step's instructions + output in order. All RLS-scoped to the current user.
- Confirm that every run and its run_steps were being saved during Prompt 8's flow; if not, fix the create-run / upsert-run_step logic so history is complete.
```

**Check:** run a workflow, go back to the dashboard, reopen the workflow, and open a past run — you see the exact inputs and outputs from before.

---

### Prompt 10 — Polish, guardrail QA, and deploy

```
Final pass before sharing.

1. Empty/loading/error states: every button shows a loading state while running; API/network errors show a friendly message, not a stack trace.
2. Verify the abuse guardrail end-to-end: temporarily set MAX_RUNS_PER_DAY = 2, confirm the 3rd run returns a friendly "daily limit reached" message, then set it back.
3. Mobile: the builder is usable on a narrow screen (stacked layout is fine).
4. Add a one-screen intro on first load explaining in 2–3 plain sentences what this is ("build an agent as a few steps, then run it on the Ridgeline sample company or your own text").
5. Prepare for Vercel: confirm no server-only secret is imported into any client component; confirm all four env vars are read server-side where expected.
```

Then deploy (you do this):
- Push the repo to GitHub, import it into Vercel.
- Add all env vars in Vercel Project Settings (including `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY`).
- In Supabase Auth → URL Configuration, add your Vercel domain to the redirect allowlist.
- Deploy, then test the full magic-link flow on the live URL before sending the link to your 5 friends.

**Check:** on the live Vercel URL, a fresh incognito session can sign up via magic link, build a workflow, run it against Ridgeline data, and see it saved on return.

---

## 6. One-week sequencing (suggested)

- **Day 1:** Prompts 0–3 (setup, scaffold, Supabase, schema). End of day: DB live, auth clients wired.
- **Day 2:** Prompt 4 (auth working end-to-end) + Prompt 5 (Claude endpoint returning output).
- **Day 3:** Prompt 6 (scaffolds + paste in the real Ridgeline sandbox text) + Prompt 7 (dashboard).
- **Day 4–5:** Prompt 8 (the builder — the hardest part; budget two days).
- **Day 6:** Prompt 9 (run history) + Prompt 10 (polish, guardrail QA).
- **Day 7:** Deploy, live-test, send the link. Start the feedback loop with your 5 friends.

## 7. Definition of done

A PMM friend, given only the link, can: sign in via email, pick a use case, write their own step instructions, run the agent against Ridgeline's sample data (or their own pasted text), see each step feed the next, and come back later to a saved workflow and past runs — without you in the room. Success is 5 of them reporting it actually saved time or helped, gathered in a short follow-up, not inferred from logs.
```
