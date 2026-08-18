-- Durable state for the autonomous comment-processing pipeline.
-- This migration only adds processing metadata; it does not change the
-- existing manual reply behavior.

alter table public.comments
  add column if not exists automation_status text not null default 'pending'
    check (automation_status in ('pending', 'processing', 'replied', 'skipped', 'failed')),
  add column if not exists automation_attempts integer not null default 0,
  add column if not exists automation_started_at timestamptz,
  add column if not exists automation_completed_at timestamptz,
  add column if not exists automation_error text;

create index if not exists comments_automation_status_idx
  on public.comments (user_id, automation_status, published_at);

-- Existing successfully-replied comments must never enter the automatic
-- processing queue after this migration is applied.
update public.comments
set
  automation_status = 'replied',
  automation_completed_at = coalesce(automation_completed_at, updated_at)
where reply_id is not null
  and automation_status = 'pending';
