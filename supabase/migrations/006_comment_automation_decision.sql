-- Store the decision produced by the autonomous comment decision engine.
-- The decision is intentionally separate from automation_status so a worker
-- can record why it chose REPLY, SKIP, or REVIEW without conflating that
-- decision with the eventual processing lifecycle.

alter table public.comments
  add column if not exists automation_decision text
    check (automation_decision in ('reply', 'skip', 'review')),
  add column if not exists automation_decision_reason text,
  add column if not exists automation_confidence numeric(5,4),
  add column if not exists automation_decided_at timestamptz;

create index if not exists comments_automation_decision_idx
  on public.comments (user_id, automation_decision, automation_decided_at);
