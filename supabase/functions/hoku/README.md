# Hoku OpenAI バックエンド（Supabase Edge Function）

Hoku を OpenAI で「文脈つき会話＋登録の手伝い」ができる賢いアシスタントにするサーバ関数。
**OpenAI APIキーはこのサーバ（環境変数）にだけ置く。アプリ(HTML)やGitには絶対に書かない。**

## ゼロ設定方針（プレミアムは設定不要で賢くなる）

- アプリは **関数名 invoke** でこの関数を呼び、**ログイン中ユーザーの JWT と anon キーを自動付与**する。
- 関数は **JWT 検証ON でデプロイ**（`--no-verify-jwt` を付けない）。
  → 「ログイン中の Familink ユーザー」だけが到達でき、URL も合言葉もアプリに手入力不要。
- プレミアム かつ Supabase ログイン中なら、アプリ側で **自動的に AI 版 Hoku が有効**になる。

## デプロイ手順（推奨）

```bash
npm install -g supabase            # もしくは npx supabase@latest
supabase login
supabase functions deploy hoku --project-ref jrmzzizjlkrogrbtzyuz   # JWT検証ON（--no-verify-jwt は付けない）
supabase secrets set OPENAI_API_KEY=sk-あなたの鍵 --project-ref jrmzzizjlkrogrbtzyuz
# （任意）モデル変更。既定は gpt-4o-mini
supabase secrets set HOKU_MODEL=gpt-4o-mini --project-ref jrmzzizjlkrogrbtzyuz
```

これだけ。**アプリ側の設定は不要**：プレミアム＆ログイン中のユーザーは自動でAI版になります。
（OFFにしたい場合のみ 設定→「Hoku を AI で賢くする」→「AI版Hokuを使う」のチェックを外す）

## 動作

- アプリは `supabase.functions.invoke('hoku', { body: { mode:'chat'|'intent', text, context, history } })` で呼ぶ。
- `mode:'chat'` → `{ reply, intent, entities }`（自然文＋登録系なら確認フローへ）
- `mode:'intent'` → `{ intent, confidence }`（分類のみ）
- 失敗・タイムアウト・未ログイン時はアプリが自動で既存（ローカル）Hoku にフォールバック（落ちない）。

## 上級者：独自エンドポイント直叩き（任意）

JWT 方式を使わず独自URLで運用したい場合のみ：
- `supabase secrets set HOKU_SHARED_KEY=合言葉` を設定（設定時のみ `x-hoku-key` 一致を要求）
- アプリ 設定→「Hoku を AI で賢くする」で URL（`https://<ref>.supabase.co/functions/v1/hoku`）と合言葉を入力
- この場合は `--no-verify-jwt` でのデプロイも可

## 安全性

- OpenAI 鍵はサーバの環境変数のみ。CORS 許可。既定は Supabase JWT 認証で保護。
- 家計の金額などはアプリ側 context で最小限のみ送信（プライバシー配慮）。
