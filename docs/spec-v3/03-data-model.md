# 03. データモデル

## 3.1 クライアント状態 `S` と LocalStorage `familink_v3`
- 全状態はグローバル `S`。`PERSIST` 配列（**88キー**）が LocalStorage キー `familink_v3` に JSON 保存される。
- 写真は base64 文字列で保持（容量に注意。超過時は通知＋ロールバック）。
- 破壊禁止：`familink_v3` を初期化・上書きしない。新しい保存キーを足したら **必ず `PERSIST` にも追加**。

### 3.1.1 主なドメイン配列（項目スキーマ）
> 実装は寛容（旧スキーマ互換キーを併存）。以下は正準フィールド。`updatedAt`/`createdAt` は ISO 文字列（同期の競合解決に使用）。

- **events[]**（予定）: `id, title, date(YYYY-MM-DD), time(HH:MM), endTime, allDay, member, color, note, repeat(''|daily|weekdays|weekly|monthly|yearly|custom), repeatInterval, repeatUnit(day|week|month|year), repeatUntil, remind(''|0|5|10|30|60|1440), workspaceId, createdAt, updatedAt`
- **tasks[]**: `id, title, memo, assignedTo, dueDate, priority, category, status(todo|done), completedAt, order, repeat…, workspaceId, createdAt, updatedAt`（旧: text/member/done/at 併存）
- **txs[]**（家計）: `id, type(income|expense), amount, cat, desc, date, member, workspaceId, createdAt, updatedAt`
- **recurringTxs[]**: 固定収支テンプレ
- **health[]**（体調）: `id, memberId(child), date, time, temp/temperature, status, cond/symptoms[], medicine/meds, medicineTime, visitedHospital, hospitalName, appetite, sleep, stool, note, updatedAt`
- **posts[]**（家族ボード投稿）: `id, author, title, body, time, pinned, reactions{type:[memberId]}, comments[{id,author,text,time}]`
- **announces[]**（お知らせ）: `id, title, body, author, cat, isPinned, targets, expiresAt, reads[], reactMap{memberId:reaction}, comments[], createdAt, updatedAt`
- **prep[]**（準備）: `id, text, cat, done, date, memberId` / **prepRoutines[]**（曜日別テンプレ）
- **shoppingItems[]**: `id, name, qty, section, memo, done` / **shoppingFrequent[]**: よく買うもの
- **customBoards[]** / **boardItems[]** / **boardSections[]**（カスタムボード）
- **albumPhotos[]** / **faceGroups[]**（アルバム）/ **memos[]** / **memoFolders[]**
- **members[]**（家族メンバー: id/name/role/avatar 等）/ **workspaces[]**（スペース）
- **notifs[]**（アプリ内通知）
- **_deletions**（削除トゥームストーン: `{ data_key: { id: ISO時刻 } }`。§05）

### 3.1.2 個人/端末固有・設定キー（家族に共有しない）
`userProfile, userPhotos, userAvatars, userAvatarType, isPremiumUser, premiumPaid, trialStartedAt,
onboardCompleted, guideSeen, hokuContext, hokuOwnedSkins, cashflowSettings, notifPrefs, browserNotifEnabled,
webPushEnabled, homeOrder, tabConfig, widgetItems, activeTheme, loginBonus(coins/streak…), demoProfiles,
familyId, familyIdOwner, supaSession, supaEntryChoice, homeNote, _serverEntitlement(実行時のみ) …`

> ※ `PERSIST` の完全一覧は実装 `grep "const PERSIST" app-source/familink.html` を正とする（88キー）。

## 3.2 同期キー分類（重要）
同期対象は `SYNC_KEYS`、そのうち家族全員に共有するのは `FAMILY_SHARED_KEYS`。差集合は「自分の全端末だけで同期」する個人キー。

### 3.2.1 SYNC_KEYS（クラウド同期する。先頭 `_deletions` は削除耐久性のため）
`_deletions, events, tasks, txs, health, posts, announces, prep, prepRoutines, folders, docs, albumPhotos,
faceGroups, shoppingItems, shoppingFrequent, members, customBoards, boardItems, boardSections, recurringTxs,
memos, memoFolders, workspaces, notifs, tabConfig, widgetItems, homeOrder, userPhotos, userAvatars,
userAvatarType, userProfile, isPremiumUser, onboardCompleted, hokuContext, cashflowSettings, demoProfiles,
familyId, homeNote`

### 3.2.2 FAMILY_SHARED_KEYS（家族間で共有＝RLSで家族が読める）
`events, tasks, txs, health, posts, announces, prep, prepRoutines, folders, docs, albumPhotos, shoppingItems,
shoppingFrequent, members, customBoards, boardItems, boardSections, recurringTxs, memos, memoFolders,
workspaces, homeNote`

> **不変条件**：`fl_family_data` の RLS 許可 data_key（allowlist）と `FAMILY_SHARED_KEYS` は**必ず一致**させる。
> ここに無いキー（例: userProfile/isPremiumUser/notifs/hokuContext）は家族でも読めない＝プライバシー保護。

## 3.3 Supabase スキーマ
### 3.3.1 `fl_family_data`（家族データの key-value ストア）
| 列 | 型 | 説明 |
|---|---|---|
| user_id | uuid | 所有者（auth.uid） |
| family_id | text | 家族ID（null=単独） |
| data_key | text | SYNC_KEYS のいずれか |
| payload | jsonb | 値（配列/オブジェクト/スカラ） |
| updated_at | timestamptz | 行の更新時刻（マージ順序に使用） |
- 一意制約：`(user_id, data_key)`（upsert onConflict）。
- RLS（`docs/security-tests.sql` / §06 参照）：
  - select：`auth.uid()=user_id` OR（`family_id in fl_my_family_ids()` AND `data_key = any(共有allowlist)`）。
  - insert/update/delete：`auth.uid()=user_id` のみ。
  - 自己参照RLSの再帰回避に `fl_my_family_ids()`（SECURITY DEFINER）を使用。

### 3.3.2 `fl_family_invites`（招待）
招待トークン/コード・family_id・発行者・失効管理（SQLは docs/ 配下）。招待リンク方式（`?join=`）と併存。

### 3.3.3 `fl_entitlements` ＋ ビュー `fl_my_premium`（課金権利・正本）
| 列 | 型 |
|---|---|
| user_id | uuid (PK) |
| premium | boolean |
| status | text（active/trialing/past_due/canceled…）|
| stripe_customer_id / stripe_subscription_id | text |
| current_period_end | timestamptz |
| updated_at | timestamptz |
- RLS：本人 select のみ。書き込みは service_role（Stripe Webhook）だけ。
- ビュー `fl_my_premium`（security_invoker）：`premium=(status in active/trialing かつ 期限内)`, `expires_at`。
  アプリの `_syncPremiumFromServer()` がこれを読み `isPremium()` が最優先で参照。
- SQL：`docs/billing-entitlements.sql`。

### 3.3.4 `fl_push_subscriptions` ＋ `fl_push_log`（Web Push）
- `fl_push_subscriptions(endpoint PK, user_id, family_id, p256dh, auth, updated_at)`。RLS：本人のみ操作。
- `fl_push_log(key PK, sent_at)`：リマインドの重複送信防止（service_roleのみ）。
- SQL：`docs/push-subscriptions.sql`。

## 3.4 データ整合ルール
- 配列の同期は **id マージ**（cloud優先、ローカル専用idは保持、`updatedAt` で LWW）。
- 削除は **トゥームストーン**（`_deletions`）で家族に伝播。復活防止（§05）。
- 内容重複は `_dedupByContent()` で畳む（数量など差分は保持）。
- 非配列（設定値等）はクラウド値で上書き（最終書き込み優先）。
- 保存失敗（容量超過）は握りつぶさず通知し、保存系はロールバック。
