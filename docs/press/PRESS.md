# Familink プレスキット（ITS コーポレートサイト用・実機画像 引き継ぎ）

ITS合同会社のホームページ（LP）に、**Familink の実機画面・ブランド素材**をそのまま反映する
ための引き継ぎです。すべて GitHub Pages の安定URLで配信しているので、`<img src>` で直接参照できます。

- **公開ベースURL**：`https://ktakahashi7755-creator.github.io/Familink/press/`
- 画像は実機サイズ **390×844 / Retina(3x)** で撮影。デモモードの**架空サンプル家族**を使用（実在の個人情報なし）。
- ブランド配色・タグライン等は `../press/tokens.json`（= リポジトリ `docs/press/tokens.json`）参照。

---

## 1. 実機スクリーンショット（URL一覧）

| 画面 | URL |
|---|---|
| ウェルカム/ログイン | `https://ktakahashi7755-creator.github.io/Familink/press/screens/welcome-login.png` |
| ホーム | `…/press/screens/home.png` |
| カレンダー | `…/press/screens/calendar.png` |
| やること | `…/press/screens/tasks.png` |
| かけいぼ（家計） | `…/press/screens/budget.png` |
| けんこう（体調） | `…/press/screens/health.png` |
| 家族ボード | `…/press/screens/board.png` |
| 買い物 | `…/press/screens/shopping.png` |
| アルバム | `…/press/screens/album.png` |
| Hoku（AI） | `…/press/screens/hoku.png` |
| 設定 | `…/press/screens/settings.png` |
| プレミアム | `…/press/screens/premium.png` |

> `…/` は `https://ktakahashi7755-creator.github.io/Familink/press/` の省略。

## 2. ブランド素材

| 素材 | URL | 用途 |
|---|---|---|
| アプリアイコン | `…/press/app-icon-256.png` | favicon / OGP / ロゴ脇 |
| Hoku（透過・切り抜き） | `…/press/hoku.png` / `…/press/hoku@2x.png` | 自前で影を付けたい時 |
| **Hoku（影付き・そのまま浮く）** | `…/press/hoku-soft.png` | **LPにそのまま置くだけで自然に浮く（推奨）** |
| Hoku 笑顔 | `…/press/hoku-happy.png` / `…/press/hoku-happy@2x.png` | 表情違い |

※ Hoku は背景の余白を切り取った**透過PNG**。`hoku-soft.png` は自然なソフトシャドウを焼き込み済みで、白/淡色背景にそのまま置けます。

---

## 3. ブランド基本（tokens.json と一致）

- **アプリ名**：Familink（ファミリンク） ／ **提供**：ITS合同会社
- **タグライン**：家族をチームに。予定も、やることも、ひとつに。
- **カラー**：Primary `#0A84FF` / Secondary `#34C759` / Accent `#FF9F0A` / 背景 `#F2F2F7` / カード `#FFFFFF` / 文字 `#1C1C1E`
- **フォント**：見出し=Poppins、本文=Noto Sans JP
- **角丸**：カード 16〜20px、ボタン pill。**影**：`0 8px 28px rgba(0,0,0,.10)` 基調

---

## 4. そのまま貼れる HTML / CSS スニペット

### 4-1. ヒーロー（スマホモックに実機画面＋浮かぶ Hoku）

```html
<section class="fl-hero">
  <div class="fl-hero-text">
    <h1>家族をチームに。<br>予定も、やることも、ひとつに。</h1>
    <p>予定・やること・家計・体調・Hoku AI をひとつに。家族みんなで子育てをチームで回すアプリ。</p>
    <a class="fl-btn" href="https://ktakahashi7755-creator.github.io/Familink/">Familink を見る</a>
  </div>
  <div class="fl-phone">
    <img class="fl-phone-shot"
         src="https://ktakahashi7755-creator.github.io/Familink/press/screens/home.png"
         alt="Familink ホーム画面">
    <img class="fl-hoku"
         src="https://ktakahashi7755-creator.github.io/Familink/press/hoku-soft.png"
         alt="Hoku">
  </div>
</section>

<style>
.fl-hero{display:flex;gap:48px;align-items:center;flex-wrap:wrap;justify-content:center;
  padding:64px 24px;background:linear-gradient(168deg,#E4F0FF,#F9FBFF);font-family:'Noto Sans JP',sans-serif}
.fl-hero-text{max-width:440px}
.fl-hero-text h1{font-family:'Poppins','Noto Sans JP',sans-serif;font-size:34px;line-height:1.4;
  letter-spacing:-.5px;color:#1C1C1E;margin:0 0 16px}
.fl-hero-text p{font-size:16px;line-height:1.8;color:#3C3C43;margin:0 0 24px}
.fl-btn{display:inline-block;background:#0A84FF;color:#fff;font-weight:700;text-decoration:none;
  padding:14px 28px;border-radius:9999px;box-shadow:0 4px 18px rgba(10,132,255,.32)}
.fl-phone{position:relative;width:300px;flex:none}
/* 端末フレーム（簡易）：実機画面を角丸＋枠＋影で“スマホ”に見せる */
.fl-phone-shot{width:300px;border-radius:38px;border:10px solid #1C1C1E;
  box-shadow:0 24px 60px rgba(0,0,0,.22);display:block;background:#fff}
.fl-hoku{position:absolute;left:-46px;bottom:36px;width:120px;height:auto;
  animation:fl-float 4s ease-in-out infinite}
@keyframes fl-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@media(max-width:560px){.fl-hero-text h1{font-size:26px}.fl-phone,.fl-phone-shot{width:240px}}
</style>
```

### 4-2. 機能セクション（実機スクショを3〜6枚）

```html
<section class="fl-features">
  <div class="fl-feat">
    <img src="https://ktakahashi7755-creator.github.io/Familink/press/screens/calendar.png" alt="カレンダー">
    <h3>家族のカレンダー</h3>
    <p>月／週／リスト表示、メンバー別の色分け、繰り返し予定とリマインドまで。</p>
  </div>
  <div class="fl-feat">
    <img src="https://ktakahashi7755-creator.github.io/Familink/press/screens/budget.png" alt="家計">
    <h3>かんたん家計</h3>
    <p>月次の収支とカテゴリ別の内訳をひと目で。家族で共有できます。</p>
  </div>
  <div class="fl-feat">
    <img src="https://ktakahashi7755-creator.github.io/Familink/press/screens/hoku.png" alt="Hoku AI">
    <h3>AIガイド「Hoku」</h3>
    <p>予定・やること・買い物を、話しかけるだけでサポート。</p>
  </div>
</section>

<style>
.fl-features{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:28px;
  padding:56px 24px;max-width:1080px;margin:0 auto;font-family:'Noto Sans JP',sans-serif}
.fl-feat{text-align:center}
.fl-feat img{width:220px;border-radius:26px;box-shadow:0 8px 28px rgba(0,0,0,.10);margin-bottom:16px}
.fl-feat h3{font-size:18px;color:#1C1C1E;margin:0 0 8px}
.fl-feat p{font-size:14px;line-height:1.8;color:#3C3C43;margin:0}
</style>
```

---

## 5. 使い方メモ（実装者向け）

- 画像は**実寸が縦長(390×844相当)**。`width` だけ指定し `height:auto` で**比率を崩さない**。
- Retina 用に `@2x` の Hoku を用意。`srcset` を使うと綺麗：
  `srcset="…/hoku.png 1x, …/hoku@2x.png 2x"`
- スクショは端末フレーム（4-1のCSS）に載せても、生でカード化(4-2)してもOK。
- 画像を**自前ホストしたい**場合は `docs/press/` 配下のファイルをダウンロードして使用可（同梱の zip も参照）。
- 画像が更新されたら同じURLで差し替わります（GitHub Pages 反映に数分）。

---

## 6. 取得方法（リポジトリ共有）

- これらは `ktakahashi7755-creator/familink` の `docs/press/` にあり、`main` push で GitHub Pages に自動公開されます。
- まとめてのファイル受け渡しが必要なら `handoff-its-hp.zip`（実機スクショ＋トークン＋素材一式）も利用してください。
