# Familink Web Push セットアップ手順（アプリを閉じても届く通知）

クライアント側（アプリ／Service Worker）は実装済みです。**あなたの Supabase 側で以下の設定**を行うと、
予定のリマインドなどが「アプリを閉じていても」届くようになります。

> 前提知識：Web Push は **VAPID 鍵ペア（公開鍵＋秘密鍵）** で成り立ちます。
> **秘密鍵は絶対にアプリ／リポジトリに置かない**でください（サーバ＝Edge Function のシークレットにのみ設定）。

---

## 手順

### 1. VAPID 鍵ペアを生成
手元の PC で（Node があれば）:
```sh
npx web-push generate-vapid-keys
```
`Public Key:` と `Private Key:` が表示されます。以降で使います。

### 2. 公開鍵をアプリに設定
`app-source/familink.html` 内の次の行に **公開鍵**を貼ります:
```js
const VAPID_PUBLIC_KEY = '';   // ← ここに Public Key を貼る
```
→ 貼ったら §12.3 の手順で `docs/index.html` に同期し（`var V` と `docs/sw.js` の `SW_VERSION` も更新）、`main` に push。
（公開鍵は名前のとおり公開情報なのでコミットして問題ありません。**秘密鍵は入れない**こと。）

### 3. 購読テーブルを作成
Supabase ダッシュボード → SQL Editor に `docs/push-subscriptions.sql` を貼って **Run**。

### 4. Edge Function のシークレットを設定
Supabase CLI（またはダッシュボードの Edge Functions → Secrets）で:
```sh
supabase secrets set VAPID_PUBLIC_KEY="＜Public Key＞"
supabase secrets set VAPID_PRIVATE_KEY="＜Private Key＞"
supabase secrets set VAPID_SUBJECT="mailto:あなたの連絡先メール"
# SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY は Edge Function に既定で注入されます
```

### 5. Edge Function をデプロイ
`docs/edge-functions/push-send/index.ts` を Supabase の関数として配置し:
```sh
supabase functions deploy push-send --no-verify-jwt
```
（`--no-verify-jwt` は cron / 内部呼び出しのため。外部公開しないなら十分ですが、心配なら §7 参照）

### 6. 定期実行（予定リマインドの自動送信）
SQL Editor で pg_cron を有効化し、5分毎に `scan` を実行:
```sql
-- 拡張を有効化（初回のみ）
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 5分毎に push-send(scan) を叩く
select cron.schedule(
  'fl_push_scan',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://＜プロジェクトID＞.functions.supabase.co/push-send',
    headers := jsonb_build_object('Content-Type','application/json',
                                  'Authorization','Bearer ＜SUPABASE_SERVICE_ROLE_KEY＞'),
    body    := '{"mode":"scan"}'::jsonb
  );
  $$
);
```
※ `net.http_post` で service_role キーを使うのは DB 内（サーバ）に閉じるため安全です。

### 7. iPhone の注意（重要）
iOS の Web Push は **「ホーム画面に追加」した PWA でのみ** 動作します（iOS 16.4 以降）。
- Safari で `https://ktakahashi7755-creator.github.io/Familink/` を開く → 共有 → **ホーム画面に追加**
- 追加したアイコンから起動 → 設定 → 通知設定 → **「アプリを閉じても届く通知」をオン**（初回に通知許可）
- ブラウザのタブのままでは iOS では届きません（Android/PC は通常のブラウザでも可）。

---

## 疎通確認（テスト送信）
アプリで通知をオンにした状態で、Edge Function にテスト送信を投げます:
```sh
curl -X POST 'https://＜プロジェクトID＞.functions.supabase.co/push-send' \
  -H 'Authorization: Bearer ＜SUPABASE_SERVICE_ROLE_KEY＞' \
  -H 'Content-Type: application/json' \
  -d '{"mode":"test","user_id":"＜対象ユーザーのuuid＞","title":"テスト","msg":"届きました！"}'
```
`{"ok":true,"sent":N}` が返り、端末に通知が出れば成功です（アプリを閉じていてもOK）。

---

## しくみ（概要）
```
アプリ（設定でオン）
  → pushManager.subscribe（VAPID公開鍵）で購読を作成
  → fl_push_subscriptions に保存（本人のみ・RLS保護）

pg_cron（5分毎）
  → Edge Function push-send(scan)
     → fl_family_data の予定を走査し「remind分前が今到来」した予定を判定
     → fl_push_log で重複排除
     → 家族の購読へ web-push 送信（VAPID秘密鍵で署名・暗号化）
  → Service Worker(docs/sw.js) の push ハンドラが通知表示
     → タップで notificationclick → アプリを開く
```

## セキュリティ要点
- 秘密鍵（VAPID_PRIVATE_KEY / service_role）は **Edge Function のシークレットのみ**。クライアント・リポジトリには置かない。
- 購読テーブルは RLS で本人のみ読み書き。送信は service_role（サーバ）で全件参照。
- 失効した購読（404/410）は送信時に自動削除。

## トラブルシュート
- 通知が来ない：iOSは「ホーム画面に追加」必須／通知許可がオンか／VAPID公開鍵がアプリと一致しているか。
- テストは来るがリマインドが来ない：cron が動いているか（`select * from cron.job;`）／予定の「通知」が「なし」でないか／時刻(JST)が正しいか。
- `sent:0`：その user_id/family の購読が未登録（アプリでオンにし直す）。
