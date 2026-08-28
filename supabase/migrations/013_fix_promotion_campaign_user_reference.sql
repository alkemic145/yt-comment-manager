alter table public.promotion_campaigns
  drop constraint if exists promotion_campaigns_user_id_fkey;

alter table public.promotion_campaigns
  add constraint promotion_campaigns_user_id_fkey
  foreign key (user_id)
  references public.app_users(id)
  on delete cascade;
