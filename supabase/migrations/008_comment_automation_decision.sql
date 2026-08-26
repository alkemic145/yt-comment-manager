-- Migration 008: Add decision, reason, and confidence columns to comments
alter table comments
  add column if not exists automation_decision text check (automation_decision in ('reply', 'skip', 'review')),
  add column if not exists automation_decision_reason text,
  add column if not exists automation_confidence numeric;

create index if not exists idx_comments_automation_decision 
  on comments (user_id, automation_decision);