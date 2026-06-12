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
