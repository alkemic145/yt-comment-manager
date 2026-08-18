-- Allow the same YouTube channel to be connected by different users,
-- while preventing duplicate connections for the same user/channel pair.

drop index if exists public.idx_youtube_connections_channel_id_unique;

create unique index idx_youtube_connections_user_channel_unique
  on public.youtube_connections (user_id, channel_id);
