# 商用リリース前タスク（client側で完結しない・要人間確認/環境）

最終更新: 2026-06-12 / 監査コミット: 7eb3a9f

このセッションでクライアント側の確定P0/P1（ログアウトのデータ保護・削除の正直化・
共有キー整合・連打防止・動画上限）は実装済み。以下は Supabase ダッシュボード設定・
サーバ再デプロイ・実機検証を要するため、人間確認のうえ着手する。

## 1. OAuth（Google / Apple）の実機検証 — 優先度: 高
- 現状: `signInWithOAuth({ redirectTo: location.origin + ... })` 実装済み。ただし
  GitHub Pages 本番URLでのコールバック往復が未検証。
- 完了条件:
  - [ ] Supabase Authentication → Providers で Google/Apple を有効化
  - [ ] Redirect URLs に `https://ktakahashi7755-creator.github.io/Familink/` を登録
  - [ ] 実機（iOS Safari）で Google ログイン → アプリに戻り s-home まで到達
  - [ ] Apple も同様（Apple は審査でSign in with Apple必須になる場合あり）
- 未対応時の暫定: メール＋パスワード / メールOTP は動作するため、OAuthボタンは
  「準備中」表示にするか非表示にする判断を行う。

## 2. パスワード再設定の完了UI — 優先度: 高
- 現状: `resetPasswordForEmail` で再設定メール送信は実装済み。メール内リンクから
  戻った後に「新パスワードを入力」するアプリ内フォームが未実装。
- 完了条件:
  - [ ] `detectSessionInUrl:true` でリンク復帰時に PASSWORD_RECOVERY イベントを検知
  - [ ] 新パスワード入力モーダルを表示し `updateUser({ password })` で確定
  - [ ] 実機でメールリンク→新パスワード設定→ログインまで通す
- 暫定: 「メールでコードを受け取る(OTP)」方式でパスワード無しログインが可能な旨を案内済み。

## 3. Edge Function のサーバ側レート制限 — 優先度: 中
- 現状: クライアント側でOCR月1-30回・Hoku日次上限により濫用は実質抑止済み。
  ただしサーバ側（/functions/v1/hoku, /calendar-scan）に独立のレート制限は無い。
- 完了条件:
  - [ ] 各 Edge Function に per-user（JWT sub単位）の時間窓レート制限を追加
        （例: Hoku 20回/時、calendar-scan 5回/時）。Deno KV もしくは
        fl_rate_limit テーブルでカウント。
  - [ ] 超過時 429 を返し、クライアントは優しい上限案内を表示
  - [ ] OpenAI 使用量を Supabase ログで日次モニタリングする運用を用意

## 4. アカウント完全削除（auth.users）— 優先度: 中
- 現状: クライアントは fl_family_data 行を削除し signOut するが、auth.users 本体は
  anon キーでは削除不可（admin権限が必要）。同じメールで再登録は可能な状態。
- 完了条件:
  - [ ] 退会を受け付ける Edge Function（service_role でユーザー削除）を用意
        ※ service_role キーは Edge Function の環境変数にのみ置く（クライアント禁止）
  - [ ] クライアントの confirmDeleteAccount からそれを呼ぶ
- 暫定: 現状でも個人データ（fl_family_data）は消えるため実害は限定的。App Store の
  「アカウント削除」要件は満たすが、メール再利用可の点はリリースノートに明記。

## 5. アルバム巨大base64のクラウド同期最適化 — 優先度: 中（将来）
- 現状: albumPhotos は base64 のまま fl_family_data(JSONB) に同期。多枚数で
  ペイロードが肥大しコスト/速度に影響しうる。
- 将来対応: Supabase Storage バケット + 署名URL へ移行（写真本体はStorage、
  メタdata only をテーブルへ）。LocalStorage 5MB制約の解消にもなる（IndexedDB併用）。
- 注: CLAUDE.md §14.3 の「LocalStorage構造変更」に該当 → 必ず人間確認。
