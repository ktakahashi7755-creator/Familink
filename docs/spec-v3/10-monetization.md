# Familink 課金・マネタイズ設計書

**文書番号**: SPEC-v3-10 ／ **版**: 1.0 ／ **作成日**: 2026-07-07 ／ **正本**
**対象読者**: マネタイズ責任者・プロダクトオーナー・エンジニア・App Store リリース担当・QA

> 本書は Familink の収益モデル・価格・機能境界・権利管理・決済フロー・アップセル導線の正本である。
> 数値・関数名・行番号は `app-source/familink.html`（全 28,836 行・2026-07 実測）の実装値を転記した。
> 戦略の背景は `docs/premium-strategy.md`・`01-product-vision.md` §4、要件は `02-requirements.md`（FR-240）、
> 権利テーブルの SQL は `docs/supabase-entitlements-sql.sql`、Stripe 有効化手順は `docs/BILLING-SETUP.md` を参照。
> 実装（コード）と旧戦略文書が食い違う箇所は実装値を正とし、本書内に注記した。

---

## 1. 収益モデル概要

### 1.1 基本方針

> **無料で習慣化、有料で便利化。課金は価値の対価であり、囲い込みではない。**

| 原則 | 内容 |
|---|---|
| フリーミアム | 中核機能（予定/タスク/ボード/Hoku 基本/データ保存）は無料で壊れずに使える。無料が弱すぎると習慣化しない |
| 家族単位課金 | 課金単位は個人ではなく**家族**。「家族で利用する場合も、代表者1名の契約でプレミアム機能を利用できます」（規約文 L21174 付近）。解約されにくく LTV が家族継続に連動（`01-product-vision.md` §4.2） |
| 信頼最優先 | 煽らない・責めない・押し売りしない。実装状態と矛盾する課金表示をしない（NFR-703） |
| 広告モデル不採用 | 家族の信頼と両立しないため広告収益は追わない（`01-product-vision.md` §5.3）。※「広告なし」はプレミアム訴求として使用（§3.1 注記参照） |

### 1.2 収益の三層

| 層 | 内容 | 状態 |
|---|---|---|
| サブスクリプション | プレミアム 月額 480 円 / 年額 4,800 円 | 実装済み（β・実課金は無効。§6/§7） |
| ファミコイン経済 | ログインボーナス由来のアプリ内ポイント。装飾・チケット交換（**換金・有償販売なし**） | 実装済み（§9） |
| 上位プラン（将来） | 680 / 780 / 980 円の段階導入 | 構想（§2.2） |

---

## 2. 価格体系

### 2.1 現行プラン

| プラン | 価格 | 実装 |
|---|---|---|
| 無料 | ¥0 | 既定状態 |
| プレミアム（月額） | **¥480/月** | `selectPremiumPlan`（L22601）/ `_premiumPlanInfo`（L22614） |
| プレミアム（年額） | **¥4,800/年**（2 か月分お得） | 同上 |
| 30 日全開放トライアル | ¥0（全機能開放） | §4 |

- 価格表示箇所: プレミアム画面比較表（L21145）・FAQ「月額480円/年額4,800円」（L16225–16226）・法的文書（L16272, L16292）・規約リスト「無料期間終了後は、月額480円で自動更新されます。」（L21174 付近）。
- 価格は不透明にしない（常に明示）。表示価格の変更は全箇所同時更新＋人間確認必須。

> **旧戦略文書との差異**: `docs/premium-strategy.md` §2 は月額 480 円のみを定義していたが、実装は年額 ¥4,800 を追加済み。本書を正とする。

### 2.2 将来の上位プラン（Phase 3〜・構想）

| 価格 | 想定内容 |
|---|---|
| ¥680/月 | 家族レポート・AI 整理など |
| ¥780/月 | 写真・記録の保存拡張・テンプレート増加など |
| ¥980/月 | 家族複数・詳細 AI 分析などの上位 |

技術的には `fl_entitlements.source` / Stripe Price の追加で対応可能な設計（`03-architecture.md` §9）。導入判断は `familink-ceo-strategy` Skill で事業インパクトを確認してから行う。

---

## 3. 機能マトリクス（機能境界の正本）

### 3.1 機能ゲート `PREMIUM_FEATURES`（L22443–22448・実装値）

| キー | 機能 | 無料 | プレミアム |
|---|---|---|---|
| `ocr` | 予定表の読み取り（月） | **1 回** | **30 回** |
| `hokuDaily` | Hoku の相談（1 日） | **5 回** | 無制限（`premium` 未定義＝無制限） |
| `adFree` | 広告なし | — | ✓（`premiumOnly:true`） |
| `themes` | テーマ着せ替え | — | ✓（`premiumOnly:true`） |

> 注記 1: 散在していた境界値はこの定数へ統合済み。**境界の変更は必ずこの定数で行い**、画面別のハードコードを復活させない。
> 注記 2: 「広告なし」はプレミアム訴求として実装されている（機能カード L21116「無料プランでは画面に広告が表示されます」）が、
> `01-product-vision.md` §5.3 は広告モデル不採用を掲げる。広告の実出稿有無・訴求文言の整合は正式リリース前に要判断（未確認事項）。

### 3.2 件数上限 `PREMIUM_LIMITS`（L22520–22530・9 項目・実装値）

| キー | 対象 | 無料上限 | プレミアム |
|---|---|---|---|
| `events` | イベント（予定） | **500** | 無制限 |
| `tasks` | タスク | **30** | 無制限 |
| `txs` | 家計入力 | **100** | 無制限 |
| `health` | 体調記録 | **50** | 無制限 |
| `albumPhotos` | アルバム写真 | **20** | 無制限 |
| `customBoards` | カスタムボード | **3** | 無制限 |
| `members` | メンバー | **4** | 無制限 |
| `memos` | メモ | **20** | 無制限 |
| `docs` | 書類 | **15** | 無制限 |

判定は `checkPremiumLimit(key)`（L22532）:
- `isPremium()` なら常に許可（正本アクセサ経由・§5）
- **80% 到達で近接警告**（「〜の無料上限まであと N 件です。」トースト・sessionStorage でセッション 1 回のみ）
- 上限到達で `showUpgradeModal`（§8.1）

### 3.3 比較表 UI（プレミアム画面 `rows` L21145–21153・表示仕様）

| 項目 | 無料 | Premium |
|---|---|---|
| 価格 | ¥0 | ¥480/月 |
| 広告非表示 | — | ✓ |
| ストレージ | 500MB | 20GB |
| Hoku 利用 | 1 日 5 回 | 無制限 |
| プレミアムアバター | — | ✓ |
| 写真/書類管理 | 基本機能 | 拡張機能 |
| 今後の限定機能 | — | ✓ |

フィーチャーカード（L21116）: 「広告なしで使える」「ストレージを20GBまで拡張」「プレミアムアバターが使える（18種類以上・ファンタジーやドラゴンシリーズ）」。

> 注記: 「ストレージ 500MB/20GB」は比較表上の訴求値であり、現実装の強制は §3.2 の**件数上限**で行われている
> （クラウドストレージの容量計測による強制は未実装）。訴求と実装の乖離は正式リリース前に解消すること（未確認事項）。

### 3.4 その他のプレミアムゲート実装箇所

| ゲート | 実装 |
|---|---|
| プレミアムアバター | `confirmAvatarSelect`（L22676）/ L22423: `avatarDef.isPremium && !isPremiumUser && !isShopOwned` → `showPremiumGate()`（L22590 → `go('s-premium')`）。ロック表示 L22395–22398 |
| LLM 版 Hoku | `_hokuAiAllowed`（L23749）— プレミアム＋ログイン限定（`09-hoku-ai.md` §5） |
| OCR 回数 | `_ocrMonthlyLimit`（L13400）/ `_ocrShowScanLimit`（L13406–13417） |
| Hoku 回数 | `hokuSend`（L24792–24810）・使用バー `renderHoku`（L24670–24682） |
| 設定画面のプレミアム表示 | L22131–22133 |
| ショップ内アップセル | L21797–21805 |

---

## 4. トライアル設計（30 日全開放）

### 4.1 実装値

| 項目 | 値 / 実装 |
|---|---|
| 期間 | `TRIAL_DAYS = 30`（L21264） |
| 開始時刻 | `S.trialStartedAt`（ISO 文字列・L8829・PERSIST 対象） |
| 開始 | `prmStartTrial`（L21325）— 開始時に `S.isPremiumUser = true` |
| 残日数 | `_trialDaysLeft`（L21266）/ 判定 `isInTrial`（L21274） |
| 表示 | ヒーロー「プレミアムを30日間 無料で体験しよう」（L21099）・トライアル中は「トライアル利用中／無料トライアル残り N 日」＋残日数バッジ（L21216） |

### 4.2 `_refreshTrialStatus`（L21301）の挙動（init と renderPremium で毎回呼ぶ）

```
premiumPaid === true        → 常時プレミアム（トライアル状態は無視）
トライアル残日数 > 0         → S.isPremiumUser = true
トライアル満了               → S.isPremiumUser = false
                              ＋ S.trialStartedAt = null（再取得防止）
                              ＋ 満了トースト表示
```

### 4.3 トライアル規約表示（`termsList` L21174 付近・実装コピー）

- 「30日間無料でお試しいただけます。」
- 「無料期間中に解約すれば料金はかかりません。」
- 「無料期間終了後は、月額480円で自動更新されます。」
- 「ご契約と解約は、App Storeのアカウント設定から行えます。」
- 「家族で利用する場合も、代表者1名の契約でプレミアム機能を利用できます。」
- 「購入済みの場合は「購入を復元」から状態を確認できます。」

> **要整合**: 上記の「App Store のアカウント設定から」「購入を復元」は **IAP（ネイティブ配布）前提の文言**であり、
> Web/PWA の Stripe 配布（§6・解約は Billing Portal）とは動線が異なる。配布チャネル確定時に文言を実態へ揃えること
> （NFR-703「実装状態と矛盾する表示をしない」・未確認事項）。

### 4.4 コンバージョン設計原則（`docs/premium-strategy.md` §6 を継承）

- 初回起動時は有料を推さない（まず価値体験）
- トライアル中は体験できているプレミアム機能を可視化（残日数バッジ）
- 満了時は押し売りせず自動で無料へ戻す（機能は縮退するがデータは消さない）

---

## 5. 権利管理アーキテクチャ（クライアント改ざん不可の設計）

### 5.1 判定の正本アクセサ `isPremium()`（L22451）

```js
function isPremium() {
  // サーバ権利が取得できていればそれを最優先（クライアント改ざんに依存しない）
  if(S._serverEntitlement && typeof S._serverEntitlement.premium === 'boolean') {
    return S._serverEntitlement.premium;
  }
  return !!S.isPremiumUser;   // ローカル（トライアル/ダミー課金を集約済み）
}
```

**優先順位**: ① サーバ権利 `S._serverEntitlement.premium` → ② ローカル `S.isPremiumUser`（`_refreshTrialStatus` が `premiumPaid`＋トライアルを集約）。

> **不変条件**: プレミアム判定は必ず `isPremium()` を通す。`S.isPremiumUser` を直接参照するゲートを新設しない（コード内コメントで明文化済み・L22515 付近）。

### 5.2 サーバ権利の同期チェーン

```
Stripe Webhook（service_role・唯一の書き込み主体）
      │ upsert
      ▼
fl_entitlements（課金権利の正本テーブル）
      │ 本人参照用ビュー
      ▼
fl_my_premium（premium, expires_at）
      │ _syncPremiumFromServer（L21286）:
      │   sb.from('fl_my_premium').select('premium,expires_at')
      ▼
S._serverEntitlement（揮発キャッシュ・PERSIST 非対象）
      │
      ▼
isPremium()（L22451）→ 全ゲートが参照
```

- `fl_entitlements` への書き込みは **Stripe Webhook（service_role）のみ**（NFR-404）。クライアントは SELECT ビュー経由の読み取りだけで、LocalStorage 改ざん・DevTools 操作では**サーバ権利を付与できない**。
- ローカルフラグ（`premiumPaid` / `isPremiumUser` / `trialStartedAt`）は UX 用であり、サーバ権利が取得できる状態では常にサーバが勝つ。
- SQL 正本: `docs/supabase-entitlements-sql.sql`。分離検証: `docs/security-tests.sql`。

---

## 6. Stripe 決済フロー

### 6.1 シーケンス（Web/PWA 配布・実装済み）

```
[アプリ] startCheckout（L22470）
   └→ sb.functions.invoke('create-checkout')   … JWT から user 特定・Checkout セッション作成
[Stripe Checkout]（リダイレクト型・カード情報はアプリ/自社サーバを一切通らない＝PCI は Stripe 側）
   └→ 決済完了 → アプリへ ?checkout=success で帰還
[Stripe] → stripe-webhook Edge Function（署名検証）
   └→ fl_entitlements を upsert（権利付与の唯一の経路）
[アプリ] _handleCheckoutReturn（L22501）
   └→ ?checkout=success を検知 → _syncPremiumFromServer を最大 5 回リトライ
      （Webhook 反映までのタイムラグ吸収）→ isPremium() が true に
```

### 6.2 構成要素

| 要素 | 実装 | 役割 |
|---|---|---|
| `STRIPE_ENABLED` | `false`（L22468・機能フラグ） | false: β表示＋ダミーフロー ／ true: 実決済に接続 |
| `startCheckout` | L22470 | `create-checkout` 呼び出し → Checkout へ遷移 |
| `openBillingPortal` | L22485 | `billing-portal` 呼び出し → **解約・支払管理は Stripe Billing Portal** で完結 |
| `_handleCheckoutReturn` | L22501 | 帰還処理（成功: 権利同期 5 回リトライ ／ キャンセル: 「お手続きをキャンセルしました。いつでもご登録いただけます」トースト） |
| Edge Functions | `create-checkout` / `billing-portal` / `stripe-webhook`（成果物は `docs/edge-functions/`。`supabase/functions/` 配下の常設は hoku / calendar-scan の 2 本） | サーバ側処理。Stripe secret は Edge Function シークレット |

- 有効化手順・テスト手順の正本: `docs/BILLING-SETUP.md`（Stripe テストカードによる E2E 手順を含む）。
- **実課金の有効化（`STRIPE_ENABLED=true`）は人間確認必須**（CLAUDE.md §10.2 / §14.3）。

---

## 7. β状態の表示規約（現在の公開状態）

`STRIPE_ENABLED=false` の間、以下を厳守する（NFR-703・FR-247）。

| 規約 | 実装 |
|---|---|
| 実課金なしの明示 | β明示バー（`betaBar` L21220）: 「現在はベータ版です。実際の課金は発生しません（正式リリース時にApp Store経由で開始）」を `STRIPE_ENABLED` OFF 時に表示（L21236–） |
| カード入力欄の保護 | ダミー決済モーダルの入力欄は `autocomplete=off`（ブラウザにカード情報を学習させない） |
| カード情報の非送信 | ダミーフローのカード情報は**外部送信しない・保存は端末内のみ**（L22648–22651 コメントで明文化） |

### 7.1 ダミー課金フローの範囲

```
openPremiumCheckout（L22620）
  → m-premium-checkout（カード入力 pc-number / pc-exp / pc-cvc / pc-name・同意 pc-agree）
  → submitPremiumCheckout（L22652）
  → activatePremiumDemo（L22661: premiumPaid=true, isPremiumUser=true, trialStartedAt=null）
```

- あくまで **UI 完成度検証のためのモック**であり、権利はローカルフラグのみ（サーバ権利は付与されない）。
- 開発用トグル: `togglePremiumDev`（L21060・`premiumPaid` 反転）／解約: `cancelPremium`（`premiumPaid=false`）。
- 正式リリース時: β バー撤去・ダミーフロー無効化・§4.3 の IAP/Stripe 文言整合を同時に実施する（リリースチェックリスト項目）。

---

## 8. アップセル導線一覧

### 8.1 全タッチポイント表（実装済み）

| # | タッチポイント | トリガー | 実装 | 文言トーン |
|---|---|---|---|---|
| 1 | 件数上限モーダル | `PREMIUM_LIMITS` 到達（80% で近接警告） | `showUpgradeModal`（L22555） | 「30日間無料でためす」／「今はこのままでいい」（拒否肢を対等に用意） |
| 2 | Hoku 使用バー | 無料 5 回の消費状況 | `renderHoku`（L24670–24682）「残り N/M 回」＋「無制限にする」→ s-premium | 機能価値ベース |
| 3 | OCR 上限 | 月 1 回消費後 | `_ocrShowScanLimit`（L13406） | 上限の事実＋案内 |
| 4 | アバターロック | プレミアムアバター選択時 | `showPremiumGate`（L22590） | 「使えない」でなく「プレミアムで使える」 |
| 5 | ショップ内バナー | ショップ閲覧時 | L21797–1805「プレミアムなら、もっと自由に…月額480円（30日間無料）」 | ポジティブ訴求 |
| 6 | 設定画面 | 常設導線 | L22131–22133 | 控えめなセクション |
| 7 | プレミアム画面本体 | s-premium 遷移時 | ヒーロー「プレミアムを30日間 無料で体験しよう」（L21099）＋ 3 ベネフィット＋機能カード＋比較表＋規約 | 価値提示中心 |
| 8 | FAQ・法的文書 | 参照時 | L16225–16226 / L16272 / L16292 | 事実の明示 |

### 8.2 訴求原則（全導線共通・絶対遵守）

- **控えめ・ポジティブ訴求**: 「プレミアムだから使えない」ではなく「プレミアムでこんなことができる」（旧ガイド §8 を継承）
- 押し売り表現（「今すぐプレミアムへ！」）・カウントダウン・煽り禁止
- アップグレードを断る選択肢を常に対等に提示する（例:「今はこのままでいい」）
- プレミアム画面へは 1 タップで到達・価格は常に明示
- Hoku 経由の導線も Hoku の口調規定（`09-hoku-ai.md` §1.2）に従う

---

## 9. ファミコイン経済（無料ユーザーのソフトなマネタイズ・習慣化装置）

### 9.1 位置づけ

- ログインボーナス由来の**アプリ内ポイント**（換金不可・現金購入なし。`02-requirements.md` §5 用語定義）
- 目的は①毎日開く習慣化、②無料ユーザーへの「装飾・チケット」提供によるエンゲージメント維持
- **プレミアムとの棲み分け**: プレミアム＝機能・容量の恒久解放（サーバ権利）／ファミコイン＝装飾と単発チケット（端末内経済）。コインでプレミアム権利そのものは買えない

### 9.2 ログインボーナス（Wave 250・L21338–）

| 項目 | 実装値 |
|---|---|
| 付与条件 | 毎日 7:00 以降の初回起動（1 日 1 回厳守・独立キー `fl_lb_shown` で保存失敗にも耐性） |
| 基本付与 | **+10 コイン** |
| 3 日連続 | **+30 コイン** ボーナス |
| 7 日連続 | **+100 コイン** ボーナス |
| 30 日連続 | **+100 コイン＋特別バッジ**（`badge30`） |
| 状態 | `S.loginBonus { lastClaimDate, streak, coins, enabled, badge30, dates[] }`（L8831・PERSIST 対象） |
| API | `getFamiCoins` / `addFamiCoins`（L21377） |

### 9.3 ショップ（`SHOP_ITEMS` L21488–・`renderShop` L21709）

| カテゴリ | 商品 | 価格（コイン） | 性質 |
|---|---|---|---|
| Hoku チケット | Hoku 追加 +3 回 / +10 回（当日限り） | 30 / 90 | 消費型（無料 5 回/日の追加枠） |
| 限定アバター | flp_boy_cap / flp_girl_pigtail / flp_boy_glasses / flp_girl_band | 各 60 | 恒久保有（購入すれば無料プランでも使用可） |
| 限定アバター | flp_man / flp_woman / flp_grandpa / flp_grandma | 各 80 | 同上 |
| テーマ | sky / sakura / mint / lavender | 各 60 | 恒久保有（`08-design-system.md` §8.1） |
| テーマ | apricot / aqua | 各 80 | 同上 |
| Hoku スキン | normal 30–100 / rare 200 / premium 300（`HOKU_SKINS` L21576–21594・10 種） | 30–300 | 恒久保有 |

- 保有管理: `S.shop.owned` / `isShopOwned(id)`。所持スキンは `S.hokuOwnedSkins`。
- ショップ内にはプレミアムへの控えめなアップセルバナーを併設（§8.1 #5）＝コイン経済がプレミアム導線の入口も兼ねる。
- **設計上の注意**: コイン価格・付与量の変更はエンゲージメント全体に影響するため、`familink-monetization-lead` Skill でレビューしてから実施する。

---

## 10. ストア配布時の注意（IAP 要件）

| 項目 | 内容 |
|---|---|
| 原則 | App Store / Google Play でネイティブ（ラッパー含む）配布する場合、**アプリ内のデジタル商品・サブスクリプションは IAP（StoreKit / Play Billing）必須**。Stripe 等の外部決済への誘導はリジェクト対象 |
| 現行実装 | Stripe Checkout は **Web/PWA 配布専用**。ネイティブ配布時は IAP 実装を別途追加し、`fl_entitlements.source` で権利ソース（stripe / appstore / play）を区別する設計（`03-architecture.md` §9） |
| 文言整合 | §4.3 の規約文（「App Store のアカウント設定から」「購入を復元」）は IAP 前提。**配布チャネル確定時に、表示文言・解約導線・復元導線を実態に一致させる**（NFR-703） |
| トライアル | IAP 移行時は Introductory Offer（30 日無料）として App Store Connect 側にも定義が必要 |
| 価格 | ストア税・手数料（15–30%）を織り込んだ価格判断は `familink-ceo-strategy` / `familink-appstore-release-lead` Skill で審査 |
| ファミコイン | 現金で購入できないため IAP 対象外（この前提を崩す変更＝コインの有償販売は IAP 化が必要になるため人間確認必須） |

---

## 11. KPI・計測計画

### 11.1 主要 KPI（`01-product-vision.md` §4.4 と整合）

| KPI | 定義 | 関連実装値 |
|---|---|---|
| 北極星: WAF | 週次アクティブ家族数 | familyId 単位の集計（将来サーバ側） |
| トライアル開始率 | 無料 → `prmStartTrial` 実行率 | `S.trialStartedAt` |
| 無料→有料転換率 | トライアル/無料 → 実課金 | `fl_entitlements`（サーバ正本で計測可能） |
| 30 日継続率 | 無料 / 有料別 | ログインボーナス `S.loginBonus.dates`（端末内） |
| 解約率と理由 | Billing Portal 解約 | Stripe ダッシュボード / Webhook イベント |
| 上限接触率 | `PREMIUM_LIMITS` 80% 警告・到達の発生率 | `showUpgradeModal` 表示（計測配線は未実装） |
| Hoku 上限接触率 | 無料 5 回消費・チケット購入率 | `S.hokuDailyUsage` / ショップ購入履歴 |

### 11.2 計測の現状と方針

- **現状、専用の計測基盤（アナリティクス SDK）は搭載していない**（依存ゼロ原則・プライバシー方針とも整合）。
- サーバ側で自然に取れるもの（`fl_entitlements`・Stripe イベント・`fl_family_members` 参加）から計測を開始し、クライアント行動ログの追加は**外部サービス追加＝人間確認必須**（CLAUDE.md §7）として別途判断する。
- 数値レビューはリリース後に `familink-product-owner` Skill で四半期実施（`docs/premium-strategy.md` §7 を継承）。

---

## 12. 本書の運用

- 本書は課金・マネタイズ設計の**正本**である。`docs/premium-strategy.md`（戦略背景）と数値・実装が食い違う場合は本書（＝実装値）を正とする（§2.1 注記参照）。
- **人間確認必須の変更**(CLAUDE.md §10.2 / §14.3): 実課金の有効化（`STRIPE_ENABLED=true`）、価格変更、無料/プレミアム境界（`PREMIUM_FEATURES` / `PREMIUM_LIMITS`）の変更、権利管理チェーン（§5）の変更、ファミコインの有償販売化、IAP 実装。
- 境界値の変更は必ず `PREMIUM_FEATURES` / `PREMIUM_LIMITS` 定数で行い、本書 §3 の表・比較表 UI・FAQ・法的文書を同時更新する（表示と実装の矛盾禁止）。
- 未解決の要整合項目（正式リリース前に解消）: ①比較表「ストレージ 500MB/20GB」と件数上限実装の乖離（§3.3）②規約の IAP 文言と Stripe 動線の不一致（§4.3 / §10）③「広告なし」訴求と広告モデル不採用方針の整合（§3.1）。
- レビュー担当: 価格・導線 = `familink-monetization-lead`／事業判断 = `familink-ceo-strategy`／ストア審査 = `familink-appstore-release-lead`／訴求 UI = `familink-uiux-designer` の各 Skill。
- 関連文書: `01-product-vision.md` §4（ビジネスモデル）／ `02-requirements.md`（FR-240〜249）／ `03-architecture.md` §5–6（権利テーブル・機能フラグ）／ `09-hoku-ai.md` §9（Hoku 利用制限）／ `docs/BILLING-SETUP.md`（Stripe 有効化・テスト手順）。
