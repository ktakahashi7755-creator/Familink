# 08. 課金設計（Stripe Checkout・サーバ権利正本）

## 8.1 価格・プラン
- **無料**：習慣化に必要な最低限を必ず残す（下記の上限内）。
- **プレミアム**：**月額480円**。将来 680/780/980円の上位プランへ拡張余地。
- **30日無料トライアル**（`trialStartedAt`＋30日）。

### 8.1.1 無料上限（`PREMIUM_LIMITS`）
| キー | 無料上限 | 表示名 |
|---|---|---|
| events | 500 | イベント |
| tasks | 30 | タスク |
| txs | 100 | 家計入力 |
| health | 50 | 体調記録 |
| albumPhotos | 20 | アルバム写真 |
| customBoards | 3 | カスタムボード |
| members | 4 | メンバー |
| memos | 20 | メモ |
| docs | 15 | 書類 |
- 80%接近で1回だけ近接警告。上限到達で `showUpgradeModal()`。

### 8.1.2 プレミアム機能（`PREMIUM_FEATURES`）
| 機能 | 無料 | プレミアム |
|---|---|---|
| 予定表OCR（月） | 1回 | 30回 |
| Hoku相談（1日） | 5回 | 無制限 |
| 広告なし | — | ○ |
| テーマ着せ替え | — | ○ |

## 8.2 判定の正本（改ざん不可）
- `isPremium()`：`S._serverEntitlement.premium`（サーバ権利）を最優先 → 無ければローカル `S.isPremiumUser`（トライアル/旧）にフォールバック。
- `_syncPremiumFromServer()`：`fl_my_premium` ビュー（本人の有効権利のみ）を読み `S._serverEntitlement` に反映。fetch 成功時に毎回実行。
- 権利を書けるのは **Stripe Webhook（service_role）だけ**。クライアントからは書けない（RLS）。

## 8.3 決済フロー（Stripe Checkout / Web）
```
アプリ「プレミアムに登録」(startCheckout)
  → Edge:create-checkout（JWTでuser特定・Stripe顧客作成/取得）→ Checkoutセッション作成
  → Stripe ホスト型決済ページへ遷移（カード情報はStripeのみ・PCIはStripe側）
  → 成功: returnUrl?checkout=success に戻る → _handleCheckoutReturn() が数回リトライで権利再同期
Stripe → Edge:stripe-webhook（署名検証）→ fl_entitlements を upsert（premium/status/期限）＝権利の正本
「お支払い・解約の管理」(openBillingPortal) → Edge:billing-portal → Stripe Billing Portal
```
- クライアントは `STRIPE_ENABLED` フラグでガード。**false（既定）の間は従来のβ/トライアル表示のまま**（既存挙動不変）。
- 実決済の未実装状態（β）では決済モーダルに β 明示・`autocomplete=off`（§13.5 の名残・Stripe移行で解消）。

## 8.4 サーバ成果物（要デプロイ・リポジトリ同梱）
- SQL：`docs/billing-entitlements.sql`（`fl_entitlements` ＋ `fl_my_premium` ビュー ＋ RLS）。
- Edge Functions（Deno/`npm:stripe`）：
  - `docs/edge-functions/create-checkout`：Checkout セッション作成（顧客管理）。
  - `docs/edge-functions/stripe-webhook`：署名検証→権利付与（`checkout.session.completed` / `customer.subscription.*`）。
  - `docs/edge-functions/billing-portal`：解約・お支払い管理。
- 手順書：`docs/BILLING-SETUP.md`。

## 8.5 環境変数（Edge Functionシークレット・クライアントに置かない）
`STRIPE_SECRET_KEY, STRIPE_PRICE_ID(月額480円), STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY`。
クライアント側で公開してよいのは `STRIPE_ENABLED`（bool）と価格表示のみ。

## 8.6 有効化手順（要約）
1. Stripe で月額480円 Price を作成。2. `billing-entitlements.sql` を適用。3. Edge Functions を3本デプロイ。
4. Webhook を登録し `STRIPE_WEBHOOK_SECRET` を設定。5. アプリの `STRIPE_ENABLED=true` にして再同期・push。6. テストカードで疎通→本番モード。

## 8.7 配布形態の注意（重要）
- **Web/PWA 販売はこの Stripe 構成で本実装として成立**する。
- **iOS/Android ネイティブアプリ**としてデジタル商品を売る場合は各ストアの**アプリ内課金(IAP)が必須**（Stripe不可）。
  ネイティブ配布時は StoreKit / Play Billing の実装＋権利同期の別実装が必要。

## 8.8 解約・返金・トライアル満了
- 解約：Billing Portal（Stripe有効時）／ローカルの `cancelPremium`（フラグoff時）。
- トライアル満了：`_refreshTrialStatus()` が満了を検出し無料へ確実に戻す（旧不具合の再発防止）。
- 返金/請求問い合わせは Stripe と会社問い合わせ窓口で対応（利用規約・特商法表記を整備）。
