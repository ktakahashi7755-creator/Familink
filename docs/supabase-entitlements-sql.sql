-- ============================================================
-- Familink プレミアム権利のサーバ側検証（BILL-3）
--
-- 目的: 課金状態をクライアント任せ（LocalStorage の isPremiumUser）にせず、
--       サーバが書き込んだ権利をクライアントは「読むだけ」にする。
--       書き込みは service_role（IAP レシート検証を行う Edge Function）のみ。
--       → クライアントを改ざんしても権利は付与できない（RLSで保証）。
--
-- 適用: docs/supabase-setup-sql.sql の後に SQL Editor で実行（冪等）。
-- ============================================================

create table if not exists public.fl_entitlements (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  premium     boolean not null default false,
  source      text,                              -- 'app_store' | 'play' | 'promo' | 'trial' 等
  expires_at  timestamptz,                       -- サブスク期限（null=無期限/買い切り）
  updated_at  timestamptz not null default now(),
  constraint fl_ent_source_chk check (source is null or char_length(source) <= 32)
);
alter table public.fl_entitlements enable row level security;

-- 読み取り: 本人のみ自分の権利を読める
drop policy if exists "ent_select_own" on public.fl_entitlements;
create policy "ent_select_own" on public.fl_entitlements for select
  using (auth.uid() = user_id);

-- ★書き込みポリシーは作らない★
--   → authenticated ロールからの INSERT/UPDATE/DELETE は RLS により全て拒否される。
--     権利の付与・更新は service_role（RLSをバイパス）を持つサーバ側
--     （IAPレシート検証 Edge Function）でのみ行う。これによりクライアント改ざんでは
--     premium を true にできない。
grant select on public.fl_entitlements to authenticated;

-- 失効を考慮した「現在プレミアムか」を返すビュー（クライアントはこれを読む）
create or replace view public.fl_my_premium as
  select
    coalesce(e.premium, false)
      and (e.expires_at is null or e.expires_at > now()) as premium,
    e.expires_at
  from public.fl_entitlements e
  where e.user_id = auth.uid();
grant select on public.fl_my_premium to authenticated;

-- ============================================================
-- サーバ側（service_role）での権利付与例（Edge Function 内で実行）:
--   IAP レシートを Apple/Google で検証 → 成功時に upsert:
--     insert into public.fl_entitlements(user_id, premium, source, expires_at)
--     values (:uid, true, 'app_store', :expires)
--     on conflict (user_id) do update
--       set premium=excluded.premium, source=excluded.source,
--           expires_at=excluded.expires_at, updated_at=now();
--   ※ service_role キーは Edge Function の環境変数にのみ置く（クライアント禁止）。
--
-- クライアント側（app-source）:
--   ログイン後に select * from fl_my_premium を読み S._serverEntitlement に反映。
--   isPremium() は S._serverEntitlement.premium を最優先で参照する（実装済み）。
--   ローカルの isPremiumUser はオフライン時のキャッシュに過ぎない。
-- ============================================================

-- 検証実績: 2026-06-12 ローカル PostgreSQL16 で確認:
--   A は自分の権利を読める / B は A の権利を読めない /
--   B の偽造INSERT拒否 / A の自己UPDATE偽造拒否（クライアントから premium 付与不可）。
