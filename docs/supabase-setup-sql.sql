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
        'recurringTxs','memos','memoFolders','workspaces','homeNote',
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
