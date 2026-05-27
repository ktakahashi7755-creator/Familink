# Familink — Supabase バックエンド導入 設計書

最終更新：2026-05-24（Wave 202 反映） / 状態：**Phase 4-2 / 4-3 実装着手済み・Phase 4-4 以降は要オーナー（テーブル/RLS 反映）**

オーナー決定事項（2026-05-17）：
- 複数端末をまたいだ家族内共有を行う → **バックエンド必須**
- **Supabase で本物のデータベースを構築**する

Wave 202 着手済み事項（2026-05-24）：
- Supabase プロジェクトの URL と publishable key 受領、フロントに公開キーのみ埋め込み
- supabase-js v2 を CDN（jsdelivr UMD）で defer 読み込み、CDN 失敗時は安全フォールバック
- ウェルカム画面に 3 ボタン入口（ログイン / ゲスト体験 / 招待コード）
- メール + パスワードでのサインアップ / ログイン / ログアウト（モーダル + 日本語エラー）
- 設定画面に「クラウド連携（ベータ）」セクション（未ログイン / ログイン中で出し分け）
- `syncToSupabase` / `syncFromSupabase` はスタブ実装（Phase 4-4 を待ち、接続のみ確認のトースト）
- 残：オーナー側のテーブル/RLS 反映 → 同期本実装 → Realtime → 招待コード本実装

本書は 6 家族（オーナー家族 + 知人 5 家族）が実運用するための、
認証・家族単位のデータ分離・招待コードの設計と、オーナーの作業手順を示す。

---

## 1. 目的・要件

| 要件 | 実現方法 |
|---|---|
| 家族ごとにログインできる | Supabase Auth（メール + パスワード）|
| 家族内では複数端末で共有 | Supabase DB（クラウド保存）+ リアルタイム同期 |
| 他家族のデータにアクセスできない | **RLS（行レベルセキュリティ）** で family_id 単位に隔離 |
| 招待コードで家族に参加 | families.invite_code + join_family() RPC |
| 既存の端末内データを引き継ぐ | 初回ログイン時にローカル → クラウドへ移行 |
| オフラインでも動く | LocalStorage をキャッシュとして併用 |

---

## 2. 全体アーキテクチャ

```
┌─────────────────────────┐     HTTPS / Realtime      ┌──────────────────┐
│  Familink（単一HTML）     │ ───────────────────────▶ │  Supabase         │
│  GitHub Pages 配信        │                          │  - Auth（認証）    │
│  - LocalStorage（キャッシュ）│ ◀─────────────────────── │  - Postgres + RLS │
│  - supabase-js（CDN）      │     家族のデータのみ        │  - Realtime       │
└─────────────────────────┘                          └──────────────────┘
```

- フロントは単一 HTML のまま（GitHub Pages 配信は維持）。
- `supabase-js` は CDN から読み込む（npm 不使用の方針を維持）。
- **anon key はフロントに置いてよい**（公開前提のキー）。データ保護は RLS が担保する。
- service_role key は**絶対にフロントに置かない**（管理用・サーバー専用）。

---

## 3. 認証モデル

### 3.1 ユーザーとメンバーの関係

- **ユーザー（auth.users）**：実在の利用者（パパ・ママ等）。メール + パスワードでログイン。
- **家族（families）**：1 つの家族。作成者が最初のユーザー。
- **family_members**：ユーザー ↔ 家族の所属。1 ユーザー = 1 家族（MVP）。
- アプリ内の「メンバー」（パパ/ママ/子ども等）は従来どおり family_data に保持。
  ログインユーザーは family_members.app_member_id で「自分がどのメンバーか」を持つ。

### 3.2 ログイン方式

- メールアドレス + パスワード（Supabase Auth 標準）。
- 新規家族作成：サインアップ → families を作成 → invite_code 発行。
- 既存家族へ参加：サインアップ → 招待コード入力 → join_family() で所属。

---

## 4. データベース設計

### 4.1 方針：最小スキーマ + JSONB

既存アプリのデータ（events / tasks / txs …）は JS オブジェクト配列。
スキーマ変更を最小化するため、**1 テーブルに集約**する：

```sql
-- 家族
create table families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  plan text not null default 'free',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- ユーザー ↔ 家族の所属
create table family_members (
  user_id uuid not null references auth.users(id),
  family_id uuid not null references families(id) on delete cascade,
  role text not null default 'member',          -- 'owner' | 'member'
  app_member_id text,                            -- アプリ内メンバー（kenya 等）
  display_name text,
  joined_at timestamptz not null default now(),
  primary key (user_id)
);

-- 家族の全データ（events / tasks / txs … を1テーブルに）
create table family_data (
  family_id  uuid not null references families(id) on delete cascade,
  collection text not null,        -- 'events' | 'tasks' | 'txs' | 'health' …
  item_id    text not null,        -- アプリ側の各レコード id
  data       jsonb not null,       -- レコード本体
  updated_at timestamptz not null default now(),
  deleted    boolean not null default false,
  primary key (family_id, collection, item_id)
);
create index on family_data (family_id, collection);
```

`collection` に入る値（既存 PERSIST 由来）：
events / tasks / txs / recurringTxs / health / prep / prepRoutines /
announces / posts / notifs / shoppingItems / shoppingFrequent /
shoppingHistory / customBoards / boardItems / boardSections /
folders / docs / albumPhotos / members

> 端末ごとの UI 設定（homeOrder / budgetTab / shoppingTab 等）は
> 共有不要なため LocalStorage に残す。

### 4.2 RLS（行レベルセキュリティ）— 分離の核心

```sql
alter table families       enable row level security;
alter table family_members enable row level security;
alter table family_data    enable row level security;

-- 自分の所属家族 id を返す（補助関数）
create or replace function my_family_id() returns uuid
  language sql stable security definer as
  $$ select family_id from family_members where user_id = auth.uid() $$;

-- families: 自分の家族のみ参照可
create policy fam_select on families for select
  using ( id = my_family_id() );

-- family_members: 自分の所属のみ
create policy fm_select on family_members for select
  using ( family_id = my_family_id() );

-- family_data: 自分の家族のデータのみ 参照/追加/更新/削除
create policy fd_all on family_data for all
  using      ( family_id = my_family_id() )
  with check ( family_id = my_family_id() );
```

**この RLS により、ログインユーザーは自分の家族の行しか読めない・書けない。**
他家族のデータは、たとえクライアントを改変しても DB が拒否する。
= アプリ側の実装ミスに依存しない、データベースレベルの確実な分離。

### 4.3 招待コードで家族に参加（RPC）

```sql
create or replace function join_family(code text)
  returns uuid language plpgsql security definer as $$
declare fam uuid;
begin
  select id into fam from families where invite_code = code;
  if fam is null then raise exception 'invalid_code'; end if;
  insert into family_members (user_id, family_id, role)
    values (auth.uid(), fam, 'member')
    on conflict (user_id) do update set family_id = fam;
  return fam;
end $$;
```

新規家族作成も RPC（create_family）で families + family_members を一括作成。

---

## 5. 招待コード運用

- 形式：8 文字（英大文字 + 数字、紛らわしい 0/O・1/I を除外）。例：`FAM7K2QX`。
- 家族作成時に自動発行。設定画面に表示・コピー可。
- 知人家族へは「アプリ URL + 各家族の招待コード」を個別に渡す。
- 招待コードは家族 1 つにつき 1 本。漏洩時はオーナーが再発行できる設計にする。

---

## 6. 既存データの移行

初回ログイン時：
1. その家族の family_data が空、かつ端末に LocalStorage データがある場合、
   確認モーダルを出して「この端末のデータをこの家族にアップロード」。
2. 以降はクラウドが正。LocalStorage はキャッシュ。

---

## 7. 同期戦略

- **ログイン後**：family_data を全件取得し S.* に反映。
- **書き込み時**：S.* 更新 → LocalStorage 保存 → Supabase に upsert（オンライン時）。
- **オフライン時**：LocalStorage に保留キューを持ち、オンライン復帰時に送信。
- **他端末の更新**：Supabase Realtime を購読し、変更を受信して画面更新。
- 競合は updated_at の新しい方を採用（last-write-wins、MVP 範囲）。

---

## 8. オーナーのセットアップ手順（実装着手前に必要）

1. https://supabase.com で無料アカウントを作成
2. 新規プロジェクトを作成（リージョン：Tokyo 推奨）
3. SQL エディタで本書 §4 の SQL（最終版は実装時に提供）を実行
4. Authentication 設定でメール認証を有効化
5. プロジェクトの **Project URL** と **anon public key** を控える
6. それらを Familink の設定画面（実装後に追加）に入力 → 連携完了

> service_role key は使わない・共有しない。anon key のみ使用。

---

## 9. 実装フェーズ計画

| Phase | 内容 | 状態 |
|---|---|---|
| 4-0 | 本設計書（確認）| ☑ 本書 |
| 4-1 | オーナーが Supabase プロジェクト作成 + SQL 実行 | ◐ プロジェクト作成 + 公開キー受領済 / SQL 未確認（要オーナー） |
| 4-2 | ログイン / サインアップ / 招待コード画面（UI）| ☑ Wave 202 で実装（招待は受付スタブ） |
| 4-3 | supabase-js 連携・認証フロー | ☑ Wave 202 で実装（onAuthStateChange / セッション永続化） |
| 4-4 | family_data 同期レイヤー（読み書き + 移行）| ☐ Phase 4-1 の SQL 反映後に着手 |
| 4-5 | Realtime 購読（複数端末リアルタイム反映）| ☐ |
| 4-6 | 6 家族でのテスト運用・調整 | ☐ |

---

## 10. セキュリティ / プライバシー

- データ分離は RLS が DB レベルで保証（クライアント実装に依存しない）。
- パスワードは Supabase Auth が管理（アプリは平文を扱わない）。
- anon key は公開前提。service_role key はフロントに置かない。
- 通信は HTTPS。
- プライバシーポリシーを「端末内のみ保存」から「Supabase に家族データを
  保存」へ改訂が必要（実装時に privacy-policy を更新）。

---

## 11. コスト

- Supabase 無料枠：DB 500MB / 月間アクティブ 5 万人 / Realtime 200 接続。
  6 家族（〜30 人）の実運用は無料枠で十分に収まる。
- 規模拡大時は Pro プラン（月 25 USD〜）。

---

## 12. 次のアクション

1. オーナーが本設計書を確認
2. §8 の手順で Supabase プロジェクトを作成
3. Project URL / anon key を共有 → Phase 4-2 以降の実装を開始

> 本書は CLAUDE.md §10.2「DB / Supabase 移行・認証・外部サービス連携」に
> 該当する大型変更。設計→確認→セットアップ→実装の順で安全に進める。
