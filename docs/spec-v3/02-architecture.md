# 02. 基本設計（アーキテクチャ）

## 2.1 設計思想（不変条件）
1. **単一HTML・Vanilla・ビルドなし**：`app-source/familink.html` に全て（HTML/CSS/JS）を内包。npm依存ゼロ。
   → 依存の腐敗が起きず、いつでも1ファイルで再現・配布できる。学習コストと運用コストを最小化。
2. **ローカルファースト**：全機能は LocalStorage（`familink_v3`）だけで完結する。クラウドは「任意の増強」。
   → オフラインでも動く。通信障害・未ログインでもプロダクト価値が落ちない。
3. **クラウドは薄く強く**：Supabase（anon/publishableキーのみ）で認証・保存・リアルタイム・Edge Function。
   秘密鍵はサーバ（Edge Function）にのみ。
4. **サーバ権利の正本化**：課金など「改ざんされては困る状態」はサーバ（RLS/Edge/Webhook）が唯一の真実源。
5. **やさしさは非機能要件**：アクセシビリティ・世界観・コピーは仕様の一部（§10）。

## 2.2 全体構成図
```
┌──────────────────────────── クライアント（PWA / 単一HTML）────────────────────────────┐
│  index.html(先頭SW登録+キャッシュバスター) → familink.html本体                          │
│  ├─ UI層: 22 screen(.screen) + 87 modal(.modal-backdrop) / go()・switchTab()・refresh() │
│  ├─ 状態: グローバル S（メモリ）↔ LocalStorage 'familink_v3'（PERSIST 88キー）           │
│  ├─ ドメイン: 予定/タスク/家計/体調/準備/買い物/ボード/アルバム/メモ/Hoku/課金/通知      │
│  ├─ 同期: _pushToSupabase / _fetchFromSupabase / Realtime購読 / マージ・トゥームストーン │
│  ├─ Hoku: 意図解析(parseHokuIntent)→実行(executeHokuAction) / 会話AI(任意)               │
│  └─ Service Worker(sw.js): cache-first / push・notificationclick                        │
└───────────────┬───────────────────────────────────────────────┬───────────────────────┘
                │ @supabase/supabase-js（anon/publishable）        │ Web Push（VAPID公開鍵）
                ▼                                                  ▼
┌───────────────────────── Supabase（BaaS）───────────────────────────────────────────────┐
│  Auth（メール/パスワード, OAuth）                                                          │
│  Postgres + RLS:                                                                          │
│    fl_family_data(key-value JSONB, family_read RLS) / fl_family_invites                   │
│    fl_entitlements(+ view fl_my_premium) / fl_push_subscriptions / fl_push_log            │
│  Realtime（postgres_changes on fl_family_data）                                           │
│  Edge Functions(Deno): hoku / calendar-scan / create-checkout / stripe-webhook /         │
│                        billing-portal / push-send                                         │
│  Secrets（サーバのみ）: OpenAI, Stripe secret/webhook, VAPID private, service_role        │
└───────────────┬───────────────────────────────────┬──────────────────────────────────────┘
                │ Stripe（Checkout/Webhook/Portal）    │ 外部AI（OCR/会話・任意）
                ▼                                     ▼
          [Stripe]                               [OpenAI 等]
```

## 2.3 技術スタック
| レイヤ | 採用 | 理由 |
|---|---|---|
| フロント | 素のHTML/CSS/JS（単一ファイル） | 依存ゼロ・再現性・運用簡素 |
| 配信 | GitHub Pages（`docs/`）＋ Service Worker(cache-first) | 無料・即時起動・オフライン・自動更新 |
| ローカル保存 | LocalStorage（`familink_v3`, 写真base64） | サーバ不要でローカルファースト |
| BaaS | Supabase（Postgres/Auth/Realtime/Edge/Storage可） | anonキーだけで認証+同期+関数、RLSで分離 |
| サーバ処理 | Supabase Edge Functions（Deno/TypeScript） | 秘密鍵を持てる・npm:利用可 |
| 決済 | Stripe Checkout（Web） | ホスト型でPCI回避・Portalで解約 |
| 通知 | Web Push（VAPID）＋ Notification API | 閉じても届く＋起動中通知 |
| フォント | Google Fonts（Poppins / Noto Sans JP） | 世界観・可読性 |

## 2.4 実行時アーキテクチャ（クライアント内部）
- **状態モデル**：単一のグローバル `S`（オブジェクト）。`PERSIST` 配列（88キー）が LocalStorage 保存対象。
  - `saveS()`：`PERSIST` を JSON 化して保存。容量超過は検知→トースト＋（保存系は）ロールバック。
  - `loadS()`：起動時に読み込み `Object.assign(S, ...)`。
- **画面ルーティング**：`go(screenId)`（遷移＋アニメ）/ `switchTab()`（タブ）/ `refresh(id)`（内容のみ再描画・チラつき防止）。
  - `_refreshDispatch(id)` が各 `renderXxx()` に振り分け。例外は Error Boundary（画面内オーバーレイ「もう一度試す」）で吸収。
- **描画**：`renderHome/renderCal/renderTaskScreen/renderBudget/...` が `innerHTML` を再構築。ユーザー入力は必ず `H()` でエスケープ。
- **イベント**：`onclick` インライン＋委譲。二重送信は `_lockSubmit(key)`（700ms）で防止。
- **時刻**：JST前提。日付は `todayStr()`（YYYY-MM-DD）、時刻文字列 `HH:MM`。ISO打刻は同期の競合解決に使用。

## 2.5 同期アーキテクチャ（要約 / 詳細は §05）
- 保存 → 1.5s デバウンス → `_pushToSupabase()`（自分の行 `fl_family_data(user_id,data_key,payload)` に upsert・20件バッチ・指数リトライ）。
- 取得 → `_fetchFromSupabase()`：自分＋家族（`family_id`）の行を取得 → data_keyごとに集約 → 配列は id で LWW マージ、
  トゥームストーン（`_deletions`）で削除伝播、内容重複を畳む → 変更時のみ再描画。
- リアルタイム → `startRealtimeSync()`：`fl_family_data` の変更を購読 → 自分のecho抑制 → 800msデバウンスで再取得。
  切断は指数バックオフ、購読/再接続直後に取りこぼし防止の再取得。

## 2.6 セキュリティアーキテクチャ（要約 / 詳細は §06）
- **家族分離**：`fl_family_data` の RLS。自分の行は全 data_key 読める。家族（同一 family_id）の行は
  「共有してよい data_key（allowlist）」だけ読める。書き込みは常に自分の行のみ。
- **XSS**：`innerHTML` へ入れるユーザー値は `H()` でエスケープ。外部リンクは `noopener,noreferrer`。
- **秘密鍵**：service_role / Stripe secret / VAPID private / OpenAI キーは Edge Function のシークレットのみ。クライアント・リポジトリに置かない。
- **課金**：`fl_entitlements` を Webhook（service_role）だけが書く。`fl_my_premium` ビュー→`isPremium()` が最優先参照。

## 2.7 デプロイ/リリース構成
- 正本：`app-source/familink.html`。公開用：`docs/index.html`（先頭にSW登録＋キャッシュバスター、以降は本体と同一）＋`docs/sw.js`。
- **版管理**：`var V='v{YYYYMMDD}{a-z}'`（index.html）と `SW_VERSION`（sw.js）を**必ず同値**にする。
  値が変わると SW のバイトが変わり、ブラウザが新SWを検知→skipWaiting→自動リロードで最新配信（cache-first でも張り付かない）。
- CI：GitHub Actions `pages.yml` が `main` への push で GitHub Pages を自動デプロイ。
- 同期義務：`app-source` を変えたら必ず `docs` に同期（本体一致・版一致）。逆も同様。

## 2.8 主要モジュール（関数群の責務・約968関数の分類）
| 責務 | 代表関数 |
|---|---|
| 状態/永続化 | saveS / loadS / _lockSubmit / H |
| ルーティング/描画 | go / switchTab / refresh / _refreshDispatch / renderXxx |
| 予定 | openEventModal / saveEvent / _occursOn / _eventsOnDate / renderCal |
| タスク | openTaskModal / saveTaskEdit / toggleTaskDone / renderTaskScreen |
| 家計 | saveTx / renderBudget |
| 体調 | openHealthModal / saveHealth / renderHealth |
| 同期 | _pushToSupabase / _fetchFromSupabase / _mergeSyncArray / _isTombstoned / _mergeDeletions / _dedupByContent / startRealtimeSync |
| 招待/家族 | openMyInviteModal / openSupaInviteModal / _processPendingJoin |
| Hoku | sendHokuMsg / parseHokuIntent / executeHokuAction / renderHokuMsgs |
| OCR | openOcrIntro / ocrStartAnalyze / ocrRenderReview / ocrAddSelected |
| 課金 | isPremium / checkPremiumLimit / startCheckout / openBillingPortal / _syncPremiumFromServer / prmStartTrial |
| 通知 | addNotif / _checkEventNotifs / enableWebPush / _pushSubscribeAndStore |
| コイン | getFamiCoins / addFamiCoins / checkLoginBonus / openHokuShop / equipHokuSkin |
