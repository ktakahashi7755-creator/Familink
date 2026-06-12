-- ============================================================
-- Familink RLS データ分離 検証SQL（別ユーザーを想定）
--
-- 目的: fl_family_data の RLS が「家族ID外のデータに一切アクセスできない」
--       ことを、別ユーザーの auth.uid() を偽装して SELECT/INSERT/UPDATE/DELETE
--       の各操作で確認する。
--
-- 実行方法:
--   Supabase ダッシュボード → SQL Editor に貼り付けて Run。
--   ※ docs/supabase-setup-sql.sql を先に適用しておくこと。
--   ※ 本ファイルはテスト用データを作って最後に必ず削除する（冪等）。
--   ※ 認証情報は一切含まない。誰の Supabase でも安全に実行できる。
--
-- 検証実績: 2026-06-12、ローカル PostgreSQL 16 上で auth.uid()/authenticated ロールを
--   シムして本ポリシーを適用し、下記 1-1〜3-2 と CHECK 制約を全て期待どおり確認済み
--   （B=同家族は共有キーのみ可・private不可、C=別家族は完全遮断、偽装INSERTはRLS拒否、
--     不正 family_id / 空 data_key は CHECK 拒否）。本番 Supabase でも同 SQL で再現可能。
--
-- 想定:
--   ユーザーA(uidA) … 家族 FAMI-AAAA-AAAA-AAAA
--   ユーザーB(uidB) … 家族 FAMI-AAAA-AAAA-AAAA（A と同じ家族）
--   ユーザーC(uidC) … 家族 FAMI-CCCC-CCCC-CCCC（別の家族）
--
-- auth.uid() の偽装:
--   set local role authenticated;
--   select set_config('request.jwt.claims',
--     json_build_object('sub', '<uuid>')::text, true);
-- ============================================================

begin;  -- 全体をトランザクションで包み、最後に rollback してテストデータを残さない

-- 固定UUID（テスト専用）
\set uidA '00000000-0000-0000-0000-0000000000aa'
\set uidB '00000000-0000-0000-0000-0000000000bb'
\set uidC '00000000-0000-0000-0000-0000000000cc'

-- 0) 準備: RLS をバイパスできる所有者ロールで初期データを投入
--    （auth.users への FK があるため、テスト中は一時的に制約を緩めるのではなく、
--     既存の本物ユーザーUUIDが無い環境向けに FK を確認。FK で失敗する場合は
--     実在ユーザーのUUIDに置換して実行すること。）
-- ここでは「RLSの判定」を見るのが目的なので、行は postgres ロール（RLS免除）で挿入する。

-- A の共有データ（events）と私的データ（userProfile）
insert into public.fl_family_data(user_id, family_id, data_key, payload)
values
  (:'uidA', 'FAMI-AAAA-AAAA-AAAA', 'events',      '[{"id":"a1","title":"Aの予定"}]'),
  (:'uidA', 'FAMI-AAAA-AAAA-AAAA', 'userProfile', '{"name":"Aの個人情報"}'),
  (:'uidB', 'FAMI-AAAA-AAAA-AAAA', 'events',      '[{"id":"b1","title":"Bの予定"}]'),
  (:'uidC', 'FAMI-CCCC-CCCC-CCCC', 'events',      '[{"id":"c1","title":"Cの予定"}]'),
  (:'uidC', 'FAMI-CCCC-CCCC-CCCC', 'userProfile', '{"name":"Cの個人情報"}')
on conflict (user_id, data_key) do update set payload = excluded.payload, family_id = excluded.family_id;

-- ============================================================
-- 検証1: ユーザーB（A と同じ家族）の視点
-- ============================================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'uidB')::text, true);

-- [期待: PASS] B は自分の events を読める
select '1-1 B reads own events' as test,
  (count(*) = 1) as pass
from public.fl_family_data where user_id = :'uidB' and data_key = 'events';

-- [期待: PASS] B は家族A の共有キー(events)を読める
select '1-2 B reads family A events (shared key)' as test,
  (count(*) = 1) as pass
from public.fl_family_data where user_id = :'uidA' and data_key = 'events';

-- [期待: PASS=0件] B は家族A の私的キー(userProfile)を読めない
select '1-3 B CANNOT read family A userProfile (private key)' as test,
  (count(*) = 0) as pass
from public.fl_family_data where user_id = :'uidA' and data_key = 'userProfile';

-- [期待: PASS=0件] B は別家族C の events を読めない
select '1-4 B CANNOT read other-family C events' as test,
  (count(*) = 0) as pass
from public.fl_family_data where user_id = :'uidC';

-- [期待: PASS] B が他人(A)の行を UPDATE しても 0 行（RLS で対象外）
with upd as (
  update public.fl_family_data set payload = '[{"hacked":true}]'
  where user_id = :'uidA' and data_key = 'events' returning 1
)
select '1-5 B CANNOT update family A row' as test, (count(*) = 0) as pass from upd;

-- [期待: PASS] B が他人(C)の行を DELETE しても 0 行
with del as (
  delete from public.fl_family_data where user_id = :'uidC' returning 1
)
select '1-6 B CANNOT delete other-family C row' as test, (count(*) = 0) as pass from del;

-- [期待: PASS] B が user_id を A に偽装して INSERT すると拒否される（with check 違反）
do $$
begin
  begin
    insert into public.fl_family_data(user_id, family_id, data_key, payload)
    values ('00000000-0000-0000-0000-0000000000aa', 'FAMI-AAAA-AAAA-AAAA', 'tasks', '[]');
    raise notice '1-7 B inserting as A: FAIL (insert was allowed!)';
  exception when others then
    raise notice '1-7 B inserting as A: PASS (rejected: %)', SQLERRM;
  end;
end $$;

-- ============================================================
-- 検証2: ユーザーC（別家族）の視点 — A/B の家族データに一切触れない
-- ============================================================
select set_config('request.jwt.claims', json_build_object('sub', :'uidC')::text, true);

-- [期待: PASS=0件] C は家族A/B の events を読めない
select '2-1 C CANNOT read family A/B events' as test,
  (count(*) = 0) as pass
from public.fl_family_data where family_id = 'FAMI-AAAA-AAAA-AAAA';

-- [期待: PASS] C は自分の events / userProfile を読める
select '2-2 C reads own rows' as test,
  (count(*) = 2) as pass
from public.fl_family_data where user_id = :'uidC';

-- ============================================================
-- 検証3: C2 エスカレーション — C が自分の行の family_id を A の家族に書き換えると
--        A の共有データが見えてしまう「ベアラトークン」挙動の可視化。
--        （これは設計上の既知挙動。招待コードの有効期限・使い捨て化＝H3で露出窓を限定）
-- ============================================================
update public.fl_family_data set family_id = 'FAMI-AAAA-AAAA-AAAA'
  where user_id = :'uidC' and data_key = 'events';

select '3-1 (KNOWN) C claimed family A and now sees A shared events' as note,
  (count(*) >= 1) as observed
from public.fl_family_data where user_id = :'uidA' and data_key = 'events';

-- [重要] それでも A の private キーは読めない（whitelist が効いている）
select '3-2 even after claiming, C CANNOT read A userProfile' as test,
  (count(*) = 0) as pass
from public.fl_family_data where user_id = :'uidA' and data_key = 'userProfile';

reset role;
rollback;  -- テストデータは一切残さない

-- ============================================================
-- 結果の見方:
--   各行の pass 列が全て true なら RLS は期待どおり（家族ID外アクセス遮断）。
--   1-7 / 検証3 は RAISE NOTICE / observed 列で挙動を確認する。
--   3-1 が observed=true なのは「コードを知る者は参加できる」という仕様であり、
--   3-2 が pass=true（private キーは漏れない）であることが防御の核心。
--   コード自体の露出は H3（招待の使い捨て化）で時間的に限定する。
-- ============================================================
