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

-- Existing comments are historical data. They must not be swept into the
-- first automatic-reply run. Existing replies are marked replied; all other
-- existing comments are skipped. New comments inserted after this migration
-- keep the default `pending` state and are eligible for future automation.
update public.comments
set
  automation_status = case
    when reply_id is not null then 'replied'
    else 'skipped'
  end,
  automation_completed_at = coalesce(automation_completed_at, now())
where automation_status = 'pending';
