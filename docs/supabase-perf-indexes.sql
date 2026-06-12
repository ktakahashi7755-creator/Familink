-- ============================================================
-- Familink Supabase クエリ最適化（PERF-3）
--
-- クライアントの同期クエリは既に列を限定（select user_id,data_key,payload,updated_at）し、
-- SELECT * や N+1 は行っていない。家族取得は family_id 等値、個人取得は user_id 等値。
-- 行数増加に備えて以下のインデックスを追加する（冪等）。
-- ============================================================

-- 家族読み取り（family_read ポリシー）の主経路: family_id で絞り込む
create index if not exists idx_fl_family_data_family on public.fl_family_data (family_id);

-- 個人データ取得・upsert の主キー経路（unique(user_id,data_key) で既にインデックス有り）。
-- 念のため user_id 単独の検索（自分の全行取得）も補助インデックス化。
create index if not exists idx_fl_family_data_user on public.fl_family_data (user_id);

-- 招待トークンの消費（redeem）は主キー(token)で引くため追加不要。
-- 権利（fl_entitlements）は user_id 主キーで引くため追加不要。

-- ※ pg のプランナが seq scan を選ぶ小規模時は無害。行数が増えると効く。
