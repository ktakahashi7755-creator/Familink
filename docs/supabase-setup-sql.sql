-- ============================================================
-- Familink — Supabase バックエンド セットアップ SQL（実行用・最終版）
--
-- これは docs/supabase-backend-plan.md §4 の「最終版 SQL」です。
-- オーナーが Supabase ダッシュボードの SQL Editor に “全文貼り付けて 1 回実行” するだけで、
-- 家族単位データ分離（RLS）+ 招待コード + Realtime が一括で構成されます。
--
-- 前提（先に済ませること）:
--   1. https://supabase.com でプロジェクト作成（リージョン: Tokyo 推奨）
--   2. Authentication → Providers → Email を有効化
--      （テスト中は Authentication → Sign In / Up で "Confirm email" を OFF にすると検証が速い）
--   3. このファイルを SQL Editor に貼って Run
--   4. Project URL / publishable(anon) key は既にフロントに設定済み（familink.html）。
--      別プロジェクトを使う場合は SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY を差し替える。
--
-- 安全性:
--   - service_role キーは一切不要・使用しない。フロントには publishable(anon) キーのみ。
--   - データ分離は下記 RLS が DB レベルで保証する（クライアント実装ミスに依存しない）。
--   - 冪等性: 何度実行しても壊れないよう create ... if not exists / or replace を使用。
-- ============================================================

-- ── 拡張（gen_random_uuid 用。Supabase は既定で有効だが念のため） ──
create extension if not exists pgcrypto;

-- ============================================================
-- 1. テーブル
-- ============================================================
create table if not exists public.families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default '私の家族',
  invite_code text unique not null,
  plan        text not null default 'free',
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now()
);

create table if not exists public.family_members (
  user_id       uuid not null references auth.users(id),
  family_id     uuid not null references public.families(id) on delete cascade,
  role          text not null default 'member',   -- 'owner' | 'member'
  app_member_id text,                              -- アプリ内メンバー（kenya 等）
  display_name  text,
  joined_at     timestamptz not null default now(),
  primary key (user_id)                            -- MVP: 1 ユーザー = 1 家族
);

create table if not exists public.family_data (
  family_id  uuid not null references public.families(id) on delete cascade,
  collection text not null,        -- 'events' | 'tasks' | 'txs' | 'health' …
  item_id    text not null,        -- アプリ側の各レコード id
  data       jsonb not null,       -- レコード本体
  updated_at timestamptz not null default now(),
  deleted    boolean not null default false,
  primary key (family_id, collection, item_id)
);
create index if not exists idx_family_data_fc on public.family_data (family_id, collection);

-- ============================================================
-- 2. 補助関数（security definer = RLS を内部でバイパス → ポリシーの再帰を防ぐ）
-- ============================================================
create or replace function public.my_family_id()
  returns uuid language sql stable security definer
  set search_path = public as
$$ select family_id from public.family_members where user_id = auth.uid() $$;

-- 招待コード生成: 8 文字、紛らわしい文字（0/O, 1/I/L）を除外
create or replace function public.gen_invite_code()
  returns text language plpgsql as
$$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    -- 衝突回避
    exit when not exists (select 1 from public.families where invite_code = code);
  end loop;
  return code;
end
$$;

-- ============================================================
-- 3. RLS（行レベルセキュリティ）— 家族単位の分離の核心
-- ============================================================
alter table public.families       enable row level security;
alter table public.family_members enable row level security;
alter table public.family_data    enable row level security;

-- families: 自分の家族のみ参照可
drop policy if exists fam_select on public.families;
create policy fam_select on public.families for select
  using ( id = public.my_family_id() );

-- family_members: 自分の所属行のみ参照可
drop policy if exists fm_select on public.family_members;
create policy fm_select on public.family_members for select
  using ( family_id = public.my_family_id() );

-- family_data: 自分の家族のデータのみ 参照/追加/更新/削除
drop policy if exists fd_all on public.family_data;
create policy fd_all on public.family_data for all
  using      ( family_id = public.my_family_id() )
  with check ( family_id = public.my_family_id() );

-- ※ families / family_members への INSERT はクライアント直接ではなく
--   下記 RPC（security definer）経由のみ。だから INSERT ポリシーは不要。

-- ============================================================
-- 4. RPC（家族の作成 / 参加）
-- ============================================================

-- 新規家族を作成し、作成者を owner として登録。新しい招待コードを発行。
-- 新規サインアップごとに必ず “別の” 家族コードが発行される（前アカウントを引き継がない）。
create or replace function public.create_family(family_name text default '私の家族')
  returns table (family_id uuid, invite_code text)
  language plpgsql security definer set search_path = public as
$$
declare
  fam uuid;
  code text;
begin
  -- 既に所属していればそれを返す（二重作成防止・冪等）
  select fm.family_id into fam from public.family_members fm where fm.user_id = auth.uid();
  if fam is not null then
    return query select f.id, f.invite_code from public.families f where f.id = fam;
    return;
  end if;

  code := public.gen_invite_code();
  insert into public.families (name, invite_code, created_by)
    values (coalesce(nullif(family_name,''),'私の家族'), code, auth.uid())
    returning id into fam;
  insert into public.family_members (user_id, family_id, role)
    values (auth.uid(), fam, 'owner');

  return query select fam, code;
end
$$;

-- 招待コードで既存家族に参加。
create or replace function public.join_family(code text)
  returns uuid language plpgsql security definer set search_path = public as
$$
declare fam uuid;
begin
  select id into fam from public.families where invite_code = upper(trim(code));
  if fam is null then raise exception 'invalid_code'; end if;
  insert into public.family_members (user_id, family_id, role)
    values (auth.uid(), fam, 'member')
    on conflict (user_id) do update set family_id = excluded.family_id;
  return fam;
end
$$;

-- 招待コードの再発行（owner のみ。漏洩時用）
create or replace function public.rotate_invite_code()
  returns text language plpgsql security definer set search_path = public as
$$
declare fam uuid; code text; r text;
begin
  select fm.family_id, fm.role into fam, r from public.family_members fm where fm.user_id = auth.uid();
  if fam is null then raise exception 'no_family'; end if;
  if r <> 'owner' then raise exception 'not_owner'; end if;
  code := public.gen_invite_code();
  update public.families set invite_code = code where id = fam;
  return code;
end
$$;

-- 認証ユーザーが RPC を呼べるように
grant execute on function public.create_family(text)    to authenticated;
grant execute on function public.join_family(text)      to authenticated;
grant execute on function public.rotate_invite_code()   to authenticated;
grant execute on function public.my_family_id()         to authenticated;

-- ============================================================
-- 5. Realtime（複数端末リアルタイム反映）
--    family_data の変更を購読できるよう publication に追加。
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'family_data'
  ) then
    execute 'alter publication supabase_realtime add table public.family_data';
  end if;
end $$;

-- ============================================================
-- 6. 動作確認（任意・SQL Editor 上で）
--   select public.create_family('テスト家族');     -- 招待コードが返る
--   select public.my_family_id();                   -- 自分の family_id
--   select * from public.families;                  -- RLS により自分の家族のみ
-- ============================================================

-- 完了。次はアプリ側 同期レイヤー（Phase 4-4 / 4-5）の実装 + 2 アカウントでの検証。
