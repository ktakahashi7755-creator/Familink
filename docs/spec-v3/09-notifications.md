# 09. 通知・Web Push 設計

3層で構成する：**アプリ内通知**（ベル）／**OS通知（起動中）**／**Web Push（閉じても届く）**。

## 9.1 アプリ内通知
- `S.notifs[]` に蓄積、ホームのベルにバッジ件数。`addNotif(title, desc, icon, type)`。
- 種別ON/OFF（`S.notifPrefs`・`NOTIF_PREF_DEFS`）：担当設定/タスク完了/コメント/予定登録/メモ投稿/家計/体調/買い物/期限切れ。
  - `notifEnabled(type)` が false の種別は生成をスキップ。
- 空状態は「まだありません」＋案内。

## 9.2 OS通知（起動中・Notification API）
- `S.browserNotifEnabled`＋`Notification.permission==='granted'` のとき、`_checkEventNotifs()` を60秒毎に実行。
- **予定リマインド**：各予定の `remind`（分前・既定30）に到来した予定を1回通知（±5分窓・`sessionStorage`で重複防止）。
  `_occursOn` で**繰り返し予定の発生日にも**対応。旧データ（remind未設定）は30分前として後方互換。
- **期限切れタスク**：1日1回。
- 制約：アプリを開いている間のみ。

## 9.3 Web Push（アプリを閉じても届く）— クライアント実装済み
- サポート判定：`serviceWorker`＋`PushManager`＋`Notification`。設定判定：`VAPID_PUBLIC_KEY` が設定済みか（`_webPushConfigured`）。
- 有効化 `enableWebPush()`：許可取得 → `pushManager.subscribe({userVisibleOnly, applicationServerKey:VAPID公開鍵})` → `fl_push_subscriptions` に保存。
- 無効化 `disableWebPush()`：unsubscribe＋購読削除。起動時 `_refreshWebPushOnStart()` で endpoint 更新に追従。
- 設定UI：通知設定に「アプリを閉じても届く通知」トグル。未設定時は「準備中」表示（既存挙動を壊さない）。
- **iOS 注意**：「ホーム画面に追加」した PWA でのみ動作（iOS 16.4+）。Android/PC は通常ブラウザでも可。

### 9.3.1 Service Worker（`docs/sw.js`）
- `push` イベント：JSON `{title, body, url, tag, icon}` を受けて `showNotification`（data無しでも安全に既定表示）。
- `notificationclick`：既存ウィンドウをフォーカス（無ければ `openWindow`）。

### 9.3.2 サーバ（要デプロイ・同梱）
- SQL：`docs/push-subscriptions.sql`（`fl_push_subscriptions`＋`fl_push_log`＋RLS）。
- Edge Function：`docs/edge-functions/push-send`（Deno/`npm:web-push`）
  - `mode:'test'`：疎通確認。`mode:'scan'`（cron）：`fl_family_data` の予定を走査し `remind` 到来分を家族の購読へ送信。
  - `_occursOn` 移植で繰り返し対応・`fl_push_log` で重複排除・失効購読(404/410)を自動削除。
- 定期実行：pg_cron で5分毎に scan（`net.http_post`・service_role）。
- シークレット：`VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT`。**公開鍵のみクライアント**、秘密鍵はサーバ。
- 手順書：`docs/WEB-PUSH-SETUP.md`。

## 9.4 有効化手順（要約）
1. `npx web-push generate-vapid-keys`。2. 公開鍵をアプリ `VAPID_PUBLIC_KEY` に設定→再同期。3. SQL適用。
4. シークレット設定→ `push-send` デプロイ。5. pg_cron で5分毎 scan。6. iOSはホーム追加→トグルON→`mode:'test'`で疎通。

## 9.5 将来
- リマインドの宛先制御（家族全員 vs 担当メンバーのみ）、静音時間帯、週次サマリー、通知センターの一元化。
