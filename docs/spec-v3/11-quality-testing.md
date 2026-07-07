# Familink 品質保証・テスト計画書

**文書番号**: SPEC-v3-11 ／ **版**: 1.0 ／ **作成日**: 2026-07-07 ／ **正本**
**対象読者**: QA 担当・エンジニア・リリース判定者

> 本書は Familink のテスト体系と品質判定基準の正本である。運用ルールの上位規範は
> `CLAUDE.md` §2（終了プロトコル）/ §14.5（QA 自動テスト必須）。手動テスト観点の正本は
> `docs/test-checklist.md`、リリース判定の詳細は `docs/RELEASE-CHECKLIST.md`。
> アーキテクチャ前提は `03-architecture.md` を参照。

---

## 1. 品質方針

| # | 方針 | 根拠 |
|---|---|---|
| 1 | **実装・修正後は `node qa_full_test.js` で 84/84 PASS を確認してからコミット**する。FAIL が出たら修正→再実行を繰り返し、PASS 確認後にのみコミットする | CLAUDE.md §2 / §14.5 |
| 2 | テストは「本物のコード」を検証する。ユニットテストは本体 HTML から実関数を抽出して実行し（§5）、複製コードのテストはしない | `tests/harness.mjs` 設計方針 |
| 3 | テスト結果は隠さない。未実施項目は worklog に「未実施: 理由」を必ず明記する | `docs/test-checklist.md` §7 |
| 4 | 致命バグ（S 級）ゼロがリリースの前提（押せない/保存されない/閉じない/JS エラー/主要画面が開かない/iPhone で操作不能/LocalStorage 不整合） | `docs/test-checklist.md` §3 |
| 5 | 自動テストで担保できない領域（iPhone Safari 実機・本番 Supabase・Web Push・実決済）は、worklog の「iPhone 確認ポイント」に必ず引き継ぐ | CLAUDE.md §2 手順 7 |

---

## 2. テスト体系全体像

| レイヤー | 件数 | 実行コマンド | 対象 | 実行環境 |
|---|---|---|---|---|
| ユニット（Vitest） | 23 件 | `npm run test:unit`（= `npx vitest run`） | 純粋ロジック関数（日付/課金境界/招待/ファイル検証/繰り返し予定） | Node のみ（サーバ不要） |
| QA 総点検（Playwright） | 84 件 | `node qa_full_test.js` | 全画面遷移・CRUD・永続性・XSS・レイアウト・コンソールエラー | ローカル HTTP サーバ（§6） |
| 機能別追加スイート（Playwright/Node） | 約 33 本（§4） | `node tools/qa_<name>_test.js` | カレンダー/課金/同期/招待/エラー処理/ツアー等の深掘り回帰 | 同上（一部 Node 単体） |
| 手動・実機 | チェックリスト | — | iPhone Safari 実機・本番 Supabase 疎通・Web Push・実決済 | 実機 + 本番環境 |

コミット前の必須ゲートは「QA 84/84 PASS」。Vitest と追加スイートは対象領域を変更した際・リリース前に実行する（リリース時は全スイート緑が前提: `docs/RELEASE-CHECKLIST.md` ヘッダ「Vitest 23 + Playwright 各スイート + QA84 = すべて緑」）。

---

## 3. qa_full_test.js の構成（84 件の内訳）

`qa_full_test.js`（670 行・Playwright/chromium）は iPhone 390×844 @2x（`isMobile:true, hasTouch:true`）で本体を起動し、TEST 1〜33 のブロックで 84 アサーションを実行する。判定は PASS / FAIL / WARN の 3 値で、**FAIL が 1 件でもあれば exit code 1**（WARN はブロックしない）。

| カテゴリ | 検証内容 |
|---|---|
| ウェルカム / ログイン（TEST 1–2） | 初回起動で `s-ob` 表示・Hoku 画像・ゲスト体験導線・ログインフォーム（`#ob2-email` / `#ob2-login-btn`）の存在 |
| ホーム / タブバー（TEST 3–4） | ゲスト入室でホーム表示・タブバー表示・ボタン 3 個以上 |
| 画面遷移 / 導線（TEST 5–6） | 15 主要画面（`s-task`〜`s-premium`）の表示＋各画面の戻るボタン＋`goBack()` でホーム復帰 |
| CRUD（TEST 7–17） | 予定・タスク・家計・体調・ボード投稿・買い物・メモ・書類・アルバム・準備リストの「モーダルが開く→保存で閉じる→一覧に反映」 |
| 多重クリック（TEST 18） | モーダル連続起動の耐性・正常クローズ |
| 永続性（TEST 19） | `saveS()` → リロード → `familink_v3` から復元 |
| 設定 / プレミアム / 家族管理 / 通知（TEST 20–23） | 各画面のレンダリング・プレミアム導線・トライアルボタン・メンバー追加モーダル |
| Hoku（TEST 12, 24, 27） | 画面表示・入力欄/送信ボタン・FAB 存在・空入力では送信されない |
| セキュリティ（TEST 25–26） | `H()` の XSS エスケープ動作・LocalStorage 正規キーのみ使用（`familink_v3` / `familink*` / `fl_*` / `sb-*`） |
| バリデーション（TEST 28） | 予定タイトル空で保存できない（モーダルが閉じない） |
| コンソール（TEST 29） | JS コンソールエラー 0 件（favicon / Supabase 未接続 / sw.js 由来のネットワークエラーは除外フィルタ） |
| レイアウト（TEST 30） | 主要 5 画面で横スクロールが発生しない（iPhone 幅） |
| 紐付け（TEST 31–33） | 家計カテゴリチャート領域・カレンダー月移動反映・タスク完了トグルの状態変更 |
| スクリーンショット（FINAL） | 主要 6 画面を `/tmp/qa_*.png` に保存（目視確認用） |

注意: Playwright は `/opt/node22/lib/node_modules/playwright` の絶対パスで require している（リモート環境前提。環境が異なる場合はこの 1 行の調整が必要）。

---

## 4. tools/ 追加スイート全一覧（33 本）

すべて `node tools/<ファイル名>` で実行（§6 のサーバ起動が前提。`sync_harness_test.js` のみ Node 単体）。件数は `docs/RELEASE-CHECKLIST.md` に記録があるもののみ記載。

| ファイル | 対象機能 / 目的 | 件数 |
|---|---|---|
| `qa_3states_test.js` | Hoku 応答 3 状態（ローカル応答 / loading / 日次上限）と空データユーザー表示 | — |
| `qa_authguard_test.js` | 認証ガード: 未ログインは `s-ob` 固定・タブバー非表示・`?screen=` バイパス不可 | 7 |
| `qa_autosync_test.js` | 完全自動同期（保存→デバウンス push・ポーリング・ログイン直後同期） | — |
| `qa_bill_centralized_test.js` | BILL-1: 機能境界の一元管理（`PREMIUM_FEATURES` / `PREMIUM_LIMITS` が正本） | 計 21（bill_* 合算） |
| `qa_bill_copy_server_test.js` | BILL-2/3: 無料上限の訴求文言＋サーバ権利（`_serverEntitlement`）優先 | 〃 |
| `qa_boundary_test.js` | 境界テスト: 月跨ぎ / 年跨ぎ / 閏年 / 大量データ | 計 32（content と合算） |
| `qa_cal_allday_test.js` | CAL-1: 終日予定（トグル・時刻欄の出入り・表示） | 計 37（cal_* 合算） |
| `qa_cal_integrity_test.js` | CAL-4: カレンダーのデータ整合性ガード（不正値保存の防止） | 〃 |
| `qa_cal_memberfilter_test.js` | CAL-3: メンバーフィルタ（誰の予定か絞り込み） | 〃 |
| `qa_cal_taptarget_test.js` | CAL-2: タップ領域 44px 以上（月送り・ビュー切替等） | 〃 |
| `qa_cloudbanner_test.js` | ログイン中だがクラウド未接続時の案内バナーとログイン導線 | — |
| `qa_cloudfirst_login_test.js` | クラウド優先ログイン（ログアウト後再ログイン）＋招待発行の回帰 | — |
| `qa_content_test.js` | 表示値の正当性: 決定的データを投入し画面の数値・件数・内容の一致を検証 | 計 32（boundary と合算） |
| `qa_doublesubmit_test.js` | E4: フォーム二重送信防止（`_lockSubmit` 700ms） | 計 28（errbound/netbanner と合算） |
| `qa_e2e_flow_test.js` | 主要ユーザーフロー結合: 家族作成→招待コード→予定→買い物→アルバム→タスク | 14 |
| `qa_errbound_test.js` | Error Boundary: 1 画面の例外で全白にならず復旧画面が出る | 計 28（同上） |
| `qa_event_remind_test.js` | 予定リマインド＋繰り返し終了日（`repeatUntil` 尊重・旧データ 30 分前互換） | — |
| `qa_ext_test.js` | 拡張 QA: 実操作レベルの紐付け・CRUD・状態検証（qa_full の補完） | 36 |
| `qa_fam_ocr_test.js` | 家族共有（コード生成/参加/切替/同時編集）＋ OCR 導線 | 18 |
| `qa_fileval_test.js` | ファイル検証: 不正ファイル拒否・XSS エスケープ | 16 |
| `qa_final_smoke_test.js` | リリース直前の最終スモーク（主要フロー一括） | — |
| `qa_invite_link_test.js` | 招待リンク自動参加（`?join=` 捕捉→保留→ログイン後参加） | — |
| `qa_invite_token_test.js` | T-071: 招待トークン配線（`INV-` → `redeem_family_invite` 呼出経路） | — |
| `qa_netbanner_test.js` | オフライン/オンライン切替の net-banner 表示と手動リトライ | 計 28（同上） |
| `qa_ocr_unit_test.js` | OCR 単体: 読み取り正規化・不正日付（2/30 等）ブロック・確認画面 | 16 |
| `qa_otp_onboard_test.js` | ウェルカム（ログイン）導線回帰: メール＋パスワード主導線の統一仕様 | — |
| `qa_perf_lazy_test.js` | アルバム 30 枚の遅延読込・描画性能 | — |
| `qa_release_test.js` | リリース修正の回帰（容量超過ロールバック等） | — |
| `qa_supaerr_test.js` | E3: Supabase エラー文言の日本語共通化（生エラー非露出） | — |
| `qa_sync_merge_test.js` | 家族同期マージ中核: `_mergeSyncArray` / `_isTombstoned` / `_mergeDeletions` / `_gcDeletions` / `_dedupByContent` / `_occursOn` の網羅（実コード） | — |
| `qa_tour_test.js` | 使い方ツアー 19 ステップの実演・スポットライト位置 | 計 21（tour_* 合算） |
| `qa_tour_firstrun_test.js` | ツアー初回選択・低い画面（アプリ内ブラウザ相当 375×560）での吹き出し視認性 | 〃 |
| `sync_harness_test.js` | 同期ロジックの Node 単体検証ハーネス（ブラウザ不要） | — |

---

## 5. Vitest ユニットテスト（実コード抽出方式）

### 5.1 harness の仕組み（`tests/harness.mjs`・87 行）

テストは複製コードではなく**本体の実装そのもの**を検証する。

1. `app-source/familink.html` を文字列として読み込む。
2. `extractFunction(name)`: `function NAME(...)` を波括弧の対応をとって本体ごと抽出。`extractConst(name)`: `const NAME = ...;` を括弧対応で抽出（アロー・オブジェクト対応）。
3. 抽出対象: `localDateStr` / `_ocrZen2Han` / `_ocrNormTime` / `_ocrNormDate` / `_ocrDateIsReal` / `_occursOn` / `_validateUploadFile` / `isPremium` / `_ocrMonthlyLimit` / `checkPremiumLimit` / `_generateFamilyId` ＋ 定数 `PREMIUM_FEATURES` / `PREMIUM_LIMITS` / `FAMILY_SHARED_KEYS`。
4. `buildSandbox(overrides)`: `node:vm` の最小サンドボックス（`S` / `MEMBERS` を差し替え可能、`crypto.getRandomValues` は最小スタブ）に注入して eval し、`__exports` として返す。

この方式により、本体側で関数名や実装が変わればテストが即座に失敗する（仕様の複製ズレが起きない）。

### 5.2 テスト内容（`tests/unit.test.mjs`・23 件）

| describe | 検証内容 |
|---|---|
| 日付処理（5） | `localDateStr` のローカル TZ、`addDays` の月跨ぎ、OCR 日付/時刻正規化、実在日判定（2/30・13 月・閏年） |
| 繰り返し予定 `_occursOn`（4） | 毎週 7 日ごと・平日（土日除外）・開始日前は発生しない・カスタム 2 週ごと |
| 課金境界（6） | `PREMIUM_FEATURES` 正本値（OCR 無料 1/プレミアム 30・Hoku 日次 5）、`isPremium` のサーバ権利最優先（改ざん耐性）、`_ocrMonthlyLimit`、`checkPremiumLimit` の上限判定 |
| 権限・招待コード（3） | `FAMI-` 形式のみ許可・`_generateFamilyId` の形式と紛らわしい文字（I/O/0/1）除外・生成コードが検証を必ず通る |
| ファイルアップロード検証（4） | 画像/動画/JSON の種別判定・非許可拒否・サイズ超過拒否・null 安全 |
| データ分離キー整合（1） | `FAMILY_SHARED_KEYS` が未使用 `faceGroups` を含まず、`events` / `albumPhotos` を含む |

実行: `npm run test:unit`（devDependencies は `vitest` のみ・`package.json` 参照）。サーバ起動不要。

---

## 6. 実行手順

```sh
# 1. ローカルサーバ起動（QA / tools スイートの前提）
python3 -m http.server 9000 --bind 127.0.0.1 --directory app-source &

# 2. QA 総点検（コミット前必須・84/84 PASS を確認）
node qa_full_test.js 2>&1 | tail -15

# 3. ユニットテスト（サーバ不要）
npm run test:unit

# 4. 機能別スイート（変更領域に応じて / リリース前は全本）
node tools/qa_cal_allday_test.js     # 例: カレンダー変更時
node tools/qa_sync_merge_test.js     # 例: 同期ロジック変更時
```

- テスト URL は `http://localhost:9000/familink.html`（`app-source` を直接配信。`docs/index.html` ではない）。
- 判定: `qa_full_test.js` は FAIL>0 で exit 1。CI 的に扱う場合は終了コードで判定できる。
- 構文チェックのみ行いたい場合は `node --check`（CLAUDE.md §14.2 で許可済み操作）。

---

## 7. 手動テスト・iPhone 実機確認観点（`docs/test-checklist.md` 要約）

### 7.1 コミット前セルフチェック（毎回）

起動 / 主要画面表示 / ログイン導線 / ボタン反応 / 画面遷移 / スマホ幅（375〜428px）で崩れなし / 不要な console.log なし / 既存機能の非破壊 / 過剰実装でないか。

### 7.2 iPhone Safari 実機観点（自動テストで代替不可）

- 起動・主要画面表示、セーフエリア（ノッチ・ホームインジケータ）の侵食なし
- スクロール / タップ / 入力のレスポンス、キーボード表示時のレイアウト
- タップ領域が片手操作で届く（44px 基準）
- LocalStorage が再読み込み後も保持される
- 予定 / タスク / ボードの作成・編集・削除、Hoku 常駐が他要素を隠さない
- iPhone SE 幅（375px）/ 小型端末（320px）で横スクロールが出ない
- 機内モード →「オフライン」バナー → 復帰で自動同期
- PWA:「ホーム画面に追加」からの起動・オフライン起動・更新（新版で 1 回だけ自動リロード）

### 7.3 本番環境が必要な手動フロー（`docs/RELEASE-CHECKLIST.md` §3）

- ログイン（メール＋パスワード / メール OTP）実往復
- 家族を招待 → 別端末で参加 → 予定が同期される（本番 Supabase SQL 適用後）
- アルバム写真が他の家族端末に表示される
- 予定表カメラ読み取り → 確認画面 → 登録（Edge Function 経由）
- Web Push（iOS はホーム画面追加 PWA のみ・iOS 16.4+）
- 課金導線（β時: 試用モード明示 / 実決済時: Stripe テストカード → `fl_my_premium` 反映 → Billing Portal 解約）

---

## 8. 回帰テスト運用ルール

1. **毎コミット**: `node qa_full_test.js` 84/84 PASS（CLAUDE.md §14.5・例外なし）。
2. **変更領域の追加スイート**: 触った機能に対応する `tools/qa_*_test.js` を実行する（例: カレンダー変更 → `qa_cal_*` 4 本、同期変更 → `qa_sync_merge` + `qa_autosync`、課金変更 → `qa_bill_*` + Vitest 課金境界）。
3. **純粋ロジック変更**（日付・OCR 正規化・課金境界・共有キー・ファイル検証）: `npm run test:unit` を必ず実行。harness の抽出対象関数を改名した場合はテストが即失敗するため、harness 側も同時更新する。
4. **毎セッションの回帰観点**（`docs/development-workflow.md` §6）: 入力→保存→リロード→復元 / 空・最大長・特殊文字 / 多重クリック / モーダル多重 / オフライン往復。
5. **テストの追加基準**: バグ修正には可能な限り再現テストを `tools/` に追加する（既存スイートの命名: `qa_<領域>_test.js`）。
6. 結果は worklog の「テスト結果」に必ず記録し、未実施は「未実施: 理由」を明記する。

---

## 9. リリース判定基準

以下をすべて満たした場合のみリリース可（`docs/RELEASE-CHECKLIST.md` §5 / `docs/development-workflow.md` §7）。

| # | ゲート | 判定方法 |
|---|---|---|
| 1 | 自動テスト全緑 | QA 84/84 ＋ Vitest 23/23 ＋ tools/ 全スイート PASS |
| 2 | S 級バグゼロ | `docs/test-checklist.md` §3 の 7 項目 |
| 3 | 本番 Supabase 適用完了 | `docs/supabase-apply-all.sql` Run ＋ `docs/security-tests.sql` 全 pass ＋ `#qa-debug` セルフテスト合格 |
| 4 | セキュリティチェック | `07-security.md` §10 のリリース前チェックリスト全項目 |
| 5 | iPhone 実機確認完了 | §7.2 / §7.3 の全項目（worklog に記録） |
| 6 | 同期規約遵守 | app-source ⇄ docs 同期・`var V` = `SW_VERSION` 一致（`12-operations-release.md` §3） |
| 7 | ストア提出時の追加ゲート | 解約導線 / プライバシーポリシー / 課金表記（480 円・税込・30 日）/ 年齢区分 / スクショ / Hoku 応答安全性 / オフライン起動 |

---

## 10. 既知の制約

| 制約 | 内容 | 代替手段 |
|---|---|---|
| サンドボックスから本番 Supabase に到達不可 | 開発環境（リモートサンドボックス）では本番認証・Realtime・Edge Function の疎通テストができない | RLS/RPC はローカル PostgreSQL 16 ＋ `docs/security-tests.sql` で検証（2026-06-14 実績あり）。クライアント同期ロジックは `qa_sync_merge_test.js` / `sync_harness_test.js` がモック・実コード抽出で検証。本番疎通はアプリ内 `#qa-debug` 家族共有セルフテストで確認 |
| Playwright は Safari 実体ではない | chromium の iPhone viewport エミュレーションであり、iOS Safari 固有挙動（キーボード・セーフエリア・LocalStorage 上限・Web Push）は再現しない | §7.2 の実機チェックを worklog で引き継ぎ必須 |
| Web Push / 実決済は自動テスト対象外 | VAPID 鍵・Stripe 本番設定・pg_cron はサーバ設定に依存 | `docs/WEB-PUSH-SETUP.md` / `docs/BILLING-SETUP.md` の疎通確認手順（テスト送信 curl・Stripe テストカード）を手動実施 |
| QA 84 件は環境により WARN を含みうる | ネットワーク遮断環境では Supabase CDN ロード失敗系のエラーを除外フィルタで許容 | FAIL 0 が判定基準（WARN は目視レビュー） |
| Playwright のパスがハードコード | `/opt/node22/lib/node_modules/playwright`（リモート環境前提） | ローカル PC で実行する場合は require パスを調整 |

---

## 11. 本書の運用

- テストスイートの追加・削除・件数変更（QA 84 件の増減を含む）は本書 §2〜§4 を必ず更新し、CLAUDE.md §14.5 の件数表記と `docs/RELEASE-CHECKLIST.md` の対応表も同時に更新する。
- 実装と本書が矛盾した場合は実装（テストコード）を正とし、本書を修正する。
- 手動テスト観点の正本は `docs/test-checklist.md` のまま維持し、本書には体系と判定基準のみを置く（重複記述を増やさない・CLAUDE.md §11）。
