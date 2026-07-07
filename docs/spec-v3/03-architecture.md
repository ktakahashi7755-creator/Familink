# Familink 基本設計書（システムアーキテクチャ）

**文書番号**: SPEC-v3-03 ／ **版**: 1.0 ／ **作成日**: 2026-07-07 ／ **正本**
**対象読者**: アーキテクト・エンジニア・技術デューデリジェンス担当

> 本書は Familink の技術アーキテクチャの正本である。要件は `02-requirements.md`、
> データ詳細は `05-data-design.md`、サーバ処理は `06-api-edge-functions.md`、
> セキュリティは `07-security.md` を参照。ここから読めばシステム全体を再構築できる。

---

## 1. アーキテクチャ概要

### 1.1 全体構成図

```
┌─────────────────────────── クライアント（iPhone / Android / PC ブラウザ）───────────────────────────┐
│  PWA（GitHub Pages 配信: docs/index.html）                                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────┐                  │
│  │ 単一 HTML アプリ（app-source/familink.html が正本・約 29,000 行）              │                  │
│  │  ・Vanilla JS / CSS（フレームワーク・バンドラなし、npm 依存ゼロ）              │                  │
│  │  ・全 22 画面 + モーダル群 + Hoku（AI ガイド）                                 │                  │
│  │  ・状態オブジェクト S（メモリ）⇄ LocalStorage `familink_v3`（ローカル正本）    │                  │
│  └──────────────┬───────────────────────────────────────────────────────────────┘                  │
│                 │ Service Worker（docs/sw.js: cache-first・オフライン・Web Push 受信）              │
└─────────────────┼───────────────────────────────────────────────────────────────────────────────────┘
                  │ HTTPS（Supabase JS SDK v2 / CDN 読込・anon(publishable) キーのみ）
┌─────────────────▼───────────────────────────── Supabase ────────────────────────────────────────────┐
│  Auth（メール+パスワード / OTP / Magic Link[PKCE]）                                                  │
│  PostgreSQL + RLS                                                                                    │
│   ・fl_family_data（KV JSONB 同期）      ・fl_family_members（家族メンバーシップ正本）              │
│   ・fl_family_invites（使い捨て招待）    ・fl_entitlements + fl_my_premium（課金権利正本）          │
│   ・fl_push_subscriptions（Web Push 購読）                                                           │
│  Realtime（postgres_changes 購読）／ pg_cron（Push 定期スキャン）                                    │
│  Edge Functions（TypeScript / Deno）                                                                 │
│   ・hoku（Hoku LLM 応答）              ・calendar-scan（予定表 OCR）                                │
│   ・create-checkout / billing-portal / stripe-webhook（Stripe 決済）  ・push-send（Web Push 送信）  │
└─────────────┬────────────────────────────────────────────────────────┬──────────────────────────────┘
              │ OpenAI API（gpt-4o / gpt-4o-mini）                      │ Stripe（Checkout / Billing Portal / Webhook）
```

### 1.2 設計哲学（なぜこの構成か）

| 原則 | 内容 | 採用理由 |
|---|---|---|
| 単一 HTML | 画面・CSS・JS・主要画像（base64）を 1 ファイルに内包 | ビルド工程ゼロ＝改善サイクル最速。配信は静的ホスティングのみで原価極小。1人開発でも品質を保てる |
| Vanilla JS / 依存ゼロ | npm 依存なし。CDN は Supabase SDK と Google Fonts のみ | サプライチェーンリスク最小化・依存腐敗なし・審査/監査が容易 |
| オフラインファースト | ローカル（LocalStorage）で全機能が完結し、クラウドは同期レイヤー | 家族の生活導線（電波の悪い園・地下）でも必ず動く。未ログインでも全機能利用可 |
| クラウドは「同期と権利」だけ | データ同期・認証・課金権利・AI 呼び出しのみサーバ | サーバ障害時もアプリは動き続ける。秘密情報をクライアントに置かない |
| 家族単位のデータモデル | `familyId`（`FAMI-XXXX-XXXX-XXXX`）を中心に家族横断マージ | 「1家族=1ユニット」という事業モデルと一致（`01-product-vision.md`） |

### 1.3 技術スタック一覧

| レイヤー | 技術 | 備考 |
|---|---|---|
| フロントエンド | HTML5 / Vanilla JavaScript (ES2017+) / CSS3 | フレームワークなし |
| 配信 | GitHub Pages（静的） + Service Worker（PWA） | `docs/index.html` + `docs/sw.js` + `docs/manifest.json` |
| ローカル保存 | LocalStorage（主キー `familink_v3`）・写真は base64 | 上限 5MB 保守設計（iOS Safari） |
| BaaS | Supabase（Auth / Postgres+RLS / Realtime / Edge Functions） | anon(publishable) キーのみ搭載 |
| サーバ処理 | Supabase Edge Functions（TypeScript / Deno） | 6 本（§6） |
| AI | OpenAI API（gpt-4o=OCR / gpt-4o-mini=Hoku 会話） | キーは Edge Function シークレット |
| 決済 | Stripe Checkout + Billing Portal + Webhook | Web/PWA 配布用。ネイティブ配布時は IAP 必須 |
| フォント | Google Fonts（Poppins / Noto Sans JP） | 唯一の外部視覚アセット |
| テスト | Playwright（QA 84 件＋tools/ 追加スイート約30本）・Vitest（ユニット 23 件） | `node qa_full_test.js` / `npm run test:unit` |

---

## 2. ファイル構成と単一 HTML の内部構造

### 2.1 リポジトリ構成（主要）

```
Familink/
├─ app-source/familink.html      # 本体（正本・約 29,000 行）
├─ docs/                          # GitHub Pages 公開ディレクトリ + ドキュメント正本
│  ├─ index.html                  # 公開用本体（= SW 登録ブロック + app-source 本体）
│  ├─ sw.js                       # Service Worker（cache-first / SW_VERSION 管理）
│  ├─ manifest.json               # PWA マニフェスト
│  ├─ edge-functions/             # Stripe / Push 用 Edge Function 成果物（デプロイ元）
│  ├─ *.sql                       # Supabase スキーマ・RLS・検証 SQL
│  └─ spec-v3/                    # 本ドキュメント体系
├─ supabase/functions/            # デプロイ済み Edge Functions（hoku / calendar-scan）
├─ qa_full_test.js                # QA 自動テスト（Playwright・84 件）
├─ tools/qa_*_test.js             # 機能別追加スイート（約 30 本）
├─ tests/                         # Vitest ユニットテスト（実コード抽出・23 件）
└─ CLAUDE.md                      # 開発運用ルール（開発憲法）
```

### 2.2 familink.html の内部レイアウト（2026-07 実測）

| 行範囲（目安） | 内容 |
|---|---|
| L1–20 | `<head>`: meta / CSP / Google Fonts preconnect / Supabase SDK（`defer`・`onerror` ガード） |
| L21–3853 | `<style>`: デザイントークン（`:root` 変数）＋全コンポーネント CSS（`08-design-system.md`） |
| L3855–6396 | `<body>` マークアップ: 22 画面（`.screen`）・モーダル・タブバー・Hoku FAB |
| L6397–28669 | メインスクリプト: Supabase 接続→同期→状態管理→各画面 render→Hoku→課金 |
| L29211–29324 | 補助スクリプト（起動フック等） |

スクリプト内の論理モジュール（ファイル分割はしないが、責務は明確に区分）:

1. **クラウド接続層**（L6300–8300 付近）: `initSupabase` / 認証 / `_pushToSupabase` / `_fetchFromSupabase` / Realtime / 招待
2. **状態・永続化層**（L8300–9100）: `S` 定義 / `PERSIST`（88 キー）/ `saveS` / `loadS` / マイグレーション / ストレージ統計
3. **共通基盤**（L9100–10100）: `uid` / 日付ヘルパー / `H()` エスケープ / `_validateUploadFile` / モーダル・トースト・確認
4. **画面 render 層**（L10100–23600）: 画面ごとの `renderXxx` / `openXxxModal` / `saveXxx`
5. **Hoku 層**（L23600–27500）: 二層応答（ローカル/LLM）・インテントエンジン・音声・OCR 導線
6. **課金・ショップ層**（L21000–22700）: トライアル / `isPremium` / Stripe 導線 / ファミコイン

### 2.3 app-source ⇄ docs の同期規約（リリース工程）

- `docs/index.html` ＝「SW 登録ブロック（先頭〜`<!-- FL-HEAD-END -->` マーカー）」＋「app-source 本体（4 行目以降）」
- バージョン文字列 `var V='vYYYYMMDD{a-z}'`（index.html）と `SW_VERSION`（sw.js）を**必ず同値**にする
- 同期は CLAUDE.md §12.3 の sed コマンドで機械的に実施（手作業コピー禁止）
- SW のバイト変化 → ブラウザが新 SW 検知 → `skipWaiting` → `controllerchange` で 1 回だけ自動リロード

---

## 3. クライアントアーキテクチャ

### 3.1 状態管理

- 単一のグローバル状態 `S`（プレーンオブジェクト）。UI は「`S` 変更 → `saveS()` → 対象画面 `renderXxx()` 再描画」の単方向フロー
- `PERSIST` 配列（88 キー）に列挙されたキーだけが LocalStorage へ保存される。**新規保存キーは PERSIST への追加が必須**（技術的不変条件・CLAUDE.md §12.2）
- `S._xxx` 形式のキーは揮発（PERSIST 非対象）— 例: `S._serverEntitlement`（課金権利のサーバキャッシュ）、`S._deletions` は例外的に永続
- `saveS()` は boolean を返し、容量超過時は呼び出し側がロールバック（§5.3 データ保護）

### 3.2 画面遷移

- 22 画面 = `<div class="screen" id="s-*">` の表示切替（SPA だがルーターなし）
- `go(id)` → `showScreen(id)` + `refresh(id)`（画面別 render 呼出）+ タブバー表示制御
- 画面 ID 一覧（不変条件）: `s-home / s-task / s-cal / s-budget / s-board / s-health / s-prep / s-shopping / s-hoku / s-notif / s-settings / s-login / s-onboard / s-ob / s-album / s-archive / s-memo / s-ch / s-cdetail / s-premium / s-board-detail / s-custom-board`
- モーダルはボトムシート方式（`openModal`/`closeModal`）。破壊的操作は `showConfirm` を必ず経由

### 3.3 起動シーケンス

```
DOMContentLoaded
 → loadS()（LocalStorage 復元）→ マイグレーション群
 → _captureJoinFromUrl()（?join= 招待トークンを保留領域へ・URL から除去）
 → initSupabase()（CDN ロード成否をガード。失敗時は完全ローカルモード）
    → getSession / onAuthStateChange → S.supaSession 反映
    → _reconcileFamilyIdForLogin() → _fetchFromSupabase() → _pushToSupabase()
    → startRealtimeSync()（postgres_changes 購読）
 → _refreshTrialStatus() / _syncPremiumFromServer()
 → ログイン状態に応じて s-ob（ウェルカム）/ s-login / s-home へ
 → _startNotifChecker()（60 秒毎のローカルリマインド）
```

### 3.4 PWA / Service Worker（配信戦略）

- **cache-first**: 同一オリジン GET はキャッシュ即応答 → 裏でネットワーク取得しキャッシュ更新（stale-while-revalidate 的挙動）。遅い回線でも即起動・オフラインでも動作
- 別オリジン（Supabase CDN / Google Fonts）はキャッシュせずネットワーク任せ（未接続時はローカルのみで動く設計のため問題なし）
- 更新検知: `SW_VERSION` 焼き込み → バイト差分 → `skipWaiting` + 1 回だけ自動リロード（強制リロードで作業を壊さない）
- Web Push 受信ハンドラも sw.js に実装（iOS 16.4+ は「ホーム画面に追加」した PWA のみ）

---

## 4. クラウド同期アーキテクチャ

### 4.1 データフロー（自動同期・手動操作ゼロ）

```
ユーザー操作 → S 変更 → saveS()
  → _scheduleSyncToSupabase()（1500ms デバウンス）
  → _pushToSupabase(): SYNC_KEYS（38キー）を {user_id, family_id, data_key, payload(JSONB), updated_at}
    の行に変換し 20 行バッチで upsert（onConflict: user_id,data_key）・指数バックオフ 3 回

他端末の変更 → Postgres → Realtime(postgres_changes)
  → 800ms デバウンス → _fetchFromSupabase()（12s タイムアウト・_fetchChain で直列化）
  → family_id 一致の全メンバー行を取得
  → FAMILY_SHARED_KEYS（22キー）は家族横断マージ／それ以外は自分の行のみ採用
  → 差分があった場合のみ再描画（閲覧中の画面はチラつき防止のため背景反映）
```

補助経路: 20 秒ポーリング／`online` 復帰イベント／ログイン直後の fetch→push。

### 4.2 競合解決（マルチデバイス設計）

- **per-item Last-Write-Wins**: 配列は同一 `id` ごとに `updatedAt` の新しい方を採用（`_mergeSyncArray`）。非配列は行の `updated_at` 比較
- **削除トゥームストーン**: 削除は `S._deletions[key][id]=ISO時刻` に記録し全端末で union。「削除 vs 編集」は時刻比較（削除後の編集は復活）。30 日で GC
- **自己エコー抑制**: Realtime で自分の書き込み（3 秒以内・user_id 一致）は無視
- **重複防止**: `_dedupByContent()` が内容一致の重複を畳む

### 4.3 家族グループと招待

- `familyId`: `FAMI-XXXX-XXXX-XXXX`（crypto 乱数・紛らわしい文字 I/O/0/1 除外）。メンバーシップの正本はサーバの `fl_family_members`（RPC 経由でのみ変更＝自己申告参加不可）
- **招待リンクフロー**（摩擦ゼロ設計・グロースエンジン）:
  1. 発行側: `fl_family_invites` に使い捨てトークン `INV-...`（72h・1 回限り）を insert → `…/?join=INV-...` を Web Share / クリップボードで送付
  2. 受領側: 起動時に `?join=` を捕捉して保留（URL からは即除去）→ ログイン完了時点で `redeem_family_invite` RPC が原子的にメンバーシップ付与 → 自動 push/fetch →「家族に参加しました」
- 後方互換: `FAMI-` 直接コードの手入力経路も温存

### 4.4 障害時の振る舞い（グレースフルデグラデーション）

| 障害 | 挙動 |
|---|---|
| Supabase CDN ロード失敗 | `_supaLoadFailed` ガード → 完全ローカルモードで全機能動作 |
| オフライン | net-banner 表示・同期は保留。`online` イベントで自動再同期 |
| Realtime 切断 | 指数バックオフ（最大 30s）で自動再接続。20 秒ポーリングが下支え |
| push 失敗 | バッチごと 3 回リトライ。失敗はエピソード内 1 回だけ通知（黙殺しない） |
| LocalStorage 容量超過 | トースト通知＋呼び出し側ロールバック＋ストレージ管理導線 |

---

## 5. サーバサイド設計（Supabase）

### 5.1 テーブル構成（詳細は `05-data-design.md` §3）

| テーブル / ビュー | 役割 | 書き込み主体 |
|---|---|---|
| `fl_family_data` | KV 型 JSONB 同期（user_id × data_key で 1 行） | 本人（RLS） |
| `fl_family_members` | 家族メンバーシップの正本 | RPC（SECURITY DEFINER）のみ |
| `fl_family_invites` | 使い捨て招待トークン（72h） | 発行者 insert / 消費は RPC |
| `fl_entitlements` → `fl_my_premium` | 課金権利の正本 → 本人参照用ビュー | service_role（Stripe Webhook）のみ |
| `fl_push_subscriptions` | Web Push 購読 | 本人（RLS） |

### 5.2 RLS 設計原則（家族分離の担保）

- 家族間分離は**サーバ側 RLS のみで担保**し、クライアント判定に依存しない（セキュリティ原則）
- `fl_family_data` の family 読取は「共有許可キーのホワイトリスト × 自家族」の二重条件。個人キー（プロフィール・通知・Hoku 文脈等）は本人以外読めない
- クライアント定数 `FAMILY_SHARED_KEYS` とサーバの許可リストは**一致必須**（変更時は両方更新）
- 詳細と検証 SQL: `07-security.md` / `docs/security-tests.sql`

### 5.3 Edge Functions（詳細は `06-api-edge-functions.md`）

| 関数 | 役割 | 認証 | 外部接続 |
|---|---|---|---|
| `hoku` | Hoku の LLM 応答（gpt-4o-mini・JSON 出力・人格/安全プロンプト内蔵） | Supabase JWT | OpenAI |
| `calendar-scan` | 予定表画像 OCR（gpt-4o Vision・分割クロップ並列） | Supabase JWT | OpenAI |
| `create-checkout` | Stripe Checkout セッション作成（JWT から user 特定） | Supabase JWT | Stripe |
| `billing-portal` | Stripe Billing Portal（解約・支払管理） | Supabase JWT | Stripe |
| `stripe-webhook` | 署名検証 → `fl_entitlements` upsert（権利の正本を書く唯一の主体） | Stripe 署名 | Stripe |
| `push-send` | 予定リマインドの Web Push 送信（pg_cron 5 分毎 scan） | service_role | Web Push |

- 秘密鍵（OpenAI / Stripe / VAPID 秘密鍵 / service_role）はすべて Edge Function シークレット。**クライアント・リポジトリには一切置かない**

---

## 6. 機能フラグと段階的リリース

| フラグ / 設定 | 現在値 | 意味 |
|---|---|---|
| `STRIPE_ENABLED`（L22468 付近） | `false` | false: β表示（実課金なし）／true: Stripe Checkout 実決済に接続 |
| `VAPID_PUBLIC_KEY`（L16068 付近） | `''` | 空: Web Push「準備中」表示／設定でプッシュ購読が有効化 |
| `S.hokuAiOff` | ユーザー opt-out | Hoku の LLM 利用をユーザーが停止可能（ローカル応答へ） |

サーバ側の有効化手順書: `docs/BILLING-SETUP.md`（Stripe）/ `docs/WEB-PUSH-SETUP.md`（Push）。

---

## 7. 技術的不変条件（壊してはいけない前提）

CLAUDE.md §12 の正本を要約（変更には人間確認必須）:

1. 単一 HTML 構成を維持（SPA フレームワーク化・複数ファイル分割をしない）
2. npm 依存禁止。CDN 追加は要人間確認（現許可: Supabase SDK / Google Fonts）
3. LocalStorage 主キー `familink_v3` を破壊・初期化しない。新規保存キーは PERSIST に必ず追加
4. 画面 ID・主要関数名・データ構造の大幅変更は要人間確認
5. app-source と docs/index.html は必ず同期し、`var V` = `SW_VERSION` を守る
6. service_role キー等の秘密情報をクライアントに置かない
7. 入力は `H()` でエスケープ。`innerHTML` への未エスケープ変数注入禁止

---

## 8. 性能設計

| 項目 | 設計値 / 実測 | 対応 |
|---|---|---|
| 初回表示 | cache-first SW によりキャッシュ後は即時 | 初回のみ HTML 一括 DL（base64 画像込み） |
| 再描画 | 画面単位 render・背景同期時は閲覧画面を再描画しない | スクロール位置保存・チラつき防止 |
| 同期負荷 | push はデバウンス 1500ms・20 行バッチ／fetch は直列化＋差分検出 | 空振り再描画・再アップロードなし |
| Hoku 応答 | ローカル応答は同期処理（数十 ms）。LLM は上限つき | フォールバックチェーンで無応答ゼロ |
| 写真 | 取込時 1280px / JPEG 0.82–0.85 に自動縮小 | LocalStorage 5MB 保守設計に収める |

将来の負債と対策候補は `docs/PERF.md` / `docs/storage-indexeddb-roadmap.md`（写真の IndexedDB 移行・Supabase Storage 移行）を参照。

---

## 9. 将来拡張の設計方針

| 拡張 | 方針 |
|---|---|
| ネイティブ配布（App Store / Google Play） | WebView 薄ラッパー + StoreKit / Play Billing（Stripe はストア内デジタル販売に使えない）。`docs/ios-wrapper-decision.md` |
| 写真ストレージ拡張 | LocalStorage base64 → IndexedDB → Supabase Storage の段階移行 |
| 上位プラン（680〜980円） | `fl_entitlements.source` / Stripe Price 追加で対応可能な設計 |
| 多言語化 | 文言の定数化から着手（現状は日本語ハードコード） |
| React Native 移行 | 要人間確認の大規模変更。現行の単一 HTML は「検証済み仕様書」として活用 |

---

## 10. 本書の運用

- アーキテクチャ変更（新規テーブル・新規 Edge Function・CDN 追加・構成変更）は本書を先に更新し、worklog に記録する
- 実装と本書が矛盾した場合は実装を調査のうえ本書を修正する（推測で書かない）
- 旧 `docs/architecture-overview.md`（2026-05-02 / 9,720 行時点）は歴史的文書とし、本書を正本とする
