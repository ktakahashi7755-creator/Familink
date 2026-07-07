# 06. セキュリティ・プライバシー・脅威モデル

Familink は家族情報・子ども情報・体調・家計・写真・書類という**高プライバシー情報**を扱う。セキュリティは最優先の非機能要件。

## 6.1 セキュリティ原則（絶対遵守）
1. **パスワード/OTP は必ず本人が入力**。アプリが代行・推測・平文保存しない。
2. **家族間データの完全分離**：別家族のデータは読み書き不可。**サーバ側 RLS で担保**し、クライアント判定に依存しない。
3. **課金状態はサーバ権利（`fl_entitlements`）を正本**。クライアント改ざんで付与できない。
4. 入力は `H()` でエスケープ（XSS）。ファイルは種別・サイズ検証。**秘密鍵（service_role/Stripe secret/VAPID private/OpenAI）はクライアント・リポジトリに置かない**。

## 6.2 認証
- Supabase Auth（メール＋パスワード主／OAuth任意）。セッションは Supabase が LocalStorage の `sb-…` キーに保持。
- クライアントは **anon/publishable キーのみ**保持。`SUPABASE_URL`・publishable キーは公開情報として扱う（RLS が守りの本体）。

## 6.3 家族分離（RLS）— 守りの本体
`fl_family_data` に対する RLS：
```sql
-- 自己参照RLSの再帰回避
create or replace function fl_my_family_ids()
  returns setof text language sql security definer stable as $$
    select distinct family_id from fl_family_data
    where user_id = auth.uid() and family_id is not null $$;

create policy "family_read" on fl_family_data for select using (
  auth.uid() = user_id
  or (family_id in (select fl_my_family_ids())
      and data_key = any(array[/* = FAMILY_SHARED_KEYS と一致させる */
        'events','tasks','txs','health','posts','announces','prep','prepRoutines',
        'folders','docs','albumPhotos','shoppingItems','shoppingFrequent','members',
        'customBoards','boardItems','boardSections','recurringTxs','memos','memoFolders',
        'workspaces','homeNote','_deletions'])));
create policy "own_insert" on fl_family_data for insert with check (auth.uid() = user_id);
create policy "own_update" on fl_family_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_delete" on fl_family_data for delete using (auth.uid() = user_id);
```
- **効果**：予定/タスク/家計/体調等の**家族共有データは見えるが**、`userProfile / hokuContext / isPremiumUser /
  cashflowSettings / notifs` 等の**個人・端末固有データは家族でも読めない**。
- **書き込みは常に自分の行のみ**。他人の行を改変できない。
- **不変条件**：allowlist（RLS）と `FAMILY_SHARED_KEYS`（アプリ）を必ず一致させる（ズレると漏洩 or 共有不能）。
- 検証：`docs/security-tests.sql`（ローカル Postgres で分離を実証）。本番は RLS 適用が前提。

## 6.4 XSS 対策
- ユーザー入力は原則 HTML に直接挿入しない。挿入時は必ず `H()` でエスケープ。
- `innerHTML` を新規追加する際は含まれる変数がすべて `H()` 済みか確認（家族名・予定・メモ・家計説明・ボード本文・コメント等）。
  - 例：本セッションで **ワークスペース名の `H()` 漏れ（保存型XSS）を検出・修正**。同種の再発防止として innerHTML 追加時のレビュー必須。
- 外部リンクの `window.open(url,'_blank')` には `'noopener,noreferrer'`。

## 6.5 ファイル/入力検証
- 画像/動画/JSON は MIME・拡張子・サイズの三点で検証（`_validateUploadFile`）。非対応は理由付きで中断。
- 数値/日付は NaN ガード。長文は `word-break/overflow-wrap` で崩れ防止。
- 二重送信は `_lockSubmit(key)`（700ms）で防止（全保存系）。

## 6.6 課金の真正性
- `fl_entitlements` は Webhook（service_role）だけが書き込む。クライアントは `fl_my_premium` ビューを読むだけ（RLS）。
- `isPremium()` は `S._serverEntitlement`（サーバ権利）を最優先。ローカルのトライアル/フラグはフォールバック。
- Stripe Webhook は署名検証（`STRIPE_WEBHOOK_SECRET`）で真正性を担保。

## 6.7 Web Push の秘密管理
- VAPID **公開**鍵のみクライアント。**秘密**鍵は Edge Function シークレット。購読は本人のみ操作（RLS）。

## 6.8 プライバシー方針（プロダクト表現）
- トラッキング/広告SDK/解析の自動送信なし。端末識別子・位置情報・カード情報を収集しない。
- ゲスト利用は端末内のみ保存。クラウド時のみ Supabase（EU/アイルランド）に暗号化保存。
- 音声は端末側 Web Speech API で処理し、音声データはサーバへ送らない。
- 13歳未満本人の利用は想定しない（保護者が子ども情報を記録する用途）。
- 医療/家計/AIは「記録・提案の支援」であり専門的助言の代替でない旨を常設。緊急時は #7119/119 等を案内。
- 法的文書はアプリ内に内蔵（`LEGAL_TERMS` / `LEGAL_PRIVACY`）＋ HP 掲載用テンプレを提供。

## 6.9 脅威モデル（要点）
| 脅威 | 対策 |
|---|---|
| 別家族のデータ閲覧 | RLS（family_read allowlist）・クライアント判定に依存しない |
| 保存型XSS（家族名/メモ等） | `H()` エスケープ徹底・innerHTML追加時レビュー |
| 課金の改ざん（無料で有料機能） | サーバ権利正本・Webhook署名検証 |
| 秘密鍵漏洩 | クライアント/リポジトリに置かない・Edge Functionシークレットのみ |
| 端末紛失/データ消失 | ローカルの脆さを明記・クラウド同期/エクスポートを案内 |
| なりすまし招待 | 招待トークン失効・参加はログイン必須 |

## 6.10 リリース前セキュリティゲート
1. RLS 適用済み・分離テスト合格（`security-tests.sql`）。
2. XSS：新規 innerHTML の `H()` 済み確認・秘密情報の混入0。
3. 課金：クライアントから権利を書けないことを確認。
4. 依存：新規CDN/依存の追加なし（追加は人間確認）。
- 詳細は `docs/AUDIT.md` / `docs/security-audit.md` / `docs/pre-release-audit.md`。
