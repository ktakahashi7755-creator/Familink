# Familink データ設計書

**文書番号**: SPEC-v3-05 ／ **版**: 1.0 ／ **作成日**: 2026-07-07 ／ **正本**
**対象読者**: エンジニア・データ設計レビュー担当・技術デューデリジェンス担当

> 本書は Familink の全データ（LocalStorage・エンティティ・Supabase スキーマ・同期プロトコル）の正本である。
> システム全体像は `03-architecture.md`、要件は `02-requirements.md`、サーバ処理は `06-api-edge-functions.md`、
> セキュリティ検証は `07-security.md` / `docs/security-tests.sql` を参照。
> 本書の記述はすべて `app-source/familink.html`（2026-07-07 時点・29,327 行）および `docs/` 配下 SQL の実測に基づく。

---

## 1. データアーキテクチャ概要

### 1.1 二層構造（ローカル正本＋クラウド同期）

Familink は**オフラインファースト**である。ローカル（LocalStorage）が常に正本として全機能を賄い、
クラウド（Supabase）は「家族間同期」と「課金権利の真正性」のためのレイヤーに徹する。

```
┌── クライアント（各端末）──────────────────────────────────────────┐
│  メモリ状態 S（単一グローバルオブジェクト）                        │
│    │ saveS()  … PERSIST 88 キーのみ抽出して JSON 保存              │
│    ▼                                                              │
│  localStorage['familink_v3']  ←─ ローカル正本（未ログインで完結）  │
│    │ _scheduleSyncToSupabase()（1500ms デバウンス・ログイン時のみ）│
│    ▼                                                              │
│  _pushToSupabase()  … SYNC_KEYS 38 キーを 20 行バッチ upsert       │
└───────┬───────────────────────────────────────────────────────────┘
        │ HTTPS（supabase-js v2 / anon(publishable) キーのみ）
┌───────▼── Supabase ───────────────────────────────────────────────┐
│  fl_family_data（KV 型 JSONB・user_id × data_key で 1 行）          │
│    ・RLS: 本人行＋「家族共有許可キー × 自家族」のみ読める           │
│  Realtime（postgres_changes）→ 他端末へ変更を通知                  │
│    → 800ms デバウンス → _fetchFromSupabase() → 家族横断マージ      │
│  fl_entitlements（課金権利の正本・クライアントは読むだけ）          │
└───────────────────────────────────────────────────────────────────┘
```

### 1.2 正本の所在（責務分離）

| データ | 正本 | 備考 |
|---|---|---|
| 家族の記録データ全般 | 端末 LocalStorage `familink_v3` | クラウドは同期コピー。未ログインでも全機能動作 |
| 家族メンバーシップ | サーバ `fl_family_members` | RPC（SECURITY DEFINER）経由でのみ変更 |
| 課金権利（プレミアム） | サーバ `fl_entitlements` → `fl_my_premium` ビュー | クライアント改ざんで付与不可（§4.4） |
| 認証セッション | Supabase Auth（`sb-*` キーに SDK が自動保存） | `persistSession: true` |

---

## 2. LocalStorage 設計

### 2.1 保存機構

| 項目 | 内容 |
|---|---|
| 主キー | `const SK = 'familink_v3'`（L6402）。**破壊・初期化は禁止**（CLAUDE.md §12.2） |
| 保存 | `saveS()`（L8843）: `PERSIST` の各キーだけを `S` から抽出し `JSON.stringify` して一括保存。成功後 `_scheduleSyncToSupabase()` を予約。**返り値 boolean**（容量超過ロールバックに使用） |
| 読込 | `loadS()`（L9258）: `JSON.parse(localStorage.getItem(SK) \|\| '{}')` を既定 `S` に `Object.assign` でマージ |
| 別系統キー | Supabase セッション `sb-*`（SDK 自動管理）／招待保留 `fl_pending_join`（`_captureJoinFromUrl()` L8200）／近接警告抑止 `sessionStorage['_premWarn_<key>']` |
| 揮発キー | `S._xxx` 形式は原則 PERSIST 非対象（例: `S._serverEntitlement`）。**例外は `_deletions`**（削除トゥームストーン・永続） |

### 2.2 PERSIST 全 88 キー一覧（L8841）

同期区分の凡例:
- **家族共有** = SYNC_KEYS かつ FAMILY_SHARED_KEYS（家族全員分をマージ）
- **本人同期** = SYNC_KEYS だが FAMILY_SHARED_KEYS 外（クラウドに置くが自分の行のみ採用）
- **ローカルのみ** = SYNC_KEYS 外（端末内のみ・クラウドに送らない）

> 注: 過去文書では「87 キー」と記載されていたが、2026-07-07 実測で **88 キー**である（本書が正）。

#### (a) コアエンティティ（家族共有・22 キー中 20）

| キー | 型 | 用途 | 同期区分 |
|---|---|---|---|
| `events` | 配列 | 予定（§3.2） | 家族共有 |
| `tasks` | 配列 | タスク（§3.1) | 家族共有 |
| `txs` | 配列 | 家計取引（§3.3） | 家族共有 |
| `recurringTxs` | 配列 | 固定収支テンプレート（§3.3） | 家族共有 |
| `posts` | 配列 | ボード投稿（旧・掲示） | 家族共有 |
| `announces` | 配列 | お知らせ投稿（§3.4） | 家族共有 |
| `health` | 配列 | 体調記録（§3.5） | 家族共有 |
| `prep` | 配列 | 準備リスト項目（§3.6） | 家族共有 |
| `prepRoutines` | 配列 | 曜日ルーティン（§3.6） | 家族共有 |
| `folders` | 配列 | 書類保管庫フォルダ | 家族共有 |
| `docs` | 配列 | 書類（写真 base64 含む・§3.8） | 家族共有 |
| `albumPhotos` | 配列 | アルバム写真/動画（base64・§3.7） | 家族共有 |
| `shoppingItems` | 配列 | 買い物リスト（§3.11） | 家族共有 |
| `shoppingFrequent` | 配列 | よく買うもの（§3.11） | 家族共有 |
| `members` | 配列 or null | 動的メンバー（null=`DEFAULT_MEMBERS` L8513・§3.14） | 家族共有 |
| `customBoards` | 配列 | カスタムボード（§3.9） | 家族共有 |
| `boardItems` | 配列 | ボード項目（§3.9） | 家族共有 |
| `boardSections` | 配列 | ボードセクション（§3.9） | 家族共有 |
| `memos` | 配列 | メモ（§3.12） | 家族共有 |
| `memoFolders` | 配列 | メモフォルダ（§3.12） | 家族共有 |
| `workspaces` | 配列 | ワークスペース定義（§3.13） | 家族共有 |
| `homeNote` | 文字列 | ホームの家族メモ | 家族共有 |

#### (b) 本人同期キー（16 キー・クラウド保存するが家族には見えない/上書きされない）

| キー | 型 | 用途 | 同期区分 |
|---|---|---|---|
| `_deletions` | オブジェクト | 削除トゥームストーン `{配列キー:{id:ISO時刻}}`（§5.3）。**SYNC_KEYS 先頭固定** | 本人同期（※） |
| `faceGroups` | 配列 | 顔認識スキャフォールド（未使用） | 本人同期 |
| `notifs` | 配列 | アプリ内通知（§3.10） | 本人同期 |
| `tabConfig` / `widgetItems` | 配列 or null | タブ / ウィジェット設定（null=デフォルト） | 本人同期 |
| `homeOrder` | 配列 | ホームボード表示順 | 本人同期 |
| `userPhotos` | オブジェクト | `{memberId: dataURL}` カスタムアバター写真 | 本人同期 |
| `userAvatars` / `userAvatarType` | オブジェクト | `{memberId:'avatar_xxx'}`／`{memberId:'customPhoto'\|'official'}` | 本人同期 |
| `userProfile` | オブジェクト | `{displayName, familyName, createdAt, prepVisibleMembers, swipeHintSeen, ...}` | 本人同期 |
| `isPremiumUser` | bool | プレミアム状態のローカルキャッシュ（正本はサーバ・§4.4） | 本人同期 |
| `onboardCompleted` | bool | オンボーディング完了 | 本人同期 |
| `hokuContext` | 配列 | Hoku 直近 5 ターン会話文脈 | 本人同期 |
| `cashflowSettings` | オブジェクト | `{openingBalances:{'YYYY-MM':n}, defaultOpeningBalance:0}` | 本人同期 |
| `demoProfiles` | 配列 | デモプロファイル | 本人同期 |
| `familyId` | 文字列 or null | 家族グループ ID `FAMI-XXXX-XXXX-XXXX`（§5.5） | 本人同期 |

※ `_deletions` はクライアントの `FAMILY_SHARED_KEYS` には含まれないが、fetch 時に `_mergeDeletions()`（L6815）で
全メンバー分を union するため、**サーバ RLS の家族共有許可リストには含まれる**（§4.3・計 23 キー）。

#### (c) ローカルのみ（50 キー・クラウドに送らない）

| キー | 型 | 用途 |
|---|---|---|
| `loggedIn` | bool | アプリ入室済みフラグ |
| `user` | オブジェクト | ログイン中メンバー `{id,name,role,av,grad}` |
| `budgetY` / `budgetM` | 数値 | 家計画面の表示中の年 / 月 |
| `budgetTab` | 文字列 | `'normal'\|'recurring'\|'cashflow'` |
| `ocrImports` / `ocrScanUsage` | 配列 / オブジェクト | スキャン解析履歴／`{ym:'YYYY-MM', count}` 月間回数 |
| `albumPrefs` / `albumFolders` | オブジェクト / 配列 | アルバム表示設定 / アルバムフォルダ |
| `kanbanCols` | — | 未使用（撤廃済み・互換のため残置） |
| `tkVisibleMembers` / `budgetVisibleMembers` / `calVisibleMembers` | 配列 or null | 可視メンバーフィルタ（null=全員） |
| `premiumPaid` | bool | 課金済みフラグ（移行判定用・§6） |
| `boardCustomTabs` / `defaultCustomBoardsSeeded` | 配列 / bool | ボードタブ / 初期投入済みフラグ |
| `shoppingHistory` / `shoppingTab` / `shoppingMigrated` | 配列 / 文字列 / bool | 買い物履歴 / 表示タブ / 移行済みフラグ |
| `hokuQuickSave` / `hokuApiUrl` / `hokuApiKey` / `hokuChatMode` / `hokuAiOff` | 各種 | Hoku 設定（独自 URL・共有鍵・会話モード・AI 停止） |
| `hokuDailyUsage` / `hokuAiUsage` | オブジェクト | `{date:'YYYY-MM-DD', count, ...}` Hoku 日次利用カウント |
| `guideSeen` / `demoSeeded` | bool | ガイド表示済み / デモ投入済み |
| `notifPrefs` | オブジェクト | 9 種通知の on/off |
| `account` | オブジェクト | ローカルアカウント `{email, passHash, recoveryCode, createdAt}` |
| `currentWorkspaceId` | 文字列 | 選択中ワークスペース（端末ごと） |
| `activeDemoProfileId` / `demoModeEnabled` / `demoBackupBeforeApply` / `demoProfilesSeeded` | 各種 | デモ管理 |
| `supaSession` | オブジェクト or null | `{id, email}` Supabase ログイン情報の写し |
| `supaEntryChoice` | 文字列 or null | `'supa'\|'guest'\|'invite'` 入室方法 |
| `familyIdOwner` / `familyIdSetByUser` | 文字列 / bool | familyId の所有者 uid / ユーザー設定済みフラグ |
| `trialStartedAt` | ISO 文字列 | 30 日トライアル開始日時 |
| `browserNotifEnabled` / `webPushEnabled` | bool | ブラウザ通知 / Web Push の有効化 |
| `lastActiveDate` / `activeStreak` | 文字列 / 数値 | 連続利用記録 |
| `loginBonus` | オブジェクト | `{lastClaimDate, streak, coins, enabled, badge30, dates[]}` |
| `shop` | オブジェクト | `{owned:[]}` ファミコイン装飾 |
| `activeTheme` | 文字列 | ホーム背景テーマ |
| `hokuOwnedSkins` / `hokuEquippedSkin` / `hokuShopPurchaseHistory` | 各種 | Hoku 着せ替え |

---

## 3. エンティティ定義

共通事項:
- ID は `uid()`（L9269）= `Math.random().toString(36).slice(2) + Date.now().toString(36)`。接頭辞派生あり（§7.1）。
- 全レコードに `createdAt` / `updatedAt`（ISO8601）を付与。`updatedAt` は同期の LWW 判定キー（§5.3）。
- 主要エンティティは `workspaceId` を持ち、ワークスペース（§3.13）で横断的に絞り込まれる。
- 無料上限は `PREMIUM_LIMITS`（L22520）と `checkPremiumLimit(key)`（L22532）で判定（§3.15）。
- 旧スキーマ互換のため新旧フィールドを併記して保存するものがある（「互換(旧)」列）。**新規コードは正規フィールドを使う**。

### 3.1 tasks — タスク（保存: `saveTaskEdit()` L14854）　無料上限 30

| フィールド | 型 | 必須 | 説明 | 互換(旧) |
|---|---|---|---|---|
| `id` | string | ○ | `uid()` | — |
| `title` | string | ○ | タスク名 | `text` |
| `memo` | string | — | メモ | — |
| `assignedTo` | string | — | 担当メンバー id | `member` |
| `dueDate` | string | — | 期限 `YYYY-MM-DD` | `at` |
| `repeat` / `repeatInterval` / `repeatUnit` | string / number / string | — | 繰り返し設定 | — |
| `priority` | string | — | `'none'\|'low'\|'med'\|'high'` | — |
| `category` | string | — | カテゴリ（`TK_CATS` 定義） | — |
| `status` | string | ○ | `'todo'\|'done'` | `done`（bool） |
| `order` | number | — | 並び順 | — |
| `completedAt` | string | — | 完了日時 | — |
| `workspaceId` | string | ○ | 所属ワークスペース | — |

### 3.2 events — 予定（保存: `saveEvent()` L13318）　無料上限 500

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `id` | string | ○ | `uid()` |
| `title` | string | ○ | 予定名 |
| `date` | string | ○ | `YYYY-MM-DD` |
| `time` / `endTime` | string | — | `HH:MM`（`allDay` 時は空） |
| `allDay` | bool | — | 終日フラグ |
| `member` | string | — | 対象メンバー id |
| `note` | string | — | メモ |
| `repeat` / `repeatInterval` / `repeatUnit` / `repeatUntil` | 各種 | — | 繰り返し（daily/weekdays/weekly/monthly/yearly/custom） |
| `remind` | string/number | — | 通知リード分（未指定は 30 分として Push 送信・`06-api-edge-functions.md` §2.6） |
| `color` | string | — | 表示色（既定 `'#0A84FF'`） |
| `workspaceId` | string | ○ | 所属ワークスペース |
| `importedAt` | string | — | ICS 取込時のみ付与 |

### 3.3 txs / recurringTxs — 家計（保存: `saveTx()` L15873 / `addRecurringTx()` L15198）　txs 無料上限 100

txs:

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `id` | string | ○ | `uid()` |
| `type` | string | ○ | `'income'\|'expense'` |
| `amount` | number | ○ | 金額（1〜1,000,000,000 をバリデーション） |
| `cat` / `desc` / `date` / `member` | 各種 | — | カテゴリ / 摘要 / 日付 / メンバー |
| `workspaceId` | string | ○ | 所属ワークスペース |
| `source` / `recurringId` | string | — | 固定収支から自動展開された場合 `'recurring'` ＋元テンプレ id |

recurringTxs（id 接頭辞 `rtx_`）:

| フィールド | 型 | 説明 |
|---|---|---|
| `type` / `amount` / `cat` / `desc` / `member` / `memberId` / `memo` | 各種 | 取引内容 |
| `frequency` | string | `'monthly'\|'weekly'\|'yearly'` |
| `dayOfMonth` / `isMonthEnd` / `dayOfWeek` / `monthOfYear` | 各種 | 発生日指定 |
| `startDate` / `endDate` / `enabled` | 各種 | 適用期間・有効フラグ |

### 3.4 announces / posts — お知らせ・ボード投稿（保存: `savePost()` L16823）

| フィールド | 型 | 説明 |
|---|---|---|
| `id` / `title` / `body` | string | `uid()` / 件名 / 本文 |
| `author` | string | 投稿者 `userId()` |
| `cat` / `isPinned` / `targets` / `expiresAt` | 各種 | カテゴリ / ピン留め / `'all'` or メンバー id / 掲載期限 |
| `reads` | 配列 | 既読メンバー `userId()` の配列 |
| `reactions` / `reactMap` / `comments` | 各種 | リアクション・コメント（`migrateReactions()` L16394 が旧形式を移行） |

### 3.5 health — 体調記録（保存: `saveHealth()` L18154）　無料上限 50

| フィールド | 型 | 必須 | 説明 | 互換(旧) |
|---|---|---|---|---|
| `id` | string | ○ | `'health_'+ts+'_'+rand` | — |
| `memberId` / `memberName` | string | ○ | 対象メンバー | `child` |
| `date` / `time` | string | ○/— | 記録日時 | — |
| `temp` | string | — | 体温 | `temperature` |
| `status` / `symptoms` | string / 配列 | — | 状態 / 症状 | `cond` |
| `medicine` / `medicineTime` | string | — | 服薬 | `meds` |
| `visitedHospital` / `hospitalName` | bool / string | — | 受診 | — |
| `appetite` / `sleep` / `stool` / `note` | 各種 | — | 食欲・睡眠・排便・メモ | — |
| `workspaceId` | string | ○ | 所属ワークスペース | — |

### 3.6 prep / prepRoutines — 準備リスト（ルーティン追加: `addPrepRoutine()` L20439）

prep: `{id: uid(), workspaceId, text, cat:'持ち物'等, subject, quantity, done: bool, date, member, memberId, source:'ocr'等, createdAt, updatedAt}`

prepRoutines（id 接頭辞 `pr_`）: `{memberId, dayOfWeek:'mon'等, title, category, subject, quantity, memo,
showTiming:'previous_day_and_today', repeat, enabled, order, createdAt, updatedAt}`

### 3.7 albumPhotos — アルバム（縮小: `downscaleImageFile()` L9149）　無料上限 20

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | string | `'ph_'+uid()` |
| `dataUrl` | string | `data:image/jpeg;base64,...`（長辺 1280px・JPEG 品質 0.82–0.85 に自動縮小） |
| `type` | string | `'photo'\|'video'` |
| `takenAt` / `caption` / `folderId` / `fav` | 各種 | 撮影日時 / キャプション / フォルダ / お気に入り |
| `memberId` / `memberIds` | string / 配列 | 写っているメンバー |
| `reactions` / `mine` / `comments` | 各種 | リアクション・コメント |

フォルダは別配列 `albumFolders`（ローカルのみ・§2.2(c)）。

### 3.8 docs — 書類保管庫　無料上限 15

`{id:'doc_'+uid(), title, cat:'園・学校'等, memo, photo: base64, folderId, createdAt, updatedAt}`

### 3.9 customBoards / boardItems / boardSections — カスタムボード（保存: `saveBoardItem()` L23260）　customBoards 無料上限 3

- customBoards: `{id, name, type:'share'|'prep', color, order, visible, ...}`
- boardItems: `{id: uid(), boardId, title, body, category, childId, sectionId, status:'todo'|'done', order, createdAt, createdBy}`

### 3.10 notifs — アプリ内通知（追加: `addNotif()` L15929）

`{id: uid(), title, desc, icon:'bell'等, time: todayStr(), read: false}` — `unshift` で最新を先頭に挿入。本人同期（家族非共有）。

### 3.11 shopping — 買い物（保存: `saveShopAdd()` L18485）

- `shoppingItems[]`: `{id:'shop_'+uid(), name, qty, category, memo, section:'今すぐ'等, assignedTo, status:'active'等, createdAt, updatedAt, workspaceId}`
- `shoppingFrequent[]`（よく買う・家族共有）／ `shoppingHistory[]`（履歴・ローカルのみ）
- 旧 `boardItems` からの移行: `migrateShoppingFromBoardItems()`（L27566・`shoppingMigrated` で一度きり）

### 3.12 memos — メモ（フォルダ保存: `saveMemoFolder()` L17516）　無料上限 20

- `memos[]`: `{id:'memo_'+uid(), title, body, folderId, attachments:[{dataUrl,...}], createdAt, updatedAt, workspaceId}`
- `memoFolders[]`: `{id:'mfld_'+uid(), name, parentId, color, createdAt}`

### 3.13 workspaces — ワークスペース（`DEFAULT_WORKSPACES` L10076 / `initWorkspaces()` L10101）

`{id:'ws_shared'|'ws_personal', name, type:'shared'|'personal', description, allowedMemberIds:[],
enabledFeatures:['cal','task','budget','health','prep','board','shopping','memo'], accessMode:'all'|'self', createdAt, updatedAt}`

現在のワークスペースは `curWsId()`（L10114）= `S.currentWorkspaceId || 'ws_shared'`。全主要エンティティの `workspaceId` が参照する横断軸。

### 3.14 members / user — メンバー　無料上限 4

`{id, name, role:'parent'|'child', av, grad, updatedAt}`。初期値 `DEFAULT_MEMBERS`（L8513・5 名固定）。
`applyMembersFromS()`（L8533）が id 重複除去と必須フィールド補完、`persistMembersToS()`（L8554）が LWW 用 `updatedAt` を付与。

### 3.15 プレミアム制限（`PREMIUM_LIMITS` L22520）

| キー | 無料上限 | | キー | 無料上限 |
|---|---|---|---|---|
| events | 500 | | albumPhotos | 20 |
| tasks | 30 | | customBoards | 3 |
| txs | 100 | | members | 4 |
| health | 50 | | memos | 20 |
| | | | docs | 15 |

判定は `isPremium()`（L22451）: サーバ権利 `S._serverEntitlement.premium`（メモリのみ・PERSIST 非対象）を最優先、
未取得時のみローカルキャッシュ `S.isPremiumUser` を参照。

---

## 4. Supabase スキーマ

接続: `SUPABASE_URL = 'https://jrmzzizjlkrogrbtzyuz.supabase.co'`（L6415）・**publishable(anon) キーのみ**（service_role 不搭載）。
`initSupabase()`（L6423）。CDN ロード失敗時は `_supaLoadFailed` ガードで完全ローカル動作を継続。

SQL の正本は次の 2 系統（**本番は membership 強化版が正**）:
- 初期版: `docs/supabase-setup-sql.sql` ＋ `docs/supabase-invites-sql.sql` ＋ `docs/supabase-entitlements-sql.sql`
- **統合・membership 強化版（2026-06-14）**: `docs/supabase-apply-all.sql`（ポリシー完全リセット追補つき）
- Stripe 課金拡張: `docs/billing-entitlements.sql`／Web Push: `docs/push-subscriptions.sql`

### 4.1 テーブル DDL 要約

#### fl_family_data — KV 型 JSONB 同期テーブル

```sql
id uuid pk, user_id uuid FK auth.users, family_id text,
data_key text not null, payload jsonb, updated_at timestamptz,
unique(user_id, data_key)
-- CHECK: char_length(data_key) between 1 and 64
-- CHECK: family_id is null or family_id ~ '^FAMI-[A-Z0-9-]{4,40}$'
```

1 ユーザー × 1 data_key で 1 行（upsert）。`payload` に PERSIST キーの値をそのまま JSONB 格納。

#### fl_family_members — 家族メンバーシップの正本（`supabase-apply-all.sql` L324）

```sql
family_id text, user_id uuid FK, role text ('owner'|'member'), joined_at,
pk(family_id, user_id)
-- CHECK: family_id ~ '^FAMI-[A-Z0-9-]{4,40}$', role in ('owner','member')
```

#### fl_family_invites — 使い捨て招待トークン

```sql
token text pk (CHECK '^INV-[A-Z0-9-]{4,40}$'), family_id text (CHECK '^FAMI-...$'),
created_by uuid FK, created_at, expires_at (既定 +72h), used_at, used_by uuid FK
```

#### fl_entitlements — 課金権利の正本（2 変種）

| 変種 | ファイル | カラム |
|---|---|---|
| IAP 想定版 | `docs/supabase-entitlements-sql.sql` | `user_id pk, premium bool, source text('app_store'\|'play'\|'promo'\|'trial', ≤32), expires_at, updated_at` |
| Stripe 版 | `docs/billing-entitlements.sql` | `user_id pk, premium bool, status text, stripe_customer_id, stripe_subscription_id, current_period_end, updated_at` |

いずれもビュー **`fl_my_premium`** を定義: 本人分のみを `premium`（有効判定込み）と `expires_at` で返す。
クライアントは `_syncPremiumFromServer()`（L21286）でこのビューだけを読む。Stripe 決済を有効化する場合は
Stripe 版 SQL の適用が前提（`06-api-edge-functions.md` §2.5）。

#### fl_push_subscriptions / fl_push_log — Web Push（`docs/push-subscriptions.sql`）

```sql
fl_push_subscriptions: endpoint text pk, user_id uuid not null, family_id text,
                       p256dh text, auth text, updated_at
fl_push_log:           key text pk, sent_at timestamptz  -- 送信重複防止（RLS ポリシーなし＝service_role 専用）
```

### 4.2 RLS ポリシー全一覧（membership 版・`supabase-apply-all.sql` 追補が最終形）

| テーブル | ポリシー | 操作 | 条件 |
|---|---|---|---|
| fl_family_data | `family_read` | SELECT | `auth.uid() = user_id` **または**（`family_id ∈ fl_my_family_ids()` かつ `data_key ∈ 家族共有許可リスト`） |
| fl_family_data | `own_insert` | INSERT | 本人かつ（`family_id` が null または自分の家族） |
| fl_family_data | `own_update` | UPDATE | 本人（with check も同条件＋自家族） |
| fl_family_data | `own_delete` | DELETE | 本人のみ |
| fl_family_members | select のみ | SELECT | 自分の家族の行のみ。**INSERT/UPDATE/DELETE ポリシーなし＝RPC（SECURITY DEFINER）経由のみ**（自己申告参加不可） |
| fl_family_invites | insert | INSERT | `created_by = auth.uid()` かつ自分の family_id のみ |
| fl_family_invites | select/update/delete | 各 | 作成者のみ。**被招待者は直接 SELECT 不可**（消費は RPC） |
| fl_entitlements | `ent_select_own`/`fl_ent_own_select` | SELECT | 本人のみ。**書き込みポリシーなし → 付与は service_role（Stripe Webhook）のみ** |
| fl_push_subscriptions | own_select/insert/update/delete | 各 | `auth.uid() = user_id` の 4 本 |
| fl_push_log | （ポリシーなし） | — | 一般ユーザー全拒否・service_role 専用 |

**家族共有許可リスト（サーバ側・23 キー）** = クライアント `FAMILY_SHARED_KEYS`（22 キー）＋ `_deletions`:

```
events, tasks, txs, health, posts, announces, prep, prepRoutines, folders, docs,
albumPhotos, shoppingItems, shoppingFrequent, members, customBoards, boardItems,
boardSections, recurringTxs, memos, memoFolders, workspaces, homeNote, _deletions
```

個人固有キー（`userProfile` / `isPremiumUser` / `hokuContext` / `notifs` 等）はこのリスト外のため、
**同じ家族でも本人以外は読めない**。検証は `docs/security-tests.sql`（全 pass=true を確認済み）。

### 4.3 RPC 4 本の仕様（すべて SECURITY DEFINER・authenticated に grant）

| RPC | 引数 | 動作 | クライアント呼び出し |
|---|---|---|---|
| `fl_my_family_ids()` | なし | 自分の membership から family_id 一覧を返す（stable・RLS 再帰回避） | RLS 内部で使用 |
| `fl_create_family(p_family_id)` | text | 本人を owner として登録。他人使用中の id は `family_id_taken` で拒否。冪等 | `_createNewFamily()`（L8187） |
| `redeem_family_invite(p_token)` | text | 未使用・未期限トークンを**行ロックで used 化**し membership 追加、family_id を返す。二重消費不可 | `_processPendingJoin()`（L8225） |
| `fl_leave_family(p_family_id)` | text | 自分の membership 行のみ削除 | 家族から抜ける導線 |

クライアントは RPC 不在（初期版 SQL のみ適用）の環境では legacy フォールバック（`FAMI-` 直接コード受理）で動作する後方互換実装。

---

## 5. 同期プロトコル詳細

### 5.1 対象キー定義

| 定数 | 場所 | 数 | 意味 |
|---|---|---|---|
| `SYNC_KEYS` | L6665 | **38 キー** | push/fetch の対象。`_deletions` を**先頭に固定**（20 行バッチの先頭バッチに削除トゥームストーンを必ず含め、後半バッチ失敗時の「削除の復活」を防ぐ） |
| `FAMILY_SHARED_KEYS` | L6684 | **22 キー** | 家族参加中は全メンバー分をマージするキー。**サーバ RLS 許可リストと一致必須**（§4.2） |

> 注: 過去のインベントリでは SYNC_KEYS を 40 キーと記載していたが、実測は **38 キー**（本書が正）。

### 5.2 push / fetch

```
saveS() 成功
 → _scheduleSyncToSupabase()（L6768）… 1500ms デバウンス
 → _pushToSupabase()（L6840）
    ・SYNC_KEYS を {user_id, family_id, data_key, payload, updated_at} 行に変換
    ・20 行/バッチで upsert(onConflict:'user_id,data_key')
    ・バッチごとに指数バックオフ 3 回リトライ／_isSyncing mutex で多重実行防止

Realtime 通知 or 20 秒ポーリング or online 復帰 or ログイン直後
 → _fetchFromSupabase()（L6895）→ Impl（L6900）… _fetchChain で直列化
    ・family_id 有 → eq('family_id', ...)／無 → eq('user_id', uid)
    ・タイムアウト 12,000ms（L6913）
    ・FAMILY_SHARED_KEYS は家族横断マージ、それ以外は自分の行のみ採用
    ・JSON.stringify 比較で実変化時のみ S へ反映・再描画
```

ログイン直後は `getSession` → `_reconcileFamilyIdForLogin()`（L8130）→ fetch → push の順で実行する。

### 5.3 コンフリクト処理（per-item LWW ＋ トゥームストーン）

| 機構 | 実装 | 内容 |
|---|---|---|
| 配列マージ | `_mergeSyncArray()`（L6778） | 同一 `id` は `updatedAt \| updated_at \| createdAt` の新しい方を採用。ローカル専用 id は保持 |
| 非配列 | — | 行の `updated_at` が新しい payload を優先 |
| 削除記録 | `_recordDeletion(key,id)`（L6797） | `S._deletions[key][id] = ISO時刻` |
| 削除判定 | `_isTombstoned()`（L6805） | 削除時刻 ≥ 更新時刻なら削除優先（**削除後に編集された項目は復活**＝編集を失わない） |
| 削除の伝播 | `_mergeDeletions()`（L6815） | 全メンバーの `_deletions` を union |
| GC | `_gcDeletions()`（L6830） | 30 日経過したトゥームストーンを削除 |
| 重複畳み込み | `_dedupByContent()`（L9212） | 内容一致の重複レコードを統合 |
| 自己エコー抑制 | `startRealtimeSync()` 内 | 自分の書き込み（user_id 一致かつ `updated_at − _lastPushAt < 3000ms`）は無視 |

### 5.4 Realtime

`startRealtimeSync()`（L7046）: チャンネル名 `'familink_sync_' + uid.slice(0,8) + '_' + rand`（**自セッション固有**。
家族の判別はチャンネル名ではなく**サーバ RLS で担保**）で `postgres_changes`（event:'*', table:'fl_family_data'）を購読。
他者変更は 800ms デバウンス後に fetch。切断時は指数バックオフ（最大 30 秒）で自己回復し、20 秒ポーリングが下支えする。
描画抑制: 入力中モーダルおよび閲覧系画面（s-album / s-archive / board-detail / cdetail / custom-board / memo / hoku）は
背景同期で再描画しない。

### 5.5 familyId と招待

- 生成: `_generateFamilyId()`（L8104）= crypto 乱数・32 文字集合（紛らわしい I/O/0/1 除外）12 文字 → `FAMI-XXXX-XXXX-XXXX`
- 設定: `_setFamilyId(id)`（L8120）が `familyId` / `familyIdOwner`(=uid) / `familyIdSetByUser=true` を保存
- 招待発行: `_issueInviteToken()`（L8279）が `INV-XXXX-XXXX-XXXX`（72h・1 回限り）を `fl_family_invites` へ insert。
  失敗時は `FAMI-` 直接コードにフォールバック。リンク = `origin + pathname + '?join=' + token`
- 受領: 起動時 `_captureJoinFromUrl()`（L8200）が `?join=`（`^(INV|FAMI)-[A-Z0-9-]{4,}$`）を `fl_pending_join` に保留し URL から除去
- 参加: ログイン後 `_processPendingJoin()`（L8225）。INV → `redeem_family_invite` RPC／FAMI → 後方互換受理 → `_setFamilyId` → push → fetch

### 5.6 同期関連の定数一覧

| 定数 | 値 | 用途 |
|---|---|---|
| push デバウンス | 1,500ms | `saveS()` → `_scheduleSyncToSupabase()` |
| push バッチサイズ | 20 行 | upsert の分割単位 |
| push リトライ | 指数バックオフ 3 回 | バッチ単位 |
| fetch タイムアウト | 12,000ms | `_withTimeout`（L6913） |
| Realtime fetch デバウンス | 800ms | 他者変更の連続通知を集約 |
| 自己エコー窓 | 3,000ms | `updated_at − _lastPushAt` |
| Realtime 再接続 | 指数バックオフ・最大 30s | 切断からの自己回復 |
| 補助ポーリング | 20 秒 | Realtime 欠落の下支え |
| 招待トークン期限 | 72 時間・1 回限り | `fl_family_invites.expires_at` 既定 |
| トゥームストーン GC | 30 日 | `_gcDeletions()` |

---

## 6. ID・日付・ファイル規約

| 規約 | 内容 |
|---|---|
| 汎用 ID | `uid()`（L9269）。接頭辞派生: `ph_`（写真）/ `doc_`（書類）/ `memo_` / `mfld_`（メモフォルダ）/ `shop_` / `rtx_`（固定収支）/ `pr_`（ルーティン）/ `mem_`（メンバー）。health は `health_<ts>_<rand>` |
| セキュア ID | familyId / 招待トークンのみ crypto 乱数（`FAMI-` / `INV-` ＋ 12 文字） |
| 日付 | `localDateStr(d)`（L9309）= ローカル TZ の `YYYY-MM-DD`。`todayStr()` も同様。タイムスタンプは ISO8601 UTC（一部 `todayStr()` 混用あり） |
| 表示 | `jpDate` / `jpMonth` / `fmtAmt` ヘルパー。ICS 出力は `_evToICalDates` |
| XSS | HTML へ挿入する変数は `H()`（L9268）で必ずエスケープ |
| 写真 | 全て base64 で `S` 内に保存（IndexedDB 未使用。移行計画は `docs/storage-indexeddb-roadmap.md`）。格納先: `albumPhotos[].dataUrl` / `docs[].photo` / `userPhotos` / `tasks[].photo` / `memos[].attachments[].dataUrl` |
| 縮小 | `downscaleImageFile()`（L9149）: 長辺 1280px・JPEG 品質 0.82–0.85 |
| 検証 | `_validateUploadFile(file, kind, maxBytes)`（L9288）: MIME / 拡張子 / サイズの三点判定 |

---

## 7. マイグレーション方針

原則: **旧データを消さず、読める形に補完して前へ進める**（一度きりフラグ＋新旧フィールド併記）。

| 移行 | 実装 | 内容 |
|---|---|---|
| タスク新スキーマ | `migrateTaskData()`（L14254） | `text→title` / `member→assignedTo` / `done→status` 併記補完 |
| リアクション | `migrateReactions(a)`（L16394） | 旧リアクション形式の変換 |
| 買い物の分離 | `migrateShoppingFromBoardItems()`（L27566） | 旧 `boardItems` → `shoppingItems`。`shoppingMigrated` で一度きり |
| プレミアム移行 | `premiumPaid` 未定義判定 | 既存ユーザーは `isPremiumUser && !trialStartedAt` なら課金扱い |
| メンバー正規化 | `applyMembersFromS()`（L8533） | id 重複除去・必須フィールド補完 |

旧互換フィールド（tasks の `text`/`member`/`done`、health の `child`/`temperature`/`cond`/`meds` 等）は
読み取り側が両対応する。新規実装は正規フィールドのみを書き、互換フィールドを**新たに増やさない**。

---

## 8. データ保護

### 8.1 容量ハンドリング（LocalStorage 上限 5MB 保守設計）

- `getStorageStats()`（L8864）: Blob サイズ＋base64 を合算して使用量を推定（iPhone Safari 実機 5–10MB、保守値 5MB）
- `saveS()` は容量超過（QuotaExceeded）を catch し、トースト「保存容量が上限に達しました。設定→ストレージ管理から整理してください」
  を表示して `false` を返す。**黙殺しない**（CLAUDE.md §13.1）

### 8.2 ロールバック

`saveS()` が `false` を返した場合、呼び出し側が S への変更を巻き戻す（実装例: `saveTx` / `saveHealth` / 書類保存）。
「保存されたように見えて消えている」状態を作らない。

### 8.3 エクスポート・整理導線

- `openStorageModal()`（L9015）: 種別ごとの使用量表示と整理導線
- `openDataShareModal()`（L8905）: JSON エクスポート（写真込み完全版／テキスト軽量版の 2 形式）
- 大切な写真・書類は端末本体にも保管する旨をユーザーへ案内する（CLAUDE.md §13.1）

---

## 9. 変更時の手順（新キー追加チェックリスト）

新しい保存データを追加する際は、以下を**同一の変更で**行う。1 つでも漏れると「保存されない」「同期されない」
「家族に見えない/見えてはいけないものが見える」事故につながる。

1. **`PERSIST` に追加**（L8841）— 追加しないと LocalStorage に保存されない（必須・CLAUDE.md §12.2）
2. **クラウド同期するなら `SYNC_KEYS` に追加**（L6665）— 端末内のみで良いキーは追加しない（プライバシー優先の既定）
3. **家族全員で共有するなら `FAMILY_SHARED_KEYS` に追加**（L6684）— 個人データは絶対に入れない
4. **手順 3 を行った場合はサーバ RLS の許可リストにも追加** — `docs/supabase-apply-all.sql` の `family_read`
   ポリシー内 `data_key = any(array[...])` を更新し、本番 Supabase に再適用。**クライアントとサーバのリストは常に一致**させる

追加後の確認:
- [ ] `node qa_full_test.js` 84/84 PASS
- [ ] 配列キーの場合、各要素に `id` と `updatedAt` があるか（LWW・トゥームストーンの前提）
- [ ] 削除導線がある場合 `_recordDeletion(key, id)` を呼んでいるか
- [ ] `docs/security-tests.sql` で家族分離が保たれているか（家族共有キーを増やした場合）
- [ ] 本書 §2.2 の PERSIST 表と §5.1 のキー数を更新

---

## 10. 本書の運用

- **正本は 1 箇所**: LocalStorage キー・エンティティ形・Supabase スキーマ・同期仕様の正本は本書とする。
  同内容を他文書に重複記載しない（`03-architecture.md` は概要のみ、`07-security.md` は RLS の検証観点のみを扱う）
- **更新タイミング**: PERSIST / SYNC_KEYS / FAMILY_SHARED_KEYS の増減、エンティティのフィールド追加、
  Supabase スキーマ・RLS・RPC の変更、同期定数の変更を行ったら、**同じコミットで本書を更新**する
- **実測主義**: 実装と本書が矛盾した場合はコードを調査のうえ本書を修正する（推測で書かない）。
  行番号は変動するため、大規模編集後は主要参照（`saveS` / `PERSIST` / `SYNC_KEYS` 等）の行番号を再確認する
- **キー数の検証コマンド**: `grep "const PERSIST" app-source/familink.html`（現在 88 キー・38 SYNC・22 FAMILY_SHARED）
- 更新時は `docs/worklog.md` に変更理由を記録する（CLAUDE.md §15）
