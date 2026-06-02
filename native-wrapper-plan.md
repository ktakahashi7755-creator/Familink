# Familink ネイティブ化・実装ロードマップ（実決済 / ウィジェット / 自動同期）

> このドキュメントは、現行の **単一 HTML（`app-source/familink.html`）を「正本」のまま**、
> App Store 配信・アプリ内課金（IAP）・iPhone ウィジェット・カレンダー自動同期を実現するための
> **具体的な実行手順書**です。Web 側のコードはほぼ作り直さず、ネイティブの「殻」をかぶせます。
>
> 作成: 2026-06-02 / 対象読者: Mac + Xcode を扱える開発者（ご本人 or 委託先）

---

## 0. 結論（推奨アプローチ）

| 選択肢 | 採否 | 理由 |
|---|---|---|
| **A. Capacitor で WKWebView ラッパー化** | ✅ **採用推奨** | 既存 HTML をそのまま再利用。App Store / IAP / ウィジェットすべての前提。学習コスト最小 |
| B. React Native へ全面移行 | ✕ 見送り | 既存 HTML 資産を捨てることになる。工数大・リスク大（`native/` フォルダは保留中） |
| C. PWA のまま（ネイティブ化しない） | △ 限定的 | App Store 配信不可・IAP不可・ウィジェット不可。Web配布のみなら可 |

**Capacitor** を採用し、以下を**段階的**に実装する。各フェーズは独立してリリース可能。

```
Phase 1: Capacitor ラッパー（App Store 配信できる状態）        ← 最優先
Phase 2: アプリ内課金 IAP（月額480円の実決済）                ← 収益化
Phase 3: iPhone ホーム画面ウィジェット                        ← 体験強化
Phase 4: カレンダー自動同期（バックエンド/ネイティブ）         ← 利便性
```

---

## 1. 事前に必要なもの（ユーザー準備事項）

| 項目 | 内容 | 費用 |
|---|---|---|
| Mac | Xcode が動く macOS マシン | 既存 or 調達 |
| Xcode | App Store からインストール | 無料 |
| Apple Developer Program | IAP・実機配信・申請に必須 | **$99/年** |
| App Store Connect | アプリ登録・課金商品登録・審査 | 上記に含む |
| Node.js | Capacitor のビルドツール（**開発機のみ**。配信物には含まれない） | 無料 |

> ⚠️ Node/npm は「開発機でラッパーをビルドするため」に使う。**`familink.html` 本体は引き続き Vanilla JS のまま**で、npm 依存は持ち込まない（§12.1 の精神を維持）。

---

## 2. Phase 1 — Capacitor ラッパー（App Store 配信）

### やること
既存の `app-source/familink.html`（と `docs/` の資産）を WKWebView で表示する薄いネイティブシェルを作る。

### 手順（開発機）
```bash
# 1. ラッパー用ディレクトリを作成（リポジトリ内 native-shell/ など。本体とは分離）
mkdir familink-shell && cd familink-shell
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/ios

# 2. Capacitor 初期化
npx cap init Familink com.familink.app --web-dir=www

# 3. www/ に Web 本体を配置（familink.html を index.html として同梱）
#    ビルド時に app-source/familink.html を www/index.html へコピーするスクリプトを用意
cp ../app-source/familink.html www/index.html
#    （画像はインライン base64 / Google Fonts は CDN のため追加コピー不要）

# 4. iOS プロジェクト生成
npx cap add ios
npx cap sync ios

# 5. Xcode で開く
npx cap open ios
```

### 注意点
- **オフライン同梱**: Web をアプリにバンドルするため、Service Worker/キャッシュバスター（`docs/index.html` 先頭ブロック）は**ラッパー版では不要**。`www/index.html` は `app-source/familink.html` そのまま。
- **Supabase**: 現状 CDN(`@supabase/supabase-js@2`) を `<script>` 読み込み。WKWebView でも動作するが、App Store の「外部スクリプト実行」審査を避けるため、**supabase-js をローカル同梱**（www/ に置く）するのが安全。
- **LocalStorage**: WKWebView の LocalStorage は永続化される（`familink_v3` はそのまま使える）。ただし iOS がストレージを掃除する可能性があるため、IAP 状態は後述の receipt 検証を正とする。
- **Safe Area**: 既に `viewport-fit=cover` / `env(safe-area-inset-*)` 対応済み。ノッチ対応はそのまま効く。

### 完了条件
- 実機で `familink.html` が WKWebView 内で全機能動作する
- App Store Connect にアプリ登録 → TestFlight 配信できる

---

## 3. Phase 2 — アプリ内課金 IAP（月額 480 円）

### 重要な前提
Apple のルール上、**デジタルサブスクは App Store IAP 必須**（Stripe等の外部決済は不可）。
HTML から直接カード処理はできない（PCI-DSS / Apple 規約）。→ **StoreKit（ネイティブ）一択**。

### 使うもの
- Capacitor プラグイン: [`@capacitor-community/in-app-purchases`](https://github.com/capacitor-community/in-app-purchases) または RevenueCat（推奨：レシート検証・サーバ管理が楽）

### App Store Connect 側
1. 「自動更新サブスクリプション」商品を作成
   - 商品ID 例: `com.familink.premium.monthly`（月額480円）
   - 将来: `com.familink.premium.monthly.680` 等の上位プラン
2. 無料トライアル期間を **30日**に設定（イントロオファー）→ 既存の `TRIAL_DAYS=30` と一致

### Web 側の統合ポイント（**ここが既に準備済み**）
現行コードの課金状態は以下で一元管理されている（C1 で整備済み）：

| 変数/関数 | 役割 |
|---|---|
| `S.premiumPaid` | **課金済みフラグ**（IAP 成功でここを true にする） |
| `S.isPremiumUser` | アプリ全体のゲート判定（`_refreshTrialStatus()` が再計算） |
| `S.trialStartedAt` | トライアル開始日（30日で満了） |
| `activatePremiumDemo()` | **購入成功ハンドラ**（現在はデモ。IAP のコールバックで呼ぶ） |
| `checkPremiumLimit(key)` | 無料上限の判定（タスク/予定/家計/体調/写真） |

**IAP 連携は最小変更**で済む：
```js
// ネイティブ橋渡し（Capacitor プラグイン経由）
async function purchasePremium(productId) {
  const result = await CapacitorInAppPurchases.purchase({ productId });
  if (result.transaction && result.transaction.state === 'purchased') {
    // ★ 既存の購入成功ハンドラをそのまま呼ぶだけ
    activatePremiumDemo();           // → S.premiumPaid = true
    // レシートをサーバ（or RevenueCat）に送って検証・記録
  }
}
// 復元
async function restorePurchases() {
  const r = await CapacitorInAppPurchases.restorePurchases();
  if (r.hasActiveSubscription) activatePremiumDemo();
  else showToast('有効な購入が見つかりませんでした', 'info');
}
```
- 既存の決済モーダル（β）の「登録して始める」ボタンの `onclick` を `purchasePremium(...)` に差し替える。
- 「購入を復元」ボタン（`prmRestorePurchase`）を `restorePurchases()` に差し替える。
- β明示バナー・`autocomplete=off` のテスト用カード入力欄は**削除**（IAP は Apple の決済シートが出る）。

### レシート検証（不正対策）
- RevenueCat 採用なら検証はマネージドで完結（推奨・初期は無料枠）。
- 自前なら Supabase Edge Function で Apple の verifyReceipt を叩き、`fl_family_data` に課金状態を記録。

### 完了条件
- 実機で Apple の決済シートが出て購入できる
- 購入後 `S.premiumPaid=true` になり、無料上限が解除される
- 機種変更後も「購入を復元」で復帰できる

---

## 4. Phase 3 — iPhone ホーム画面ウィジェット

### 重要な前提
ウィジェットは **WidgetKit（Swift・ネイティブ専用）**。Web/Capacitor の JS では作れない。
→ Xcode で **Widget Extension ターゲット**を追加する純ネイティブ作業。

### データ共有の仕組み
1. アプリ本体（WKWebView）と Widget Extension の間は **App Group** で共有する。
2. WKWebView の LocalStorage は直接 Widget から読めない。→ 本体側で「今日の予定/タスク件数」など**ウィジェット表示用の最小データ**を App Group の `UserDefaults`(suite) に書き出す。
   - Capacitor の `@capacitor/preferences` を App Group 対応で使う、または小さな自前プラグインで `WKScriptMessageHandler` 経由で受け渡し。
3. Widget は `UserDefaults(suiteName:)` から読んで描画。

### ウィジェット内容（MVP）
- 今日の予定 件数・直近1件
- 未完了タスク 件数
- （プレミアム特典として「中・大サイズ」「家族の体調」などを出すと課金訴求になる）

> 旧 HTML 版にあった「ウィジェット設定」UI（近日対応予定の placeholder）は削除済み。
> Phase 3 着手時に、表示項目の選択 UI を**本実装**として復活させる。

### 完了条件
- ホーム画面に Familink ウィジェットを追加でき、今日の予定/タスクが表示される

---

## 5. Phase 4 — カレンダー自動同期

### 現状
- ICS ファイルの**手動取り込み**は実装済み。
- Google/Apple/Yahoo の ics URL を**ブラウザから直接 fetch すると CORS で失敗**する（提供側が CORS ヘッダを返さない）。

### 実装方法（2案）
**案A: Supabase Edge Function を CORS プロキシにする（Web/ラッパー共通で動く）**
```ts
// supabase/functions/ics-proxy/index.ts （Deno）
serve(async (req) => {
  const url = new URL(req.url).searchParams.get('url');
  // SSRF対策: 許可ドメイン(calendar.google.com 等)のみ通す
  const res = await fetch(url);
  const ics = await res.text();
  return new Response(ics, { headers: { 'Access-Control-Allow-Origin': '*' } });
});
```
- Web 側は `/functions/v1/ics-proxy?url=...` を fetch → 既存の ICS パーサで取り込み。
- 定期同期は、アプリ起動時 + プル更新時に再 fetch（バックグラウンド常時同期はネイティブの BGTaskScheduler が必要）。
- **要: Supabase CLI でデプロイ・SSRF/レート制限の実装**。

**案B: ネイティブの EventKit でローカルカレンダーを読む（ラッパー必須）**
- Capacitor プラグインで iOS の EventKit にアクセスし、端末カレンダーの予定を読み込む。
- OAuth 不要・CORS 不要だが、iOS のカレンダー権限が必要。

### 推奨
- まず **案A（Edge Function プロキシ）** で「URL貼り付け→自動取込」を実現（Web でも効く）。
- 本格的な双方向同期は将来の OAuth + バックエンドで。

---

## 6. 全体の進め方・判断ポイント

```
[今ここ] Web 版: 機能・課金ロジック・コード品質すべて完成（App Store 公開"品質"）
   │
   ├─ 判断1: ネイティブ化に踏み切るか？（§12.1 単一HTML原則を「殻をかぶせる形」で発展させる承認）
   │
   ├─ Phase 1 (Capacitor) ── 数日〜1週: App Store / TestFlight 配信可能に
   ├─ Phase 2 (IAP)        ── 1〜2週 + 審査: 実際の月額480円課金（収益化スタート）
   ├─ Phase 3 (Widget)     ── 1〜2週: ホーム画面ウィジェット
   └─ Phase 4 (Calendar)   ── 1週: ics プロキシ自動取込
```

### この設計の良さ
- **既存 HTML を一切作り直さない**（`familink.html` が正本のまま）。
- Web 側の IAP 統合点（`activatePremiumDemo` / `S.premiumPaid`）は**既に用意済み**。差し替えは数行。
- 各フェーズが独立。Phase 1 だけでも「App Store にあるアプリ」になる。

### やってはいけないこと
- React Native へ全面移行（既存資産を捨てる・`native/` は保留）。
- Stripe 等の外部決済をアプリ内に出す（Apple 審査リジェクト）。
- レシート検証なしの課金状態だけで重要機能を恒久解放（不正の温床）。

---

## 7. 現 Web 版で「既に済んでいること」（ネイティブ化前提の地ならし）

- ✅ フリーミアム・ゲーティング（`checkPremiumLimit`：タスク/予定/家計/体調/写真）
- ✅ プレミアム限定（アバター・Hoku 利用回数）
- ✅ **トライアル満了ロジック**（`premiumPaid` / `_refreshTrialStatus` / 30日で無料降格）← C1 で修正済み
- ✅ 課金成功ハンドラ（`activatePremiumDemo`）= IAP コールバックの受け皿
- ✅ 購入復元の導線（`prmRestorePurchase`）
- ✅ 安全エリア・レスポンシブ・アクセシビリティ（WKWebView でそのまま効く）
- ✅ Supabase 連携（家族同期）= Edge Function 追加の素地

→ **ネイティブの殻を用意すれば、Web 側はほぼ差し替えゼロで収益化に入れる状態**。
