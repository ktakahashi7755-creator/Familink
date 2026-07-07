-- Familink 課金権利（entitlements）テーブル + ビュー + RLS
-- 「課金状態はサーバ権利を正本」— Webhook(service_role)だけが書き込み、クライアントは自分の権利を読むだけ。
-- 実行: Supabase → SQL Editor に貼って Run

create table if not exists public.fl_entitlements (
  user_id                uuid primary key,
  premium                boolean not null default false,
  status                 text,                    -- stripe: active / trialing / past_due / canceled ...
  stripe_customer_id     text,
  stripe_subscription_id text,
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);
create index if not exists fl_ent_customer on public.fl_entitlements (stripe_customer_id);

alter table public.fl_entitlements enable row level security;

-- 本人は自分の権利を「読む」だけ。書き込みポリシーは作らない＝一般ユーザーは書けない（service_roleのみ）。
drop policy if exists fl_ent_own_select on public.fl_entitlements;
create policy fl_ent_own_select on public.fl_entitlements for select using (auth.uid() = user_id);

-- アプリが読む正本ビュー：本人の「有効な権利」を premium/expires_at で返す。
-- status が active/trialing かつ 期限内なら premium=true。security_invoker で RLS を尊重。
drop view if exists public.fl_my_premium;
create view public.fl_my_premium
  with (security_invoker = true) as
  select
    user_id,
    (status in ('active','trialing')
      and (current_period_end is null or current_period_end > now())) as premium,
    current_period_end as expires_at
  from public.fl_entitlements
  where user_id = auth.uid();

grant select on public.fl_my_premium to anon, authenticated;
