-- Track replies posted by Triage so a retry/double-click cannot create
-- duplicate replies and the dashboard can show durable reply state.
alter table public.comments
  add column if not exists reply_id text,
  add column if not exists reply_text text,
  add column if not exists replied_at timestamptz;

create unique index if not exists comments_reply_id_unique_idx
  on public.comments (reply_id)
  where reply_id is not null;
