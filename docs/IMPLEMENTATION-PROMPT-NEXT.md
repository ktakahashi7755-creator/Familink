# 次セッション用 実装プロンプト（Wave 24 / 2026-05-03）

このファイルは、**次の AI / 開発者**に渡すための「次に着手すべきタスクと制約」をまとめたもの。
そのままコピペして Claude Code / ChatGPT / 別 AI に渡せる構成。

---

## 🎯 すぐに着手すべき Top 10 タスク

### 1. iPhone 実機検証（最優先 / Wave 24 推奨）
**プロンプト：**
```
docs/iphone-verification-playbook-2026-05-03.md の Quick 10 分テストを iPhone Safari で実行し、
PASS/FAIL を表で報告してください。FAIL があれば該当画面のスクリーンショットも添付。
診断パネル：https://ktakahashi7755-creator.github.io/Familink/#qa-debug
```

### 2. 家族 2 端末同期 Step 1（QR コード）
**プロンプト：**
```
Familink に「家族 2 端末同期」を実装してください。
- 設定画面に「家族コードを共有」エントリ追加
- LocalStorage 全体を JSON → 圧縮 → QR 表示
- 受信側：QR スキャン or テキスト貼付で merge
- LocalStorage 構造変更なし（追加のみ）
- 既存テスト 301/301 PASS 維持
- 詳細：docs/REDEV-ROADMAP-2026-05-03.md F-01
```

### 3. 通知 Step 1（朝の段取り）
**プロンプト：**
```
朝 7:00 に「今日の予定 N 件 / 準備未完了 N 件」を通知する機能を追加。
WKWebView 経由 or Web Notification API のフォールバック。
詳細：F-02
```

### 4. プレミアム週次サマリー
**プロンプト：**
```
日曜夜 21:00 に「今週の家族ハイライト」を Hoku が生成。
- 完了タスク数 / 家計サマリー / 家族ボード新規投稿
- 設定画面 → 「週次サマリーを見る」ボタン
- スクリーンショット可能なカード形式
詳細：F-04
```

### 5. カメラ実起動 + 写真添付
**プロンプト：**
```
ホーム右上のカメラアイコンを実カメラに接続。
<input type="file" accept="image/*" capture="environment"> を使い、
撮影後に投稿モーダルに画像プレビュー + 添付。
画像は base64 で S.announces.imageData に保存。
LocalStorage 上限を考慮（画像は 100KB に圧縮）。
詳細：F-05
```

### 6. Hoku 文脈応答（直前 3 ターン記憶）
**プロンプト：**
```
Hoku に会話履歴を持たせる：
- _hokuMsgs を直近 3 ターン保持
- 次の応答で履歴を参照（「先ほどの〇〇」のような繋ぎ）
- 既存の正規表現分類器をベースに、文脈ヒント付きで応答
- 詳細：G-01
```

### 7. BOARD_TYPE_META と INTENT_META の統合
**プロンプト：**
```
BOARD_TYPE_META（旧）と INTENT_META（新）を 1 つに統合。
互換性維持のため getIntentMeta() は残す。
コード簡素化のみ / 機能変更なし。
```

### 8. 曜日ルーティン準備の自動投入
**プロンプト：**
```
S.prepRoutines = [{id, dayOfWeek, text, cat}] を追加。
毎日起動時に「今日の曜日のルーティン」を S.prep に自動投入。
重複防止：originRoutineId + date チェック。
設計案：docs/priority3-design-2026-05-02.md §2
```

### 9. 繰り返し予定の仮想展開（Step 2）
**プロンプト：**
```
event.repeat の仮想展開を実装：
- カレンダー月表示で repeat を展開して描画
- 個別の日付の例外（スキップ / 単発編集）
- LocalStorage 構造変更なし（events 配列に追加項目）
詳細：MED-7-step2
```

### 10. 法務確認 + WKWebView ラッパー
**プロンプト（人間向け）：**
- 弁護士に `docs/privacy-policy.md` / `docs/terms-of-use.md` 確認依頼
- WKWebView 薄ラッパーアプリを Xcode で作成
- App Store Connect で IAP プロダクト登録
- 詳細：`docs/iap-integration-plan.md`

---

## 🚧 開発時の絶対ルール

### MUST
- ✅ `docs/SPEC-v2-*` を正本要件として参照
- ✅ LocalStorage 構造は追加のみ（既存削除禁止）
- ✅ 各 Wave 後に regression（`/tmp/wave17_deep.mjs` + `/tmp/wave18_full.mjs` + `/tmp/wave21_features.mjs`）
- ✅ md5 一致を確認（src ↔ docs）
- ✅ `worklog.md` に追記
- ✅ 単一 HTML 維持
- ✅ 依存ライブラリ追加禁止（ただし v0.2 で WKWebView ラッパー化は可）

### MUST NOT
- ❌ React / Next / Vite 化
- ❌ npm パッケージ追加
- ❌ 既存機能を壊す変更
- ❌ 押せないボタンを残す
- ❌ 保存されないフォームを残す
- ❌ 個人情報 / 固定パスワードを埋め込む
- ❌ 大規模デザイン刷新
- ❌ バックアップ無しでの破壊的変更

### 自動停止ルール
以下なら実装せず docs に課題化：
- LocalStorage 構造の大幅変更が必要
- iPhone 実機でないと判断できない
- 4 時間以上の大規模改修
- 仕様判断が必要

---

## 📦 環境

### ファイル構成
```
Familink/
├── app-source/familink.html  ← 正本（編集対象）
├── docs/
│   ├── index.html            ← Pages 公開用（src を sync）
│   ├── SPEC-v2-*.md          ← 要件定義 v2
│   ├── REDEV-ROADMAP-*.md    ← ロードマップ
│   ├── BACKUP-MANIFEST.md    ← 全コミット参照表
│   ├── worklog.md            ← 作業ログ
│   └── ...
└── .github/workflows/pages.yml  ← Pages デプロイ
```

### Git ブランチ
- 開発：`claude/familylink-unicorn-product-TzM1F`
- Pages 元：`claude/merge-and-push-main-u44Ty`
- snapshot：`snapshot/mvp-v0.1` 等 12 件

### 起動
```bash
# 開発サーバー
nohup python3 -m http.server 8765 > /tmp/familink-serv.log 2>&1 & disown

# ローカルテスト
http://localhost:8765/app-source/familink.html

# 公開
https://ktakahashi7755-creator.github.io/Familink/

# 診断モード
https://ktakahashi7755-creator.github.io/Familink/#qa-debug
```

### テスト
```bash
# Wave 17C 詳細テスト（203 項目）
node /tmp/wave17_deep.mjs

# Wave 18 シナリオ + Hoku（48 項目）
node /tmp/wave18_full.mjs

# Wave 21 新機能（13 項目）
node /tmp/wave21_features.mjs

# JS 構文チェック
awk '/<script>/{f=1;next} /<\/script>/{f=0} f' app-source/familink.html > /tmp/familink.js
node --check /tmp/familink.js
```

---

## 📋 標準作業フロー（Wave 化）

```
1. git status 確認
2. SPEC-v2 を読んで要件理解
3. 影響範囲を特定（grep）
4. 編集前にバックアップ（snapshot ブランチ作成）
5. 最小差分で実装
6. md5 sync（src ↔ docs）
7. JS 構文チェック
8. Playwright regression（3 スイート）
9. スクリーンショット確認
10. worklog 追記
11. commit
12. default branch merge + push
13. 必要なら snapshot 作成
```

---

## 🎁 v0.2 完了時の成功条件

- 家族 30 組ベータで初週リテンション 40%
- プレミアム転換率 5%
- App Store 評価 4.0+
- MAU 500 / 月額有料 50

---

## 📞 困ったら

- **設計疑問**：`SPEC-v2-*.md` を読む
- **過去履歴**：`worklog.md` を `git log` で時系列確認
- **復旧**：`BACKUP-MANIFEST.md` の snapshot ブランチから即復旧
- **Hoku 設計**：`hoku-guideline.md` + `hoku-voice-notes-2026-05-02.md`
- **ボード設計**：`board-experience-design.md`
- **iPhone 検証**：`iphone-verification-playbook-2026-05-03.md`
