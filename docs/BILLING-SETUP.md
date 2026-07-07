# Familink 決済セットアップ手順（Stripe Checkout・本実装）

アプリ側（決済導線・権利判定）は実装済みです。**Stripe とサーバの設定**を行うと、
Web/PWA から実際の月額課金（月額480円）ができ、**権利はサーバ（fl_entitlements）が正本**になります。

> 設計原則（厳守）
> - カード情報はアプリを通りません（Stripe のホスト型 Checkout に遷移）。
> - **秘密鍵（STRIPE_SECRET_KEY / webhook secret / service_role）はアプリ・リポジトリに置かない**（Edge Function のシークレットのみ）。
> - 課金状態は **Webhook が書いた fl_entitlements だけが真**。クライアント改ざんでは付与できません。

---

## 手順

### 1. Stripe 側の準備
1. Stripe アカウントを作成（最初はテストモードで検証）。
2. 商品（Familink プレミアム）と **価格（Price）** を作成：**月額・¥480・JPY・継続（recurring）**。
   → 作成された `price_...` を控える（= `STRIPE_PRICE_ID`）。
3. APIキー：`Secret key`（`sk_...`）を控える（= `STRIPE_SECRET_KEY`）。

### 2. 権利テーブルを作成
Supabase → SQL Editor に `docs/billing-entitlements.sql` を貼って **Run**。
（`fl_entitlements` テーブル＋`fl_my_premium` ビュー＋RLS。アプリの `_syncPremiumFromServer()` がこのビューを読みます）

### 3. Edge Function をデプロイ
`docs/edge-functions/` の3つを配置してデプロイ：
```sh
supabase functions deploy create-checkout
supabase functions deploy billing-portal
supabase functions deploy stripe-webhook --no-verify-jwt
```

### 4. シークレットを設定
```sh
supabase secrets set STRIPE_SECRET_KEY="sk_..."
supabase secrets set STRIPE_PRICE_ID="price_..."
# SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY は既定で注入されます
```

### 5. Stripe Webhook を登録
Stripe ダッシュボード → Developers → Webhooks → エンドポイント追加：
- URL：`https://＜プロジェクトID＞.functions.supabase.co/stripe-webhook`
- 送信イベント：`checkout.session.completed` / `customer.subscription.created` /
  `customer.subscription.updated` / `customer.subscription.deleted`
- 表示される **Signing secret（`whsec_...`）** を控えて設定：
```sh
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 6. アプリ側を有効化
`app-source/familink.html` の
```js
const STRIPE_ENABLED = false;   // ← true にする
```
を `true` にして、§12.3 の手順で `docs/index.html` に同期（`var V` と `docs/sw.js` の `SW_VERSION` も更新）→ `main` に push。
（`false` の間は従来のβ/トライアル表示のまま。`true` にすると「プレミアムに登録（月額480円）」ボタンが実決済に接続されます）

---

## 動作確認（テストモード）
1. アプリにログイン → プレミアム画面 →「プレミアムに登録」→ Stripe の決済ページへ。
2. テストカード `4242 4242 4242 4242`（有効期限は未来・CVC任意）で購入。
3. 成功すると `?checkout=success` でアプリに戻り、数秒で「プレミアム利用中」に切替（Webhook→fl_entitlements→fl_my_premium）。
4. 「お支払い・解約の管理」→ Stripe Billing Portal で解約できることを確認。
5. 問題なければ Stripe を本番モードに切替（本番キー・本番Webhookで再設定）。

---

## しくみ
```
アプリ「登録」→ create-checkout(Edge, JWTでuser特定) → Stripe顧客作成/取得 → Checkoutセッション
  → Stripe決済ページ（カード情報はStripeのみ）→ 成功 → アプリへ戻る(?checkout=success)

Stripe → stripe-webhook(署名検証) → fl_entitlements を upsert（premium/status/期限）＝権利の正本
アプリ → _syncPremiumFromServer() → fl_my_premium ビュー → isPremium() が最優先で参照
「お支払い・解約」→ billing-portal(Edge) → Stripe Billing Portal
```

## セキュリティ要点
- 秘密鍵はすべて Edge Function シークレット。クライアント／リポジトリには置かない（`STRIPE_ENABLED` と price は公開情報だが、secret は不可）。
- `fl_entitlements` は本人が読むだけ・書き込みは service_role（Webhook）のみ（RLS）。
- Webhook は署名検証（`STRIPE_WEBHOOK_SECRET`）で真正性を担保。

## 注意（配布形態）
- **Web / PWA での販売はこの Stripe 構成で問題ありません。**
- ただし **iOS/Android のネイティブアプリ（App Store / Google Play）としてデジタル商品を売る場合は、各ストアの
  アプリ内課金(IAP)が必須**です（Stripe不可）。ネイティブ配布時は別途 StoreKit / Play Billing の実装が必要になります。
  現状の Web/PWA 配布ではこの Stripe 実装で「本実装」として成立します。

## トラブルシュート
- 登録後に反映されない：Webhook が届いているか（Stripeダッシュボードのイベントログ）／`STRIPE_WEBHOOK_SECRET` が一致しているか／`fl_entitlements` に行ができているか。
- `no_customer`（管理ページ）：まだ購入がなく顧客未作成。先に登録を。
- ボタンが「準備中」：`STRIPE_ENABLED` がまだ `false`。
