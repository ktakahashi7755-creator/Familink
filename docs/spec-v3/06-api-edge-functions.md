# Familink サーバ処理（Edge Functions）設計書

**文書番号**: SPEC-v3-06 ／ **版**: 1.0 ／ **作成日**: 2026-07-07 ／ **正本**
**対象読者**: エンジニア・インフラ/運用担当・技術デューデリジェンス担当

> 本書は Familink のサーバサイド処理（Supabase Edge Functions 6 本＋pg_cron）の正本である。
> システム全体像は `03-architecture.md` §5、データ・RLS は `05-data-design.md`、要件は `02-requirements.md` を参照。
> セットアップの実務手順は `docs/BILLING-SETUP.md`（Stripe）・`docs/WEB-PUSH-SETUP.md`（Web Push）が正本であり、
> 本書は仕様（入出力・認証・エラー・シークレット）を定義する。実コード（TypeScript / Deno）に基づき記述する。

---

## 1. 全体像

### 1.1 関数一覧（6 本）

| 関数 | 役割 | 認証 | 外部 API | デプロイ元パス | 状態 |
|---|---|---|---|---|---|
| `hoku` | Hoku の LLM 応答（会話 + intent 抽出） | Supabase JWT（verify_jwt ON）＋任意 `x-hoku-key` | OpenAI Chat Completions | `supabase/functions/hoku/index.ts` | ✅ 稼働中 |
| `calendar-scan` | 予定表写真の OCR（予定候補抽出） | Supabase JWT（verify_jwt ON）＋任意 `x-cal-key` | OpenAI Chat Completions（Vision） | `supabase/functions/calendar-scan/index.ts` | ✅ 稼働中 |
| `create-checkout` | Stripe Checkout セッション作成 | Supabase JWT | Stripe API | `docs/edge-functions/create-checkout/index.ts` | 🔶 未有効（`STRIPE_ENABLED=false`） |
| `billing-portal` | Stripe Billing Portal（支払管理・解約） | Supabase JWT | Stripe API | `docs/edge-functions/billing-portal/index.ts` | 🔶 未有効 |
| `stripe-webhook` | Stripe イベント受信 → 権利の正本を書込 | **Stripe 署名検証**（`--no-verify-jwt`） | Stripe API | `docs/edge-functions/stripe-webhook/index.ts` | 🔶 未有効 |
| `push-send` | Web Push 送信（テスト / 予定リマインド定期スキャン） | service_role Bearer（`--no-verify-jwt`・pg_cron から呼出） | Web Push（VAPID） | `docs/edge-functions/push-send/index.ts` | 🔶 未有効（`VAPID_PUBLIC_KEY` 空） |

### 1.2 共通設計原則

- **秘密鍵はサーバのみ**: OpenAI / Stripe / VAPID 秘密鍵 / service_role はすべて Edge Function シークレット。
  クライアント・リポジトリには一切置かない（§3）
- **既定は JWT 検証 ON**: `hoku` / `calendar-scan` / `create-checkout` / `billing-portal` は
  「ログイン中の Familink ユーザー」だけが到達可能。クライアントは `sb.functions.invoke('関数名', {body})` で呼び、
  supabase-js がユーザー JWT と anon キーを自動付与する（アプリ側の URL・鍵設定は不要 = ゼロ設定方針）
- **`--no-verify-jwt` は 2 本のみ**: `stripe-webhook`（Stripe は JWT を持たない → 署名検証で真正性担保）と
  `push-send`（pg_cron からの内部呼び出し → service_role Bearer）
- **クライアントを止めない**: サーバ側の失敗はすべて分類済み `reason` 付きで返し、クライアントはローカル動作へ
  フォールバックする（§6）。エラー本文に API キー等の秘密は絶対に含めない
- CORS: `hoku` / `calendar-scan` は `Access-Control-Allow-Origin: *`・`POST, OPTIONS` のみ許可。
  supabase-js が送る `x-client-info` / `x-supabase-api-version` 等をヘッダ許可リストに含める（欠けると preflight で失敗）

---

## 2. 各関数の詳細仕様

### 2.1 hoku — Hoku LLM 応答

| 項目 | 内容 |
|---|---|
| エンドポイント | `POST /functions/v1/hoku`（関数名 invoke）。独自 URL 直叩き時はパス `/api/hoku/chat`・`/api/hoku/intent` で判定 |
| 認証 | Supabase JWT 検証 ON（デプロイ時 `--no-verify-jwt` を付けない）。任意で `HOKU_SHARED_KEY` 設定時は `x-hoku-key` ヘッダ一致も要求 |
| 使用モデル | `HOKU_MODEL` シークレットで上書き可・既定 **gpt-4o-mini** |
| 生成パラメータ | `temperature: 0.4` / `max_tokens: 500` / `response_format: {type:'json_object'}` |
| サーバ側タイムアウト | 20,000ms（AbortController。OpenAI 無応答時のハング・課金時間を防止） |

リクエスト（JSON）:

```json
{
  "mode": "chat" | "intent",       // 省略時はパスで判定
  "text": "ユーザー発話（必須・空なら 400）",
  "context": { ... },              // 家族の文脈。サーバ側で 3000 文字に切詰め
  "history": [ {"role":"user"|"assistant", "content":"..."} ]  // 直近 12 ターン・各 800 文字まで採用
}
```

レスポンス:

| mode | 形式 |
|---|---|
| chat | `{ reply: string, intent: string, confidence: number(0-1), entities: object }` |
| intent | `{ intent: string, confidence: number }` |

- `intent` 候補（システムプロンプト定義）: `calendar_add / task_add / budget_add / recurring_budget_add / prep_add /
  prep_routine_add / health_add / board_post_add / notification_add / shopping_add / shopping_frequent_add /
  shopping_purchased / calendar_view / task_view / budget_view / health_view / prep_view / shopping_view / unknown`
- `entities`: `{title, date(YYYY-MM-DD), time(HH:MM), member, amount, txType, category, temperature, subject,
  medicine, symptoms[], weekday(0-6・繰り返し系のみ)}` の部分集合
- **実行はサーバでは行わない**。intent/entities を返すのみで、追加・登録の実行は確認 UI を経てクライアントが行う
- AI 出力が JSON でない場合は素のテキストを `reply`（600 文字まで）として救済、`intent:'unknown'` を返す

エラー処理:

| ステータス | body | 意味 |
|---|---|---|
| 400 | `{error:'bad_json'}` / `{error:'empty_text'}` | リクエスト不正 |
| 401 | `{error:'unauthorized'}` | `x-hoku-key` 不一致（SHARED_KEY 設定時のみ） |
| 405 | `{error:'method_not_allowed'}` | POST / OPTIONS 以外 |
| 500 | `{error:'server_misconfigured: OPENAI_API_KEY 未設定'}` | シークレット未設定 |
| 502 | `{error:'ai_failed', reason}` | OpenAI 失敗。`reason` ∈ `invalid_api_key / insufficient_quota / rate_limited / openai_unavailable / openai_timeout / network_error / empty_response / ai_error` |

`reason` はアプリの `#qa-debug` 診断（L27837 付近）が「残高不足／鍵不正／タイムアウト」を特定するために使う。
**API キーそのものは reason に含めない**。リトライはサーバ側では行わない（クライアントがフォールバック）。

| シークレット | 必須 | 用途 |
|---|---|---|
| `OPENAI_API_KEY` | ○ | OpenAI 認証（calendar-scan と共通） |
| `HOKU_MODEL` | — | モデル上書き（既定 gpt-4o-mini） |
| `HOKU_SHARED_KEY` | — | 独自 URL 直叩き用の追加合言葉 |

クライアント側呼び出し: `_hokuCallBackend(mode, payload, ms)`（L23603 付近）を経由し、
`callHokuApi(text)`（intent・タイムアウト 3,000ms）／`callHokuChat(text)`（chat・タイムアウト 12,000ms）。
`S.hokuApiUrl` 設定時のみ独自 URL を直接 fetch（`x-hoku-key` は `S.hokuApiKey`）。
文脈は `_hokuChatContext()` が生成（**家計の金額は含めない**プライバシー設計）。
フェアユース: AI 呼び出しは 1 日 `HOKU_AI_DAILY_CAP = 40` 回（L23757）、無料プランの Hoku 利用枠は
`_hokuDailyLimit()`（L21681・基本 5 回＋当日ボーナス）でクライアント側制御。

### 2.2 calendar-scan — 予定表 OCR

| 項目 | 内容 |
|---|---|
| エンドポイント | `POST /functions/v1/calendar-scan`（Hoku とは完全に別関数） |
| 認証 | Supabase JWT 検証 ON。任意で `CALENDAR_SCAN_SHARED_KEY` 設定時は `x-cal-key` 一致も要求 |
| 使用モデル | 一次: `CALENDAR_SCAN_MODEL` 上書き可・既定 **gpt-4o**（detail:'high'）。`model_unavailable` 時のみ **gpt-4o-mini** へ自動フォールバック |
| 生成パラメータ | `temperature: 0` / `max_tokens: 4096` / `response_format: {type:'json_object'}` |
| サーバ側タイムアウト | 55,000ms |

リクエスト（JSON）:

| フィールド | 型 | 説明 |
|---|---|---|
| `image` | string | dataURL または素の base64（自動で `data:image/jpeg;base64,` 付与）。**10,000,000 文字超（約 7.5MB）は 413** |
| `year` / `month` | number | 相対日付解決の基準（省略時は現在日時） |
| `existing` | 配列 | 既存予定 `{date,title}`（重複参考・最大 50 件・1000 文字に切詰め） |
| `part` | string | `'top'\|'bottom'\|'partial'\|''` — 分割クロップ位置のヒント |
| `annual` | bool | 年間予定表（学校年度 4 月〜翌 3 月。1〜3 月は year+1 で解決） |
| `mode` | string | `'monthly'（既定）\|'weekly'\|'annual'` — プロンプトを切替 |

レスポンス（アプリの `normalizeOcrEvents` が最終正規化）:

```json
{
  "events": [ { "title":"", "date":"YYYY-MM-DD", "allDay":true, "startTime":"", "endTime":"",
                "location":"", "notes":"", "confidence":0.0, "warnings":[], "originalText":"" } ],
  "warnings": [], "rawText": "", "confidence": 0.0, "model": "gpt-4o"
}
```

サーバ側サニタイズ（`sanitizeEvents`）: events 最大 80 件・title 120 / notes 500 / originalText 300 文字等に切詰め、
`confidence` を 0〜1 にクランプ。抽出方針は「誤検出ゼロ最優先」（読めない予定は出力しない・曜日自己補正・
日付を 1 日もずらさない）をシステムプロンプトで強制。

エラー: hoku と同分類に加えて `no_image`（400）/ `image_too_large`（413）/ `model_unavailable` / `bad_ai_json`（502 `ai_failed`）。

| シークレット | 必須 | 用途 |
|---|---|---|
| `OPENAI_API_KEY` | ○ | **hoku と共通の Secret を流用** |
| `CALENDAR_SCAN_MODEL` | — | 一次モデル上書き |
| `CALENDAR_SCAN_SHARED_KEY` | — | 独自直叩き用の追加合言葉 |

クライアント側呼び出し: `analyzeCalendarImageWithAI()`（L13547）。
全体＋分割クロップ（`_ocrMakeCrops`）を **同時実行 3 に制限した並列プール**（`_ocrRunPool`）で解析し、
`_ocrCallScan()`（L13565・1 画像あたりタイムアウト 60,000ms・失敗時 1 回だけ 1 秒後リトライ）→
`_ocrMergeResults()` が `date|正規化タイトル|開始時刻` キーで重複除去（信頼度の高い方を採用）。
全パス失敗時は `calendar-scan_all_failed` を throw し失敗 UX（オンライン/オフラインで文言を出し分け）。
月間スキャン回数は `S.ocrScanUsage`（`{ym, count}`）でクライアント側制御。

### 2.3 create-checkout — Stripe Checkout セッション作成

| 項目 | 内容 |
|---|---|
| エンドポイント | `POST /functions/v1/create-checkout` |
| 認証 | `Authorization` ヘッダの JWT を anon クライアント `auth.getUser()` で検証しユーザー特定（失敗は 401） |
| 依存 | `npm:stripe@14`（apiVersion `2024-06-20`）／`npm:@supabase/supabase-js@2` |

処理フロー（実コード準拠）:

1. JWT からユーザー特定（`unauthorized` 401）
2. service_role クライアントで `fl_entitlements.stripe_customer_id` を取得。無ければ
   `stripe.customers.create({email, metadata:{user_id}})` で作成し upsert 保存
3. `stripe.checkout.sessions.create` — `mode:'subscription'`・`line_items:[{price: STRIPE_PRICE_ID, quantity:1}]`
   （月額 480 円の Price）・`client_reference_id: user.id`・`subscription_data.metadata.user_id`・
   `allow_promotion_codes: true`・成功/キャンセル URL は `returnUrl` に `?checkout=success|cancel` を付与
4. `{ url }` を返す（カード情報はアプリを一切通らない = Stripe ホスト型ページへ遷移）

リクエスト: `{ returnUrl: string }`（省略時 `SUPABASE_URL + '/'`）／レスポンス: `{ url: string }`。
エラー: 401 `{error:'unauthorized'}`／500 `{error: <message>}`。リトライなし（ユーザー再操作）。

| シークレット | 用途 |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe API 認証（`sk_...`） |
| `STRIPE_PRICE_ID` | 月額 480 円・JPY・recurring の Price |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | 既定で自動注入 |

クライアント側呼び出し: `startCheckout()`（L22470）。`STRIPE_ENABLED = false`（L22468）の間はトースト
「決済は準備中です」を出して invoke しない。未ログイン時はログインモーダルへ誘導。

### 2.4 billing-portal — 支払管理・解約

| 項目 | 内容 |
|---|---|
| エンドポイント | `POST /functions/v1/billing-portal` |
| 認証 | create-checkout と同一（JWT → `auth.getUser()`） |

処理: `fl_entitlements.stripe_customer_id` を引き、`stripe.billingPortal.sessions.create({customer, return_url})` の
`{ url }` を返す。顧客未作成（未購入）は 400 `{error:'no_customer'}`。
リクエスト/レスポンス・シークレットは create-checkout と同じ（`STRIPE_PRICE_ID` は不要）。
クライアント側呼び出し: `openBillingPortal()`（L22486）。

### 2.5 stripe-webhook — 権利の正本を書く唯一の主体

| 項目 | 内容 |
|---|---|
| エンドポイント | `POST https://<プロジェクトID>.functions.supabase.co/stripe-webhook`（Stripe ダッシュボードに登録） |
| 認証 | **Stripe 署名検証のみ**: `stripe.webhooks.constructEventAsync(rawBody, stripe-signature, STRIPE_WEBHOOK_SECRET)`。失敗は 400 `bad signature`。デプロイは `--no-verify-jwt` |
| 処理対象イベント | `checkout.session.completed` / `customer.subscription.created` / `customer.subscription.updated` / `customer.subscription.deleted`（他イベントは無視して 200） |

権利書込（`upsertFromSubscription`）:

- `premium = (sub.status === 'active' || sub.status === 'trialing')`
- 書込行: `{user_id, premium, status, stripe_customer_id, stripe_subscription_id, current_period_end(ISO), updated_at}`
  を service_role で `fl_entitlements` に upsert（`onConflict:'user_id'`）
- `user_id` は `client_reference_id` → `metadata.user_id` の順で解決。不明時は `stripe_customer_id` 一致行を update
- レスポンス: `{received: true}`／処理中エラーは 500（Stripe が自動リトライ）

これが「**課金状態はサーバ権利が正本**」の要である。`fl_entitlements` は RLS で書き込みポリシーが無く
（`05-data-design.md` §4.2）、クライアント改ざんでは premium を付与できない。
反映経路: Webhook → `fl_entitlements` → `fl_my_premium` ビュー → クライアント `_syncPremiumFromServer()`（L21286）→
`isPremium()`（L22451）。決済から戻った直後は `_handleCheckoutReturn()`（L22503 付近）が
`?checkout=success` を検知し、1.5 秒間隔で最大 5 回 `_syncPremiumFromServer()` をリトライして反映遅延を吸収する。

| シークレット | 用途 |
|---|---|
| `STRIPE_SECRET_KEY` | subscription の retrieve |
| `STRIPE_WEBHOOK_SECRET` | 署名検証（`whsec_...`） |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | fl_entitlements 書込（自動注入） |

### 2.6 push-send — Web Push 送信

| 項目 | 内容 |
|---|---|
| エンドポイント | `POST /functions/v1/push-send`（`--no-verify-jwt`。呼び出しは pg_cron の `net.http_post` ＋ service_role Bearer、または運用者の curl） |
| 依存 | `npm:web-push@3.6.7`（VAPID 署名・暗号化）／`npm:@supabase/supabase-js@2`（service_role） |
| タイムゾーン | **JST 固定**（`JST_OFFSET_MIN = 540`。予定の date/time を JST として解釈） |

2 モード:

| mode | リクエスト | 動作 | レスポンス |
|---|---|---|---|
| `test` | `{mode:'test', user_id? \| endpoint?, title?, msg?, url?}` | 指定ユーザー/購読へ即時テスト通知 | `{ok:true, sent:N}` |
| `scan`（既定・cron 用） | `{mode:'scan'}` または空 body | 予定リマインドの定期スキャン（下記） | `{ok:true, sent:N}` |

scan の仕様（実コード準拠）:

1. `fl_family_data` の `data_key='events'` 全行を service_role で取得（RLS バイパス）
2. `fl_push_subscriptions` 全件を family_id / user_id でグルーピング。宛先は
   **family_id があれば家族全員の購読、なければ所有者本人の購読**
3. 各予定について: `time` なし・`allDay` は対象外／`remind`（リード分）は**未指定なら 30 分**、
   `remind === ''` は「通知なし」でスキップ／繰り返し予定は `occursOn()`（アプリの `_occursOn` を移植:
   daily / weekdays / weekly / monthly / yearly / custom(interval×unit)・`repeatUntil` 対応）で当日発生を判定
4. 通知時刻 = 開始時刻 − remind 分。**6 分の窓**（cron 5 分毎を想定）に入ったものだけ送信
5. 重複防止: `fl_push_log` に主キー `` `${family_id||user_id}:${event.id}:${date}:${remind}` `` を insert し、
   一意制約違反（23505 = 既送信）ならスキップ
6. payload: `{title:'予定のお知らせ', body:'{まもなく|N分後|N時間後|明日}：{HH:MM} {タイトル}', url:'./', tag:'fl-ev-'+id}`
7. 送信失敗 404/410（購読失効）は該当 `fl_push_subscriptions` 行を自動削除

| シークレット | 用途 |
|---|---|
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push 署名鍵ペア（公開鍵はアプリにも同値を設定） |
| `VAPID_SUBJECT` | `mailto:` 連絡先 |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | 全購読・全予定の参照（自動注入） |

クライアント側: `const VAPID_PUBLIC_KEY = ''`（L16068・空の間は UI「準備中」表示）。
購読作成は `_pushSubscribeAndStore()`（L16107）が `pushManager.subscribe` → `fl_push_subscriptions` へ
upsert（`onConflict:'endpoint'`・RLS で本人のみ）、有効化導線は `enableWebPush()`（L16132）。
受信は `docs/sw.js` の push ハンドラが通知表示、`notificationclick` でアプリを開く。
iOS 16.4+ は「ホーム画面に追加」した PWA のみ受信可能。

---

## 3. シークレット管理一覧

**原則: 秘密鍵は Edge Function シークレット（`supabase secrets set`）にのみ置く。
クライアント（HTML）・リポジトリ・worklog には絶対に置かない。**

| 鍵 | 置き場所 | 使用関数 | クライアント搭載 |
|---|---|---|---|
| `OPENAI_API_KEY` | Edge シークレット | hoku / calendar-scan（共通） | ✕ 絶対不可 |
| `HOKU_SHARED_KEY` / `HOKU_MODEL` | Edge シークレット（任意） | hoku | ✕（利用者が独自運用時のみ `S.hokuApiKey` に本人が入力） |
| `CALENDAR_SCAN_SHARED_KEY` / `CALENDAR_SCAN_MODEL` | Edge シークレット（任意） | calendar-scan | ✕ |
| `STRIPE_SECRET_KEY`（`sk_...`） | Edge シークレット | create-checkout / billing-portal / stripe-webhook | ✕ 絶対不可 |
| `STRIPE_PRICE_ID`（`price_...`） | Edge シークレット | create-checkout | ✕（公開情報ではあるがサーバ側に集約） |
| `STRIPE_WEBHOOK_SECRET`（`whsec_...`） | Edge シークレット | stripe-webhook | ✕ 絶対不可 |
| `VAPID_PRIVATE_KEY` | Edge シークレット | push-send | ✕ 絶対不可 |
| `VAPID_PUBLIC_KEY` | Edge シークレット＋アプリ内定数（L16068） | push-send／クライアント購読 | ○ 公開鍵のみ可（両者は同値必須） |
| `VAPID_SUBJECT` | Edge シークレット | push-send | ✕ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase が Edge に自動注入 | create-checkout / billing-portal / stripe-webhook / push-send / pg_cron | ✕ 絶対不可（CLAUDE.md §14.3） |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | 自動注入＋アプリ内定数（L6415） | 全関数 | ○ anon(publishable) のみ可 |

クライアントに置いてよい公開値は **SUPABASE_URL・anon(publishable) キー・VAPID 公開鍵・`STRIPE_ENABLED` フラグ**の 4 点のみ。

---

## 4. デプロイ手順要約

詳細手順の正本は各セットアップ文書。本書では要点のみ記す。

| 対象 | コマンド | 参照 |
|---|---|---|
| hoku | `supabase secrets set OPENAI_API_KEY=sk-...` → `supabase functions deploy hoku`（**`--no-verify-jwt` を付けない**） | `supabase/functions/hoku/index.ts` 冒頭コメント |
| calendar-scan | `supabase functions deploy calendar-scan`（同上・鍵は hoku と共通） | 同ファイル冒頭コメント |
| Stripe 3 関数 | `billing-entitlements.sql` 適用 → `deploy create-checkout` / `deploy billing-portal` / `deploy stripe-webhook --no-verify-jwt` → Stripe ダッシュボードで Webhook 登録（4 イベント）→ シークレット設定 → アプリ `STRIPE_ENABLED=true` にして §12.3 同期 | **`docs/BILLING-SETUP.md`** |
| push-send | VAPID 鍵生成（`npx web-push generate-vapid-keys`）→ 公開鍵をアプリ L16068 へ → `push-subscriptions.sql` 適用 → シークレット設定 → `deploy push-send --no-verify-jwt` → pg_cron 登録（§5） | **`docs/WEB-PUSH-SETUP.md`** |

Stripe / Push の有効化は「本番影響のある変更」であり人間確認必須（CLAUDE.md §7 / §10.2）。
なお iOS/Android のネイティブ配布（App Store / Google Play）でデジタル商品を売る場合は各ストアの IAP が必須で、
Stripe は使用不可（Web/PWA 配布に限り本構成で成立。`03-architecture.md` §9）。

---

## 5. pg_cron 定期実行

| ジョブ | スケジュール | 内容 |
|---|---|---|
| `fl_push_scan` | `*/5 * * * *`（5 分毎） | `pg_net` の `net.http_post` で `push-send` を `{"mode":"scan"}`・service_role Bearer 付きで呼ぶ。push-send 側は 6 分窓で判定するため取りこぼしなし・`fl_push_log` で重複なし |
| `fl_push_log_gc`（任意） | `0 4 * * *`（毎日 4:00） | `fl_push_log` の 7 日より前の行を削除（`docs/push-subscriptions.sql` 末尾のコメント例） |

前提: `create extension if not exists pg_cron;` / `pg_net`。SQL は `docs/WEB-PUSH-SETUP.md` §6 が正本。
service_role キーは `net.http_post` の呼び出しに使うが、**DB 内（サーバ側）に閉じる**ため安全。
稼働確認は `select * from cron.job;`。

---

## 6. 障害時のフォールバック（クライアントは絶対に止めない）

| サーバ側の状態 | クライアントの挙動 |
|---|---|
| hoku が失敗 / タイムアウト / 未ログイン | `_hokuCallBackend()` が null を返し、**ローカル応答へフォールバック**（`parseHokuIntent` によるルールベース intent ＋定型返答）。Hoku は無応答にならない。`S.hokuAiOff` でユーザー自身が LLM を停止することも可能（常にローカル応答） |
| hoku の 502 reason（残高不足・鍵不正等） | `#qa-debug` の接続診断（L27837 付近）が reason を表示し原因を特定できる。一般ユーザーにはやさしい定型文のみ |
| calendar-scan が未ログイン / SDK 未ロード | `mockAnalyzeCalendarImage()` にフォールバック（**外部送信なし**のデモ解析・1 秒遅延で応答） |
| calendar-scan がエラー / 全パス失敗 | `calendar-scan_all_failed` を throw → 失敗 UX（`_ocrShowFail`。オフライン時は接続確認の文言、再試行導線あり）。各パスは 1 回自動リトライ済み |
| Stripe 未設定（現状） | `STRIPE_ENABLED = false`（L22468）により決済ボタンはトースト「準備中」表示。**課金 UI は β/トライアル表記のまま**で、実装状態と表示を矛盾させない（CLAUDE.md §13.5） |
| Webhook 反映遅延 | `_handleCheckoutReturn()` が 1.5 秒 × 5 回 `_syncPremiumFromServer()` をリトライ |
| サーバ権利が取得できない（オフライン等） | `isPremium()` はローカルキャッシュ `S.isPremiumUser` で判定継続（`05-data-design.md` §3.15） |
| VAPID 未設定（現状） | 通知設定 UI は「準備中」表示（`_vapidReady()` 判定）。アプリ内通知・60 秒毎のローカルリマインド（`_startNotifChecker()` L16165）は Web Push と無関係に動作 |
| push-send の購読失効 | 404/410 を検知して購読行を自動削除（ゴミ購読が溜まらない） |

---

## 7. 本書の運用

- **正本は 1 箇所**: Edge Functions の仕様（入出力・認証・エラー・シークレット）は本書を正本とする。
  セットアップの実務手順は `docs/BILLING-SETUP.md` / `docs/WEB-PUSH-SETUP.md`、全体像は `03-architecture.md` §5 に置き、重複記載しない
- **更新タイミング**: 関数の追加・削除、リクエスト/レスポンス形式・エラー分類・使用モデル・シークレットの変更、
  `STRIPE_ENABLED` / `VAPID_PUBLIC_KEY` の有効化を行ったら、**同じコミットで本書 §1.1 の状態列と該当節を更新**する
- **実コード優先**: 本書と `supabase/functions/` / `docs/edge-functions/` の実コードが矛盾した場合はコードを調査のうえ
  本書を修正する（推測で書かない）。デプロイ済み関数の変更は本番影響があるため人間確認を挟む（CLAUDE.md §10.2）
- **新規 Edge Function 追加時のチェックリスト**: (1) 認証方式の明示（JWT ON が既定・`--no-verify-jwt` は理由必須）
  (2) シークレットを §3 の表へ追加 (3) エラー reason の分類（秘密を含めない） (4) クライアント側フォールバックを §6 へ追加
  (5) CORS ヘッダに supabase-js 系ヘッダを含める
- 更新時は `docs/worklog.md` に変更理由を記録する（CLAUDE.md §15）
