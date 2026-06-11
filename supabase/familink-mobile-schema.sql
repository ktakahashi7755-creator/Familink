-- ============================================================
-- Familink Mobile — family-shared sync schema (β)
--
-- A single generic table holds every shared item as a typed JSONB row,
-- scoped by `family_id`. This keeps the schema small while supporting all
-- collections (events / tasks / transactions / posts / health / shopping /
-- members / prep / memos). Last-write-wins via `updated_at`.
--
-- This is ADDITIVE — it does not touch the existing web app's storage.
-- Run in the Supabase SQL editor. anon key + RLS + the signed-in user's
-- JWT enforce that a user only sees/edits their own family's rows.
-- (The web app's family model uses `familink_family_${familyId}`; we keep
--  the same family_id convention so the two can converge later.)
-- ============================================================

create table if not exists public.familink_items (
  id          text primary key,             -- client-generated item id (uid)
  family_id   text not null,                -- family scope (defaults to owner's user id)
  owner_id    uuid not null default auth.uid(),
  kind        text not null,                -- 'events' | 'tasks' | 'txs' | ...
  data        jsonb not null,               -- the full typed item
  deleted     boolean not null default false,
  updated_at  timestamptz not null default now()
);

create index if not exists familink_items_family_idx on public.familink_items (family_id);
create index if not exists familink_items_kind_idx   on public.familink_items (family_id, kind);

-- A lightweight membership table so RLS can check "is this user in the family".
-- A user is always a member of their own user-id family; joining another
-- family inserts a row here.
create table if not exists public.familink_members (
  family_id text not null,
  user_id   uuid not null default auth.uid(),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

alter table public.familink_items   enable row level security;
alter table public.familink_members enable row level security;

-- Helper: families the current user belongs to (own user id + joined ones).
create or replace function public.familink_my_families()
returns setof text
language sql stable security definer set search_path = public as $$
  select auth.uid()::text
  union
  select family_id from public.familink_members where user_id = auth.uid();
$$;

-- items: read/write rows of any family the user belongs to.
drop policy if exists familink_items_select on public.familink_items;
create policy familink_items_select on public.familink_items
  for select using (family_id in (select public.familink_my_families()));

drop policy if exists familink_items_insert on public.familink_items;
create policy familink_items_insert on public.familink_items
  for insert with check (family_id in (select public.familink_my_families()));

drop policy if exists familink_items_update on public.familink_items;
create policy familink_items_update on public.familink_items
  for update using (family_id in (select public.familink_my_families()));

-- members: a user manages only their own membership rows.
drop policy if exists familink_members_all on public.familink_members;
create policy familink_members_all on public.familink_members
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Realtime: broadcast item changes so family devices stay in sync.
alter publication supabase_realtime add table public.familink_items;
