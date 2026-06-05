# Supabase セキュリティ強化 / 脆弱性監査（公開前）

最終更新: 2026-06-05 / 対象版数: v20260604y / 監査: 自動 + 手動

このドキュメントは「Supabase 認証を固く・抜き取り/脆弱性チェック」の結果と、**公開前に必須の対応**をまとめる。クライアント側（HTML）の安全性は良好だが、**データ保護の本体はサーバ側 RLS と family_id の強度**にある。RLS の適用と family_id 強化は **Supabase ダッシュボード/本体コードへの変更**であり、`CLAUDE.md §7/§14.3` により**人間確認が必要**。

---

## 1. クライアント側監査（結果：良好）

| 項目 | 結果 |
|---|---|
| 秘密鍵の露出 | なし（anon/publishable キーのみ。service_role 不在）✅ |
| `eval` / `new Function` | アプリ内 0 件 ✅ |
| `console.log` デバッグ残骸 | 0 件 ✅ |
| XSS（innerHTML 未エスケープ） | 監査済み。ユーザー入力は `H()` か `textContent` 経由で安全 ✅ |
| `window.open` の `noopener` | 漏れなし ✅ |
| QA 自動テスト | 84/84 PASS ✅ |

---

## 2. 🔴 重大: family_id が総当たり可能（要修正）

### 現状
```js
function _generateFamilyId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32種
  let s = 'FAMI-';
  for(let i=0;i<4;i++) s += chars[Math.floor(Math.random()*chars.length)]; // 4桁
  return s;
}
```
- 候補数 = **32^4 ≈ 約105万通り**。`Math.random()`（暗号学的に安全でない）。
- 家族共有は「family_id を知っていれば参加・閲覧できる」設計のため、family_id は実質**ベアラ・トークン（合言葉）**。
- RLS が family_id 一致で SELECT を許可していると、**総当たりで他家族の体調/家計/子ども情報が抜き取られ得る**。

### 推奨修正（クライアント）
暗号学的乱数で十分に長い ID にする（例: 16 文字 = 32^16 ≈ 1.2×10^24 通り）。既存家族の ID は不変なので後方互換。
```js
function _generateFamilyId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const n = 16;
  let out = '';
  try {
    const buf = new Uint32Array(n);
    crypto.getRandomValues(buf);
    for (let i = 0; i < n; i++) out += chars[buf[i] % chars.length];
  } catch (_) {
    for (let i = 0; i < n; i++) out += chars[Math.floor(Math.random() * chars.length)];
  }
  // 4文字ごとに区切って共有しやすく: FAMI-XXXX-XXXX-XXXX-XXXX
  return 'FAMI-' + out.replace(/(.{4})/g, '$1-').replace(/-$/, '');
}
```
> 表示・コピー UX は「コードをコピー」ボタン＋QR で長さの不便を吸収する。

---

## 3. 🔴 重大: RLS（Row Level Security）の適用（サーバ側・必須）

anon キーは公開前提のため、**RLS が無効/不適切だと誰でも全行を読み書きできる＝全データ漏洩**。Supabase ダッシュボード（SQL Editor）で以下を適用・検証する。

```sql
-- 1) RLS を有効化（最重要）
alter table public.fl_family_data enable row level security;

-- 2) 書き込みは本人の行のみ（user_id = 自分）
create policy "own_insert" on public.fl_family_data
  for insert with check (auth.uid() = user_id);
create policy "own_update" on public.fl_family_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_delete" on public.fl_family_data
  for delete using (auth.uid() = user_id);

-- 3) 読み取り: 自分の行 + 自分が所属する家族の行
--    「所属」= 自分自身がその family_id の行を1つ以上持っていること
create policy "read_own_or_family" on public.fl_family_data
  for select using (
    auth.uid() = user_id
    OR (
      family_id is not null
      AND family_id in (
        select d.family_id from public.fl_family_data d
        where d.user_id = auth.uid() and d.family_id is not null
      )
    )
  );
```
> この設計でも「family_id を知る＝その家族に1行書けば参加できる」ため、**family_id の強度（§2）が前提**。より堅牢にするには別途 `family_members(user_id, family_id, joined_at)` テーブル＋招待検証を設け、RLS をそのテーブル参照に切り替える（中期対応）。

### 検証手順（ダッシュボード）
1. SQL Editor で `select * from fl_family_data;` を **anon ロール**で実行 → RLS 有効なら自分の行以外は返らない。
2. 別ユーザーの family_id を直接指定して取得を試み、**0 件**になることを確認。

---

## 4. 認証設定（Supabase ダッシュボード Authentication）

| 設定 | 推奨 |
|---|---|
| Email confirmation | **ON**（確認メール必須。なりすまし登録防止） |
| Minimum password length | 8 以上 |
| Leaked password protection | ON（HaveIBeenPwned 連携） |
| Rate limiting | 既定を維持/強化（総当たり対策） |
| Redirect URLs | 本番 URL のみ許可（`https://ktakahashi7755-creator.github.io/Familink/`）。ワイルドカード乱用しない |
| JWT 有効期限 | 既定（過度に長くしない） |

---

## 5. 公開前チェックリスト（必須）

- [ ] **テスト用バックドアの削除**（最重要）
  - `_setupCoinTestGrant`（コインバッジ長押しで +5000）→ **削除**
  - `#qa-debug` テストパネル（コイン付与/リセット）→ 削除 or 厳重ゲート
- [ ] family_id を §2 の強化版に変更
- [ ] RLS（§3）を適用し、ダッシュボードで漏洩テスト
- [ ] 認証設定（§4）を適用
- [ ] CSP の connect-src が Supabase のみであることを再確認（現状 OK）
- [ ] 招待コード入力のレート制限/試行回数制限（総当たり対策。クライアント側にも試行間隔）

---

## 6. 監査メモ
- 本体（単一 HTML / Vanilla JS）構成・anon キーのみ・CSP 設定は適切。
- 最大リスクは **family_id 強度 + RLS** の2点。ここを固めれば家族データ保護は実用水準に到達。
- 参照: `CLAUDE.md §12.1/§13`、`docs/security-audit.md`
