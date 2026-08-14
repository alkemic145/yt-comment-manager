create extension if not exists pgcrypto;

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  google_sub text not null unique,
  email text,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table youtube_connections
  add column if not exists user_id uuid references app_users(id) on delete cascade;

create index if not exists idx_auth_sessions_token_hash on auth_sessions(token_hash);
create index if not exists idx_auth_sessions_user_id on auth_sessions(user_id);
create index if not exists idx_youtube_connections_user_id on youtube_connections(user_id);

-- These tables are accessed only by the server through the service-role client.
alter table app_users enable row level security;
alter table auth_sessions enable row level security;
alter table youtube_connections enable row level security;
