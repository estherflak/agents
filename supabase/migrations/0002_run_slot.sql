-- 0002_run_slot.sql — atomic per-user daily run-quota helpers.
--
-- The /api/run-step route claims a run slot before calling Claude. This MUST be
-- a single UPDATE ... RETURNING so concurrent requests can't all read under-cap
-- and each call the model (read-modify-write race). The Supabase JS query builder
-- can't express the CASE / conditional WHERE, so we wrap it in a function and
-- call it via rpc() from the service-role client.

-- Claims one run slot for the user, resetting the daily counter inline when the
-- stored day is stale. Returns the new runs_today, or NULL when the user is at
-- or over the cap (zero rows updated => no RETURNING row => NULL).
create or replace function public.claim_run_slot(p_user_id uuid, p_max int)
returns int
language sql
security definer
set search_path = ''
as $$
  update public.profiles
     set runs_today = case when runs_day < current_date then 1
                           else runs_today + 1 end,
         runs_day = current_date
   where id = p_user_id
     and (runs_day < current_date or runs_today < p_max)
  returning runs_today;
$$;

-- Refunds a slot when the model call fails after a successful claim.
create or replace function public.refund_run_slot(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
     set runs_today = greatest(runs_today - 1, 0)
   where id = p_user_id
     and runs_day = current_date;
$$;

-- These are privileged (SECURITY DEFINER) and only ever called by the server's
-- service-role client. Keep them off the public REST surface.
revoke execute on function public.claim_run_slot(uuid, int) from anon, authenticated, public;
revoke execute on function public.refund_run_slot(uuid)      from anon, authenticated, public;
grant  execute on function public.claim_run_slot(uuid, int) to service_role;
grant  execute on function public.refund_run_slot(uuid)      to service_role;
