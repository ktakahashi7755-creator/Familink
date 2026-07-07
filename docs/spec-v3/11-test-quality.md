# 11. テスト戦略・品質保証

## 11.1 方針
- **回帰の自動化を最優先**。単一HTMLでも、Playwright で実挙動を、Vitest で純関数を検証する。
- コミット前に `node qa_full_test.js`（84件）を必ず緑にする。リリース前は tools 全スイート＋監査。

## 11.2 テスト層
| 層 | 手段 | 対象 |
|---|---|---|
| ユニット（純関数） | Vitest（`npm run test:unit`・実コード抽出） | `_occursOn` / マージ / OCR判定 等 |
| 統合/UI | Playwright（`qa_full_test.js` 84件） | 起動・主要画面・保存・バリデーション・レイアウト・コンソールエラー0 |
| 機能別スイート | `tools/qa_*_test.js`（31＋） | カレンダー/家計/招待/同期/OCR/通知/課金/ツアー/エラー境界 等 |
| セキュリティ | `docs/security-tests.sql`（ローカルPostgres） | 家族分離RLSの実証 |
| 手動/実機 | iPhone 実機・#qa-debug パネル | 実配信・2端末同期・通知・決済 |

## 11.3 主要スイート（tools/・抜粋）
- 同期中核：`qa_sync_merge_test`（22件・LWW/トゥームストーン/union/GC/重複排除/繰り返し/2端末）
- 自動同期/クラウド：`qa_autosync` `qa_cloudfirst_login` `qa_cloudbanner` `qa_netbanner`
- 招待/家族：`qa_invite_link` `qa_invite_token`
- カレンダー：`qa_cal_integrity` `qa_cal_allday` `qa_cal_memberfilter` `qa_cal_taptarget` `qa_event_remind`
- 家計：`qa_bill_centralized` `qa_bill_copy_server`
- OCR：`qa_fam_ocr` `qa_ocr_unit`
- ログイン/オンボード：`qa_authguard` `qa_otp_onboard`（=パスワードログイン導線検証）
- 品質：`qa_content` `qa_ext` `qa_boundary` `qa_doublesubmit` `qa_errbound` `qa_fileval` `qa_3states`
  `qa_final_smoke` `qa_release` `qa_perf_lazy` `qa_tour` `qa_tour_firstrun` `qa_supaerr`

## 11.4 実行方法
```sh
# プレビューサーバ
python3 -m http.server 9000 --bind 127.0.0.1 --directory app-source

# フルQA（Playwright・84件）
node qa_full_test.js 2>&1 | tail -15

# 機能別
node tools/qa_<name>_test.js

# ユニット（Vitest）
npm run test:unit
```

## 11.5 受け入れ基準（リリースゲート）
1. `qa_full_test.js` 84/84 PASS（コンソールエラー0）。
2. tools 全スイート緑。
3. 全画面 pageerror 0・壊れ画像0・alt露出0・横スクロール0（iPhone SE幅）。
4. XSSエスケープ確認・秘密情報の混入0・家族分離テスト合格。
5. app-source⇄docs 本体一致・`var V`＝`SW_VERSION` 一致。

## 11.6 品質監査（定期）
- 3観点（アクセシビリティ / UXコピー / 堅牢性）の横断監査を定期実施し、高価値・低リスクを実装。
- 実害（XSS/データ欠損/クラッシュ）は最優先。詳細は `docs/AUDIT.md`。

## 11.7 新機能追加時の必須チェック
- 保存キー追加 → `PERSIST`（＋必要なら `SYNC_KEYS`/`FAMILY_SHARED_KEYS`/RLS allowlist）を更新。
- 家族共有する配列 → 編集時 `updatedAt` 打刻・削除時 `_recordDeletion`・重複シグネチャ定義。
- innerHTML にユーザー値 → `H()`。二重送信 → `_lockSubmit`。
- 対応スイートを追加/更新し、84/84＋tools 緑を確認。
