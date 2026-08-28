-- Migration 014: Grant privileges for promotion_campaigns

grant all on table public.promotion_campaigns to service_role;
grant all on table public.promotion_campaigns to authenticated;
grant all on table public.promotion_campaigns to anon;
