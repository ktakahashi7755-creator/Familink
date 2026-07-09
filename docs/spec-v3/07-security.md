# Familink セキュリティ設計書

**文書番号**: SPEC-v3-07 ／ **版**: 1.0 ／ **作成日**: 2026-07-07 ／ **正本**
**対象読者**: エンジニア・セキュリティ監査担当・技術デューデリジェンス担当

> 本書は Familink のセキュリティ設計の正本である。アーキテクチャは `03-architecture.md`、
> データ詳細は `05-data-design.md`、サーバ処理は `06-api-edge-functions.md` を参照。
> 運用ルールの上位規範は `CLAUDE.md` §13（セキュリティ・リスクマネジメント方針）。
> 監査履歴は `docs/AUDIT.md` / `docs/security-audit.md` / `docs/supabase-security-hardening.md`。

---

## 1. セキュリティ原則（5 原則・絶対遵守）

CLAUDE.md §0「セキュリティ原則」を設計上の最上位規範とする。

| # | 原則 | 実装上の意味 |
|---|---|---|
| 1 | **本人入力の原則** | パスワード・認証コード（OTP）は必ず本人が入力する。アプリが代行・推測・平文保存しない。決済モーダルは `autocomplete="off"`（β時）、パスワードは Supabase Auth に委譲しアプリは保持しない |
| 2 | **家族間データの完全分離** | 別家族のデータは読み書き不可。担保は**サーバ側 RLS のみ**で、クライアント判定に依存しない（§4）。`docs/security-tests.sql` で機械的に実証可能 |
| 3 | **課金状態はサーバ権利が正本** | `fl_entitlements` が正本。書き込みは service_role（Stripe Webhook）のみ。クライアント改ざんでは premium を付与できない（§6） |
| 4 | **入力エスケープ** | ユーザー入力は `H()` でエスケープしてから HTML に挿入。ファイルは MIME/拡張子/サイズの三点検証（§5） |
| 5 | **秘密鍵非搭載** | service_role / OpenAI / Stripe / VAPID 秘密鍵はクライアント・リポジトリに一切置かない。クライアントは anon(publishable) キーのみ（§7） |

---

## 2. 脅威モデル

### 2.1 保護対象資産

Familink は高プライバシー情報を扱う前提で設計する（CLAUDE.md §13 冒頭）。

| 資産 | 内容 | 保存場所 |
|---|---|---|
| 家族構成情報 | メンバー名・役割（親/子）・アバター | LocalStorage `familink_v3` ＋ `fl_family_data`（家族共有） |
| 子ども情報 | 体調記録（体温・症状・服薬・通院）・成長記録 | 同上 |
| 家計情報 | 収支・カテゴリ・固定収支・キャッシュフロー | 同上 |
| 写真・動画・書類 | base64（保険証・お便り等を含みうる） | 同上 |
| 認証情報 | Supabase セッション（`sb-*`）・ローカルアカウント（passHash） | LocalStorage（SDK 管理 / `S.account`） |
| 課金権利 | premium / expires_at | `fl_entitlements`（サーバ正本） |

### 2.2 脅威一覧表

| 脅威 | 影響 | 対策 | 実装箇所 |
|---|---|---|---|
| 別家族による共有データの窃視・改ざん | 家族・子ども・家計情報の漏えい | membership 方式 RLS（メンバー表にない者は SELECT/INSERT 不可） | `docs/supabase-apply-all.sql`（family_read / own_insert 等）＋ `fl_family_members` |
| family_id の総当たり・漏えい（ベアラトークン化） | 家族データへの参加窓 | ① crypto 乱数 12 文字（32^12 ≈ 1.2×10^18 通り）② membership 方式＝family_id を知るだけでは参加不可 ③ 使い捨て招待トークン（72h・1 回限り） | `_generateFamilyId()` ／ `fl_create_family` / `redeem_family_invite` RPC ／ `docs/supabase-security-hardening.md` §2 |
| XSS（悪意ある入力の HTML 注入） | セッション窃取・改ざん | `H()` エスケープ常用＋CSP＋`eval`/`new Function` 不使用（0 件） | `app-source/familink.html` L9268（H）・L16（CSP meta） |
| 不正ファイル・巨大ファイルの取込 | ストレージ破壊・不正コンテンツ | `_validateUploadFile` を全ファイル入口に適用（MIME/拡張子/サイズ） | L9288 ／ AUDIT A-H2 |
| クライアント改ざんによる課金付与 | 収益毀損 | `fl_entitlements` に書込ポリシーなし＝authenticated からの INSERT/UPDATE 全拒否。`isPremium()` はサーバ権利を最優先 | `docs/supabase-apply-all.sql`・`isPremium()`（L22451 付近） |
| 秘密鍵の漏えい | 全データ・課金への全権アクセス | 秘密鍵は Edge Function シークレットのみ。機械検証（`sk-`/service_role 非搭載の grep 検査）済み | AUDIT A-C3 |
| 共有端末での前ユーザーデータ残存 | 家族情報の第三者閲覧 | クラウドログイン時のログアウトで端末データを消去（再ログインで復元） | `doLogout` ／ AUDIT A-C4 |
| 未認証での保護画面バイパス | データ画面の露出 | 未ログインは `s-ob` 固定・`?screen=` バイパス不可 | 起動ガード ／ `tools/qa_authguard_test.js`（7 件） |
| 招待トークンの再利用・傍受 | 家族への不正参加 | 使い捨て（行ロックで二重消費防止）・72h 期限・被招待者は invites テーブルを直接 SELECT 不可 | `redeem_family_invite` RPC |
| データ消失（端末紛失・ブラウザ削除・容量超過） | 家族の記録の喪失 | 容量超過トースト＋呼出側ロールバック・ストレージ管理／エクスポート導線・端末内保存の常設告知 | `saveS()` ロールバック契約・`openDataShareModal()` |
| フォーム二重送信 | 重複データ作成 | `_lockSubmit`（700ms）を save 系に適用 | AUDIT A-M5 ／ `tools/qa_doublesubmit_test.js` |
| AI 応答の過信（医療・金銭） | 誤判断 | 医療・金銭ディスクレーマー常設＋AI 一般免責＋緊急時案内（#7119/119） | §8.4 |
| Edge Function のコスト濫用 | API コスト増 | クライアント側上限（OCR 月次・Hoku 日次 40 回 `HOKU_AI_DAILY_CAP` L23757）。サーバ側 per-user レート制限は**未実装（既知課題 A-L1）** | `_ocrMonthlyLimit` / `_hokuAiUnderCap` |

---

## 3. 認証・セッション設計

### 3.1 認証方式（Supabase Auth）

| 方式 | 実装 | 備考 |
|---|---|---|
| メール＋パスワード | `supaSignUp` / `supaSignIn` | パスワードはアプリを素通し（Supabase Auth が管理）。アプリ側に保存しない |
| メール OTP（6 桁） | `signInWithOtp({shouldCreateUser:true})` → `verifyOtp({type:'email'})` | コードは必ず本人が入力（原則 1）。無料 SMTP は 1 時間 2 通制限あり |
| Magic Link | `detectSessionInUrl:true` + `flowType:'pkce'`、`SIGNED_IN` で自動入室 | PKCE フロー。確認メール再送 `resend`・再設定 `resetPasswordForEmail` あり |
| ローカルアカウント | `S.account = {email, passHash, recoveryCode, createdAt}` | クラウド不要の**端末内簡易ロック**（本認証ではない・passHash は端末外に出ない）。パスワードは塩付き＋6万回ストレッチのハッシュ（`s2$salt$hash`・`_makePassHash`/`_verifyPass`）で保存。旧無塩形式は後方互換照合＋ログイン時に自動移行（P1-05・2026-07-08） |

### 3.2 セッション管理

- Supabase セッションは SDK が `sb-*` キーで管理（`persistSession:true`）。アプリはトークンを直接扱わない。
- `onAuthStateChange` で `S.supaSession = {id, email}` のみ保持（トークン本体は保持しない）。
- 未ログイン時の画面ガード: 未ログインは `s-ob`（ウェルカム）固定。URL パラメータによる保護画面バイパスは不可（AUDIT A-H4、`qa_authguard_test.js` で回帰担保）。
- ログアウト（クラウドアカウント時）: 端末の家族データを消去する（共有端末対策・AUDIT A-C4）。

### 3.3 Supabase ダッシュボード側の推奨設定（`docs/supabase-security-hardening.md` §4）

| 設定 | 推奨値 |
|---|---|
| Email confirmation | ON（なりすまし登録防止） |
| Minimum password length | 8 以上 |
| Leaked password protection | ON（HaveIBeenPwned 連携） |
| Rate limiting | 既定維持または強化 |
| Redirect URLs | 本番 URL のみ（`https://ktakahashi7755-creator.github.io/Familink/`） |
| JWT 有効期限 | 既定（過度に延ばさない） |

---

## 4. 家族間データ分離（RLS）

### 4.1 設計方針

- 分離の担保は**サーバ側 RLS のみ**。クライアントの `familyId` 判定は UX のためのものであり、セキュリティ境界ではない。
- 2026-06-14 の **membership 方式**強化により、「family_id を知っている＝参加できる」ベアラ方式を廃止。メンバーシップの正本は `fl_family_members` で、変更は SECURITY DEFINER の RPC のみが行う（自己申告参加は不可能）。
- 適用済み SQL の正本は `docs/supabase-apply-all.sql`（冪等・末尾にポリシー完全リセットを同梱し、再実行で緩い旧ポリシーを一掃する）。

### 4.2 RLS 全ポリシー表（現行・membership 版）

| テーブル | ポリシー | 操作 | 条件 |
|---|---|---|---|
| `fl_family_data` | `family_read` | SELECT | `auth.uid() = user_id` **または**（`family_id ∈ fl_my_family_ids()` **かつ** `data_key` が共有許可リストに含まれる） |
| `fl_family_data` | `own_insert` | INSERT | `auth.uid() = user_id` かつ（`family_id is null` または自分が属する家族）→ メンバーでない家族へは 1 行も書けない |
| `fl_family_data` | `own_update` | UPDATE | 同上（using＋with check の両方） |
| `fl_family_data` | `own_delete` | DELETE | `auth.uid() = user_id`（本人の行のみ） |
| `fl_family_members` | `member_select_own_families` | SELECT | 自分が属する家族の名簿のみ。**INSERT/UPDATE/DELETE ポリシーは作らない**＝直接変更は全拒否（RPC 経由のみ） |
| `fl_family_invites` | `invite_insert_own_family` | INSERT | 発行者本人かつ自分の family_id のみ（他家族の招待は発行不可） |
| `fl_family_invites` | `invite_select_creator` / `invite_update_creator` / `invite_delete_creator` | SELECT/UPDATE/DELETE | 作成者のみ。被招待者は直接 SELECT 不可（消費は RPC 経由） |
| `fl_entitlements` | `ent_select_own` | SELECT | 本人のみ。**書き込みポリシーなし**＝付与は service_role（Stripe Webhook）のみ（§6） |
| `fl_push_subscriptions` | （`docs/push-subscriptions.sql`） | — | 本人のみ読み書き。送信時の全件参照は service_role（サーバ内） |

補助: `fl_family_data` の CHECK 制約 — `data_key` は 1〜64 文字、`family_id` は `^FAMI-[A-Z0-9-]{4,40}$` または null。

### 4.3 FAMILY_SHARED_KEYS ホワイトリスト方式

家族読み取りは「自家族」×「共有許可キー」の**二重条件**。個人・端末固有キー（`userProfile` / `hokuContext` / `isPremiumUser` / `notifs` / アバター / `cashflowSettings` 等）は**家族であっても読めない**。

- クライアント定数 `FAMILY_SHARED_KEYS`（`app-source/familink.html` L6684・**22 キー**）:
  `events, tasks, txs, health, posts, announces, prep, prepRoutines, folders, docs, albumPhotos, shoppingItems, shoppingFrequent, members, customBoards, boardItems, boardSections, recurringTxs, memos, memoFolders, workspaces, homeNote`
- サーバ側 `family_read` の許可配列 = 上記 22 キー **＋ `_deletions`**（削除トゥームストーンの家族横断 union に必要。クライアント側は `_mergeDeletions` の専用経路で処理するため `FAMILY_SHARED_KEYS` には含めない）。
- **変更時の規約**: クライアント定数とサーバ許可リストは（`_deletions` の扱いを除き）一致必須。片方だけの変更は禁止（`tests/unit.test.mjs` の「データ分離キーの整合」テストが `faceGroups` 非含有等を回帰担保）。

### 4.4 RPC 設計（SECURITY DEFINER・最小権限）

| RPC / 関数 | 役割 | 安全設計 |
|---|---|---|
| `fl_my_family_ids()` | 自分が属する family_id 一覧 | `fl_family_members` から返す（stable / RLS 再帰回避）。データ行を書いただけでは参加扱いにならない |
| `fl_create_family(p_family_id)` | 家族新規作成（本人を owner 登録） | 形式検証（`FAMI-` regex）・他人使用中 id は `family_id_taken` 拒否・冪等 |
| `redeem_family_invite(p_token)` | 招待消費＋メンバー登録を原子的に実行 | 未使用かつ未期限のみ・行ロックで二重消費防止・失敗は `invite_invalid_or_used` |
| `fl_leave_family(p_family_id)` | 家族離脱 | 自分のメンバー行のみ削除（他人は消せない） |

### 4.5 security-tests.sql による実証方法

`docs/security-tests.sql` は Supabase SQL Editor に**全文貼り付けて Run するだけ**の非破壊テスト（begin〜rollback・痕跡ゼロ）。`session_replication_role = replica` でテスト行を投入し、RLS は通常モードで検証する。

| # | 検証項目 | 期待結果 |
|---|---|---|
| 1 | B（別家族）は A 家族の予定（events）を読めない | pass=t（0 件） |
| 2 | B が family_id を騙って A 家族へ INSERT | RLS 拒否（NOTICE: PASS） |
| 3 | 正規参加後、B は A 家族の共有キー（events）を読める | pass=t（1 件） |
| 4 | 正規参加後でも A の個人キー（userProfile）は読めない | pass=t（0 件） |

検証実績: 2026-06-14 ローカル PostgreSQL 16（apply-all 全適用）で 1/3/4 = pass、2 = 拒否を確認。アプリ内 `#qa-debug` の「家族共有セルフテスト」でも本番環境の各レイヤー合否を確認できる。

---

## 5. XSS・入力値処理

### 5.1 エスケープヘルパー `H()`

`app-source/familink.html` L9268:

```js
const H = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
```

- 5 文字（`& < > " '`）を実体参照化。null/undefined 安全。
- QA 自動テスト（`qa_full_test.js` TEST 25）が `H('<script>...')` の無害化を毎回検証する。

### 5.2 CSP（Content-Security-Policy）実際の内容

`app-source/familink.html` L16 の `<meta http-equiv="Content-Security-Policy">`（実物・改行整形のみ）:

```
default-src 'self';
script-src  'self' 'unsafe-inline' https://cdn.jsdelivr.net;
style-src   'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src    'self' https://fonts.gstatic.com data:;
img-src     'self' data: blob:;
media-src   'self' blob:;
connect-src 'self' https://jrmzzizjlkrogrbtzyuz.supabase.co wss://jrmzzizjlkrogrbtzyuz.supabase.co;
object-src  'none'; base-uri 'self'; form-action 'self';
```

- `connect-src` は Supabase（HTTPS/WSS）のみ＝**アプリからの外部送信先を構造的に限定**。
- `'unsafe-inline'` は単一 HTML 構成（インライン script/style が本体）ゆえの必要許可。`eval` / `new Function` はアプリ内 0 件（`docs/supabase-security-hardening.md` §1）。
- 併設: `<meta name="referrer" content="no-referrer">`（リファラ漏えい防止）。

### 5.3 innerHTML 規約（CLAUDE.md §13.2）

1. ユーザー入力は原則 HTML に直接挿入しない。挿入する場合は必ず `H()` を通す。
2. `innerHTML` を新規追加する際は、含まれる変数が**すべて** `H()` 済みかをレビューで確認する。
3. 動的値の代替として `textContent` を優先できる場合は優先する。
4. 外部リンクの `window.open(url, '_blank')` には `'noopener,noreferrer'` を必ず付与する（棚卸し済み・漏れなし）。
5. 主要 textarea には `maxlength` を付与（異常長文対策）。

### 5.4 ファイル三点検証 `_validateUploadFile`

`app-source/familink.html` L9288。全ファイル入口（アルバム・書類・アバター・バックアップ復元等）に適用（AUDIT A-H2）。

| 検証 | 内容 |
|---|---|
| ① MIME | `file.type` が種別（image/video/json）に適合するか |
| ② 拡張子 | ファイル名拡張子が種別の許可リストに含まれるか（MIME 空でも拡張子で判定） |
| ③ サイズ | `maxBytes` 超過を拒否（動画は 3MB 上限に制限済み・A-M6） |

戻り値は `{ok, ...}`。null 入力にも安全。`tests/unit.test.mjs`（Vitest）と `tools/qa_fileval_test.js`（16 件）が回帰担保。写真は取込時に長辺 1280px / JPEG 0.82–0.85 へダウンスケールし、LocalStorage 5MB 保守設計に収める。

---

## 6. 課金・決済セキュリティ

### 6.1 権利の正本と書き込み経路

```
Stripe（決済成立）→ stripe-webhook（Edge Function・署名検証）
  → service_role で fl_entitlements を upsert  ＝ 権利を書ける唯一の主体
アプリ → fl_my_premium ビュー（本人分のみ）→ S._serverEntitlement（メモリのみ・PERSIST 非対象）
  → isPremium() はサーバ権利を最優先で参照（ローカル isPremiumUser はオフライン時キャッシュ）
```

- `fl_entitlements` には書き込み RLS ポリシーが**存在しない**＝authenticated ロールからの INSERT/UPDATE/DELETE は全拒否。ローカル PostgreSQL 16 で「B の偽造 INSERT 拒否／A の自己 UPDATE 偽造拒否」を検証済み（`docs/supabase-apply-all.sql` 末尾の検証実績）。
- `isPremium()` のサーバ権利優先は Vitest（`S.isPremiumUser:true` かつ `_serverEntitlement.premium:false` → false）で回帰担保。

### 6.2 Stripe ホスト型（カード情報非通過）

- 決済は Stripe Checkout（ホスト型ページ）へ遷移。**カード情報はアプリ・サーバを一切通らない**。
- 解約・支払管理は Stripe Billing Portal（`billing-portal` Edge Function 経由）。
- Webhook は `STRIPE_WEBHOOK_SECRET` による署名検証で真正性を担保。
- 手順の正本: `docs/BILLING-SETUP.md`。

### 6.3 β表示規約（実決済未接続時・CLAUDE.md §13.5）

- `STRIPE_ENABLED = false`（`app-source/familink.html` L22468）の間は実決済に接続しない。
- 決済モーダルには β 明示バナー（「試用モードです。実際の決済は行われません。お持ちのお支払い情報を入力しないでください」）を常設し、入力欄 4 つ（`pc-number`/`pc-exp`/`pc-cvc`/`pc-name`）の `autocomplete` は `off`（`docs/pre-release-audit.md`）。
- 月額・年額・無料体験の表示は実装状態と矛盾させない。ネイティブ配布（App Store/Google Play）でのデジタル販売は Stripe 不可＝IAP 必須（`12-operations-release.md` §9）。

---

## 7. 秘密情報管理表

| 鍵 / 秘密情報 | 置き場所 | クライアント/リポジトリ搭載 | 禁止事項 |
|---|---|---|---|
| Supabase anon(publishable) キー | クライアント（`app-source/familink.html` L6415 付近） | ○（公開前提の設計。保護は RLS） | RLS 未適用状態での運用 |
| Supabase service_role キー | Edge Function 既定注入 / pg_cron の DB 内呼出のみ | **×（絶対禁止）** | クライアント・リポジトリ・ログへの出力 |
| OPENAI_API_KEY | Edge Function シークレット（hoku / calendar-scan 共通） | × | 同上 |
| STRIPE_SECRET_KEY（`sk_...`） | Edge Function シークレット | × | 同上 |
| STRIPE_WEBHOOK_SECRET（`whsec_...`） | Edge Function シークレット | × | 同上 |
| STRIPE_PRICE_ID | Edge Function シークレット | （公開情報だがサーバ側で管理） | — |
| VAPID 公開鍵 | クライアント（`VAPID_PUBLIC_KEY` L16068） | ○（公開情報） | 秘密鍵と取り違えない |
| VAPID 秘密鍵 | Edge Function シークレット | × | クライアント・リポジトリ搭載 |
| ユーザーパスワード | Supabase Auth（サーバ）／ローカルアカウントはハッシュのみ | ×（平文保存禁止） | アプリによる代行入力・平文保存 |

機械検証: リポジトリ・本体 HTML に `service_role` / `sk-` / OpenAI キーが非搭載であることを grep 検査済み（AUDIT A-C3・RELEASE-CHECKLIST §2）。

---

## 8. プライバシー

### 8.1 LLM に送る情報の最小化（家計金額を送らない）

- 会話モードで外部 LLM（Edge Function `hoku` → OpenAI gpt-4o-mini）へ渡す文脈は `_hokuChatContext()`（`app-source/familink.html` L23631–23668）で構築し、**家計の金額は含めない**（コード内明記: 「概要のみ・家計の金額は含めない＝プライバシー配慮」）。送るのは予定/タスク/買い物/当日体調/準備/メモ/ボードの**要約テキスト**と、家計は**カテゴリ名の一覧のみ**。
- 金額を含む詳細文脈 `buildHokuContext()`（L27462〜）は**ローカル応答専用**で、端末外へ送信されない。
- LLM 利用はユーザーが `S.hokuAiOff` で opt-out 可能（ローカル応答へフォールバック）。既定経路はログイン必須・タイムアウト/失敗時は null → ローカル応答（無応答ゼロ設計）。

### 8.2 OCR 画像の扱い

- 予定表スキャンは画像（base64）を Edge Function `calendar-scan` 経由で OpenAI Vision に渡し、予定候補 JSON を返す。**画像はサーバ DB に保存しない**（関数は変換のみ・`supabase/functions/calendar-scan/index.ts` ヘッダ参照）。
- 認証は JWT 検証 ON（ログイン中ユーザーのみ到達）。API キーはサーバ側シークレット。
- 利用回数はクライアント側で月次制限（無料 1 回/月・プレミアム 30 回/月）。

### 8.3 LocalStorage 消失リスクの告知（CLAUDE.md §13.1）

- データは端末内 LocalStorage に保存されるため、端末紛失・ブラウザデータ削除・容量超過・端末変更で消失しうる。設定画面に常設の注意ブロックを表示済み。
- 大切な写真・書類は端末本体にも保管する旨を案内（アルバム・書類・プレミアム LP に注記）。
- 保存失敗（容量超過）は黙殺せずトースト通知＋呼び出し側ロールバック＋ストレージ管理導線（`saveS()` の boolean 契約）。
- バックアップ書き出し／復元機能を実装済み（写真込み完全版・テキスト軽量版の JSON エクスポート）。

### 8.4 医療・金銭・AI ディスクレーマー（CLAUDE.md §13.3）

| 領域 | 常設表示 |
|---|---|
| 体調・服薬 | 記録支援であり診断・医療判断の代替ではない旨＋緊急時案内（119 / #7119 / かかりつけ医）を体調画面に常設 |
| 家計 | 記録支援であり金融助言ではない旨を家計画面に常設 |
| Hoku（AI） | 「AI による提案であり、最終判断はご家族・専門家へ」を画面常設 |
| ワークスペース表現 | 「共有用 / 自分用」は端末内表示モードである旨を切替モーダルに明示（アクセス制御との誤読防止・CLAUDE.md §13.4） |
| 子ども情報 | プライバシーポリシーに「子どものプライバシー」項。メンバー追加モーダルに保護者責任表記 |

---

## 9. 削除・上書き保護

- データ削除・初期化・上書きには `showConfirm`（`app-source/familink.html` L9517、呼び出し 59 箇所）等の確認導線を必ず設ける（CLAUDE.md §13.6）。削除パスは全棚卸し済み（`docs/security-audit.md`）。
- 「全削除」「リセット」は二段階確認を原則とする（通知全削除は `confirmClearAllNotifs` 等の確認関数経由）。
- LocalStorage 主キー `familink_v3` の破壊・初期化は技術的不変条件として禁止（CLAUDE.md §12.2 / §14.3）。
- 同期上の削除は即時消去ではなく**トゥームストーン**（`S._deletions`）で全端末に伝播し、「削除 vs 編集」は時刻比較で解決（削除後の編集は復活）。30 日で GC。誤同期による意図しないデータ喪失を防ぐ。
- アカウント削除はクラウド側削除の成否を捕捉して正直に報告する（不正直な成功表示の禁止・AUDIT A-H5）。

---

## 10. リリース前セキュリティチェックリスト

公開（一般配布）前に必ず全項目を通す。正本は本表＋ `docs/RELEASE-CHECKLIST.md` §2 ＋ `docs/supabase-security-hardening.md` §5。

- [ ] **テスト用バックドアの削除**（最重要）: `_setupCoinTestGrant`（コイン付与）／ `#qa-debug` テストパネルの削除または厳重ゲート
- [ ] 本番 Supabase に `docs/supabase-apply-all.sql` を適用済み（RLS・CHECK・招待・権利・インデックス・membership 強化・ポリシーリセット）
- [ ] `docs/security-tests.sql` を本番で Run し、1/3/4 = pass・2 = 拒否 を確認
- [ ] アプリ `#qa-debug` → 家族共有セルフテストで各レイヤー合格
- [ ] 認証設定（§3.3 の 6 項目）を本番ダッシュボードに適用
- [ ] CSP `connect-src` が Supabase のみであることを再確認
- [ ] クライアントに秘密鍵非搭載（grep 機械検証: `service_role` / `sk-` / `whsec_` / VAPID 秘密鍵）
- [ ] `window.open('_blank')` の `noopener,noreferrer` 漏れなし
- [ ] 削除・初期化パスがすべて `showConfirm` 等で保護されている
- [ ] 課金表示が実装状態（`STRIPE_ENABLED` の値）と矛盾しない（β時は β バナー＋`autocomplete="off"`）
- [ ] 医療・金銭・AI ディスクレーマーと端末内保存注記の常設を確認
- [ ] 招待コード入力のレート制限/試行間隔（総当たり対策）
- [ ] 既知課題の再確認: Edge Function サーバ側レート制限（A-L1）・OAuth 実機検証（A-L2）・auth.users 完全削除（A-L4）

---

## 11. 本書の運用

- セキュリティに関わる変更（RLS・RPC・認証・課金・CSP・共有キーリスト）は本書を**先に**更新し、worklog に記録する。特に `FAMILY_SHARED_KEYS` とサーバ許可リストの変更は §4.3 の表を必ず同時更新する。
- 実装と本書が矛盾した場合は実装を調査のうえ本書を修正する（推測で書かない）。
- 監査の発見事項は `docs/AUDIT.md`（引き継ぎ正本）に記録し、本書には設計として確定した内容のみを反映する。
- 既知の記載齟齬（2026-07-07 時点）: `docs/AUDIT.md` A-C2 の「client 配線 ⬜」は現行コードでは実装済み（`_processPendingJoin` → `redeem_family_invite` RPC、`tools/qa_invite_token_test.js` で回帰担保）。AUDIT.md 側の更新が必要。

### Phase 1 セキュリティ強化（2026-07-08・詳細は `docs/audit/AUDIT-phase-1.md`）

3 監査官並列＋ローカル Postgres 16 実適用検証による深層監査を実施（Critical 0）。以下を反映済み:
- ボードのリアクション内訳のメンバー名エスケープ漏れ（stored XSS）を封鎖（`H()` 追加・回帰テスト新設）。
- `fl_entitlements` を Stripe/IAP 両対応スーパーセットに統一し、`fl_my_premium` を `security_invoker=true` に（適用順ハザード解消）。
- Edge Function の JWT 強制を `supabase/config.toml` で固定（hoku/calendar-scan/create-checkout/billing-portal=true）。
- 健康データの LLM 送信を既定オフの opt-in（`S.hokuShareHealth`）に。プライバシーポリシーに OpenAI 送信範囲を明記。
- ローカル passHash を塩付き＋ストレッチ化（§3.1）。SECURITY DEFINER の `search_path` を `public, pg_temp` に強化。CORS を `ALLOWED_ORIGIN` で限定可能に。
