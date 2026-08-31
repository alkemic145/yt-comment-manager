create table if not exists public.promotion_campaigns (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  promotion_type text not null check (
    promotion_type in ('product','service','course','video','website','other')
  ),
  description text,
  call_to_action text,
  target_url text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists promotion_campaigns_user_id_idx
on public.promotion_campaigns(user_id);

create or replace function update_promotion_campaign_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists promotion_campaigns_updated_at on public.promotion_campaigns;

create trigger promotion_campaigns_updated_at
before update on public.promotion_campaigns
for each row
execute function update_promotion_campaign_updated_at();

alter table public.promotion_campaigns enable row level security;

-- 1. Select Policy
drop policy if exists "Users can view their own campaigns" on public.promotion_campaigns;
create policy "Users can view their own campaigns"
on public.promotion_campaigns
for select
using (auth.uid() = user_id);

-- 2. Insert Policy
drop policy if exists "Users can insert their own campaigns" on public.promotion_campaigns;
drop policy if exists "Users can create their own campaigns" on public.promotion_campaigns;
create policy "Users can insert their own campaigns"
on public.promotion_campaig