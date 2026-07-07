# 10. デザインシステム（世界観・トークン・コンポーネント）

## 10.1 世界観
「家族をチームに」する、**やさしく・温かく・安心感のある上質さ**。子どもっぽくしすぎない。Apple 系の落ち着いたトーン。
- 装飾的な絵文字を使わない。アイコンは**ラインアイコン（SVG stroke）**で統一。
- 十分な余白・角丸・極薄シャドウ・フォントの統一。片手操作で3秒理解。

## 10.2 カラートークン（`:root` / `tokens.json`）
| 役割 | 値 |
|---|---|
| Primary | `#0A84FF`（dark `#0060D8` / light `#E8F3FF` / mid `#C7E2FF`）|
| Secondary | `#34C759`（dark `#248A3D` / light `#D4F5DF`）|
| Accent | `#FF9F0A`（dark `#C77400` / light `#FFF3E0`）|
| 背景 | app `#F2F2F7` / card `#FFFFFF` / muted `#EBEBF0` / inset `#EFEFF4` |
| テキスト | `#1C1C1E`（副 `#3C3C43` / 弱 `rgba(60,60,67,.72)`）|
| 境界 | `rgba(60,60,67,.18)` / light `rgba(60,60,67,.10)` |
| セマンティック | red `#FF3B30` / orange `#FF9500` / purple `#AF52DE` / pink `#FF2D55` |
| 家計 | 収入 `#34C759` / 支出 `#FF3B30` / 警告 `#FF9500` |
| プレミアム | `#FF9F0A`（light `#FFF6E8`）|
| グラデ | primary `linear-gradient(135deg,#0A84FF,#5AC8FA)` / accent `linear-gradient(135deg,#FFD60A,#FF9F0A)` |

## 10.3 タイポグラフィ
- 本文：`-apple-system, BlinkMacSystemFont, 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Yu Gothic', sans-serif`
- 見出し/ロゴ：`… 'SF Pro Display', 'Hiragino…', 'Noto Sans JP' …`
- Webフォント：Poppins(600/700/800/900) ＋ Noto Sans JP(400/500/600/700/800)。実機Appleは SF Pro/Hiragino を上位に。

## 10.4 形・影・モーション
- 角丸：sm `10px` / base `16px` / lg `20px` / xl `26px` / 2xl `34px` / full `9999px`。
- 影：card `0 1px 3px rgba(0,0,0,.05)…` / base `0 4px 16px rgba(0,0,0,.08)` / lg `0 8px 28px rgba(0,0,0,.10)`。
- トランジション：base `.22s cubic-bezier(.4,0,.2,1)` / spring `.38s cubic-bezier(.34,1.36,.64,1)`。
- **reduced-motion**：常駐モーション（Hokuフローティング/バッジ/空状態/ツアー）は停止（WCAG 2.3.3）。

## 10.5 コンポーネント（要点）
- **ボードカード**：白カード（角丸16〜20px・極薄シャドウ）。左上にカテゴリ色のラインアイコン＋タイトル、本文プレビュー、淡いイラスト背景。
- **プライマリボタン**：Primary 塗り・pill・白文字・押下で軽いスケール（spring）。
- **タブバー**：下部固定5タブ（ホーム/やること/カレンダー/家計/ボード）。選択は Primary。
- **メンバー chip**：丸アバター＋名前のピル。選択で着色。
- **入力**：白背景・角丸14px・1px境界、フォーカスで Primary リング。
- **モーダル**：ボトムシート調（グリップ＋角丸）。
- **Hoku**：右下常駐の星型マスコット。透過PNG（着せ替え対応）。

## 10.6 コピー原則（UXライティング）
- やさしい「です・ます調」。押し付けない。専門用語を言い換える。
- 空状態：「まだ〜ありません」＋次の一手（例「右下の ＋ から登録できます」）。
- ボタンは動作が明確（「保存する」等）。エラー/確認は「何をどうすればよいか」を伝える。
- 医療/家計/AIは支援であり専門助言でない旨を添える。

## 10.7 アクセシビリティ基準
- タップ44px以上・`:focus-visible`・aria-label（アイコンボタン/閉じる/削除）・コントラスト配慮・reduced-motion。
- iPhone SE(375px)で横スクロールを出さない（長文 `word-break/overflow-wrap`）。

## 10.8 ブランド素材
- アプリアイコン（256px）／Hoku マスコット（透過・切り抜き・影付き版）／ウェルカム家族イラスト。
- プレスキット：`docs/press/`（実機スクショ・切り抜きHoku・tokens.json・PRESS.md）。GitHub Pages で安定URL配信。

## 10.9 参照
- `docs/ui-ux-guideline.md` / `docs/press/tokens.json` / `docs/press/PRESS.md`。
