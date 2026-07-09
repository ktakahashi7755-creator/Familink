-- Familink 課金権利（entitlements）— Stripe / IAP 両対応スキーマ
--
-- 【正本】このスキーマの正本は docs/supabase-apply-all.sql の「プレミアム権利」節である。
--   本ファイルは Stripe を単体でセットアップする場合の抜粋であり、apply-all と完全に一致する
--   スーパーセット・スキーマ（適用順非依存・冪等）。どちらを先に適用しても壊れない。
--
-- 「課金状態はサーバ権利を正本」— Webhook(service_role)だけが書き込み、
--   クライアントは自分の権利を読むだけ。
-- 実行: Supabase → SQL Editor に貼って Run

create table if not exists public.fl_entitlements (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  premium                boolean not null default false,
  updated_at             timestamptz not null default now()
);
-- 列の後方追加（apply-all と同一のスーパーセット。既存テーブルも安全にアップグレード）
alter table public.fl_entitlements add column if not exists source                 text;
alter table public.fl_entitlements add column if not exists expires_at             timestamptz;
alter table public.fl_entitlements add column if not exists status                 text;   -- stripe: active / trialing / past_due / canceled ...
alter table public.fl_entitlements add column if not exists stripe_customer_id     text;
alter table public.fl_entitlements add column if not exists stripe_subscription_id text;
alter table public.fl_entitlements add column if not exists current_period_end     timestamptz;
alter table public.fl_entitlements drop constraint if exists fl_ent_source_chk;
alter table public.fl_entitlements add  constraint fl_ent_source_chk check (source is null or char_length(source) <= 32) not valid;
create index if not exists fl_ent_customer on public.fl_entitlements (stripe_customer_id);

alter table public.fl_entitlements enable row level security;

-- 本人は自分の権利を「読む」だけ。書き込みポリシーは作らない＝一般ユーザーは書けない（service_roleのみ）。
drop policy if exists fl_ent_own_select on public.fl_entitlements;
drop policy if exists ent_select_own    on public.fl_entitlements;
create policy ent_select_own on public.fl_entitlements for select using (auth.uid() = user_id);

-- アプリが読む正本ビュー：Stripe(status/current_period_end) と IAP(premium/expires_at) の両経路を OR 判定。
-- security_invoker で RLS を尊重。
drop view if exists public.fl_my_premium;
create view public.fl_my_premium
  with (security_invoker = true) as
  select
    e.user_id,
    (
      (coalesce(e.premium, false)
        and (e.expires_at is null or e.expires_at > now()))
      or
      (e.status in ('active','trialing')
        and (e.current_period_end is null or e.current_period_end > now()))
    ) as premium,
    coalesce(e.current_period_end, e.expires_at) as expires_at
  from public.fl_entitlements e
  where e.user_id = auth.uid();

grant select on public.fl_entitlements to authenticated;
grant select on public.fl_my_premium  to anon, authenticated;
