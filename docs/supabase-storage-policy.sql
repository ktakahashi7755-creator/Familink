-- ============================================================
-- Familink アルバム画像を Supabase Storage へ移行する場合の
-- バケットポリシー（H1・将来対応用テンプレート）
--
-- 現状: アプリはアルバム画像を base64 で fl_family_data(JSONB) に保存・同期しており
--       Supabase Storage（バケット）は未使用。よってバケット起因の漏えい面は無い。
--       将来 LocalStorage 5MB 制約の解消や大容量化のため Storage へ移すときに、
--       下記ポリシーで「他家族から画像が見えない」分離を担保する。
--
-- 設計: オブジェクトパスを  <family_id>/<user_id>/<photo_id>.<ext>  とし、
--       RLS で family_id プレフィックスが自分の所属家族のときだけ読める・
--       自分の user_id 配下にだけ書ける、とする。
-- ============================================================

-- 1) 非公開バケット作成（ダッシュボード or SQL）
insert into storage.buckets (id, name, public)
values ('family-photos', 'family-photos', false)
on conflict (id) do nothing;

-- 2) 読み取り: 同じ family_id（パス先頭セグメント）に所属していれば閲覧可
drop policy if exists "photos_read_same_family" on storage.objects;
create policy "photos_read_same_family" on storage.objects for select
  using (
    bucket_id = 'family-photos'
    and (storage.foldername(name))[1] in (select public.fl_my_family_ids())
  );

-- 3) 書き込み: 自分の user_id 配下（2階層目）にのみアップロード可
drop policy if exists "photos_insert_own" on storage.objects;
create policy "photos_insert_own" on storage.objects for insert
  with check (
    bucket_id = 'family-photos'
    and (storage.foldername(name))[1] in (select public.fl_my_family_ids())
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- 4) 更新/削除: 自分がアップロードした（owner = auth.uid()）オブジェクトのみ
drop policy if exists "photos_modify_own" on storage.objects;
create policy "photos_modify_own" on storage.objects for update
  using (bucket_id = 'family-photos' and owner = auth.uid());
drop policy if exists "photos_delete_own" on storage.objects;
create policy "photos_delete_own" on storage.objects for delete
  using (bucket_id = 'family-photos' and owner = auth.uid());

-- 注: 移行は CLAUDE.md §14.3「LocalStorage 構造変更」に該当 → 必ず人間確認のうえ実施。
--     クライアントは署名付きURL（createSignedUrl）で表示し、公開URLは使わないこと。

-- ============================================================
-- 検証実績: 2026-06-12 ローカル PostgreSQL 16 で storage スキーマをシムして適用し確認:
--   ・家族A所属ユーザーは family-photos/FAMI-AAAA.../... を読める
--   ・別家族C の写真パスは読めない（パス先頭=family_id の所属チェックが有効）
-- ============================================================
