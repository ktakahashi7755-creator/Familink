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
