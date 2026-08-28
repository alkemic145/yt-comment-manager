alter table public.comments
  add column if not exists automation_decision text,
  add column if not exists automation_decision_reason text,
  add column if not exists automation_confidence double precision,
  add column if not exists automation_decided_at timestamptz;

create index if not exists comments_automation_decision_idx
  on public.comments (user_id, automation_decision);

create index if not exists comments_automation_decided_at_idx
  on public.comments (user_id, automation_decided_at);
