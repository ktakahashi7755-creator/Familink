-- ============================================================
-- Familink 本番 Supabase 一括適用 SQL（これを全文貼り付けて Run するだけ）
-- 内容: ①RLS/CHECK ②招待の使い捨て化 ③課金のサーバ権利 ④インデックス
-- 冪等: 何度実行しても壊れません。service_role キー不要。
-- 生成: 2026-06-12 / 元: docs/supabase-{setup,invites,entitlements,perf-indexes}-sql
-- ============================================================

-- ============================================================
-- Familink 家族共有 セットアップ SQL（実行用・最終版 / 冪等）
--
-- これを Supabase ダッシュボードの「SQL Editor」に “全文貼り付けて Run” するだけで、
-- 家族間データ共有に必要な テーブル / RLS / 家族横断の読み取り許可 / Realtime が
-- 一括で正しい状態になります。何度実行しても壊れません（冪等）。
--
-- 背景：アプリ側の実装は完了済み（docs/family-sync-fix.md 参照）。
--       「別アカウント＝家族同士の共有」が動くには、この SQL の RLS(family_read) と
--       Realtime publication が DB 側に適用されている必要があります。これが未適用だと
--       「自分の行しか読めない」ため、同一アカウントの多端末同期しか動きません。
--
-- 安全性：service_role キー不要。publishable(anon) キーのみでアプリは動作。
--         データ分離は下記 RLS が DB レベルで保証します。
-- ============================================================

-- 0) テーブル（既にあれば作成スキップ）
create table if not exists public.fl_family_data (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  family_id  text,
  data_key   text not null,
  payload    jsonb,
  updated_at timestamptz default now() not null,
  unique(user_id, data_key)
);
alter table public.fl_family_data enable row level security;

-- 0b) 堅牢化 CHECK 制約（データ分離の前提を DB レベルで担保）
--     ・data_key は 1〜64 文字（空キー・異常長キーを拒否）
--     ・family_id は FAMI- 形式 または null（不正な family_id 値の混入を抑止）
--     既存行を壊さないよう NOT VALID（以後の INSERT/UPDATE にのみ適用）。
alter table public.fl_family_data drop constraint if exists fl_data_key_chk;
alter table public.fl_family_data drop constraint if exists fl_family_id_chk;
alter table public.fl_family_data
  add constraint fl_data_key_chk
  check (data_key is not null and char_length(data_key) between 1 and 64) not valid;
alter table public.fl_family_data
  add constraint fl_family_id_chk
  check (family_id is null or family_id ~ '^FAMI-[A-Z0-9-]{4,40}$') not valid;

-- 1) 自分の family_id を返す補助関数（SECURITY DEFINER で RLS 再帰を回避）
create or replace function public.fl_my_family_ids()
  returns setof text language sql security definer stable
  set search_path = public as $$
    select distinct family_id from public.fl_family_data
    where user_id = auth.uid() and family_id is not null
  $$;
grant execute on function public.fl_my_family_ids() to authenticated;

-- 2) RLS ポリシー（書き込みは常に自分の行のみ）
--    読み取り（family_read）は次の二段で“最小権限”にする：
--      ① 自分の行は data_key を問わず全部読める（多端末で自分のデータを復元するため）
--      ② 家族（同じ family_id）の行は「家族で共有してよい data_key だけ」読める
--    → 体調・予定・家計・買い物・ボード等の“家族共有データ”は家族で見えるが、
--       userProfile / hokuContext(Hoku会話文脈) / isPremiumUser / cashflowSettings /
--       notifs / アバター 等の“個人・端末固有データ”は本人以外（家族でも）読めない。
--    ※ 共有キー一覧は app-source の FAMILY_SHARED_KEYS と一致させること（変更時は両方更新）。
drop policy if exists "users_own_data" on public.fl_family_data;  -- 旧ポリシーがあれば撤去
drop policy if exists "family_read"   on public.fl_family_data;
drop policy if exists "own_insert"    on public.fl_family_data;
drop policy if exists "own_update"    on public.fl_family_data;
drop policy if exists "own_delete"    on public.fl_family_data;

create policy "family_read" on public.fl_family_data for select
  using (
    auth.uid() = user_id
    or (
      family_id in (select public.fl_my_family_ids())
      and data_key = any (array[
        'events','tasks','txs','health','posts','announces',
        'prep','prepRoutines','folders','docs','albumPhotos',
        'shoppingItems','shoppingFrequent','members',
        'customBoards','boardItems','boardSections',
        'recurringTxs','memos','memoFolders','workspaces',
        '_deletions'
      ])
    )
  );
create policy "own_insert" on public.fl_family_data for insert
  with check (auth.uid() = user_id);
create policy "own_update" on public.fl_family_data for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_delete" on public.fl_family_data for delete
  using (auth.uid() = user_id);

-- 3) Realtime を有効化（他端末の変更を“即時”受け取るため。未設定だと20秒ポーリングのみ）
--    既に publication に入っている場合のエラーを握りつぶす冪等ブロック。
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'fl_family_data'
  ) then
    execute 'alter publication supabase_realtime add table public.fl_family_data';
  end if;
end $$;

-- 4) 確認（任意）：
--   select public.fl_my_family_ids();                       -- ログインユーザーの family_id 一覧
--   select count(*) from public.fl_family_data;             -- RLS により自分＋家族の行のみ
--   select * from pg_publication_tables                     -- fl_family_data が realtime に入っているか
--     where pubname='supabase_realtime' and tablename='fl_family_data';

-- ============================================================
-- 仕上げ（ダッシュボード設定・SQLではない）：
--  ・Authentication → Sign In / Providers → Email：
--      家族の登録を簡単にするなら「Confirm email」を OFF（= 登録後すぐログイン可）に。
--      ON のままにする場合、家族は登録後に確認メールのリンク or アプリの「6桁コード(OTP)」が必要。
--  ・無料SMTPは 1時間2通の制限あり → 確実なのはアプリの「メールでコードを受け取る(OTP)」。
-- 完了。アプリの #qa-debug →「家族共有セルフテスト」で各レイヤーの合否を確認できます。
-- ============================================================


-- ============================================================
-- Familink 招待コードの「有効期限・使い捨て化」（H3 / C2 対策）
--
-- 背景: 現行は family_id 自体を共有する“無期限ベアラ”方式。コードを知る者は
--       いつでも何度でも参加でき、露出窓が無限。これを短命・1回限りの招待
--       トークンに置き換え、family_id を直接配らない方式へ移行する。
--
-- 適用: docs/supabase-setup-sql.sql の後に SQL Editor で実行（冪等）。
-- 安全性: service_role 不要。RPC は SECURITY DEFINER で原子的に消費する。
-- ============================================================

create table if not exists public.fl_family_invites (
  token       text primary key,                 -- 例: INV-XXXX-XXXX（高エントロピー）
  family_id   text not null,
  created_by  uuid references auth.users(id) on delete cascade not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,             -- 既定: 発行から72時間
  used_at     timestamptz,                       -- 消費時刻（null=未使用）
  used_by     uuid references auth.users(id),    -- 消費したユーザー
  constraint fl_invite_token_chk check (token ~ '^INV-[A-Z0-9-]{4,40}$'),
  constraint fl_invite_family_chk check (family_id ~ '^FAMI-[A-Z0-9-]{4,40}$')
);
alter table public.fl_family_invites enable row level security;

-- RLS:
--  ・作成: 自分の family_id に対してのみ招待を発行できる
--    （fl_my_family_ids() に含まれる family_id だけ。任意家族の招待は作れない）
--  ・参照: 作成者のみ自分が発行した招待を一覧できる（被招待者はRPC経由で消費するため直接SELECT不可）
--  ・更新/削除: 作成者のみ（取り消し用）
drop policy if exists "invite_insert_own_family" on public.fl_family_invites;
drop policy if exists "invite_select_creator"    on public.fl_family_invites;
drop policy if exists "invite_update_creator"    on public.fl_family_invites;
drop policy if exists "invite_delete_creator"    on public.fl_family_invites;

create policy "invite_insert_own_family" on public.fl_family_invites for insert
  with check (
    auth.uid() = created_by
    and family_id in (select public.fl_my_family_ids())
  );
create policy "invite_select_creator" on public.fl_family_invites for select
  using (auth.uid() = created_by);
create policy "invite_update_creator" on public.fl_family_invites for update
  using (auth.uid() = created_by) with check (auth.uid() = created_by);
create policy "invite_delete_creator" on public.fl_family_invites for delete
  using (auth.uid() = created_by);

-- 使い捨て消費 RPC: 有効なトークンを「未使用かつ未期限」のときだけ原子的に
-- used 化し、family_id を返す。二重消費は行ロックで防止。
create or replace function public.redeem_family_invite(p_token text)
  returns text language plpgsql security definer set search_path = public as $$
declare
  v_family text;
begin
  -- 行ロックで同時消費を防ぐ
  update public.fl_family_invites
     set used_at = now(), used_by = auth.uid()
   where token = p_token
     and used_at is null
     and expires_at > now()
  returning family_id into v_family;

  if v_family is null then
    raise exception 'invite_invalid_or_used' using errcode = 'P0001';
  end if;
  return v_family;   -- 呼び出し側はこの family_id で参加処理を行う
end $$;
grant execute on function public.redeem_family_invite(text) to authenticated;

-- 期限切れ招待の自動掃除（任意・cron 推奨）:
--   delete from public.fl_family_invites where expires_at < now() - interval '7 days';

-- ============================================================
-- クライアント側の移行（app-source 実装は別途・要デプロイ後に有効化）:
--   1) 招待発行: token=INV-... を生成 → fl_family_invites に insert（expires_at=now()+72h）
--      → 被招待者にはこの token を渡す（family_id は直接渡さない）
--   2) 参加: redeem_family_invite(token) を呼ぶ → 返った family_id で _setFamilyId()
--   3) 失敗時（invite_invalid_or_used / 期限切れ）は「招待が無効か期限切れ」を案内
--   ※ 後方互換: 旧 FAMI- 直接コードも当面は受理（段階移行）。
-- ============================================================

-- ============================================================
-- 検証実績: 2026-06-12 ローカル PostgreSQL 16 で本SQLを適用し確認済み
--   ・A は自分の family_id の招待のみ作成可（他家族の招待発行は RLS 拒否）
--   ・有効トークンの redeem_family_invite() は family_id を返す
--   ・同一トークンの二度目消費は invite_invalid_or_used で失敗（使い捨て）
--   ・期限切れ／存在しないトークンも失敗
--   ・被招待者は fl_family_invites を直接 SELECT 不可（作成者のみ）
-- ============================================================


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


-- ============================================================
-- Familink Supabase クエリ最適化（PERF-3）
--
-- クライアントの同期クエリは既に列を限定（select user_id,data_key,payload,updated_at）し、
-- SELECT * や N+1 は行っていない。家族取得は family_id 等値、個人取得は user_id 等値。
-- 行数増加に備えて以下のインデックスを追加する（冪等）。
-- ============================================================

-- 家族読み取り（family_read ポリシー）の主経路: family_id で絞り込む
create index if not exists idx_fl_family_data_family on public.fl_family_data (family_id);

-- 個人データ取得・upsert の主キー経路（unique(user_id,data_key) で既にインデックス有り）。
-- 念のため user_id 単独の検索（自分の全行取得）も補助インデックス化。
create index if not exists idx_fl_family_data_user on public.fl_family_data (user_id);

-- 招待トークンの消費（redeem）は主キー(token)で引くため追加不要。
-- 権利（fl_entitlements）は user_id 主キーで引くため追加不要。

-- ※ pg のプランナが seq scan を選ぶ小規模時は無害。行数が増えると効く。


-- ============================================================
-- 【追補 2026-06-14】家族分離の最終強化（membership 方式）
-- 別家族は family_id を知っていても参加・閲覧不可。正規招待のメンバーのみ共有。
-- 元: docs/supabase-family-isolation-sql.sql（冪等・既存家族は backfill で自動移行）
-- ============================================================

-- ============================================================
-- Familink 家族分離の最終強化（membership 方式）— 本番 Supabase 適用 SQL
--
-- 目的:
--   現行は「family_id を知る＝参加できる」ベアラ方式（docs/security-tests.sql の 3-1 参照）。
--   これを「正規の招待で承認されたメンバーだけが読み書きできる」membership 方式に強化する。
--   → family_id が万一漏れても、メンバー表に無い人は A 家族の共有データを一切読めない／書けない。
--   → ABCDE 複数家族があっても、A は A のメンバーだけ、B は B のメンバーだけで共有される。
--
-- 適用順:
--   1) docs/supabase-setup-sql.sql（テーブル/RLSの土台）を先に適用済みであること。
--   2) 本ファイルを SQL Editor に全文貼り付けて Run（冪等・トランザクション保護・既存家族は自動移行）。
--   ※ docs/supabase-apply-all.sql には本内容を末尾に同梱済み（一括適用ならそちらでも可）。
--
-- 安全性: service_role 不要。membership の付与は SECURITY DEFINER の RPC のみが行う。
--         既存の共有家族は backfill で自動的にメンバー登録され、共有は途切れない。
-- ============================================================

begin;

-- 1) 家族メンバー表（誰がどの家族に属するかの“正本”）
create table if not exists public.fl_family_members (
  family_id  text not null,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'member',      -- 'owner' | 'member'
  joined_at  timestamptz not null default now(),
  primary key (family_id, user_id),
  constraint fl_member_family_chk check (family_id ~ '^FAMI-[A-Z0-9-]{4,40}$'),
  constraint fl_member_role_chk   check (role in ('owner','member'))
);
alter table public.fl_family_members enable row level security;
create index if not exists idx_fl_family_members_user on public.fl_family_members (user_id);

-- 2) 既存家族の移行（backfill）:
--    現行 fl_family_data に family_id を持つ全ユーザーを、その家族のメンバーとして登録。
--    これにより membership 方式へ切り替えても“今つながっている家族”の共有が途切れない。
insert into public.fl_family_members (family_id, user_id, role)
  select distinct d.family_id, d.user_id, 'member'
    from public.fl_family_data d
   where d.family_id is not null
     and d.family_id ~ '^FAMI-[A-Z0-9-]{4,40}$'
on conflict (family_id, user_id) do nothing;

-- 3) 自分の family_id 一覧を“メンバー表から”返すよう変更（ここが強化の核心）。
--    以前は fl_family_data から導出していたため「データ行を書けば参加扱い」になっていた。
--    メンバー表参照に変えることで、データ行を書いただけでは参加にならない。
create or replace function public.fl_my_family_ids()
  returns setof text language sql security definer stable
  set search_path = public as $$
    select distinct family_id from public.fl_family_members
    where user_id = auth.uid()
  $$;
grant execute on function public.fl_my_family_ids() to authenticated;

-- 4) メンバー表の RLS:
--    ・参照: 自分が属する家族のメンバー行のみ（家族名簿/アバター表示に必要）。
--    ・INSERT/UPDATE/DELETE ポリシーは作らない → authenticated からの直接変更は全拒否。
--      参加/離脱は下記 SECURITY DEFINER の RPC 経由でのみ行う（自己申告での参加を不可能にする）。
drop policy if exists "member_select_own_families" on public.fl_family_members;
create policy "member_select_own_families" on public.fl_family_members for select
  using (family_id in (select public.fl_my_family_ids()));

-- 5) 家族の新規作成 RPC: 呼び出し本人を owner として登録する。
--    他人が既にメンバーの family_id は奪えない（衝突＝astronomically unlikely だが安全側に倒す）。
--    自分が既にメンバーなら冪等に成功する（招待モーダルの再オープン等で再呼び出しされても安全）。
create or replace function public.fl_create_family(p_family_id text)
  returns text language plpgsql security definer set search_path = public as $$
begin
  if p_family_id is null or p_family_id !~ '^FAMI-[A-Z0-9-]{4,40}$' then
    raise exception 'bad_family_id' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.fl_family_members
     where family_id = p_family_id and user_id <> auth.uid()
  ) then
    raise exception 'family_id_taken' using errcode = 'P0001';
  end if;
  insert into public.fl_family_members (family_id, user_id, role)
    values (p_family_id, auth.uid(), 'owner')
    on conflict (family_id, user_id) do nothing;
  return p_family_id;
end $$;
grant execute on function public.fl_create_family(text) to authenticated;

-- 6) 招待消費 RPC を“メンバー登録まで原子的に行う”よう更新。
--    有効・未使用・未期限のトークンのときだけ used 化し、呼び出し本人をメンバーに追加して
--    family_id を返す。二重消費は行ロックで防止。
create or replace function public.redeem_family_invite(p_token text)
  returns text language plpgsql security definer set search_path = public as $$
declare v_family text;
begin
  update public.fl_family_invites
     set used_at = now(), used_by = auth.uid()
   where token = p_token
     and used_at is null
     and expires_at > now()
  returning family_id into v_family;

  if v_family is null then
    raise exception 'invite_invalid_or_used' using errcode = 'P0001';
  end if;

  insert into public.fl_family_members (family_id, user_id, role)
    values (v_family, auth.uid(), 'member')
    on conflict (family_id, user_id) do nothing;

  return v_family;
end $$;
grant execute on function public.redeem_family_invite(text) to authenticated;

-- 7) 家族からの離脱 RPC: 自分のメンバー行だけを削除する（他人は消せない）。
create or replace function public.fl_leave_family(p_family_id text)
  returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.fl_family_members
   where family_id = p_family_id and user_id = auth.uid();
end $$;
grant execute on function public.fl_leave_family(text) to authenticated;

-- 8) fl_family_data の RLS を membership 基準に締め直す。
--    ・読み取り: 自分の行 OR（自分が属する家族 AND 家族共有してよい data_key のみ）。
--    ・書き込み: 自分の行 かつ（family_id が null OR 自分が属する家族）。
--      → メンバーでない family_id へはデータ行を一切書けない（ベアラ参加の封じ込め）。
--    ※ 共有キー一覧は app-source の FAMILY_SHARED_KEYS と一致させること。
drop policy if exists "family_read" on public.fl_family_data;
drop policy if exists "own_insert"  on public.fl_family_data;
drop policy if exists "own_update"  on public.fl_family_data;
drop policy if exists "own_delete"  on public.fl_family_data;

create policy "family_read" on public.fl_family_data for select
  using (
    auth.uid() = user_id
    or (
      family_id in (select public.fl_my_family_ids())
      and data_key = any (array[
        'events','tasks','txs','health','posts','announces',
        'prep','prepRoutines','folders','docs','albumPhotos',
        'shoppingItems','shoppingFrequent','members',
        'customBoards','boardItems','boardSections',
        'recurringTxs','memos','memoFolders','workspaces',
        '_deletions'
      ])
    )
  );
create policy "own_insert" on public.fl_family_data for insert
  with check (
    auth.uid() = user_id
    and (family_id is null or family_id in (select public.fl_my_family_ids()))
  );
create policy "own_update" on public.fl_family_data for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (family_id is null or family_id in (select public.fl_my_family_ids()))
  );
create policy "own_delete" on public.fl_family_data for delete
  using (auth.uid() = user_id);

commit;

-- ============================================================
-- 確認（任意）:
--   select public.fl_my_family_ids();                          -- 自分が属する家族
--   select count(*) from public.fl_family_members;             -- 自分の家族の名簿のみ見える
-- 検証SQL: docs/security-tests.sql（membership 版に更新済み）を Run し、全 pass=true を確認。
--
-- クライアント（app-source）側は後方互換実装:
--   ・本SQL未適用でも従来どおり動作（RPCが無ければ legacy にフォールバック）。
--   ・本SQL適用後は「招待トークン(INV-)＝使い捨てリンク」での参加に一本化され、
--     family_id を直接知っただけでは参加できない（membership が必須）。
-- ============================================================

-- ============================================================
-- 【追補 2026-06-14b】ポリシー完全リセット（再実行で緩いポリシーを自動一掃）
-- 元: docs/supabase-policy-reset.sql
-- ============================================================
do $$
declare p record; t text;
begin
  foreach t in array array['fl_family_data','fl_family_members','fl_family_invites','fl_entitlements'] loop
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name=t) then
      execute format('alter table public.%I enable row level security', t);
      for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
        execute format('drop policy if exists %I on public.%I', p.policyname, t);
      end loop;
    end if;
  end loop;
end $$;

-- fl_family_data: 自分の行 / 家族の共有キーのみ読める。書込は自分の行かつ自家族のみ
create policy "family_read" on public.fl_family_data for select
  using (
    auth.uid() = user_id
    or (
      family_id in (select public.fl_my_family_ids())
      and data_key = any (array[
        'events','tasks','txs','health','posts','announces',
        'prep','prepRoutines','folders','docs','albumPhotos',
        'shoppingItems','shoppingFrequent','members',
        'customBoards','boardItems','boardSections',
        'recurringTxs','memos','memoFolders','workspaces','_deletions'
      ])
    )
  );
create policy "own_insert" on public.fl_family_data for insert
  with check (auth.uid() = user_id and (family_id is null or family_id in (select public.fl_my_family_ids())));
create policy "own_update" on public.fl_family_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and (family_id is null or family_id in (select public.fl_my_family_ids())));
create policy "own_delete" on public.fl_family_data for delete
  using (auth.uid() = user_id);

-- fl_family_members: 参照は自分の家族のみ。変更は RPC(SECURITY DEFINER)のみ＝直接の書込ポリシーは作らない
create policy "member_select_own_families" on public.fl_family_members for select
  using (family_id in (select public.fl_my_family_ids()));

-- fl_family_invites: 作成は自家族のみ・参照/更新/削除は作成者のみ
create policy "invite_insert_own_family" on public.fl_family_invites for insert
  with check (auth.uid() = created_by and family_id in (select public.fl_my_family_ids()));
create policy "invite_select_creator" on public.fl_family_invites for select
  using (auth.uid() = created_by);
create policy "invite_update_creator" on public.fl_family_invites for update
  using (auth.uid() = created_by) with check (auth.uid() = created_by);
create policy "invite_delete_creator" on public.fl_family_invites for delete
  using (auth.uid() = created_by);

-- fl_entitlements: 本人の読み取りのみ。書込ポリシーは作らない＝クライアントから課金付与は不可
create policy "ent_select_own" on public.fl_entitlements for select
  using (auth.uid() = user_id);
