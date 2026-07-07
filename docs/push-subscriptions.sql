-- Familink Web Push 購読テーブル + RLS
-- 実行: Supabase ダッシュボード → SQL Editor に貼って Run
-- クライアントは anon(publishable) キー＋ログイン状態で自分の購読のみ読み書き。
-- 送信用 Edge Function は service_role で全件参照（RLS バイパス）。

create table if not exists public.fl_push_subscriptions (
  endpoint    text primary key,
  user_id     uuid not null,
  family_id   text,
  p256dh      text not null,
  auth        text not null,
  updated_at  timestamptz not null default now()
);

create index if not exists fl_push_subs_user  on public.fl_push_subscriptions (user_id);
create index if not exists fl_push_subs_family on public.fl_push_subscriptions (family_id);

alter table public.fl_push_subscriptions enable row level security;

-- 本人の購読のみ操作可（user_id は auth.uid() と一致必須）
drop policy if exists fl_push_own_select on public.fl_push_subscriptions;
drop policy if exists fl_push_own_insert on public.fl_push_subscriptions;
drop policy if exists fl_push_own_update on public.fl_push_subscriptions;
drop policy if exists fl_push_own_delete on public.fl_push_subscriptions;
create policy fl_push_own_select on public.fl_push_subscriptions for select using (auth.uid() = user_id);
create policy fl_push_own_insert on public.fl_push_subscriptions for insert with check (auth.uid() = user_id);
create policy fl_push_own_update on public.fl_push_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy fl_push_own_delete on public.fl_push_subscriptions for delete using (auth.uid() = user_id);

-- 送信の重複防止ログ（同じ予定リマインドを二重送信しない）
create table if not exists public.fl_push_log (
  key      text primary key,   -- 例: `${user_id}:${event_id}:${occ_date}:${lead}`
  sent_at  timestamptz not null default now()
);
alter table public.fl_push_log enable row level security;
-- クライアントからは触らせない（service_role のみ）。ポリシー無し = 一般ユーザーは全拒否。

-- 古いログの自動掃除（任意・7日より前を削除）を pg_cron で回す場合の例:
-- select cron.schedule('fl_push_log_gc', '0 4 * * *',
--   $$ delete from public.fl_push_log where sent_at < now() - interval '7 days' $$);
