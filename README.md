# Familink

家族向けアプリ「ファミリンク」のリポジトリ。**家族みんなで子育てをチームにするアプリ**を目指しています。

運用ルール・ロードマップ・UI 基準などの正本は `CLAUDE.md` および `docs/` を参照してください。

---

## 構成

```
app-source/familink.html   # アプリ本体（単一 HTML 運用）
src/familink.html          # 上記への symlink（公開確認用ショートカット）
docs/                      # 仕様・ガイドライン・worklog
.claude/skills/            # Familink 専用 17 Skills
CLAUDE.md                  # 運用ルール
```

正本は `app-source/familink.html` です。`src/familink.html` は symlink で、内容を二重管理しません。

---

## 起動手順（ローカル / iPhone 確認）

依存ライブラリは不要です。Python 標準の HTTP サーバで動きます。

### PC ローカルブラウザ

```bash
# リポジトリ直下から
python3 -m http.server 8000
# ブラウザで http://127.0.0.1:8000/src/familink.html を開く
# （または http://127.0.0.1:8000/app-source/familink.html）
```

`Ctrl+C` で停止。

### 同一 LAN の iPhone から確認

```bash
# PC のローカル IP を確認（例: 192.168.1.10）
ipconfig getifaddr en0    # macOS
# または
hostname -I               # Linux

# サーバ起動（外部からアクセスできるように 0.0.0.0 で起動）
python3 -m http.server 8000 --bind 0.0.0.0
```

iPhone Safari で `http://192.168.1.10:8000/src/familink.html` を開く。
PC とスマホは同じ Wi-Fi に接続してください。

### ホームに追加（iPhone）

`apple-mobile-web-app-capable=yes` 指定済みのため、Safari の「ホーム画面に追加」でフルスクリーン PWA 風に動作します。

### iPhone 実機 QA をする方は

OS 別の起動手順 / 21 画面チェックリスト / バグ報告テンプレートをまとめた **`docs/iphone-qa-guide.md`** を参照してください（プログラミング初心者でも進められる詳細手順あり）。

---

## 出先の iPhone から確認したい（GitHub Pages 一時公開）

PC を立ち上げずに iPhone から URL で開きたい場合は、GitHub Pages を使って一時公開できます。

### ⚠️ 前提：リポジトリを Public にする必要があります

**現在このリポジトリは Private**です。GitHub Free プランでは **Private リポジトリで Pages が使えません**ので、まず Public に変更する必要があります（公開不可な情報は Wave 1〜4 で 0 件確認済みなので Public 化しても安全）。

### Step A：リポジトリを Public に変更（オーナー側、1 回だけ）

1. `https://github.com/ktakahashi7755-creator/Familink` を開く
2. **`Settings`** タブをクリック
3. ページを一番下までスクロール → **`Danger Zone`**（赤枠）
4. **`Change repository visibility`** → **`Change to public`** をクリック
5. 確認画面でリポジトリ名 `ktakahashi7755-creator/Familink` を入力
6. **`I understand, change repository visibility`** をクリック

### Step B：Pages を有効化（オーナー側、1 回だけ）

公開ワークフロー `.github/workflows/pages.yml` を **追加済み**なので、Settings の操作は **1 つだけ**：

1. Settings → 左サイドバー **`Pages`**
2. **`Build and deployment`** → **`Source`** ドロップダウン：
   - **`GitHub Actions`** を選択（`Deploy from a branch` ではない）
3. 自動的にワークフローが走り、数分後に `https://ktakahashi7755-creator.github.io/Familink/` が有効になる

### 公開後の URL

```
https://ktakahashi7755-creator.github.io/Familink/
```

このページが自動的に `app-source/familink.html` にリダイレクトします。

### 動作確認の流れ

1. Step A → Step B を実施
2. リポジトリの **`Actions`** タブで `Deploy to GitHub Pages` ワークフローが緑色（成功）になっていることを確認
3. iPhone Safari で上記 URL を開く
4. Familink のウェルカム画面が表示される

### 終了後（推奨）

実機 QA が完了したら：
- Settings → Pages → Source を `Disable` または `None` に
- Settings → 必要なら Public → Private に戻す（Public のままでも公開不可情報は 0 件確認済み）

### キャッシュの罠

- iPhone Safari は前回読み込んだバージョンをキャッシュしがちです
- 最新版が反映されないと感じたら：**Safari 設定 → 詳細 → Web サイトデータ → このサイトのデータを削除** → 再読み込み
- 開発中は **プライベートブラウズ** で開くとキャッシュ問題を回避しやすい

### Public に変更したくない場合

Public 化が難しい場合は、**PC + 同一 LAN の iPhone** 方式が確実です（前述の §同一 LAN の iPhone から確認 を参照）。

---

## 開発 / 修正フロー（要約）

1. 作業開始：`CLAUDE.md` §1 の開始プロトコルに従う
2. 修正：`familink-html-engineer` Skill で最小差分（単一 HTML 運用継続）
3. テスト：`docs/test-checklist.md` の観点で手動確認 + iPhone 実機
4. 作業終了：`CLAUDE.md` §2 の終了プロトコルで `docs/worklog.md` 追記 + commit

詳細は `CLAUDE.md` / `docs/development-workflow.md` / `docs/mobile-operation.md` を参照。

---

## ライセンス / 公開前

App Store / Google Play 公開前のチェックは `familink-appstore-release-lead` Skill と `docs/test-checklist.md` を参照してください。
