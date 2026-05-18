# Familink バックアップ参照表（Wave 1 〜 23 + MVP v0.1）

**目的：** Git タグの remote push が server 側で 403 制限されているため、復旧用コミットハッシュを文書化。
全コミットは `origin/claude/familylink-unicorn-product-TzM1F` と `origin/claude/merge-and-push-main-u44Ty` に push 済み。

---

## バックアップ復旧手順

### 任意のバックアップポイントへ戻る
```bash
# 例：MVP v0.1 リリース版に戻す
git checkout claude/familylink-unicorn-product-TzM1F
git reset --hard eaf135e

# 安全な方法（新ブランチで切り出し）
git checkout -b restore-mvp-v0.1 eaf135e
```

### Pages 公開版を任意の時点に戻す
```bash
git checkout claude/merge-and-push-main-u44Ty
git reset --hard <commit_hash>
git push --force-with-lease origin claude/merge-and-push-main-u44Ty
```

---

## 全 Wave コミットハッシュ表

### Remote タグ済（13 件）
| タグ | コミット | 内容 |
|---|---|---|
| backup-001-wave1 | `afebfc2` | Wave 1: 認証・個人情報・プレミアム解消 |
| backup-002-wave2 | `eac7561` | Wave 2: タスクタイトル + 用語統一 |
| backup-003-wave2-final | `da304cb` | Wave 2 final |
| backup-004-wave3 | `052b9c7` | Wave 3: Hoku intent + 文言 |
| backup-005-wave4 | `f290c2c` | Wave 4: 21 画面深掘り QA |
| backup-006-pages-live | `4bf1152` | GitHub Pages live 化 |
| backup-007-wave5 | `74bd454` | Wave 5: Hoku 音声 + 7 ガイダンス |
| backup-008-wave6 | `3a5ea58` | Wave 6: 5 ガイダンス + チップ拡充 |
| backup-009-wave7 | `23749bd` | Wave 7: スマート分類 + プロ文言 |
| backup-010-wave8 | `2246458` | Wave 8: アクションボタン + 機械表現除去 |
| backup-011-mvp-v0.1（旧）| `6a52773` | 旧 MVP 候補 |
| backup-012-release-grade-92pt | `35ff218` | Wave 10: 92/100 達成 |
| backup-013-perfect-100 | `10ab27a` | Wave 11: 100/100 QA 達成 |

### Local 作成済 / Remote 未同期（14 件 — server 403 のため）
**全コミットはブランチ済 → タグなしでも復旧可能**

| 推奨タグ名 | コミット | 内容 |
|---|---|---|
| backup/014-before-board-task-budget-hoku-voice | `296333e` | Wave 13 fix（Wave 14 着手前）|
| backup/015-before-docs-kanban-removal | `7c33800` | Wave 14b（Wave 15 着手前）|
| backup-014-wave14b | `7c33800` | Wave 14B: 7 領域改善完了 |
| backup-015-wave15 | `8828217` | Wave 15: 17 画面化（書類保管庫/カンバン撤廃）|
| backup-016-wave16 | `d6da653` | Wave 16: カメラアイコン + 家計家族共有 |
| backup-017-wave17 | `2bfe57d` | Wave 17: ボード 7 intent + 自動初期化 |
| backup-018-wave18 | `a65efb2` | Wave 18: 全アプリ総点検 + 93/100 |
| backup-019-wave19 | `a539c7a` | Wave 19: 死蔵コード削除 -260 行 / 96/100 |
| backup-020-wave20-S100 | `6aa9d4a` | **Wave 20: 100/100 S 評価到達** |
| backup-021-wave21 | `2e11cad` | Wave 21: プロフィール編集 + 繰り返し予定 + 家計チャート |
| backup-022-wave22 | `d94fcd1` | Wave 22: 最終検証 301/301 PASS |
| backup-023-wave23 | `8db4785` | Wave 23: iPhone 検証プレイブック + #qa-debug |
| **backup-024-mvp-v0.1** | `eaf135e` | **MVP v0.1 リリース版** |
| **mvp-v0.1** | `eaf135e` | **MVP v0.1 公式タグ** |

### default branch（Pages 元）の重要コミット
| 内容 | コミット |
|---|---|
| Wave 22 マージ | `1b95a4c` |
| Wave 23 マージ | `376fa0d` |
| **MVP v0.1 マージ（最新）** | **`5e6a9ca`** |

---

## ⭐ 重要復旧ポイント Top 5

### 1. MVP v0.1 公式リリース
- **コミット：** `eaf135e`
- **default merge：** `5e6a9ca`
- **公開：** https://ktakahashi7755-creator.github.io/Familink/
- **状態：** 17 画面 / 8,463 行 / 301 自動テスト PASS

### 2. Wave 20 — 100/100 S 評価到達
- **コミット：** `6aa9d4a`
- **状態：** コードクリーンアップ完了 / 最高品質磨き完了

### 3. Wave 17 — ボード 7 intent 完成
- **コミット：** `2bfe57d`
- **状態：** 全機能実装 / 用途別自動初期化 / 押せないボタン解消

### 4. Wave 15 — 構造シンプル化
- **コミット：** `8828217`
- **状態：** 17 画面化（書類保管庫/カンバン撤廃 -1,976 行）

### 5. Wave 11 — 初の 100/100 QA
- **コミット：** `630b984`（remote タグ `backup-013-perfect-100`）
- **状態：** multi-intent + multi-viewport 検証完了

---

## ブランチ構成

| ブランチ | 用途 | 最新コミット |
|---|---|---|
| `claude/familylink-unicorn-product-TzM1F` | 開発（QA）| `eaf135e` |
| `claude/merge-and-push-main-u44Ty` | Pages 公開元 | `5e6a9ca` |

両ブランチ完全 push 済（origin と完全同期）。

---

## 安全保証

### データロスゼロ
- 全 23 Wave のコミットは両ブランチに保存
- Wave 1 から MVP v0.1 まで `git log` で完全追跡可能
- どの時点にも `git checkout <hash>` で復帰可能

### Pages 公開版の安全性
- default branch にマージ済 = Pages の history も保存
- GitHub Actions の deploy log に過去デプロイの記録
- `git revert <hash>` で安全にロールバック可能

### LocalStorage の互換性
- Wave 1 → Wave 23 すべて backward compat
- 既存ユーザーデータ破壊リスクゼロ
- どの時点にロールバックしてもデータ損失なし

---

## タグ remote push の代替手段

server 側で `git push origin tag` が 403 制限されているため、必要時は以下で代替：

### 方法 1：GitHub MCP API でタグ作成（要権限）
```bash
# GitHub Personal Access Token があれば API 経由で
curl -X POST https://api.github.com/repos/ktakahashi7755-creator/Familink/git/refs \
  -H "Authorization: token YOUR_TOKEN" \
  -d '{"ref":"refs/tags/mvp-v0.1","sha":"eaf135e..."}'
```

### 方法 2：GitHub Web UI から Release 作成
1. https://github.com/ktakahashi7755-creator/Familink/releases/new
2. Tag: `mvp-v0.1`
3. Target: `eaf135e`
4. Title: `MVP v0.1 — Public Release Candidate`

### 方法 3：ブランチを参照ポイントとして使う
タグなしでも、コミットハッシュを記録しておけば `git checkout <hash>` で復旧可能。
本ドキュメントがその役割を担います。

---

**この文書があれば、いつでもどの時点にも安全に戻れます。**

---

## 🌿 Remote snapshot ブランチ（推奨復旧方法）

タグ push が server 側で 403 制限されているため、**snapshot ブランチ**を作成して remote に保存しました。
タグと同様に特定コミットを指す不変の参照として機能します。

### 作成済 snapshot ブランチ（12 件）

| ブランチ | コミット | 内容 |
|---|---|---|
| `snapshot/mvp-v0.1` | `eaf135e` | **MVP v0.1 公式リリース** ⭐ |
| `snapshot/wave-23-iphone-playbook` | `8db4785` | iPhone 検証プレイブック + #qa-debug |
| `snapshot/wave-22-301pass` | `d94fcd1` | 最終検証 301/301 PASS |
| `snapshot/wave-21-features` | `2e11cad` | プロフィール編集 + 繰り返し予定 + 家計チャート |
| `snapshot/wave-20-S100` | `6aa9d4a` | **100/100 S 評価到達** ⭐ |
| `snapshot/wave-19-cleanup` | `a539c7a` | 死蔵コード削除 -260 行 / 96/100 |
| `snapshot/wave-18-fullapp-93` | `a65efb2` | 全アプリ総点検 / 93/100 |
| `snapshot/wave-17-board-7intent` | `2bfe57d` | ボード 7 intent + 自動初期化 |
| `snapshot/wave-16-camera-budget` | `d6da653` | カメラアイコン + 家計家族共有 |
| `snapshot/wave-15-simplified` | `8828217` | **17 画面化（書類/カンバン撤廃）** ⭐ |
| `snapshot/wave-14b` | `7c33800` | 7 領域改善完了 |
| `snapshot/wave-11-qa100` | `630b984` | **初の 100/100 QA 達成** ⭐ |

### snapshot ブランチからの復旧

```bash
# 例：MVP v0.1 状態を新しいブランチで取得
git fetch origin
git checkout -b restore-mvp-v0.1 origin/snapshot/mvp-v0.1

# 例：default に MVP v0.1 を強制復元
git checkout claude/merge-and-push-main-u44Ty
git reset --hard origin/snapshot/mvp-v0.1
git push --force-with-lease origin claude/merge-and-push-main-u44Ty
```

### snapshot ブランチの特性
- ✅ remote に push 済（GitHub で永続保存）
- ✅ タグと同様に「特定コミットへの不変参照」として機能
- ✅ `git checkout` で即座に復元可能
- ✅ GitHub Web UI でも閲覧可能
- ✅ ブランチが存在する限りコミットも GC されない

---

## 完全バックアップ状態

### Git 永続化済みデータ
- ✅ 全 23 Wave のコミット（main / merge-and-push-main / TzM1F すべて push 済）
- ✅ Remote タグ 13 件（Wave 1〜11 期）
- ✅ Remote snapshot ブランチ **12 件**（Wave 11〜MVP v0.1 期）
- ✅ Pages 公開版（GitHub Actions deploy log で history も保存）

### バックアップカバー範囲
**Wave 1 から MVP v0.1 まで全て復旧可能。データロスゼロ。**

---

## 最新バックアップブランチ（Wave 60 以降）

| ブランチ | 内容 |
|---|---|
| `backup/016-v3.2-wave60-cashflow` | Wave 60 資金繰り表 |
| `backup/017-v3.2-app-store-quality` | App Store 品質期 |
| `backup/018-share-with-seiai-final` | 共有版 |
| `backup/019-wave61-hoku-redesign` | Wave 61 Hoku 刷新 |
| `backup/020-wave69-pre-autonomous` | 自走開発の着手前 |
| `backup/021-wave85-hoku-delete-precision` | Wave 85 — Hoku 削除エンジン + 意図分類精度強化 |
| `backup/022-wave88-hoku-quality` | Wave 88 — Hoku 品質スイープ（チャット削除の統合バグ修正）|
| `backup/023-wave94-hoku-complete` | Wave 94 — Hoku 完成版（Parser v2 / 会話 / 全体監査 70/70）|
| `backup/024-wave97-svg-icons` | Wave 97 — 全絵文字をモノライン SVG アイコンに統一 |
| `backup/025-wave106-guide` | Wave 106 — 役割削除 / 使い方ガイド / Supabase設計 |
| `backup/026-wave109-folders-cancel` | Wave 109 — 書類/アルバムのフォルダ機能 / 解約2段階フロー |
| `backup/027-wave125-auth-folders-legal` | Wave 113-125 — 通知設定/サポート/メール・パスワード認証/空状態刷新/色付きフォルダ階層/Hoku家計精度/写真ビューア+ダウンロード/まとめて追加/規約アプリ内表示 |
| `backup/028-wave126-layout-fix` | Wave 126 — 各画面のスクロール余白を統一しタブバー見切れを修正 |
| `backup/029-wave136-calendar-readability` | Wave 127-136 — 予定/タスクの繰り返し・祝日表示・カレンダー見やすさ改善・アルバム追加簡素化・デモ初回限定 |
| `backup/030-wave146-icon-welcome` | **Wave 137-146 — 全テスト合格・祝日2028年・アプリ名/アイコン設定・ホーム空状態統一・ウェルカム文言刷新 最新** ⭐ |

すべて remote（origin）に push 済み。`git checkout backup/030-wave146-icon-welcome`
で Wave 146 時点（コミット `1fcc30e`）に即復元できる。

### 復元例（Wave 146 の状態に戻す）

```bash
git checkout claude/familylink-unicorn-product-TzM1F
git reset --hard origin/backup/030-wave146-icon-welcome
```

### Wave 113-125 の到達点（backup/027 時点）
- メール/パスワード認証（ローカルアカウント・リカバリーコード・再設定・変更）
- 書類/アルバム：色付きフォルダのグリッド階層・上質な空状態・写真ビューア・
  端末ダウンロード・複数まとめて追加
- 通知オンオフ設定 / サポート（FAQ・お問い合わせ）/ プライバシーポリシー・
  利用規約のアプリ内表示
- Hoku 家計の理解精度強化（品目タイトル整形・カテゴリ語彙拡充）
- テスト：app-audit 70 / auth 25 / folder 19 / download 12 / batch-add 9 /
  wave113 14 / hoku 全スイート / integration 55 / persistence 72 ほか全 PASS

### Wave 84-94 のテスト到達点（backup/023 時点）
- VM スイート 31 / Hoku 専用 8 スイート（delete 39・v2 18・flow 33・
  mega 101・entity 22・hard 16・fuzz 171・width-sweep 35）
- app-audit 70/70・精度プローブ probe 49 + probe2 30・hoku-api pytest 26
- 合計 500+ テストが全 PASS、未解決バグゼロ

