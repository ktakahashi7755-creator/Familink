# Hoku OpenAI バックエンド（Supabase Edge Function）

Hoku を OpenAI で「文脈つきの会話＋登録の手伝い」ができる賢いアシスタントにするサーバ関数。
**APIキーはこのサーバ（環境変数）にだけ置く。アプリ(HTML)やGitには絶対に書かない。**

## デプロイ手順（3分）

```bash
# 1) 一度だけ：CLI 準備
npm install -g supabase
supabase login
supabase link --project-ref jrmzzizjlkrogrbtzyuz   # Familink の project-ref

# 2) 鍵をサーバの秘密として登録（sk-... は OpenAI の secret key）
supabase secrets set OPENAI_API_KEY=sk-あなたの鍵
# 【必須】不正利用防止の合言葉。これを設定しないと関数は500を返す（フェイルクローズ）。
#   アプリの「共有シークレット」欄に同じ値を入れること。
supabase secrets set HOKU_SHARED_KEY=任意の合言葉
# （任意）モデル変更。既定は gpt-4o-mini（安価）。賢さ重視なら gpt-4o
supabase secrets set HOKU_MODEL=gpt-4o-mini

# 3) デプロイ
supabase functions deploy hoku --no-verify-jwt
```

## アプリ側で有効化（1ステップ）

公開アプリ → **設定 → Hoku を AI で賢くする** を開き、URL 欄に次を貼って保存：

```
https://jrmzzizjlkrogrbtzyuz.supabase.co/functions/v1/hoku
```

- 会話モードは初回設定で既定 ON（URLを貼るだけで文脈会話が有効）。
- 「共有シークレット」欄に HOKU_SHARED_KEY と同じ合言葉を必ず入れる（未一致だと401）。

## 動作

- `POST .../hoku/api/hoku/chat` → `{ reply, intent, entities }`（自然文＋登録系なら確認フローへ）
- `POST .../hoku/api/hoku/intent` → `{ intent, confidence }`（分類のみ）
- 失敗・タイムアウト時はアプリが自動でローカル判定にフォールバック（落ちない）。

## 安全性

- 鍵はサーバの環境変数のみ。CORS 許可。`x-hoku-key` で任意の簡易保護。
- 家計の金額などはアプリ側 context で最小限のみ送信（プライバシー配慮）。
