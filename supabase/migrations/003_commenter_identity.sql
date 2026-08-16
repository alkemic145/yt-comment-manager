-- Stable YouTube commenter identity for relationship history and badges.
-- Keep this as a forward migration so already-applied migrations remain immutable.

alter table public.comments
  add column if not exists author_channel_id text;

create index if not exists comments_user_id_author_channel_id_idx
  on public.comments (user_id, author_channel_id);
