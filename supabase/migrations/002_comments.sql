-- Local storage for YouTube comments, synced in from the YouTube Data API.
--
-- Reading comments from this table (instead of fetching YouTube live on
-- every dashboard load) is what makes pagination possible, and avoids
-- spending YouTube API quota just to redisplay comments you already have.

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  connection_id bigint references public.youtube_connections(id) on delete set null,
  comment_id text not null,
  video_id text,
  text text,
  author text,
  author_image text,
  like_count integer not null default 0,
  reply_count integer not null default 0,
  published_at timestamptz,
  updated_at timestamptz,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (comment_id)
);

-- Supports the paginated read query: comments for a user, newest first.
create index if not exists comments_user_id_published_at_idx
  on public.comments (user_id, published_at desc);

-- RLS is enabled for consistency with the rest of the schema. Note: the
-- app currently always queries through the Supabase service role key,
-- which bypasses RLS entirely, so this is not yet providing real
-- protection on its own -- see src/lib/comments-repo.ts and
-- src/lib/youtube-connections.ts for how user-scoping is actually
-- enforced today (manual .eq("user_id", ...) filters, centralized in
-- those modules).
alter table public.comments enable row level security;
