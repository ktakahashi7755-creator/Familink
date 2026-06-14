-- ============================================================
-- Familink 家族分離 動作テスト（Supabase SQL Editor にそのまま貼って Run・編集不要）
--
-- 目的: membership 方式の RLS が「別家族には共有されない／同じ家族の共有データのみ／
--       個人情報は家族にも漏れない／family_id を知っても参加できない」を実証する。
-- 安全: begin〜rollback で実データは一切変更されない（痕跡ゼロ）。
--       session_replication_role を一時的に replica にして FK/トリガを避けてテスト行を投入し、
--       RLS は通常モード(origin)で検証する。Role は postgres のまま実行する。
-- 検証実績: 2026-06-14 ローカル PostgreSQL16（apply-all 全適用）で 1/3/4=pass, 2=拒否 を確認。
-- ============================================================
begin;

set local session_replication_role = replica;   -- FK/トリガを一時無効（テスト投入用）

insert into public.fl_family_data(user_id, family_id, data_key, payload) values
 ('00000000-0000-0000-0000-0000000000d1','FAMI-TST1-TST1-TST1','events','[{"id":"a1","title":"A予定"}]'),
 ('00000000-0000-0000-0000-0000000000d1','FAMI-TST1-TST1-TST1','userProfile','{"name":"A個人情報"}'),
 ('00000000-0000-0000-0000-0000000000d2','FAMI-TST2-TST2-TST2','events','[{"id":"b1","title":"B予定"}]')
on conflict (user_id, data_key) do update set payload=excluded.payload, family_id=excluded.family_id;

insert into public.fl_family_members(family_id, user_id, role) values
 ('FAMI-TST1-TST1-TST1','00000000-0000-0000-0000-0000000000d1','owner'),
 ('FAMI-TST2-TST2-TST2','00000000-0000-0000-0000-0000000000d2','owner')
on conflict (family_id, user_id) do nothing;

set local session_replication_role = origin;     -- 通常モードへ（以後 RLS が正しく効く）

-- B（別家族 TST2）視点
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-0000000000d2')::text, true);

select '1 B(別家族)はA家族の予定を読めない' as test, (count(*)=0) as pass
 from public.fl_family_data where family_id='FAMI-TST1-TST1-TST1';

-- B が family_id を騙って A 家族へ書き込み → RLS で拒否されるべき
do $$ begin
  begin
    insert into public.fl_family_data(user_id, family_id, data_key, payload)
     values ('00000000-0000-0000-0000-0000000000d2','FAMI-TST1-TST1-TST1','tasks','[]');
    raise notice '2 bearer INSERT -> FAIL (許可された!)';
  exception when others then raise notice '2 bearer INSERT -> PASS (拒否)';
  end;
end $$;

-- B を正規に FAMI-TST1 のメンバーへ追加
reset role;
set local session_replication_role = replica;
insert into public.fl_family_members(family_id, user_id, role)
 values ('FAMI-TST1-TST1-TST1','00000000-0000-0000-0000-0000000000d2','member')
on conflict (family_id, user_id) do nothing;
set local session_replication_role = origin;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-0000000000d2')::text, true);

select '3 参加後 Bは共有予定(events)を読める' as test, (count(*)=1) as pass
 from public.fl_family_data where family_id='FAMI-TST1-TST1-TST1' and data_key='events';
select '4 参加後でも個人情報(userProfile)は読めない' as test, (count(*)=0) as pass
 from public.fl_family_data where family_id='FAMI-TST1-TST1-TST1' and data_key='userProfile';

reset role;
rollback;
-- 期待: 1/3/4 が pass=t、NOTICE に「2 bearer INSERT -> PASS (拒否)」
-- ============================================================
