-- 0001_init.sql — schema + Row Level Security for the PMM agent-building POC.
-- Run this in the Supabase SQL editor (or via `supabase db push`).

-- ============================================================================
-- Schema (spec §2.1)
-- ============================================================================

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
-- `set search_path = ''` pins name resolution so the function can't be hijacked
-- by a mutable search_path (Supabase linter 0011).
create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql set search_path = '';

create trigger workflows_touch
  before update on public.workflows
  for each row execute function public.touch_updated_at();

-- Auto-create a profile row when a new auth user signs up.
-- SECURITY DEFINER so the insert bypasses RLS; `set search_path = ''` keeps that
-- elevated context from being hijacked (Supabase linter 0011).
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = '';

-- This function is only ever invoked by the trigger below; it must not be
-- callable as a REST RPC. Triggers fire regardless of EXECUTE grant, so revoking
-- it here closes the /rpc/handle_new_user surface without breaking signup
-- (Supabase linters 0028/0029).
revoke execute on function public.handle_new_user() from anon, authenticated, public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Row Level Security (spec §2.2)
-- Every app table is owner-scoped. Child tables are scoped via their parent.
-- ============================================================================

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
