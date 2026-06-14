-- ============================================================
-- Familink ポリシー完全リセット（レガシーな緩いポリシー一掃＋正しい最小権限の再作成）
--
-- 背景: 本番 fl_family_data 等に、過去に手動/旧マイグレーションで付いた緩い SELECT
--       ポリシー（USING(true) 等）が残っていると、family_read のホワイトリストを
--       無視して個人情報まで家族に見えてしまう（2026-06-14 の検証で検出）。
-- 対策: 対象4テーブルの全ポリシーを動的に drop し、正しい最小権限だけを再作成する。
-- 安全: そのまま貼って Run・冪等・RLS は有効のまま。service_role 不要。
-- 検証: 2026-06-14 ローカル PostgreSQL16（apply-all 全適用＋rogueポリシー混入）で
--       一掃→正しい5ポリシーのみ残存→分離テスト全 pass を確認。
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
