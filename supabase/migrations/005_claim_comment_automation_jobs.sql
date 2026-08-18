-- Atomically claim a bounded batch of automation jobs.
-- `FOR UPDATE SKIP LOCKED` prevents concurrent workers from claiming the
-- same comment. Stale processing jobs can be reclaimed after a timeout.

create or replace function public.claim_pending_comment_automation_jobs(
  p_user_id uuid,
  p_limit integer default 10,
  p_stale_after_minutes integer default 15
)
returns setof public.comments
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with candidates as (
    select c.id
    from public.comments as c
    where c.user_id = p_user_id
      and c.reply_id is null
      and (
        c.automation_status = 'pending'
        or (
          c.automation_status = 'processing'
          and c.automation_started_at < now() - (
            greatest(coalesce(p_stale_after_minutes, 15), 1) * interval '1 minute'
          )
        )
      )
    order by c.published_at asc nulls last, c.created_at asc
    limit least(greatest(coalesce(p_limit, 10), 1), 100)
    for update skip locked
  ), claimed as (
    update public.comments as c
    set
      automation_status = 'processing',
      automation_attempts = c.automation_attempts + 1,
      automation_started_at = now(),
      automation_error = null
    from candidates
    where c.id = candidates.id
    returning c.*
  )
  select * from claimed;
end;
$$;

-- This function is an internal server-side worker primitive. Do not expose
-- it to browser-facing roles. The app uses the Supabase service-role client.
revoke execute on function public.claim_pending_comment_automation_jobs(uuid, integer, integer)
  from public, anon, authenticated;

grant execute on function public.claim_pending_comment_automation_jobs(uuid, integer, integer)
  to service_role;
