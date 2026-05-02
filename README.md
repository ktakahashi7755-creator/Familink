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

### 公開後の URL（想定）

```
https://ktakahashi7755-creator.github.io/Familink/
```

このページが自動的に `app-source/familink.html` にリダイレクトします（リポジトリ直下の `index.html` がリダイレクト用）。

### GitHub での設定手順（オーナー側で 1 回だけ）

1. GitHub の `https://github.com/ktakahashi7755-creator/Familink` を開く
2. **Settings** タブ → 左サイドバー **Pages**
3. **Source** を以下に設定：
   - **Branch**：`claude/familylink-unicorn-product-TzM1F`
   - **Folder**：`/ (root)`
4. **Save** をクリック
5. 数分待つと上部に「Your site is live at ...」が表示される
6. その URL（または `https://ktakahashi7755-creator.github.io/Familink/`）を iPhone Safari で開く

### Pages 設定のポイント

| 項目 | 推奨値 | 補足 |
|---|---|---|
| Branch | `claude/familylink-unicorn-product-TzM1F` | 現在の安定版コミット (`eae3233`) を含むブランチ |
| Folder | `/ (root)` | リポジトリ直下の `index.html` でリダイレクト |
| カスタムドメイン | 不要 | 一時 QA 用途のためデフォルトの `*.github.io` で十分 |

### 注意事項

- このブランチに push するたびに数十秒〜数分で自動再デプロイされます
- **実機 QA が終わったら Pages を無効化推奨**（Settings → Pages → Branch を `None` に戻す）
- 公開不可な情報（個人名 / 固定パスワード等）は Wave 4 までに 0 件確認済み（worklog 参照）
- ホーム画面に追加すれば PWA 風にフルスクリーン起動

### キャッシュの罠

- iPhone Safari は前回読み込んだバージョンをキャッシュしがちです
- 最新版が反映されないと感じたら：**Safari 設定 → 詳細 → Web サイトデータ → このサイトのデータを削除** → 再読み込み
- 開発中は **プライベートブラウズ** で開くとキャッシュ問題を回避しやすい

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
