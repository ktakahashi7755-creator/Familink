# 認証・クラウド同期 設計計画（Wave 66）

Familink に「本物のログイン」「家族同期」「クラウド保存」を導入するための、
段階的な設計・移行計画です。**既存 LocalStorage データの保護を最優先**とします。

---

## 1. 現在のログイン風 UI の問題

- `S.loggedIn` / `S.user` は存在するが、**本物のアカウント認証ではない**
- メールアドレスを入力するだけでログイン扱い（パスワード認証なし）
- サーバ側ユーザー ID / 家族グループ ID がない
- クラウド DB / Storage がない
- 別端末で同じデータを見られない（機種変で消える）
- 家族（夫婦）で同じ予定・体調・家計を共有できない

## 2. ログアウトでデータが消える問題（Wave 66 で解消済み）

調査の結果、現行 `doLogout()` は `S.loggedIn=false; S.user=null` のみで、
**家族データは元々削除していなかった**。ただし誤解を生まないよう Wave 66 で：
- ログアウト確認文に「データはこの端末に残ります」を明記
- 確定処理を `_logoutConfirmed()` に分離（テスト可能化）
- トーストを「ログアウトしました（データは保持されています）」に変更

## 3. ログアウトとデータ初期化の分離（Wave 66 で実装済み）

| 操作 | 挙動 |
|---|---|
| ログアウト | ログイン状態のみ解除。家族データ・authMode・familyId は保持 |
| データを初期化 | 家族データを全削除。**二段階確認**（モーダル + 「削除」文字入力）必須 |

`execDataReset()` は入力欄が「削除」のときのみ実行。ボタンは未入力時 disabled。

---

## 4. 本物ログインに必要な要素

- ユーザー認証（メール+パスワード / OAuth）
- サーバ側ユーザー ID（auth.users）
- プロフィール（display_name / avatar）
- 家族グループ（families）と所属（family_members）
- クラウド DB（予定・タスク・家計 等）
- クラウド Storage（写真・書類）
- Row Level Security（家族単位のアクセス制御）
- セッション管理 / トークン更新
- 連携解除・退会フロー

## 5. Supabase Auth 案（第一候補）

- メール+パスワード認証が標準で使える
- Google OAuth 対応、Apple サインインも設定可能
- Postgres ベース → 家族グループ / 権限を SQL で素直に設計できる
- DB・Storage・Auth が同一基盤（運用がシンプル）
- Row Level Security をテーブル単位で宣言的に書ける
- リアルタイム購読（家族同期）に対応
- 個人開発〜MVP でも無料枠で始められる

## 6. Firebase Auth 案（比較）

- Auth が強力、モバイル事例が豊富
- Firebase Storage / Cloud Messaging（プッシュ通知）との相性が良い
- ただし Firestore は NoSQL で家族グループ権限設計がやや煩雑
- 事業売却・資金調達時の説明は SQL ベースのほうが明快

## 7. Supabase を第一候補にする理由

1. 家族グループ・招待・権限を **SQL + RLS** で堅牢に設計できる
2. Auth / DB / Storage が一体 → 学習・運用コストが低い
3. リアルタイム同期で「夫婦で即反映」を実現しやすい
4. Postgres は事業 DD（デューデリ）で説明しやすい資産になる

**結論**：v0.3 で Supabase Auth/DB/Storage を導入、v1.0（App Store 版）で本格運用。

---

## 8. ローカルモード / クラウドモードの設計

| | ローカルモード | クラウドモード |
|---|---|---|
| ログイン | 不要 | Supabase Auth |
| 保存先 | LocalStorage | Supabase DB / Storage |
| 家族同期 | なし | family_id 単位で同期 |
| 別端末復元 | 不可 | 可能 |
| 用途 | デモ / 試用 | 本利用 |

Wave 66 で `S` に準備済み（PERSIST 追加済み）：
```js
S.authMode = 'local' | 'cloud'          // 既定 'local'
S.authUser = null | { id, email, displayName }
S.familyId = ''
S.syncStatus = 'local' | 'syncing' | 'synced' | 'error'
S.lastSyncedAt = ''
S.migrationStatus = { localToCloudPrompted, lastMigrationAt, migratedKeys }
```

**いきなり全ユーザーをクラウド化しない。** ローカルモードは恒久的に残す。

## 9. 家族グループ設計

- 1 ユーザーが 1 つ以上の家族（families）に所属
- family の owner が招待コードを発行
- family_members で profile と家族メンバー（太郎・花子 等）を紐付け
- 役割（role）：owner / parent / member / child

## 10. 家族招待コード設計

- `family_invites` に推測されにくいコード（例：英数字 8〜10 桁）を生成
- 有効期限（expires_at）を設定（例：7 日）
- 招待受諾で family_members に行追加
- 使用済み / 期限切れコードは無効化

---

## 11. 既存 LocalStorage → クラウド移行設計

ログイン後に選択モーダルを表示：
> 「この端末のデータをクラウドに保存しますか？」
> ・クラウドに保存する ・あとで ・この端末だけで使う

移行ルール：
- ローカル ID を保持、または remoteId を付与
- createdAt / updatedAt を保持
- memberId 対応を維持
- 重複チェック（externalId / 内容一致）
- **移行失敗時はローカルデータを消さない**
- 移行成功後も一定期間ローカルにバックアップ保持

移行対象キー：members / events / tasks / txs / health / prep / prepRoutines /
shoppingItems / shoppingFrequent / shoppingHistory / docs / albumPhotos /
customBoards / boardItems / announces / notifs / 各種設定。

`S.migrationStatus` で進捗を管理。

## 12. DB テーブル案

profiles / families / family_members / events / tasks / transactions /
recurring_transactions / health_records / prep_items / prep_routines /
shopping_items / documents / album_photos / family_invites

各テーブルに `family_id`（または profile 紐付け）/ `created_by` /
`created_at` / `updated_at` を持たせる。詳細フィールドは本ドキュメントの
別表（要件定義）で管理。

## 13. Storage 設計

- バケット：`documents`（書類）/ `album`（写真）/ `avatars`（アバター）
- パス規約：`{family_id}/{record_id}/{filename}`
- アクセスは family_id 単位の Storage ポリシーで制御
- アップロードは署名付き URL 経由

## 14. RLS / セキュリティ方針

- 全テーブルで Row Level Security を有効化
- ポリシー：`family_id IN (SELECT family_id FROM family_members WHERE profile_id = auth.uid())`
- 自分が所属しない family_id は読み書き不可
- Service Role Key は**絶対にフロントへ置かない**
- フロントで使うのは anon key のみ（RLS 前提）
- 招待コードは有効期限つき、推測困難な値

## 15. プライバシーポリシー更新項目

- クラウドに保存される情報の種類
- 保管場所・保管期間
- 家族メンバー間の共有範囲
- 写真・書類の取り扱い
- アカウント削除・退会時のデータ削除
- 第三者提供しない旨

## 16. ロードマップ

| バージョン | 範囲 |
|---|---|
| **v0.2（Wave 66 / 現在）** | ログアウト安全化 / データ初期化分離 / アカウント UI / 認証設計ドキュメント |
| v0.3 | Supabase プロジェクト作成 / Auth（メール）/ profiles・families テーブル |
| v1.0 | App Store 版 / 家族同期 / クラウド DB 保存 / 移行フロー |
| v1.5 | リアルタイム同期 / 写真・書類 Storage / 連携解除 |
| v2.0 | 学校・園カレンダー連携 / プレミアム同期機能 |

## 17. 今回（Wave 66）の実装範囲

- ログアウトでデータを消さない（確認文・トースト・関数分離）
- データ初期化を独立操作化（二段階確認）
- 設定に「アカウントと同期」セクション（ローカルモード表示）
- 「ログインして同期」→ 説明モーダル（未実装を正直に明示）
- `S.authMode` 等のキー追加 + PERSIST 登録
- Hoku の login_help / sync_help / backup_help intent
- 本ドキュメント + `docs/security-auth-notes.md`

## 18. 次 Wave で確認すべきこと

- Supabase プロジェクトの作成可否（ユーザー判断）
- 無料枠の制限（DB 容量 / Storage / 帯域）
- App Store 版のラッパー方式（Capacitor / WebView）
- Apple サインインの審査要件
- プライバシーポリシーの法務確認
