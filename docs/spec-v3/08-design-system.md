# Familink デザインシステム・世界観仕様書

**文書番号**: SPEC-v3-08 ／ **版**: 1.0 ／ **作成日**: 2026-07-07 ／ **正本**
**対象読者**: UI/UX デザイナー・フロントエンドエンジニア・ブランド管理者・QA

> 本書は Familink の視覚言語（デザイントークン・コンポーネント・モーション・ライティング・Hoku ビジュアル）の正本である。
> 数値・色・寸法はすべて `app-source/familink.html`（約 29,000 行・2026-07 実測）から転記した実装値であり、
> 旧 `docs/ui-ux-guideline.md` と実装が食い違う箇所は**実装値を正**とし、本書内に差異を注記した。
> ビジョン・世界観の事業的前提は `01-product-vision.md` §8、要件は `02-requirements.md`（NFR-105）、
> Hoku の人格・応答仕様は `09-hoku-ai.md`、課金 UI の訴求原則は `10-monetization.md` §8 を参照。

---

## 1. デザイン哲学・世界観

### 1.1 世界観ステートメント

> **温かく・安心感があり・押し付けない。家族向けだが子どもっぽくしない上質さ。**

Familink は子ども・体調・家計・写真という高プライバシー情報を預かるアプリである。
視覚デザインの役割は「かわいさ」ではなく**信頼感**の構築にあり、App Store の他アプリと並べて違和感のない品質を最低ラインとする。

### 1.2 五つの原則（絶対遵守）

| # | 原則 | 実装上の意味 |
|---|---|---|
| 1 | 装飾絵文字禁止 | 🎉✨等の装飾絵文字を UI に使わない。絵文字は 1 画面 2 個以下（旧ガイド §2 を継承）。状態記号（✅🔶等）はドキュメント内のみ可 |
| 2 | ラインアイコン統一 | すべてのアイコンは SVG stroke（塗りなし・1.7px）。`ICON()` 関数経由で生成（§4） |
| 3 | 落ち着いた配色 | iOS System Colors 準拠のパレット（§2.1）。原色の乱用・派手なグラデーションの多用禁止 |
| 4 | 3 秒理解・片手操作 | タップ領域 44×44px 以上、主要操作は画面下 1/3、1 スクロール内の主要要素 5 つ以下 |
| 5 | Apple HIG 準拠傾向 | 角丸連続曲線・超軽量シャドウ・スプリングイージング・iOS Grouped 背景など、iOS ネイティブの文法に寄せる（コード内コメントにも「Apple System Blue」「Apple Continuous Curve」「Apple Ultra-Light」等と明記） |

### 1.3 やらないこと（アンチパターン）

- 子ども向けすぎるイラスト・フォント・配色
- 重要操作へのカウントダウン・煽り表示（信頼感を損なう）
- 派手なアニメーション・効果音
- 情報の詰め込み（余白を削って要素を増やさない）

---

## 2. デザイントークン

正本は `app-source/familink.html` の `:root` ブロック（L41–133）。CSS カスタムプロパティとして全画面から参照される。
**基幹トークン**（意味を持つ一次定義）と**エイリアス**（後方互換の別名）を分けて管理する。

### 2.1 カラーパレット（基幹トークン）

#### プライマリ（ブルー / ブランド基調・iOS System Blue）— L43–46

| トークン | Hex | 役割 |
|---|---|---|
| `--primary` | `#0A84FF` | 主要アクション・アクティブ状態・フォーカスリング |
| `--primary-dark` | `#0060D8` | プレス時の濃色 |
| `--primary-light` | `#E8F3FF` | 淡背景・チップ・アクティブ薄地 |
| `--primary-mid` | `#C7E2FF` | 中間トーン |

#### セカンダリ（グリーン / 成功・収入）— L48–50

| トークン | Hex | 役割 |
|---|---|---|
| `--secondary` | `#34C759` | 成功・完了・収入 |
| `--secondary-dark` | `#248A3D` | 濃色 |
| `--secondary-light` | `#D4F5DF` | 淡背景 |

#### アクセント（オレンジ / 注意・プレミアム系）— L52–54

| トークン | Hex | 役割 |
|---|---|---|
| `--accent` | `#FF9F0A` | 注意喚起・プレミアム系アクセント |
| `--accent-light` | `#FFF3E0` | 淡背景 |
| `--accent-dark` | `#C77400` | 濃色 |

#### 背景・面（iOS Grouped）— L56–61

| トークン | 値 | 役割 |
|---|---|---|
| `--bg` | `#F2F2F7` | 全体背景 |
| `--theme-bg` | `var(--bg)` | テーマ可変背景。`applyTheme()` が上書き（§8） |
| `--bg-card` | `#FFFFFF` | カード面 |
| `--bg-muted` | `#EBEBF0` | 抑制面 |
| `--bg-grouped` | `#F2F2F7` | グループ背景 |
| `--bg-inset` | `#EFEFF4` | インセット面 |

#### テキスト（iOS Labels）— L63–65

| トークン | 値 | 役割 |
|---|---|---|
| `--text` | `#1C1C1E` | 本文 |
| `--text-sub` | `#3C3C43` | 副テキスト |
| `--text-muted` | `rgba(60,60,67,0.72)` | 補助テキスト |

#### ボーダー（iOS Separators）— L67–68

| トークン | 値 |
|---|---|
| `--border` | `rgba(60,60,67,0.18)` |
| `--border-light` | `rgba(60,60,67,0.10)` |

#### セマンティックカラー（iOS System Colors）— L70–77

| トークン | Hex | 淡色ペア | 用途 |
|---|---|---|---|
| `--red` | `#FF3B30` | `--red-light #FFECEB` | 危険・削除・支出 |
| `--orange` | `#FF9500` | `--orange-light #FFF3E0` | 警告 |
| `--purple` | `#AF52DE` | `--purple-light #F2EEFF` | 学校カテゴリ等 |
| `--pink` | `#FF2D55` | `--pink-light #FFE8EE` | 習い事カテゴリ等 |

> **旧ガイドとの差異**: `docs/ui-ux-guideline.md` §4 は「エラー / 警告：赤は強めにせず、コーラル / 朱寄りに」としていたが、
> 実装は iOS System Red `#FF3B30` を採用している。淡色ペア（`--red-light`）と併用して威圧感を抑える運用が現行の正である。

#### プレミアム — L102–104

| トークン | Hex | 用途 |
|---|---|---|
| `--premium` | `#FF9F0A` | プレミアムバッジ・王冠 |
| `--premium-light` | `#FFF6E8` | 淡背景 |
| `--premium-bg` | `#FFF3E0` | 面 |

アンバー（上品なゴールド）系で統一。旧ガイド §4「上品なゴールドまたはダークトーン」の方針と整合。

#### ステータス色（家計等）— L106–114

| トークン | 値 |
|---|---|
| `--status-income` / `-bg` | `#34C759` / `#D4F5DF` |
| `--status-expense` / `-bg` | `#FF3B30` / `#FFECEB` |
| `--status-warn` / `-bg` / `-text` | `#FF9500` / `#FFF3E0` / `#7C4400` |
| `--status-indigo` / `-bg` | `#5856D6` / `#EEEEFF` |

#### カテゴリ色（ボード / タスク）— L116–121

| カテゴリ | トークン | Hex | 淡色 |
|---|---|---|---|
| 家事 | `--cat-chore` | `#34C759` | `#D4F5DF` |
| 買い物 | `--cat-shop` | `#0A84FF` | `#E8F3FF` |
| 習い事 | `--cat-lesson` | `#FF2D55` | `#FFE8EE` |
| 配達 | `--cat-delivery` | `#FF9500` | `#FFF3E0` |
| 学校 | `--cat-school` | `#AF52DE` | `#F2EEFF` |
| 重要 | `--cat-import` | `#FF3B30` | `#FFECEB` |

### 2.2 エイリアス（後方互換の別名 / 新規使用は基幹トークンを優先）— L128–132

| エイリアス | 実体 |
|---|---|
| `--danger` / `--danger-light` | = `--red` `#FF3B30` / `#FFECEB` |
| `--green` / `--green-light` | = `--secondary` `#34C759` / `#D4F5DF` |
| `--blue-light` | = `--primary-light` `#E8F3FF` |

**運用ルール**: 新規実装ではエイリアスを使わず基幹トークンを参照する。エイリアスは既存コードの後方互換のためだけに残す。

### 2.3 グラデーション — L79–81, L123–126

| トークン | 値 | 用途 |
|---|---|---|
| `--grad-primary` | `linear-gradient(135deg, #0A84FF 0%, #5AC8FA 100%)` | 主要装飾・アルバム FAB・Hoku 送信ボタン |
| `--grad-secondary` | `linear-gradient(135deg, #34C759 0%, #0A84FF 100%)` | 成功系装飾 |
| `--grad-accent` | `linear-gradient(135deg, #FFD60A 0%, #FF9F0A 100%)` | アクセント装飾 |
| `--grad-blue-violet` | `linear-gradient(135deg, #0A84FF 0%, #5856D6 100%)` | 拡張装飾 |
| `--grad-amber` | `linear-gradient(135deg, #FFD60A 0%, #FF9F0A 100%)` | プレミアム装飾 |
| `--grad-progress` | `linear-gradient(90deg, #0A84FF 0%, #5AC8FA 100%)` | 進捗バー |
| `--grad-health` | `linear-gradient(90deg, #FF9500 0%, #FF3B30 100%)` | 体調（発熱）表示 |

### 2.4 角丸（Radii / Apple Continuous Curve）— L83–88

| トークン | 値 | 用途 |
|---|---|---|
| `--r-sm` | 10px | トースト等の小要素 |
| `--r` | 16px | 標準（入力欄・中型要素） |
| `--r-lg` | 20px | カード |
| `--r-xl` | 26px | 大型面 |
| `--r-2xl` | 34px | 特大面 |
| `--r-full` | 9999px | ピル型ボタン・アバター・バッジ |

> **旧ガイドとの差異**: `docs/ui-ux-guideline.md` §3 の「カード 12〜16px、ボタン 12px」は旧値。
> 実装はカード 20px（`--r-lg`）・主要ボタンはピル型（`--r-full`）であり、本書の値を正とする。
> なお実装には変数と直値（18px / 22px 等）が混在しており、トークンへの統一は改善余地（新規実装は必ずトークンを使う）。

### 2.5 シャドウ（Apple Ultra-Light）— L90–93

| トークン | 値 | 用途 |
|---|---|---|
| `--s-sm` | `0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` | 小要素 |
| `--s` | `0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)` | 標準 |
| `--s-lg` | `0 8px 28px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)` | 浮遊要素 |
| `--s-card` | `0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)` | カード（最軽量） |

### 2.6 イージング（Apple Easing）— L95–97

| トークン | 値 | 用途 |
|---|---|---|
| `--t` | `.22s cubic-bezier(.4,0,.2,1)` | 標準トランジション |
| `--t-spring` | `.38s cubic-bezier(.34,1.36,.64,1)` | ボタン・トースト等のスプリング |
| `--t-bounce` | `.4s cubic-bezier(.68,-.55,.265,1.55)` | 強調バウンス（多用禁止） |

---

## 3. タイポグラフィ

### 3.1 フォントスタック — L99–100, `<head>` L5–7

| トークン | 値 | 用途 |
|---|---|---|
| `--font` | `-apple-system, BlinkMacSystemFont, 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Yu Gothic', sans-serif` | 本文標準 |
| `--font-display` | `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif` | ロゴ・大型数値表示 |

- **Google Fonts**（L7・許可済み CDN）: `Poppins:wght@600;700;800;900` ＋ `Noto Sans JP:wght@400;500;600;700;800`。
  `preconnect`（L5）済み。CSP で `fonts.gstatic.com` を許可（L16）。これ以外の外部フォント追加は要人間確認（CLAUDE.md §12.1）。
- ベース設定（L148）: `body { font-size:15px; line-height:1.5; -webkit-font-smoothing:antialiased }`

### 3.2 サイズスケール（実測値）

| 用途 | サイズ | ウェイト |
|---|---|---|
| ロゴ・ヒーロータイトル | 20px 前後 | 800–900 |
| ヘッダータイトル / モーダルタイトル / 主要ボタン | 17px | 700 / 700 / 600 |
| 本文 | 15px | 400–500 |
| 吹き出し・トースト・小ボタン | 14px | 500–600 |
| フィールドラベル・補助 | 11–13px | 500–700 |
| チップ・バッジ | 11px | 700 |
| タブバーラベル | 9.5px | — |
| **入力欄（`.input` / `.form-input`）** | **16px（固定）** | 400 |

**16px 入力の不変条件**: iOS Safari はフォントサイズ 16px 未満の入力欄フォーカス時に自動ズームする。
これを防ぐため入力欄は必ず 16px とする（L152・L393。NFR-503）。**15px 以下に変更してはならない。**

### 3.3 ウェイト運用

| ウェイト | 用途 |
|---|---|
| 400 / 500 | 本文 |
| 600 | 見出し・ボタン・アクティブ状態 |
| 700–800 | 強調・タイトル |
| 800–900 | ロゴ（Poppins） |

太字は見出し・強調のみに使用する（本文の全体太字化は禁止）。家計・予定の数値はタブラー数字相当の表示（`--font-display`）で桁を揃える。

---

## 4. アイコノグラフィ

### 4.1 実装方式（L8654–8723）

- アイコンは JS 定数 **`HOKU_ICON_PATHS`**（アイコン名 → SVG path 文字列）に集約し、**`ICON(name, size=20)`** 関数が SVG を生成する。
- 生成される SVG 属性（固定・変更禁止）:

```html
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
     stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
```

| 規定 | 値 |
|---|---|
| スタイル | ラインアイコン（塗りなし） |
| ストローク幅 | **1.7px** |
| 端点・角 | round / round（丸め） |
| 色 | `currentColor`（親要素の文字色を継承） |
| デフォルトサイズ | 20px |
| 未定義名のフォールバック | `grid` |

### 4.2 アイコンセット一覧（約 60 種・L8656–8715）

| 分類 | アイコン名 |
|---|---|
| 家計・生活 | cart, book, medical, bulb, phone, play, train, shirt, bottle, grid, briefcase, gift, laptop, wallet, bag, car |
| 体調 | thermometer, pill, hospital, heart |
| UI・汎用 | star, bell, calendar, check, close, gear, trash, pencil, pin, folder, document, image, home, chat, user, camera, upload, download, warning, hourglass, sparkle, mic, plus, list, search, clock, flag, music, bowl, trophy, plant |
| リアクション | thumbsup, hand, smileface, flame, eye, repeat |

- 家計カテゴリ→アイコンの対応は `CAT_ICO`（L8726–）で定義（食費→cart、教育費→book、医療費→medical 等）。
- **新規アイコンの追加手順**: `HOKU_ICON_PATHS` に path を追加 → `ICON()` 経由でのみ使用。インライン SVG の直書き・絵文字での代用は禁止。

---

## 5. コンポーネント仕様

### 5.1 ボタン（`.btn` L355–383・Apple HIG）

共通仕様: `inline-flex` / `gap:6px` / `font-weight:600` / `transition:var(--t-spring)` / `letter-spacing:-0.1px`。
プレス反応: `:active { transform:scale(.96); opacity:.85 }`（全バリアント共通）。

| バリアント | 高さ | 角丸 | 背景 / 文字色 | フォント | 備考 |
|---|---|---|---|---|---|
| `.btn-primary` | 50px | `--r-full` | `--primary` / 白 | 17px | shadow `0 3px 14px rgba(10,132,255,.32)` |
| `.btn-lg` | 54px | `--r-full` | — | 17px | 大型 |
| `.btn-sm` | 36px | `--r-full` | — | 14px | padding `0 14px` |
| `.btn-outline` | 50px | `--r-full` | 透明 / 1.5px `--primary` 枠 | 17px | セカンダリアクション |
| `.btn-ghost` | 44px | `--r-full` | `rgba(118,118,128,.12)` / `--text` | 15px / 500 | 三次アクション |
| `.btn-danger` | 50px | `--r-full` | `--red` / 白 | 17px | 赤シャドウ。削除等 |
| `.btn-block` | — | — | `width:100%` | — | 幅修飾子 |

オンボーディング専用: `.ob2-btn`（高さ 54px, L637）、`.ob2-btn-apple`（黒 `#1C1C1E`, L681）。

### 5.2 フォーム入力（L388–415, 459–468）

| 項目 | 値 |
|---|---|
| セレクタ | `.input` / `.form-input` |
| 高さ | 50px |
| 角丸 | `--r`（16px） |
| 背景 | `rgba(118,118,128,.10)` |
| ボーダー | `1px transparent`（通常時は枠なし） |
| padding | `0 16px` |
| フォント | **16px**（§3.2 の不変条件） |
| フォーカス | `border-color:--primary; background:#fff; box-shadow:0 0 0 3.5px rgba(10,132,255,.18)` |

- `textarea.input`: padding 14px/16px, `line-height:1.6`
- `select`: SVG データ URI のシェブロン（stroke `#8A9ABE`）
- パスワード表示切替 `.pw-eye`: 36×36px（L401）

### 5.3 カード（L420–423）

```css
.card { background:#fff; border-radius:var(--r-lg); /* 20px */ box-shadow:var(--s-card) }
```

Apple の Inset Grouped リストに相当する最軽量表現。カードにボーダーは付けない（シャドウのみ）。

### 5.4 モーダル / ボトムシート（L428–476）

| 要素 | 仕様 |
|---|---|
| `.modal-backdrop` | `rgba(0,0,0,.42)`・`align-items:flex-end`（下寄せ）・`transition:opacity .28s`・z-index 200（確認ダイアログ `#m-confirm` は z-index 700） |
| `.modal`（ボトムシート） | 背景 `--bg-card`・角丸 `20px 20px 0 0`・`max-width:480px`・`max-height:92vh`・`padding-bottom:calc(24px + env(safe-area-inset-bottom))`・出現 `translateY(100%)→0`・`transition:.36s cubic-bezier(.32,1,.46,1)`・`overscroll-behavior-y:contain` |
| `.modal-grip` | 36×4px・`rgba(60,60,67,.18)`（ドラッグつまみ） |
| `.modal-title` | 17px / 700・中央揃え |
| `.modal-center`（確認ダイアログ） | `max-width:320px`・角丸 16px・出現 `scale(.88)→1` |

- `body.modal-open` でタブバー・FAB・ベルを非表示（L263–267）。
- 閉じる手段は 2 つ以上（× ボタン＋背景タップ）を必ず確保する。
- 破壊的操作は `showConfirm` 経由必須（`03-architecture.md` §3.2 / CLAUDE.md §13.6）。

### 5.5 トースト（L481–498）

| 項目 | 値 |
|---|---|
| コンテナ `#toast-wrap` | 上部固定・`padding-top:calc(env(safe-area-inset-top) + 12px)`・z-index 999 |
| `.toast` | padding 12px/18px・角丸 `--r-sm`（10px）・14px / 600・max-width 340px・`animation:toastIn .3s var(--t-spring)` |
| 種別（左ボーダー 4px） | success = 緑 `--secondary` ／ error = 赤（文字 `#c0392b`）／ info = 青 `--primary` |

### 5.6 タブバー（Floating Dock・L243–305）

| 項目 | 値 |
|---|---|
| `#tabbar` | `position:fixed`・`bottom:calc(10px + env(safe-area-inset-bottom))`・中央寄せ・`width:calc(100% - 24px)`・`max-width:456px`・高さ 64px |
| 背景 | `rgba(248,248,250,.97)` ＋ `backdrop-filter:saturate(180%) blur(28px)` |
| 形状 | 角丸 22px・多層シャドウ ＋ `inset 0 .5px 0 rgba(255,255,255,.9)`・z-index 100 |
| `.tab-btn` | flex 均等・`:active { scale(.90) }` |
| `.tab-icon` | 36×28px・非アクティブ `rgba(60,60,67,.40)`・アクティブ `--primary` ＋ `scale(1.08)` |
| `.tab-label` | 9.5px |
| 480px 以下 | 左右 12px に広がる（L268） |

### 5.7 FAB（L549–557）

| 項目 | 値 |
|---|---|
| `.fab` | 52×52px・角丸 `--r-full`・背景 `--primary`・24px 白「+」・shadow `0 3px 14px rgba(10,132,255,.38)`・`transition:var(--t-spring)`・`:active { scale(.88) }` |
| `.alb-fab`（アルバム用） | 56×56px・`--grad-primary`（L1063） |

Hoku FAB は別仕様（§10.2）。

### 5.8 バッジ / チップ（L512–522）

| 要素 | 仕様 |
|---|---|
| `.chip` | padding 3px/10px・角丸 `--r-full`・11px / 700 |
| `.badge` | min-width 20px・高さ 20px・角丸 `--r-full`・`--red` 背景・白 11px / 700（通知件数） |

### 5.9 アバター（L503–507）

```css
.av { border-radius:var(--r-full); font-weight:700; color:#fff }
```

イニシャル＋メンバーカラーの円形。カラースウォッチ `.swatch` は 30×30px の円（L540）。

### 5.10 空状態（L527–534, 3681–3718）

| 種別 | 仕様 |
|---|---|
| 汎用 `.empty` | 縦積み中央・padding 36px/24px・イラスト `img 72×72`・タイトル 15px / 700・説明 13px `--text-muted` |
| Hoku 空状態 `.hoku-empty-state` | `img 88×88` ＋ `prm-float` アニメ＋ドロップシャドウ・タイトル 20px / 800・サブ 13px・提案チップ `.hoku-empty-chip`（白・角丸 `--r-full`）・音声ヒント（赤ドット `mic-pulse`） |

空状態は「空であること」ではなく「次の一手」を伝える（コピー規定は §9.4）。

---

## 6. モーション

### 6.1 アニメーション一覧（実装値）

| 名称 | 行 | 用途 / 仕様 |
|---|---|---|
| `toastIn` | L498 | トースト出現 `.3s var(--t-spring)` |
| `coinBump` | L762 | コイン獲得 `.5s ease`・scale 1.18 |
| `sync-pulse` | L888 | 同期中ドット 1s infinite |
| `hokuFloat` | L2297 | Hoku 浮遊: 3.4s・translateY 0→-7px ＋ rotate ±1.2deg |
| `hokuSpeak` | L2303 | 発話 .85s・上下バウンス＋scale 1.025 |
| `hokuThink` | L2309 | 思考 1.7s・rotate ±3.5deg |
| `hokuBounce` ＋ sparkle | L2314–2331 | happy 演出 .62s×2 ＋キラキラ疑似要素 |
| `hokuBreathing` | L3174 | FAB 呼吸: 4.5s・scaleX/Y 変形（squash & stretch）＋ translateY。ドラッグ中は 12s に減速 |
| `hokuTapBounce` | L3182 | タップ .52s `cubic-bezier(.36,.07,.19,.97)`・0.8→1.18→1 |
| `hokuPulse` | L3190 | FAB 外周パルス 3s・opacity .5→0・scale 1.55 |
| `hoku-mq-left` / `hoku-mq-right` | L2278 | 提案チップ 2 段マーキー 50s linear（上段右送り・下段左送り） |
| `hokuSpin`(OCR) / `ldot` / `shimmer` / `prm-float` / `prm-crown-pulse` / `prm-cta-pulse` | L1827, 3018, 3519 等 | ローディング・プレミアム装飾 |
| `screen-in` | L3489–3493 | 画面遷移 `.22s cubic-bezier(.22,1,.36,1)`（オンボーディング / ログイン画面は除外） |
| `slideUp` | L2610 | メニュー等 `.2s cubic-bezier(.34,1.3,.64,1)` |
| `tourPulse` / `tourTipIn` | L3698 | チュートリアルスポット |
| `netBannerIn` | L3775 | オフライン通知バナー |

### 6.2 モーション設計原則

- Hoku のアニメは「浮遊・呼吸」の控えめな動きに限る（`docs/hoku-guideline.md` §4.2 を継承）。
- 装飾アニメは 1 画面 1 系統まで。バウンス系（`--t-bounce`）は多用禁止。
- 無限ループアニメは Hoku・同期表示・マーキーのみに限定する。

### 6.3 reduced-motion 対応（必須・L2281, 2333, 3495 他）

`@media (prefers-reduced-motion: reduce)` で以下を**全停止**する（WCAG 2.3.3 準拠・NFR-503）:

- Hoku の浮遊・呼吸・パルス
- 装飾アニメ・無限アニメ
- 画面遷移 `screen-in`・モーダル transition
- 提案チップのマーキー → **手動横スクロールに退避**

新規アニメを追加する場合は reduced-motion 側の停止定義もセットで追加すること。

---

## 7. レイアウト

### 7.1 アプリシェル（480px・L169–195）

- `#app` は `max-width:480px`。PC では中央寄せ＋`box-shadow:0 0 60px rgba(0,0,0,.18)` で「スマホ画面」を提示。
- `@media (max-width:480px)`（L186）: `position:fixed; inset:0` のフル画面・影なし。
- `body` は flex 中央寄せで外側背景を持つ。

### 7.2 横はみ出し防止（不変条件）

- `html, body { overflow-x:hidden; max-width:100% }`・`body { overflow-y:hidden }`（スクロールは `.scroll-area` 内のみ。L145・202）
- `-webkit-text-size-adjust:100%`（L141）
- **iPhone SE（375px）幅で横スクロールを発生させない**（CLAUDE.md §12.4 / NFR-501）

### 7.3 セーフエリア対応

| 対象 | 反映方法 |
|---|---|
| ヘッダー | 高さ `calc(52px + env(safe-area-inset-top))`（L211） |
| トースト・オンボーディング上部 | `env(safe-area-inset-top)` 加算 |
| タブバー | `bottom:calc(10px + env(safe-area-inset-bottom))` |
| モーダル・スクロール末尾 | `padding-bottom` に `env(safe-area-inset-bottom)` 加算 |

### 7.4 ブレークポイント

| メディアクエリ | 行 | 内容 |
|---|---|---|
| `@media (max-width:480px)` | L186, 268 | フル画面化・タブバー左右 12px |
| `@media (min-width:481px)` | L2380 | PC で Hoku バーの底 padding 調整 |
| `@media (max-width:375px)` | L686, 3688 | iPhone SE 対応: `.login-hero` フォント縮小、`.home-mode-btn { max-width:84px }` で折返し防止 |
| `@media (hover:hover)` | L2280 | ホバー可能環境でマーキー停止 |

### 7.5 タップ領域・余白基準

| 項目 | 基準 |
|---|---|
| タップ領域 | **最低 44×44px**（ヘッダーアイコンボタン 44×44 [L232]、Hoku 入力/送信/マイク各 44px、ボタン 36–54px） |
| 要素間余白 | 12–16px |
| ブロック間余白 | 24–32px |
| ヘッダー | 高さ 52px＋safe-area・`backdrop-filter:saturate(180%) blur(20px)`・`rgba(255,255,255,.94)` |
| タブバー幅 | `max-width:calc(480px - 24px)`（L249） |
| モーダル幅 | `max-width:480px`・`.modal-backdrop .modal { max-width:calc(100vw - 24px) }`（L183）・中央ダイアログ 320px |

---

## 8. テーマシステム

### 8.1 背景テーマ（8 種・L21519–21548）

`THEMES` 定数で定義。すべて「柔らかい上→下グラデーション」で白カード・濃色文字の可読性を保つ淡色設計。

| id | 名称 | 価格（ファミコイン） | 背景 |
|---|---|---|---|
| default | デフォルト | 0（無料） | `var(--bg)` |
| cream | クリーム | 0（無料） | `linear-gradient(180deg,#FBF4E6 0%,#FEFBF4 100%)` |
| sky | 青空 | 60 | `linear-gradient(180deg,#E4F0FE 0%,#F3F9FF 55%,#FFFFFF 100%)` |
| sakura | さくら | 60 | `linear-gradient(180deg,#FCE5EF 0%,#FFF3F9 55%,#FFFFFF 100%)` |
| mint | ミント | 60 | `linear-gradient(180deg,#E0F4E8 0%,#F2FBF6 55%,#FFFFFF 100%)` |
| lavender | ラベンダー | 60 | `linear-gradient(180deg,#ECE6FB 0%,#F6F3FF 55%,#FFFFFF 100%)` |
| apricot | 夕日 | 80 | `linear-gradient(180deg,#FCE7D8 0%,#FFF0E4 45%,#FCF4FF 100%)` |
| aqua | うみ | 80 | `linear-gradient(180deg,#DAEFF1 0%,#ECF9F9 50%,#F3FAFF 100%)` |

- 適用: `applyTheme()`（L21533）が `document.documentElement` の `--theme-bg` を上書きし、全 `.screen` に統一反映。
- 所持判定: `isThemeOwned()`（無料 or ショップ購入 `isShopOwned('theme:'+id)`）。
- 購入はファミコイン（`10-monetization.md` §9）。テーマ機能自体はプレミアム機能扱い（`PREMIUM_FEATURES.themes.premiumOnly`）と併存するため、境界変更時は両文書を同時更新する。

### 8.2 ダークモード

**未実装**。`prefers-color-scheme: dark` への対応は Phase 2 以降で検討（旧ガイド §9 の方針を維持）。
現状はライトテーマのみであり、新規実装で独自にダーク対応を入れないこと（部分対応は世界観の分裂を招く）。

---

## 9. ライティング・トーン&マナー

### 9.1 原則

| 原則 | 内容 |
|---|---|
| 3 秒理解 | 一読で意味が取れる短文。1 文 40 字目安 |
| 専門用語回避 | 「同期」→「みんなで共有」等、生活語彙に言い換える |
| 命令形回避 | 「保存して」→「保存しますね」。共有・お願い形 |
| 責めない | エラーはユーザーを責めず、**原因＋次の一手**を必ず添える |
| 絵文字 | 装飾絵文字禁止。使う場合も 1 画面 2 個以下 |
| 文体 | UI 本文はです・ます調。Hoku の発話のみ柔らかい常体（`09-hoku-ai.md` §1） |

### 9.2 時間帯挨拶（`greeting()` L9376）

| 時刻 | 挨拶 |
|---|---|
| 〜5 時未満 | おやすみなさい |
| 5〜10 時未満 | おはようございます |
| 10〜17 時未満 | こんにちは |
| 17〜21 時未満 | お疲れ様です |
| 21 時〜 | こんばんは |

ホームは `〈挨拶〉、〈名前〉さん`（L11474）。ログイン画面は「おかえりなさい」（L3921）。

### 9.3 エラー・バリデーション文の書き方（実例・L6524–6534）

| 実装コピー | 満たしている原則 |
|---|---|
| 「ログインできませんでした。メールアドレス・パスワードをご確認ください（新規登録直後は確認メールのリンクをクリック済みかご確認ください）。」 | 原因＋次の一手 |
| 「メール認証が未完了です。受信メールのリンクから確認してください。」 | 次の一手 |
| 「ネットワークに接続できませんでした。通信状況をご確認ください。」 | 責めない |
| 「リクエストが多すぎます。1〜2分おいて再度お試しください。」 | 具体的な回復手順 |
| 「うまく処理できませんでした。通信環境をご確認のうえ、もう一度お試しください。」（フォールバック） | 汎用でも次の一手 |
| トースト:「同期しました」（success）／「クラウドへの保存に失敗しました。通信環境をご確認のうえ再度お試しください」（error） | 黙殺しない（NFR-302） |

### 9.4 空状態コピー（実例）

| 画面 | コピー |
|---|---|
| 体調記録 | 「まだ記録はありません／右下の＋ボタンで追加できます」（L15133） |
| 固定収支 | 「固定収支はまだありません／毎月の給料・家賃…を登録すると今月のお金の見通しが分かりやすくなります。」（L15391） |
| カレンダー | 「予定はありません」（L12081） |
| ボード | 「投稿がありません」（L16457） |
| 通知 | 「通知はまだありません」（sleep 画像つき・L20980 付近） |

空状態は「何をすればよいか」の誘導を必ず含める（追加方法・登録メリットのどちらか）。

### 9.5 免責・法令系の常設文言

| 領域 | 文言 | 位置 |
|---|---|---|
| 体調 | 「体調記録は診断ではなく、家族内の振り返り用です。」 | L5313, 6177（常設） |
| 家計 | 記録支援であり金融助言ではない旨（NFR-702） | 家計画面 |
| プレミアム | 「プレミアムを30日間 無料で体験しよう」（煽らない・ポジティブ訴求） | L21099 |

---

## 10. Hoku ビジュアル規定

人格・応答仕様は `09-hoku-ai.md` を正本とする。本節は視覚仕様のみを扱う。

### 10.1 レンダリング方式

- Hoku は **PNG 画像アセット**で描画する（CSS によるキャラ造形ではない）。基本画像は `IMGS.hoku`（フォールバック `IMGS.happy`）。スキン画像は `assets/hoku/*.png`。
- 表示箇所と寸法（`refreshHokuImages`（L21619–21636）が一括差し替え）:

| 箇所 | 寸法 |
|---|---|
| FAB（`#hoku-fab img`） | 64×64px（L3235） |
| チャットヘッダー（`.hoku-hd-av`） | 36×36px 円 |
| 空状態（`.hoku-empty-img`） | 88×88px |
| チャット吹き出し脇アバター | 小型円 |
| ログインボーナス演出 | 120×120px（L21446） |

- 画像 `onerror` 時は必ず基本 Hoku へフォールバックする（`_hokuImgFallback` L21601。表示崩れ防止）。

### 10.2 FAB 配置（L3196–3271）

| 項目 | 値 |
|---|---|
| 位置 | `position:fixed; right:14px; bottom:calc(160px + env(safe-area-inset-bottom))`（＋FAB の上） |
| 寸法 | 68×68px・z-index 9999 |
| 操作 | `touch-action:none`（ドラッグ移動可） |
| アニメ | 内側 `.hoku-fab-inner` に `hokuBreathing` ＋ `drop-shadow(0 4px 12px rgba(10,132,255,.35))`・外周パルスリング・通知バッジ |

「右下常駐・浮遊・呼吸・控えめ」（`docs/hoku-guideline.md` §4）を実装で満たす。主要操作ボタンを隠さない位置を維持する。

### 10.3 吹き出し（L2345–2356）

| 要素 | 仕様 |
|---|---|
| `.hoku-bubble` | max-width 80%・padding 10px/14px・`line-height:1.65`・14px |
| AI 発話 `.ai` | 白背景・`--text`・角丸 `4px 16px 16px 16px`（左下のみ尖る＝相手側）・軽シャドウ |
| ユーザー `.u` | `--primary` 背景・白・角丸 `16px 16px 4px 16px`・ウェイト 500 |
| 入力 `.hoku-input` | 角丸 22px・min-height 44px |
| 送信 `.hoku-send` | 44px 円・`--grad-primary` |
| 音声 `.hoku-mic` | 44px 円・listening 時パルス（L2413–2429） |

### 10.4 スキン（10 種・`HOKU_SKINS` L21576–21594）

| レアリティ | 価格（ファミコイン） | スキン |
|---|---|---|
| normal | 0 | 通常Hoku |
| normal | 30 | にこにこHoku・わくわくHoku・びっくりHoku・ぴょんHoku・おやすみHoku |
| normal | 100 | パジャマHoku |
| rare | 200 | 先生Hoku・料理Hoku |
| premium | 300 | ヒーローHoku・宇宙Hoku |

- レアリティ表示色（`HOKU_RARITY`）: ノーマル `#5B7196`/`#EEF2F7`・レア `#2E7DC4`/`#E6F1FD`・プレミアム `#B5790A`/`#FFF3D6`。
- スキン説明文も Hoku の世界観に揃える（例: 「いつも笑顔で家族を応援する、ごきげんなHoku。」）。
- スキン追加・画像差し替えは要人間確認（CLAUDE.md §7「画像素材の削除/差し替え」）。

---

## 11. 新規 UI 実装チェックリスト

新規画面・コンポーネント・文言を追加する前に、以下を**全項目**確認する。

### 11.1 トークン・スタイル

- [ ] 色は `:root` トークンを参照している（Hex 直書きしていない。エイリアスでなく基幹トークン）
- [ ] 角丸は `--r` 系トークン、シャドウは `--s` 系、イージングは `--t` 系を使用
- [ ] アイコンは `ICON()` 経由のラインアイコン（絵文字・インライン SVG 直書き禁止）
- [ ] 装飾絵文字を使っていない

### 11.2 レイアウト・操作性

- [ ] タップ領域 44×44px 以上
- [ ] 入力欄フォントは 16px（iOS ズーム防止）
- [ ] iPhone SE（375px）幅で横スクロールが発生しない
- [ ] セーフエリア（top / bottom）を侵食しない
- [ ] モーダルの閉じる手段が 2 つ以上ある
- [ ] 押せないボタン・保存されないフォーム・遷移先のない導線がない（CLAUDE.md §12.4）

### 11.3 モーション・アクセシビリティ

- [ ] 新規アニメに `prefers-reduced-motion: reduce` の停止定義を追加した
- [ ] 本文コントラスト比 4.5:1 以上
- [ ] 無限アニメを追加していない（Hoku・同期・マーキー以外）

### 11.4 ライティング

- [ ] です・ます調（Hoku 発話は `09-hoku-ai.md` の口調規定）
- [ ] エラー文に「原因＋次の一手」がある
- [ ] 空状態に次のアクションへの誘導がある
- [ ] 命令形・煽り・カウントダウンを使っていない

### 11.5 セキュリティ・品質

- [ ] `innerHTML` へ渡す変数はすべて `H()` エスケープ済み
- [ ] 実装後 `node qa_full_test.js` 84/84 PASS を確認

---

## 12. 本書の運用

- 本書は Familink の視覚言語の**正本**である。旧 `docs/ui-ux-guideline.md` と数値が食い違う場合は本書（＝実装値）を正とする（差異は §2.1・§2.4 に注記済み）。
- トークン・コンポーネント仕様を変更した場合は、実装（`app-source/familink.html`）→ 本書 → worklog の順で必ず反映する。実装と本書が矛盾した場合は実装を調査のうえ本書を修正する（推測で書かない）。
- 世界観原則（§1）の変更、Hoku ビジュアルの大幅変更、画像素材の差し替え、CDN フォントの追加は**人間確認必須**（CLAUDE.md §7 / §10.2 / §12.1）。
- レビューは `familink-uiux-designer`（UI 品質）・`familink-brand-asset-director`（素材・カラー）・`familink-core`（世界観の最終裁定）の各 Skill が担う。
- 関連文書: `01-product-vision.md`（世界観の事業的前提）／ `02-requirements.md`（NFR-1/NFR-5）／ `09-hoku-ai.md`（Hoku 人格）／ `10-monetization.md`（課金 UI 訴求）。
