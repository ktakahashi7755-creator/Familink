# Familink Mobile (React Native + Expo + TypeScript)

家族向けアプリ **Familink** のネイティブ版。完成済みの Web MVP
(`../app-source/familink.html`) を正本として解析し、その UI/UX・世界観・
データモデル・Hoku AI・Supabase 構成を React Native へ全面移行したものです。

- **Framework:** Expo SDK 56 / React Native 0.85 / React 19
- **Routing:** expo-router (file-based, typed routes)
- **State:** Zustand + AsyncStorage 永続化（Web の `familink_v3` を踏襲）
- **Backend:** Supabase (Auth / Edge Functions / Realtime) — Web と同一プロジェクト
- **AI:** Hoku — Supabase Edge Function `hoku`（OpenAI をサーバ側でプロキシ）

---

## セットアップ

```sh
cd mobile
npm install
npm start          # Expo Dev Server（QR を Expo Go か Dev Build で読む）
npm run ios        # iOS シミュレータ（要 macOS）
npm run android    # Android エミュレータ
```

### 品質チェック

```sh
npx tsc --noEmit                       # 型チェック
npx eslint "src/**/*.{ts,tsx}"         # Lint
npx expo export --platform ios         # バンドルが通るか検証
```

> ⚠️ この環境のネットワークポリシーは Expo のバージョン照合 API
> (`api.expo.dev` / `reactnative.directory`) をブロックします。そのため
> `expo install` / `expo lint` は失敗します。依存追加は
> `node_modules/expo/bundledNativeModules.json` の固定版を `npm install`
> し、Lint は `eslint` を直接実行してください（上のコマンド参照）。

---

## ディレクトリ構成

```
mobile/
  src/
    app/                     # expo-router ルート（= 画面）
      _layout.tsx            # Provider + 認証ゲート + Stack
      index.tsx              # 起動時の振り分け（onboarding / tabs）
      onboarding.tsx         # 初回オンボーディング
      login.tsx              # Supabase メール OTP ログイン（modal）
      (tabs)/                # 下タブ: ホーム / カレンダー / ボード / Hoku / 設定
      event-edit.tsx         # 予定の追加・編集（modal）
      album.tsx              # アルバム（写真グリッド + ビューア）
      shopping.tsx           # 買い物リスト
      budget.tsx             # 家計
      health.tsx             # 体調記録
    components/              # UI プリミティブ（Card / Button / Segmented…）
    features/
      calendar/MonthGrid.tsx # 月カレンダーのグリッド
      hoku/hokuClient.ts     # Hoku API クライアント + オフライン応答
    lib/                     # supabase / storage / utils
    store/                   # Zustand ストア（auth / family）
    theme/                   # デザイントークン（Web の :root を移植）+ ThemeProvider
    types/                   # ドメイン型
  app.json                   # Expo 設定（権限・バンドル ID・Supabase extra）
```

詳細な Web → RN の対応表は [`docs/MIGRATION.md`](./docs/MIGRATION.md) を参照。

---

## Supabase

Web MVP と同じプロジェクト（URL / publishable=anon キー）を `app.json` の
`extra` に置いています。`EXPO_PUBLIC_SUPABASE_URL` /
`EXPO_PUBLIC_SUPABASE_ANON_KEY` で上書き可能です。
**service_role キーは絶対にクライアントへ置きません。**

- 認証: メール OTP（6 桁コード）。未ログインでも「この端末だけ」のローカル
  モードで全機能を利用可能（Web の挙動を踏襲）。
- Hoku: `supabase.functions.invoke('hoku', { body: { text, context, history } })`
  → `{ reply, intent, confidence, entities }`。関数の正本は
  `../supabase/functions/hoku/index.ts`。
