# 家族間データ共有：原因と修正（重要・要 Supabase 設定）

> 別端末（家族）とアプリ共有ができない件の **原因究明と修正** の記録。
> **アプリ側の修正は完了済み**。ただし**①下記 SQL を Supabase で1回実行**し、
> **②両者が同じ家族コードでクラウドにログイン**して初めて家族共有が動きます。

---

## 1. 原因（なぜ共有できなかったか）

家族共有が成立していなかった根本原因は **2つ**：

### 原因A：アプリが「自分のデータ」しか取得していなかった
`_fetchFromSupabase()` が `.eq('user_id', 自分)` で問い合わせており、
**家族（別ユーザー）のデータを一切取りに行っていなかった**。
→ 招待コードで familyId を合わせても、他メンバーのデータは画面に出ない。

### 原因B：DB（RLS）が「自分の行」しか読ませない設定だった
Supabase の行レベルセキュリティ(RLS)が
```sql
create policy "users_own_data" ... using (auth.uid() = user_id);
```
＝**自分の行だけ読める**ポリシー。仮にアプリが家族分を要求しても、
DB が他メンバーの行をブロックしていた。

### 補足
- 招待参加処理が familyId をローカル保存するだけで push/fetch を起こしていなかった。
- Realtime は発火していたが、結局「自分の分の再取得」だったため無意味だった。
- 結果：**「同一アカウントの複数端末同期」は動くが、「別アカウント＝家族間の共有」は成立しない**状態だった。

---

## 2. アプリ側の修正（✅ 実装済み・本コミット）

- **family_id で家族全員分を取得**：`familyId` がある場合 `.eq('family_id', S.familyId)` で家族全メンバーの行を取得し、`data_key` ごとにまとめてマージするように変更。
- **共有キー / 個人キーを分離**（`FAMILY_SHARED_KEYS`）：
  - 共有（家族でマージ）：予定・タスク・家計・体調・ボード・持ち物・買い物・メモ・メンバー 等。
  - 個人（自分の行のみ・他人で上書きしない）：タブ設定・ホーム並び・プロフィール・プレミアム状態・通知・アバター・Hoku文脈 等。
- **per-item last-write-wins マージ**（`_mergeSyncArray`）：同一 id は `updatedAt` が新しい方を採用。編集消失を防ぐ。
- **招待参加・コード発行時に push→fetch**：`doSupaInviteSubmit` / `openMyInviteModal` で自分のデータに family_id を付与し、家族分を取得するように。
- 単独利用（familyId なし）は**従来どおり**自分の user_id 分のみ取得（多端末同期は不変）。

---

## 3. ⚠️ Supabase で実行が必要な SQL（①これをやらないと動きません）

Supabase ダッシュボード → SQL Editor で **1回だけ** 実行してください。
（家族メンバーが互いのデータを「読む」ことを許可。書き込みは各自の行のみ）

```sql
-- 自己参照RLSの再帰を避けるため SECURITY DEFINER 関数で自分の family_id を取得
create or replace function fl_my_family_ids()
  returns setof text language sql security definer stable as $$
    select distinct family_id from fl_family_data
    where user_id = auth.uid() and family_id is not null
  $$;

-- 旧ポリシーを置き換え
drop policy if exists "users_own_data" on fl_family_data;

-- 読み取り: 自分の行 OR 自分と同じ family_id（=家族）の行
create policy "family_read" on fl_family_data for select
  using (auth.uid() = user_id or family_id in (select fl_my_family_ids()));

-- 書き込み: 常に自分の行のみ
create policy "own_insert" on fl_family_data for insert with check (auth.uid() = user_id);
create policy "own_update" on fl_family_data for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_delete" on fl_family_data for delete using (auth.uid() = user_id);
```

> Realtime も RLS に従うため、この SELECT 許可があって初めて
> 「家族の変更がリアルタイムに自分へ届く」ようになります。

---

## 4. 家族共有の使い方（②運用手順）

1. **両者ともクラウドにログイン**する（設定 → ストレージ等の導線、またはウェルカムのメールログイン）。
   - ※ ログインしない（ゲスト）端末同士では共有できません（クラウドを介すため）。
2. **招待する側**：設定 →「家族を招待する」でコード（例 `FAMI-XXXX`）を発行・共有。
3. **参加する側**：「招待コードで参加」に同じコードを入力。
4. 参加後、自動で push→fetch が走り、家族のデータが取得される。
   - 以降は保存のたびに自動同期＋Realtimeで相手の変更も届く。

---

## 5. テスト手順（2端末 or 2アカウント）

1. 端末A：ログイン → 予定/タスクを数件追加 → 「家族を招待する」でコード取得。
2. 端末B：別アカウントでログイン → 「招待コードで参加」にAのコードを入力。
3. 端末B に A の予定/タスクが出れば成功。
4. 端末B で1件追加 → 端末A に（数秒で）反映されれば Realtime も成功。

---

## 6. 既知の注意点 / 今後

- 参加時、参加者の**ローカルの既存データ（デモ含む）も family_id 付きで共有**される。新規参加者は早めに参加するのが綺麗。将来、参加時に「自分のデータを持ち込む / 家族のデータのみ使う」の選択肢を出すと親切。
- `members`（家族メンバー一覧）も共有対象。両者が別々に初期メンバーを作っていると統合時に重複表示の可能性 → 重複整理UIは将来課題。
- 本格的な権限管理（誰が何を編集可能か）・サーバ側バリデーションは将来のバックエンド強化で。
