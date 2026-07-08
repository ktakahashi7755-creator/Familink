# Familink 運用・リリース設計書

**文書番号**: SPEC-v3-12 ／ **版**: 1.0 ／ **作成日**: 2026-07-07 ／ **正本**
**対象読者**: 開発・運用担当（PC / iPhone 双方から作業する開発者）・リリース責任者

> 本書は Familink の環境構成・リリース工程・サーバセットアップ・障害対応の正本である。
> 開発運用ルール（開始/終了プロトコル・コミット規約）の**正本は `CLAUDE.md`** であり、
> 本書 §2 はその要約に留まる。品質判定は `11-quality-testing.md`、セキュリティは
> `07-security.md`、アーキテクチャは `03-architecture.md` を参照。

---

## 1. 環境構成

| 環境 | パス / URL | 役割 |
|---|---|---|
| 正本ソース | `app-source/familink.html`（約 29,300 行） | すべての編集はここに対して行う |
| 公開ディレクトリ | `docs/`（GitHub Pages 配信元） | `index.html`（= SW 登録ブロック＋本体）・`sw.js`・`manifest.json`・アイコン |
| 公開 URL | `https://ktakahashi7755-creator.github.io/Familink/` | PWA として配信（ホーム画面追加でネイティブ風起動） |
| リモート開発環境 | `/home/user/Familink`（claude.ai/code 等） | 実装・QA 自動テストの主環境 |
| ローカル PC | `C:\Users\ktaka\Familink` | **OneDrive 側では作業しない**（CLAUDE.md §14.4） |
| ローカルプレビュー | `python3 -m http.server 9000 --bind 127.0.0.1 --directory app-source` | `http://localhost:9000/familink.html` |
| クラウド | Supabase プロジェクト `jrmzzizjlkrogrbtzyuz` | Auth / Postgres+RLS / Realtime / Edge Functions |
| 決済 | Stripe（Checkout / Billing Portal / Webhook） | Web/PWA 配布用（ネイティブ配布時は IAP・§9） |

サーバ資材の配置:

- `docs/*.sql` — Supabase スキーマ・RLS・検証 SQL（適用順は §5.1）
- `supabase/functions/` — デプロイ済み Edge Functions（`hoku` / `calendar-scan`）
- `docs/edge-functions/` — Stripe / Push 用 Edge Function 成果物（`create-checkout` / `billing-portal` / `stripe-webhook` / `push-send` のデプロイ元）

---

## 2. 開発運用プロトコル（要約・正本は CLAUDE.md）

### 2.1 作業開始プロトコル（CLAUDE.md §1）

新規セッションで編集を始める前に、この順で必ず実行する:
`git status`（clean 確認）→ `git log -1 --oneline` → `git fetch origin` → `git status -sb`（remote 差分）→ `docs/worklog.md` 末尾エントリの申し送り引き継ぎ。ユーザーの「作業開始 / 再開 / 続き」で【作業開始報告】フォーマットを返す。未コミット変更があれば勝手に作業を始めない。

### 2.2 作業終了プロトコル（CLAUDE.md §2）

「作業終了 / 閉じて / 一区切り / コミットして」で必ず実行:
変更一覧化 → **`node qa_full_test.js` 84/84 PASS 確認** → 未確認事項・iPhone 確認ポイント・次にやることの記録 → `docs/worklog.md` 追記（1 セッション = 1 エントリ・追記のみ）→ コミット → 【作業終了報告】。

### 2.3 コミット規約（CLAUDE.md §2 / §4）

- `.claude/settings.local.json` は**絶対にコミットしない**（端末固有権限）
- 1 コミット = 1 論理単位。「fix」「update」だけのメッセージは禁止
- worklog 追記は関連変更と同一コミットに同梱してよい
- 未コミットのまま作業を終えない（コミットするか明示的に stash）
- 端末（PC ⇄ iPhone）をまたぐ前に必ず `git push`。worklog に `env:` を明記

### 2.4 自律運用の境界（CLAUDE.md §7 / §14）

安全な読み取り・テスト・`app-source` 編集・docs 同期・worklog 更新は自律実行可。`rm` 大量削除・`git reset --hard` / force push・`familink_v3` 初期化・認証方式変更・service_role 利用は必ず停止（§14.3）。携帯短文指示のマッピングは `docs/mobile-operation.md`。

---

## 3. リリース工程（app-source → docs 同期・完全版）

### 3.1 原則

- `app-source/familink.html` を修正したら、**必ず** `docs/index.html` へ同期する（逆も同様）。「片方だけ修正して同期忘れ」は禁止（CLAUDE.md §12.3）。
- `docs/index.html` = 「SW 登録ブロック（先頭〜 `<!-- FL-HEAD-END -->` マーカー）」＋「app-source 本体（4 行目以降）」。区切りは行数固定ではなく**マーカー**。
- バージョン文字列は 3 箇所を**必ず同値**にする: `docs/index.html` の `var V`（L8）・`docs/sw.js` の `SW_VERSION`（L11）。値の形式は `v{YYYYMMDD}{a-z}`（同日 2 回目の更新なら末尾英字を進める。例: `v20260615j` → 同日なら `v20260615k`）。
- 同期は手作業コピーではなく、以下の sed パターンで機械的に行う。

### 3.2 同期コマンド（CLAUDE.md §12.3 正本・例は v20260615j → v20260707a）

```sh
# 0. 現在の版数を確認
grep "var V=" docs/index.html          # 例: var V='v20260615j';

# 1. 先頭ブロック（マーカーまで）を取得して V をバンプし、app-source 本体（4行目以降）と結合
{ sed '/<!-- FL-HEAD-END -->/q' docs/index.html | sed "s/v20260615j/v20260707a/"; \
  tail -n +4 app-source/familink.html; } > /tmp/new_index.html
cp /tmp/new_index.html docs/index.html

# 2. sw.js の SW_VERSION も同じ値へ（更新検知に必須・忘れない）
sed -i "s/var SW_VERSION = '[^']*'/var SW_VERSION = 'v20260707a'/" docs/sw.js

# 3. 確認（3 つが一致していること＋本体一致）
grep "var V=" docs/index.html; grep "SW_VERSION =" docs/sw.js
diff <(tail -n +4 app-source/familink.html) \
     <(sed '1,/<!-- FL-HEAD-END -->/d' docs/index.html) && echo 本体一致OK
```

### 3.3 リリース手順全体

1. `app-source/familink.html` を編集し、`node qa_full_test.js` で 84/84 PASS（`11-quality-testing.md` §6）
2. §3.2 の同期コマンドを実行（V / SW_VERSION バンプ）
3. `git diff` で差分確認 → worklog 追記 → 論理単位でコミット
4. `main` へ push → GitHub Pages が自動再配信
5. 実機（iPhone Safari / ホーム追加 PWA）で更新の到達を確認（新版検知 → 1 回だけ自動リロード）

一般公開リリース時は追加で `docs/RELEASE-CHECKLIST.md` と `07-security.md` §10 を全通しする。

---

## 4. Service Worker 更新配信の仕組み

`docs/sw.js`（105 行・cache-first）と `docs/index.html` 先頭ブロックの協調で「即時起動・オフライン動作・自動更新」を実現する。

| 要素 | 実装 | 効果 |
|---|---|---|
| cache-first | 同一オリジン GET はキャッシュ即応答 → 裏でネットワーク取得しキャッシュ更新（`fetch` ハンドラ） | 遅い回線でも一瞬で起動・オフラインでも動く |
| 版管理 | `SW_VERSION` を sw.js に焼き込み。値が変わる＝sw.js のバイトが変わる → ブラウザが新 SW を検知 | 「V ⇄ SW_VERSION 同値」規約が更新検知の生命線 |
| 即時入替 | `install` で `skipWaiting()`、`activate` で旧キャッシュ削除＋ `clients.claim()` | 新版が待機せず即座に制御を取る |
| 自動リロード | index.html 側が `controllerchange` を購読し、**1 回だけ** `location.reload()`（`_flReloaded` ガード） | 手動操作不要で最新化。無限リロードは構造的に防止 |
| 更新の取りこぼし防止 | `register('sw.js', { updateViaCache: 'none' })` ＋ 起動時 `reg.update()` ＋ 表示中も 60 秒毎に `update()` | HTTP キャッシュの古い sw.js で更新を見逃さない |
| 除外 | 別オリジン（Supabase CDN / Google Fonts）はキャッシュせずネットワーク任せ。`sw.js` 自身もキャッシュしない | 未接続時はアプリが LocalStorage のみで動作する設計のため問題なし |
| Web Push | `push` ハンドラ（JSON `{title, body, url, tag, icon}`）＋ `notificationclick` で既存ウィンドウへフォーカス/遷移 | アプリを閉じていても通知が届く（Wave 268） |

> **解消済み（2026-07-08）**: CLAUDE.md §12.3 の旧記述「更新バナーが出る＝強制リロードしない」は、現行実装
> （**skipWaiting → controllerchange で 1 回だけ自動リロード**）に合わせて修正済み。本節の記述が正本である。

---

## 5. サーバ側セットアップのランブック索引

### 5.1 Supabase SQL 適用順序（本番 SQL Editor で Run・すべて冪等）

| 順 | SQL | 内容 | 備考 |
|---|---|---|---|
| 1 | `docs/supabase-setup-sql.sql` | `fl_family_data` テーブル・CHECK 制約・基本 RLS・Realtime publication | 土台 |
| 2 | `docs/supabase-invites-sql.sql` | `fl_family_invites`（使い捨て招待・72h）＋ `redeem_family_invite` RPC | A-H3/C2 対策 |
| 3 | `docs/supabase-entitlements-sql.sql` | `fl_entitlements` ＋ `fl_my_premium` ビュー（課金権利の正本） | 書込ポリシーなし＝service_role のみ |
| 4 | `docs/supabase-perf-indexes.sql` | family_id / user_id インデックス | 性能 |
| — | **`docs/supabase-apply-all.sql`（推奨・一括）** | 上記 1〜4 ＋ membership 強化（`fl_family_members`・RPC 4 種）＋ポリシー完全リセットを全文同梱 | **これ 1 本を Run すれば最終状態になる** |
| 5 | `docs/push-subscriptions.sql` | `fl_push_subscriptions`（Web Push 購読・本人のみ RLS） | Web Push 有効化時 |
| 6 | `docs/billing-entitlements.sql` | Stripe 用の権利テーブル整備（entitlements と同系） | Stripe 有効化時 |
| 検証 | `docs/security-tests.sql` | RLS 分離の非破壊実証（begin〜rollback） | 適用後に必ず Run（全 pass 確認） |

適用後はアプリの `#qa-debug` →「家族共有セルフテスト」で各レイヤー合否を確認する。

### 5.2 Edge Functions デプロイ

```sh
# Hoku / OCR（supabase/functions/ 配下・JWT 検証 ON のまま）
supabase functions deploy hoku
supabase functions deploy calendar-scan

# Stripe（docs/edge-functions/ 配下）
supabase functions deploy create-checkout
supabase functions deploy billing-portal
supabase functions deploy stripe-webhook --no-verify-jwt   # Stripe 署名で検証するため

# Web Push
supabase functions deploy push-send --no-verify-jwt        # pg_cron 内部呼出用
```

シークレット設定（`supabase secrets set`）: `OPENAI_API_KEY`（hoku / calendar-scan 共通）・`STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` / `STRIPE_WEBHOOK_SECRET`・`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`。`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` は Edge Function に既定注入される。

### 5.3 Stripe / Web Push 有効化（手順書の正本）

- **Stripe 課金**: `docs/BILLING-SETUP.md`。Price（月額 480 円・recurring）作成 → SQL（§5.1 の 6）→ Edge 3 本デプロイ → Webhook 登録（`checkout.session.completed` / `customer.subscription.created|updated|deleted`）→ アプリ側 `STRIPE_ENABLED = true` → §3 同期 → push。テストモードでカード `4242…` により `fl_my_premium` 反映まで確認。
- **Web Push**: `docs/WEB-PUSH-SETUP.md`。`npx web-push generate-vapid-keys` → 公開鍵をアプリ `VAPID_PUBLIC_KEY` へ → SQL（§5.1 の 5）→ シークレット設定 → `push-send` デプロイ → pg_cron（`*/5 * * * *` で `push-send(scan)`）→ curl テスト送信で疎通確認。iOS は「ホーム画面に追加」した PWA のみ（iOS 16.4+）。

---

## 6. 機能フラグ運用

| フラグ | 位置（app-source） | 現在値 | OFF 時挙動 | ON 化の手順 |
|---|---|---|---|---|
| `STRIPE_ENABLED` | L22468 | `false` | β/トライアル表示のまま（実決済なし・βバナー＋`autocomplete="off"`） | §5.3 のサーバ設定完了後に `true` → §3 同期 → push。表示と実装状態を矛盾させない（CLAUDE.md §13.5） |
| `VAPID_PUBLIC_KEY` | L16068 | `''`（空） | 通知設定が「準備中」表示（既存挙動を壊さない） | 公開鍵を貼付 → §3 同期 → push（公開鍵はコミット可・秘密鍵は不可） |
| `S.hokuAiOff` | ユーザー設定（PERSIST） | 既定 false（AI 有効） | LLM を使わずローカル応答のみ | ユーザー自身の opt-out。運用側は変更しない |

フラグの原則: **OFF の間は既存挙動を一切壊さない**（段階的リリース）。ON 化はサーバ側設定の完了が前提であり、独断で行わない（課金・通知は CLAUDE.md §7 の要事前確認カテゴリ）。

---

## 7. バックアップ・復旧

### 7.1 コードのバックアップ

- 正本は git 履歴。復旧ポイントの索引は `docs/BACKUP-MANIFEST.md`（Wave 別コミットハッシュ表＋復旧手順）。
- 任意時点への復旧は新ブランチ切り出しを推奨: `git checkout -b restore-<name> <hash>`（`git reset --hard` は CLAUDE.md §14.3 の要停止操作）。
- 公開版のロールバック: `docs/index.html` + `docs/sw.js` を旧版に戻し **V / SW_VERSION を新しい値でバンプして** push（版数を戻すとバイト差分の検知が不安定になるため、必ず前進させる）。

### 7.2 ユーザーデータのバックアップ

- ユーザーデータの正本は各端末の LocalStorage `familink_v3` ＋（ログイン時）`fl_family_data`。サーバ同期がバックアップを兼ねる（再ログインで復元）。
- アプリ内エクスポート: 設定 → ストレージ管理 / データ共有（`openDataShareModal()`）で「写真込み完全版」「テキスト軽量版」の JSON を書き出し・復元できる。
- 消失リスク（端末変更・ブラウザデータ削除）は UI で常設告知（`07-security.md` §8.3）。
- `familink_v3` の破壊・初期化は禁止（技術的不変条件）。

---

## 8. 監視・障害対応

### 8.1 アプリ内監視 UI

| 機構 | 実装 | 見えるもの |
|---|---|---|
| 同期ドット | `_setSyncDot(state)`（L6698） | syncing / ok / error の同期状態 |
| net-banner | `#net-banner`（`online`/`offline` イベント連動） | オフライン検知と「再試行」導線（`retrySyncNow()`） |
| Error Boundary | `refresh(id)` の画面例外捕捉 | 1 画面の例外で全白にせず復旧画面（再読み込み導線） |
| `#qa-debug` | 家族共有セルフテスト（`familytest_*` チャンネル） | 認証・RLS・Realtime 各レイヤーの合否（※公開時は削除または厳重ゲート） |
| Supabase エラー日本語化 | `_supaErr` 共通化 | 生の技術エラーをユーザーに露出しない |

### 8.2 障害時の自動回復（`03-architecture.md` §4.4）

Supabase CDN ロード失敗 → 完全ローカルモード ／ Realtime 切断 → 指数バックオフ（最大 30s）＋ 20 秒ポーリング下支え ／ push 失敗 → バッチ 3 回リトライ＋1 回だけ通知 ／ 容量超過 → トースト＋ロールバック。

### 8.3 トラブルシュート表

| 症状 | 確認ポイント | 参照 |
|---|---|---|
| 更新が端末に届かない | `var V` と `SW_VERSION` が同値か／sw.js のバイトが変わったか／`updateViaCache:'none'` が生きているか | §3 / §4 |
| 家族間で同期されない | 本番に apply-all 適用済みか（RLS family_read / Realtime publication）／`#qa-debug` セルフテスト／family_id 一致 | §5.1 |
| 課金登録後に反映されない | Stripe ダッシュボードのイベントログに Webhook が届いているか／`STRIPE_WEBHOOK_SECRET` 一致／`fl_entitlements` に行があるか | `docs/BILLING-SETUP.md` |
| 課金ボタンが「準備中」 | `STRIPE_ENABLED` がまだ `false` | §6 |
| 通知が来ない（iOS） | 「ホーム画面に追加」した PWA か（iOS 16.4+）／通知許可／VAPID 公開鍵がアプリと一致 | `docs/WEB-PUSH-SETUP.md` |
| テスト通知は来るがリマインドが来ない | pg_cron が動いているか（`select * from cron.job;`）／予定の通知設定／JST 時刻 | 同上 |
| push-send が `sent:0` | 対象ユーザーの購読が未登録（アプリで通知を再オン） | 同上 |
| ログインできない（OTP 未達） | 無料 SMTP は 1 時間 2 通制限。Email confirmation 設定を確認 | `docs/supabase-apply-all.sql` 末尾注記 |
| 保存できない | LocalStorage 容量超過（トースト表示）→ ストレージ管理で整理／写真の自動縮小が効いているか | `07-security.md` §8.3 |

---

## 9. App Store 公開への道筋

現状は **PWA（GitHub Pages）配布**。ストア公開へは以下の段階を踏む（決定文書: `docs/ios-wrapper-decision.md`・状態は「推奨案提示・オーナー最終判断待ち」）。

| 段階 | 内容 | 留意点 |
|---|---|---|
| 現在: PWA | ホーム画面追加で起動・オフライン・Web Push（iOS 16.4+）・Stripe 課金可 | ストアに並ばない＝発見性で不利 |
| 推奨: Capacitor ラッパー | 単一 HTML を `webDir` に置くだけでラップ（改修コスト最小）。通知・カメラ・IAP をプラグインで段階追加。iOS/Android 両対応 | npm 依存・Xcode ビルド環境が必要 → **CLAUDE.md §12.1（npm 依存禁止）の例外承認＝人間確認必須** |
| 代替: WKWebView 手書き | 依存最小だがネイティブ連携を都度自前実装 | 保守コスト高 |
| 課金の切替 | **ストア内デジタル販売に Stripe は使えない**。ネイティブ配布時は StoreKit / Play Billing（IAP）必須。権利は同じ `fl_entitlements` に `source:'app_store'|'play'` で upsert する設計（レシート検証 Edge Function） | `docs/BILLING-SETUP.md` 注意欄・`docs/iap-integration-plan.md` |
| 提出前ゲート | `familink-appstore-release-lead` Skill のチェックリスト（メタデータ・スクショ・年齢区分・プライバシー・解約導線・#qa-debug 削除） | `11-quality-testing.md` §9 / `07-security.md` §10 |

---

## 10. 本書の運用

- 環境・リリース工程・サーバ手順の変更（バージョン形式・同期コマンド・SQL 追加・Edge Function 追加・フラグ追加）は本書を先に更新し、worklog に記録する。
- 手順書の正本は 1 箇所を維持する: 運用ルール = CLAUDE.md、Stripe = `docs/BILLING-SETUP.md`、Web Push = `docs/WEB-PUSH-SETUP.md`、復旧索引 = `docs/BACKUP-MANIFEST.md`。本書は索引と全体像のみを持ち、重複記述を増やさない（CLAUDE.md §11）。
- 実装と本書が矛盾した場合は現行コード（`docs/sw.js` / `docs/index.html` 先頭ブロック / 各フラグ実値）を正とし、本書と CLAUDE.md の記述を追随させる（§4 の記載齟齬を参照）。
