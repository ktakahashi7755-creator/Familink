# 12. ゼロから再構築する完全手順（Rebuild Guide）

本書だけで Familink を作り直せることを目的に、マイルストーン順に「作る順序・完了条件」を示す。
技術は現行（単一HTML＋Supabase）を推奨するが、要求（§00/§01）を満たせば代替スタックでも可。

## 前提・環境
- Node（Playwright/Vitest用）、`python3`（ローカル配信）、Supabase プロジェクト（無料枠可）。
- リポジトリ構成：`app-source/familink.html`（正本）/ `docs/`（公開: index.html＋sw.js＋SQL/Edge/press）/ `tools/`（テスト）/ `qa_full_test.js` / `CLAUDE.md`。

## マイルストーン M0：土台（半日）
- `app-source/familink.html` を作成：`<!doctype html>`＋`<head>`（fonts/manifest）＋`<style>`（§10トークンを `:root`）＋`<body>`（22 screen の器）＋`<script>`（`S`・`PERSIST`・`saveS/loadS`・`go/switchTab/refresh`・`H()`・`_lockSubmit`）。
- ローカル配信：`python3 -m http.server 9000 --directory app-source`。
- **完了条件**：空の各画面へ遷移でき、`S` が LocalStorage `familink_v3` に保存/復元される。pageerror 0。

## マイルストーン M1：ローカル・コア機能（数日）
- 予定（§FR-CAL）：`m-event`＋`saveEvent`＋`_occursOn`＋`renderCal`（月/週/リスト・メンバー色）。編集時 `updatedAt` 打刻。
- タスク/家計/体調/準備/買い物/ボード/アルバム/メモ の CRUD と描画。空状態・確認導線・上限（`PREMIUM_LIMITS`）。
- ホーム集約（§FR-HOME）とタブ。
- **完了条件**：ゲストで全機能がローカル完結。`qa_full_test.js` の該当項目が緑。

## マイルストーン M2：PWA 配信（半日）
- `docs/index.html`＝先頭にSW登録＋キャッシュバスター（`var V`）＋本体（app-source 4行目以降）。`docs/sw.js`（cache-first＋push/notificationclick）。
- `var V` と `SW_VERSION` を同値に。GitHub Pages（`docs/`）＋ Actions `pages.yml`。
- **完了条件**：オフラインで起動、版更新で自動リロード。

## マイルストーン M3：クラウド認証＋同期（数日）
- Supabase 接続（anon/publishable）。メール＋パスワード認証（§FR-AUTH）。
- `fl_family_data`（key-value JSONB）＋ RLS（§06・allowlist＝`FAMILY_SHARED_KEYS`）。
- 同期：`_pushToSupabase`（デバウンス1.5s・20件バッチ）/ `_fetchFromSupabase`（集約＋マージ）/ マージ関数群 / Realtime（§05）。
- 招待リンク（`?join=`）＋コード参加。
- **完了条件**：2アカウントで招待→参加→双方向反映。`qa_sync_merge_test` 22/22・同期系スイート緑。分離テスト合格。

## マイルストーン M4：Hoku（数日）
- `s-hoku` UI・`sendHokuMsg`・`parseHokuIntent`・`executeHokuAction`・サジェスト・音声・常駐フローティング。
- （任意）Edge Function `hoku` で会話AI・`calendar-scan` で OCR。
- **完了条件**：自然文で予定追加/参照ができ、OCRで予定表を一括登録できる（要 Edge）。

## マイルストーン M5：習慣化・課金・通知（数日）
- ファミコイン/ログインボーナス/着せ替え（`m-shop`）。
- 課金：`isPremium()`/`checkPremiumLimit`/`_syncPremiumFromServer`＋ Stripe（§08・SQL/Edge/フラグ）。
- 通知：アプリ内＋OS通知＋Web Push（§09・SQL/Edge/SW/フラグ）。
- **完了条件**：トライアル/上限/権利同期が動作。サーバ設定後に実決済・Web Push が疎通。

## マイルストーン M6：品質・審査・公開（継続）
- アクセシビリティ・堅牢性・UXコピーの監査。`qa_full_test` 84/84＋tools 全緑。
- App Store メタデータ/審査（ネイティブ配布時は IAP）。プレスキット（`docs/press/`）。
- **完了条件**：§01「受け入れ基準」を全て満たす。

## 再構築時の必須不変条件（チェックリスト）
- [ ] 単一HTML/Vanilla/依存ゼロ（新規CDNは人間確認）。
- [ ] `familink_v3` 主キー維持・`PERSIST` に保存キーを漏れなく追加。
- [ ] `FAMILY_SHARED_KEYS` と RLS allowlist を一致。
- [ ] 家族共有配列は `updatedAt` 打刻＋削除トゥームストーン。
- [ ] innerHTML のユーザー値は `H()`。二重送信は `_lockSubmit`。
- [ ] 秘密鍵はクライアント/リポジトリに置かない（Edge シークレットのみ）。
- [ ] `app-source ⇄ docs` 同期・`var V=SW_VERSION`。
- [ ] コミット前に 84/84＋tools 緑。

## 復元（バックアップからの戻し方）
```sh
# 最新版バックアップ枝から復元（例）
git fetch origin
git checkout -B main origin/backup/2026-06-16-v20260615j-full-suite
# もしくは特定コミットへ
git checkout <commit>
```
- バックアップは `backup/YYYY-MM-DD-v…-…` ブランチとして push 済み。いつでも戻せる。
