-- Migration 015: Add automation_enabled and updated_at to youtube_connections
alter table public.youtube_connections
  add column if not exists automation_enabled boolean not null default false,
  add column if not exists updated_at timestamptz default now();

grant all on table public.youtube_connections to service_role;
grant all on table public.youtube_connections to authenticated;