-- Migration 007: RPC function to claim pending comment automation jobs
create or replace function claim_pending_comment_automation_jobs(
  p_user_id text,
  p_limit int default 10,
  p_stale_after_minutes int default 15
)
returns setof comments
language plpgsql
security definer
as $$
declare
  stale_threshold timestamptz := now() - (p_stale_after_minutes || ' minutes')::interval;
begin
  return query
  with candidate_jobs as (
    select id
    from comments
    where user_id = p_user_id
      and (
        automation_status = 'pending'
        or (automation_status = 'processing' and automation_started_at < stale_threshold)
      )
      and is_deleted = false
      and reply_id is null
    order by published_at desc
    limit p_limit
    for update skip locked
  )
  update comments c
  set
    automation_status = 'processing',
    automation_started_at = now(),
    automation_attempts = c.automation_attempts + 1
  from candidate_jobs
  where c.id = candidate_jobs.id
  returning c.*;
end;
$$;