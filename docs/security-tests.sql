-- ============================================================
-- Familink RLS データ分離 検証SQL（membership 方式・最終版）
--
-- 目的: fl_family_data / fl_family_members の RLS が
--   「家族のメンバーでない者は、その家族の共有データに一切アクセスできない」
--   ことを、別ユーザーの auth.uid() を偽装して各操作で確認する。
--   ベアラ方式（family_id を知るだけで参加）が membership 方式で封じられたことを実証する。
--
-- 前提: docs/supabase-setup-sql.sql → docs/supabase-family-isolation-sql.sql を適用済み
--       （または docs/supabase-apply-all.sql 一括適用）。
-- 実行: Supabase SQL Editor に貼り付けて Run。テストは begin〜rollback で痕跡を残さない。
--
-- 検証実績: 2026-06-14、ローカル PostgreSQL 16 上で auth.uid()/authenticated をシムして
--   本ポリシーを適用し、下記 1-1〜3-3 を全て期待どおり確認済み（backfill で既存共有は継続、
--   ベアラ参加=membership 無しの SELECT/INSERT/UPDATE は全遮断、redeem 後のみ参加可）。
--
-- 想定:
--   ユーザーA(uidA) … 家族 FAMI-AAAA-AAAA-AAAA のメンバー
--   ユーザーB(uidB) … 家族 FAMI-AAAA-AAAA-AAAA のメンバー（A と同じ家族）
--   ユーザーC(uidC) … 家族 FAMI-CCCC-CCCC-CCCC のメンバー（別の家族）
-- ============================================================

begin;

\set uidA '00000000-0000-0000-0000-0000000000aa'
\set uidB '00000000-0000-0000-0000-0000000000bb'
\set uidC '00000000-0000-0000-0000-0000000000cc'

-- 0) 準備（RLS 免除の所有者ロールで投入）: データ行＋メンバー表
insert into public.fl_family_data(user_id, family_id, data_key, payload) values
  (:'uidA', 'FAMI-AAAA-AAAA-AAAA', 'events',      '[{"id":"a1","title":"Aの予定"}]'),
  (:'uidA', 'FAMI-AAAA-AAAA-AAAA', 'userProfile', '{"name":"Aの個人情報"}'),
  (:'uidB', 'FAMI-AAAA-AAAA-AAAA', 'events',      '[{"id":"b1","title":"Bの予定"}]'),
  (:'uidC', 'FAMI-CCCC-CCCC-CCCC', 'events',      '[{"id":"c1","title":"Cの予定"}]')
on conflict (user_id, data_key) do update set payload = excluded.payload, family_id = excluded.family_id;

insert into public.fl_family_members(family_id, user_id, role) values
  ('FAMI-AAAA-AAAA-AAAA', :'uidA', 'owner'),
  ('FAMI-AAAA-AAAA-AAAA', :'uidB', 'member'),
  ('FAMI-CCCC-CCCC-CCCC', :'uidC', 'owner')
on conflict (family_id, user_id) do nothing;

-- ============================================================
-- 検証1: ユーザーB（A と同じ家族のメンバー）
-- ============================================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'uidB')::text, true);

select '1-1 B reads own events' as test, (count(*) = 1) as pass
  from public.fl_family_data where user_id = :'uidB' and data_key = 'events';

select '1-2 B reads family A events (shared key)' as test, (count(*) = 1) as pass
  from public.fl_family_data where user_id = :'uidA' and data_key = 'events';

select '1-3 B CANNOT read family A userProfile (private key)' as test, (count(*) = 0) as pass
  from public.fl_family_data where user_id = :'uidA' and data_key = 'userProfile';

select '1-4 B CANNOT read other-family C events' as test, (count(*) = 0) as pass
  from public.fl_family_data where user_id = :'uidC';

-- ============================================================
-- 検証2: ユーザーC（別家族）— A/B の家族データに一切触れない
-- ============================================================
select set_config('request.jwt.claims', json_build_object('sub', :'uidC')::text, true);

select '2-1 C CANNOT read family A/B events' as test, (count(*) = 0) as pass
  from public.fl_family_data where family_id = 'FAMI-AAAA-AAAA-AAAA';

select '2-2 C reads own rows' as test, (count(*) = 1) as pass
  from public.fl_family_data where user_id = :'uidC';

-- ============================================================
-- 検証3【最重要】ベアラ攻撃の封じ込め:
--   C は FAMI-AAAA-AAAA-AAAA を「知っている」が、メンバー表に居ないため
--   ① 自分の行を A 家族へ書き換えても拒否される ② 新規 INSERT も拒否される
--   ③ 結局 A の共有データは1件も見えないまま。
-- ============================================================

-- ① C が own_update で自分の行を A 家族へ移して覗こうとする → with check 違反で 0 行 or 例外
do $$
declare n int;
begin
  begin
    update public.fl_family_data set family_id = 'FAMI-AAAA-AAAA-AAAA'
     where user_id = '00000000-0000-0000-0000-0000000000cc' and data_key = 'events';
    get diagnostics n = row_count;
    if n = 0 then raise notice '3-1 C update-claim moved 0 rows -> PASS';
    else raise notice '3-1 C update-claim moved % rows -> FAIL', n; end if;
  exception when others then
    raise notice '3-1 C update-claim rejected -> PASS (%)', SQLERRM;
  end;
end $$;

-- ② C が新規 INSERT で A 家族の行を作ろうとする → with check 違反で拒否
do $$
begin
  begin
    insert into public.fl_family_data(user_id, family_id, data_key, payload)
    values ('00000000-0000-0000-0000-0000000000cc', 'FAMI-AAAA-AAAA-AAAA', 'tasks', '[]');
    raise notice '3-2 C insert into family A: FAIL (allowed!)';
  exception when others then
    raise notice '3-2 C insert into family A: PASS (rejected: %)', SQLERRM;
  end;
end $$;

-- ③ 上記が全て拒否されるため、C には依然 A 家族の events は1件も見えない
select '3-3 C STILL cannot read family A events (bearer blocked)' as test, (count(*) = 0) as pass
  from public.fl_family_data where user_id = :'uidA' and data_key = 'events';

reset role;
rollback;

-- ============================================================
-- 結果の見方:
--   1-1〜2-2 / 3-3 の pass 列が全て true、3-1/3-2 が PASS（RAISE NOTICE）なら
--   家族分離は membership 方式で完全に担保されている。
--   旧版の「3-1 (KNOWN) ベアラで見えてしまう」は本版で解消され、
--   メンバー表に無い者は SELECT も INSERT/UPDATE も全て遮断される。
-- ============================================================
