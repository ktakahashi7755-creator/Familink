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

## 開発 / 修正フロー（要約）

1. 作業開始：`CLAUDE.md` §1 の開始プロトコルに従う
2. 修正：`familink-html-engineer` Skill で最小差分（単一 HTML 運用継続）
3. テスト：`docs/test-checklist.md` の観点で手動確認 + iPhone 実機
4. 作業終了：`CLAUDE.md` §2 の終了プロトコルで `docs/worklog.md` 追記 + commit

詳細は `CLAUDE.md` / `docs/development-workflow.md` / `docs/mobile-operation.md` を参照。

---

## ライセンス / 公開前

App Store / Google Play 公開前のチェックは `familink-appstore-release-lead` Skill と `docs/test-checklist.md` を参照してください。
