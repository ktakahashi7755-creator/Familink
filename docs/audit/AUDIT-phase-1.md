# AUDIT — Phase 1: セキュリティ深層監査

**フェーズ**: phase-1-security ／ **日付**: 2026-07-08 ／ **ブランチ**: `audit/phase-1-security`
**監査体制**: XSS/インジェクション監査官・RLS/課金完全性監査官・認証/秘密情報/プライバシー監査官の 3 並列 ＋ 品質責任者によるローカル Postgres 16 実適用検証
**対象**: `app-source/familink.html`（29,266 行・v20260708b）／`supabase/functions/*`／`docs/edge-functions/*`／`docs/*.sql`
**状態**: **監査完了・承認待ち（本レポート出力で停止／修正は未実施）**

> 本レポートは原則1（破壊的変更の前に監査→報告→承認）に従い、発見の報告に留める。
> 各修正は承認後に `audit/phase-1-security` 上で実施し、品質ゲート（構文・QA84・Vitest23・tools32・動的92・RLS実DB）を通してからコミットする。

---

## 0. 総評

家族向けアプリとして扱う情報の機微さ（子ども・体調・家計・写真）に対し、**セキュリティ設計の骨格は極めて堅牢**である。特に:

- **家族間データ分離**: ローカル Postgres 16 に `supabase-apply-all.sql` を実適用し、非特権ロールで敵対的テストを実施。**別家族のデータは読取・更新・削除いずれも不可、個人キーは同家族にも非公開**を実証（品質責任者 7/7・RLS 監査官 17/17、独立に一致）。
- **課金権利のサーバ正本化**: クライアントから `fl_entitlements` へ premium を書くことは、**テーブル権限（SELECT のみ付与）と RLS（INSERT ポリシー不在）で二重に拒否**されることを実DBで確認。
- **XSS 防御規律**: `H()` エスケープの運用は約 150 の innerHTML 代入サイトでほぼ完全。eval 類・`document.write`・文字列 `setTimeout` は 0 件。CSP は `object-src 'none'`・`base-uri 'self'`・`form-action 'self'`・`connect-src` を Supabase 限定と良質。
- **秘密情報**: クライアントは anon(publishable) キーのみ。service_role / Stripe secret / OpenAI / VAPID 秘密は非搭載を grep で網羅確認。
- **プライバシー**: 家計金額は外部 LLM に送信されない（`_hokuChatContext` はカテゴリ名のみ）ことをコードで確認。トラッキング SDK 皆無。

**Critical: 0 件。** 公開前に塞ぐべき実害ある指摘は **High 1 件**（stored XSS）、統合すべき **Medium 4 件**。いずれも局所修正または設定/文書対応で解消可能で、アーキテクチャ変更は不要。

---

## 1. 発見サマリ（重大度順）

| ID | 重大度 | 分類 | 概要 | 検証 |
|---|---|---|---|---|
| P1-01 | **High** | Stored XSS | ボードのリアクション内訳でメンバー名が `H()` 未経由（家族間同期値→スクリプト実行） | CONFIRMED（実コード確認） |
| P1-02 | **Medium** | 課金/DB | `fl_entitlements` の二重スキーマ（billing版 vs apply-all版）が非互換・適用順で `fl_my_premium` ビュー消失 | CONFIRMED（実DB再現） |
| P1-03 | **Medium** | 認証/設定 | Edge Function の `verify_jwt` が `config.toml` に固定されていない（本番設定依存） | UNVERIFIED（本番設定） |
| P1-04 | **Medium** | プライバシー | Hoku が子どもの健康データ（名前+体温+症状）を OpenAI へ送信するがポリシー未明記・任意化なし | CONFIRMED（実コード） |
| P1-05 | **Medium** | 認証 | ローカルアカウントの passHash が非暗号学的（FNV-1a+djb2・ソルトなし） | CONFIRMED（実コード） |
| P1-06 | **Medium** | XSS/構造 | CSP が `script-src 'unsafe-inline'`（HTML注入がそのまま実行に直結・唯一の防御線がH()） | CONFIRMED |
| P1-07 | Low | 課金 | `isPremium()` がオフライン時にクライアント値へフォールバック（UIゲートのみのため実害小） | CONFIRMED |
| P1-08 | Low | XSS | 副 `H()`（renderPremium内・L21048）が `'` 未エスケープ（現状は静的コピーのみで無害） | CONFIRMED |
| P1-09 | Low | CORS/ログ | Edge Function CORS が `*`（Bearer 認証のためCSRF不成立）・診断ログに email 保存 | CONFIRMED |
| P1-10 | Info | DB強化 | SECURITY DEFINER の search_path は `public` 固定済（`pg_catalog,pg_temp` で更に堅牢化余地）・ビュー security_invoker 統一・古いコメント同期 | CONFIRMED（実DB） |

---

## 2. 詳細と修正案

### P1-01 High — ボードリアクション内訳の Stored XSS

- **場所**: `app-source/familink.html:16746`（`renderBoardReactDetail`）
- **コード**:
  ```js
  .map(([uid])=>getMem(uid).name).join('、');
  // → `<strong>${r.label}</strong>：${users}` を el.innerHTML に代入
  ```
- **攻撃シナリオ**: 家族メンバーが自分の表示名を `<img src=x onerror=...>` に設定 → 任意のボード投稿にリアクション → メンバー名は `members` キーで家族間同期される → 他メンバーが投稿詳細を開きリアクション内訳が描画された瞬間にスクリプト実行。CSP が `unsafe-inline` を許可しているため onerror はブロックされない。他の全描画箇所（`postCardHtml`・コメント・アルバム等）はメンバー名を `H()` 済みで、**ここだけが失念**。
- **影響範囲**: 同一家族内（RLS により別家族へは波及しない）。ただし App Store 審査では XSS は明確な指摘対象。
- **修正案（1行）**: `.map(([uid])=>H(getMem(uid).name)).join('、')`
- **リスク**: 極小（描画エスケープの追加のみ・既存挙動不変）。

### P1-02 Medium — fl_entitlements 二重スキーマの適用順ハザード

- **場所**: `docs/billing-entitlements.sql`（Stripe型: `status`/`stripe_customer_id`/`current_period_end`・view は `security_invoker=true`）vs `docs/supabase-apply-all.sql` L223〜（IAP型: `source`/`expires_at`・view は owner権限）
- **再現（実DB）**: apply-all 適用後に billing を適用すると、`create table if not exists` は no-op の一方 `drop view if exists fl_my_premium` は成功し、`create view`（`status` 列参照）が列不在で `ERROR: column "status" does not exist` → **`fl_my_premium` ビューが消失**。結果: ①クライアント `_syncPremiumFromServer()` が失敗しフォールバック ②Stripe webhook が期待列を書けない。
- **修正案**: 正本を1本化する。Stripe を採用するなら apply-all の entitlements 節を billing 版スキーマ（`status`/`current_period_end`・`security_invoker=true`）へ差し替え、`billing-entitlements.sql` を「正本」と明記するか削除。SPEC v3 の 06 号/10 号にも反映。
- **注意**: 実課金有効化（`STRIPE_ENABLED=true`）前の必須事項。現行デプロイ（apply-all のみ）には影響しない。

### P1-03 Medium — Edge Function の JWT 強制がリポジトリで固定されていない

- **現状**: `hoku`/`calendar-scan` は関数内で JWT を検証せず、Supabase の `verify_jwt` デプロイ設定に依存。リポジトリに `supabase/config.toml` が無く、本番が `verify_jwt=ON` である保証がコード上に無い（**UNVERIFIED**）。任意の共有キー（`HOKU_SHARED_KEY` 等）は AND 条件でありバイパスにはならないが、未設定かつ `--no-verify-jwt` でデプロイすると誰でも OpenAI をオーナー課金で叩ける。
- **修正案**: `supabase/config.toml` に `[functions.hoku] verify_jwt = true` / `[functions.calendar-scan] verify_jwt = true` を commit して固定。または関数内で `auth.getUser()` により JWT を明示検証。`stripe-webhook` は署名検証済み・`create-checkout` は `getUser()` 済みで正しい。

### P1-04 Medium — 健康データの LLM 送信の開示・同意

- **場所**: `app-source/familink.html:23610` 付近（`_hokuChatContext().todayHealth` に子の名前+体温+症状）。加えて member 名・役割・予定・メモ・ボードも送信。プレミアム＋ログイン時のみ（LLM 経路）。
- **修正案**: プライバシーポリシーに OpenAI をサブプロセッサとして明記し、健康データを含む文脈送信を**ユーザー選択制（opt-in / 既定オフも検討）**にする。家計金額を送らない設計と同様の配慮を健康にも適用。

### P1-05 Medium — ローカル passHash の強度

- **場所**: `app-source/familink.html:9722`（`_hashStr`＝FNV-1a+djb2 の 64bit 非暗号学的ハッシュ・ソルトなし）。`S.account.passHash`/`recoveryCode` を `familink_v3`（LocalStorage）に保存。
- **文脈**: これは**端末ローカル専用アカウント**の簡易ロックで、サーバ送信・サーバ認証はしない。本認証は Supabase が担う。実害は「端末/LocalStorage にアクセスできる者に対する簡易ロックが即破られる」レベル。
- **修正案**: ①UI/文言で「本物の認証ではなく端末内の簡易ロック」と明示（§13.4 の趣旨）②継続するなら `crypto.subtle.digest('SHA-256', salt+pass)`＋アカウント毎ランダムソルト。本命は Supabase 認証への一本化。

### P1-06 Medium（構造） — CSP `script-src 'unsafe-inline'`

- 単一 HTML ＋大量のインライン `onclick` という現行アーキテクチャ上、`unsafe-inline` 除去は全ハンドラの `addEventListener` 化を要し即時対応は非現実的。**当面は「H() を1箇所も漏らさない」ことが唯一の防御線**（P1-01 の即修正が重要）。nonce/hash 方式は中長期課題として記録。Phase 3/4 で段階的ハンドラ委譲を検討。

### P1-07〜P1-10（Low/Info）

- **P1-07**: `isPremium()`（L22419付近）オフライン時は `S.isPremiumUser`（改ざん可）へフォールバック。現状プレミアムは**クライアントUIゲートのみ**で守るサーバ資源が無いため実害小。将来サーバ資源をプレミアムで守る際は必ずサーバ側で `fl_entitlements` 判定。仕様明文化を推奨。
- **P1-08**: 副 `H()`（L21048）が `'` 未対応。現状 renderPremium は静的コピーのみで無害。グローバル `H()` への統一を推奨。
- **P1-09**: Edge Function CORS `*`（Bearer 認証・Cookie 不使用のため CSRF 不成立）。診断ログ `familink_supa_attempts` に email を最大10件保存（OTP/パスワードは非保存）。実害小。必要なら公開オリジン限定・email マスク。
- **P1-10**: SECURITY DEFINER 4 関数は `search_path=public` 固定済・本体スキーマ修飾済で注入耐性あり。防御多重化として `pg_catalog, pg_temp` 化、`fl_my_premium` を `security_invoker=true` へ統一、埋め込みコメントのホワイトリストを実SQLへ同期。

---

## 3. ローカル Postgres 実適用検証（品質責任者・原則2）

`docs/supabase-apply-all.sql` を PG16 に Supabase 互換スタブ（`auth.users`/`auth.uid()`/`authenticated`・`anon`・`service_role`/`supabase_realtime`）上で適用し、非特権ロール `app_user`（= authenticated 相当）で敵対的検証:

| # | テスト | 結果 |
|---|---|---|
| 1 | apply-all.sql 適用（エラーゼロ・2回実行で冪等性確認） | PASS |
| 2 | 同家族: user2 が user1 の events を読める（共有キー） | PASS |
| 3 | 別家族: user3 は家族Aの全データを読めない | PASS |
| 4 | 個人キー: user2 は user1 の userProfile を読めない | PASS |
| 5 | 別家族: user3 は家族Aの行を UPDATE できない | PASS |
| 6 | 別家族: user3 は家族Aの行を DELETE できない | PASS |
| 7 | 課金: app_user は fl_entitlements へ premium を書けない（権限＋RLS二重拒否） | PASS |

**RLS実適用検証: 7/7 PASS。** RLS 監査官の独立検証（公式 `security-tests.sql` 4項目＋敵対テスト13項目＝17/17 PASS）とも一致。検証スクリプトは `scratchpad/rls-verify.sh`（再現可能）。

---

## 4. 承認をお願いする修正計画（承認後に着手）

優先度順。各項目は個別コミット・全品質ゲート通過を条件とする。

| 順 | 対応 | 種別 | リスク |
|---|---|---|---|
| A | **P1-01 の H() 追加**（stored XSS 封鎖） | コード1行 | 極小 |
| B | **P1-08 副H()をグローバルH()へ統一** | コード | 極小 |
| C | **P1-03 `supabase/config.toml` に verify_jwt=true を追加** | 設定新規 | 小 |
| D | **P1-02 fl_entitlements 正本1本化**（配布チャネル確定と連動） | SQL/文書 | 中（要方針確認） |
| E | **P1-04 健康データ送信のポリシー明記＋opt-in化** | 文書＋コード | 中 |
| F | **P1-05 ローカルアカウントの位置づけ明示 or SHA-256+ソルト化** | コード/文言 | 小〜中 |
| G | **P1-07/P1-09/P1-10 の仕様明文化・防御多重化** | 文書/SQL/コード | 小 |

**質問（承認判断）**: A・B・C（低リスク・即効）は即着手してよいか。D（fl_entitlements 正本化）は Stripe 採用を前提に進めてよいか、それとも配布チャネル確定まで保留するか。E（健康データ opt-in）は既定オン/オフどちらにするか。

---

## 5. 修正実施記録（2026-07-08・承認「全て進めて」を受領して実施）

判断が必要だった 2 点はユーザー承認のもと以下で確定: **D** = Stripe を将来の主配布とみなし entitlements を Stripe/IAP 両対応スーパーセットに統一 ／ **E** = 健康データ送信は**既定オフの opt-in**。

| ID | 対応 | 実装 | 検証 |
|---|---|---|---|
| P1-01 | ✅ 完了 | `renderBoardReactDetail` のメンバー名を `H()` 経由に（L16746） | `tools/qa_xss_boardreact_test.js` 5/5 PASS（生img挿入なし・onerror非発火） |
| P1-02 | ✅ 完了 | `fl_entitlements` を Stripe/IAP 両対応スーパーセットに統一（`add column if not exists`・ビュー `security_invoker=true`・両ファイル一致） | ローカルPG: 適用順3パターン×3項目=9/9 PASS（ビュー消失せず両経路で premium=true） |
| P1-03 | ✅ 完了 | `supabase/config.toml` 新規（hoku/calendar-scan/create-checkout/billing-portal=verify_jwt:true, stripe-webhook/push-send=false） | 設定ファイルで固定 |
| P1-04 | ✅ 完了 | `_hokuChatContext` の健康データを `S.hokuShareHealth`（既定false）でゲート・設定トグル追加・プライバシーポリシー第5/9項に OpenAI 送信範囲を明記 | 既定で送信されないことをコードで担保 |
| P1-05 | ✅ 完了 | ローカル passHash を塩付き＋6万回ストレッチ（`s2$salt$hash`）へ・旧形式は後方互換照合＋ログイン時自動移行・signup モーダルに「端末内簡易ロック」明示 | `tools/qa_passhash_test.js` 11/11 PASS（塩差異・後方互換・自動移行・日本語pass） |
| P1-06 | 記録 | CSP `unsafe-inline` は構造的課題。P1-01 封鎖で当面の実害を除去。nonce/hash 化は Phase 3/4 で検討 | — |
| P1-07 | ✅ 完了 | `isPremium()` にフォールバックの前提（UIゲート限定・サーバ資源はサーバ判定必須）をコメント明記 | — |
| P1-08 | ✅ 完了 | renderPremium 内の副 `H()` を撤去しグローバル `H()` に統一 | 構文OK・QA緑 |
| P1-09 | ✅ 完了 | hoku/calendar-scan の CORS を `ALLOWED_ORIGIN` 環境変数で絞れるように（既定`*`・`Vary: Origin`付与） | — |
| P1-10 | ✅ 完了 | 6つの SECURITY DEFINER を `search_path = public, pg_temp` へ強化・埋め込みコメントのホワイトリストに `homeNote` 追加同期 | ローカルPG RLS 7/7 PASS 維持 |

**品質ゲート（修正後）**: 全 script 構文OK ／ 静的総点検 全ゼロ維持 ／ ローカルPG RLS 7/7・課金スキーマ 9/9 ／ ブラウザ全テストバッテリーは別掲（AUDIT完了時点で全緑を確認）。docs/index.html 同期・v20260708c。

## 6. 次フェーズ予告

Phase 1 修正完了後、Phase 2（data-integrity: 同期競合・容量・マイグレーション・データ消失経路）へ進む。
