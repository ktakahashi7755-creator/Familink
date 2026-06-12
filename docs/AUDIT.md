# Familink セキュリティ監査（AUDIT）— Critical / High（データ分離中心）

作成: 2026-06-12 / 対象コミット: 4ac0426 時点 / 監査: Security & Data-Isolation

## アーキテクチャ前提（重要・事実確認済み）
- バックエンドは **Supabase 1テーブル `fl_family_data`**（`user_id, family_id, data_key, payload(jsonb)`、`unique(user_id,data_key)`）。
  アプリ状態はキー単位で1行に格納される key-value 型。**個別の業務テーブルは存在しない**。
- **Supabase Storage（バケット）は未使用**。アルバム画像は base64 を `albumPhotos` キーとして
  `fl_family_data` に格納・同期する。→ 画像のアクセス制御は **fl_family_data の RLS に一元化**される。
- クライアントは anon(publishable) キーのみ使用。service_role キーはコード非搭載。

## 重大度別の発見

### Critical
- **C1 RLS の網羅性**: SELECT/INSERT/UPDATE/DELETE すべてにポリシーあり。書き込みは
  `auth.uid() = user_id` に限定され他者行は書けない。読み取りは「自分の全キー or
  同一 family_id かつ共有許可キーのみ」。→ **設計は健全**。ただし下記 C2 の残存リスク。
- **C2 family_id がベアラトークン的**: 読み取り権限は「その family_id の行を1つ持つこと」で
  付与される（`fl_my_family_ids()`）。UPDATE で自分の行の family_id を被害者の値に変更すれば、
  その家族の**共有キーのみ**読めてしまう（private キーは読めない）。コード強度 32^12 が
  唯一の防壁。→ 招待コードの**有効期限・使い捨て化**で露出窓を閉じるべき（H3）。
- **C3 シークレット露出**: service_role / OpenAI キー等がクライアントに無いことを検証する。

### High
- **H1 Storage バケットポリシー**: 現状バケット未使用のため N/A。将来 Storage 移行時に
  備え、family_id プレフィックス＋RLS のひな型を用意しておく（defense-in-depth）。
- **H2 ファイルアップロード検証**: `accept` 属性のみ依存でバイパス可能。非画像/非動画/
  巨大ファイルを明示的に拒否するクライアント側ガードを各入口へ追加する。
- **H3 招待コードの有効期限・使い捨て化**: 現状コードは無期限・複数回利用可（ベアラ）。
  `fl_family_invites` テーブル＋使い捨て redeem RPC を用意し露出を限定する。
- **H4 セッション/未認証リダイレクト**: ローカルファースト構成。未ログイン時は s-ob
  （オンボーディング）へ。Supabase セッションは SDK が自動管理。挙動を検証する。

### 既に対応済み（再確認のみ）
- XSS: 全ユーザー入力は `H()` でエスケープ（過去監査で確認、本監査でも再確認）。
- ログアウトの共有端末データ消去（コミット 7eb3a9f）。
- 家族コード送信の連打抑止（7eb3a9f）。

## 検証方針
- RLS: `docs/security-tests.sql` に**別ユーザーを想定した2ユーザー検証クエリ**を残す
  （`set local role` / `request.jwt.claims` で auth.uid() を偽装し、各操作の許可/拒否を確認）。
  実DBでの実行はユーザーの Supabase 環境で行う（本リポジトリには認証情報を置かない）。
- クライアント側（ファイル検証・未認証リダイレクト・XSS）は Playwright で自動検証。
