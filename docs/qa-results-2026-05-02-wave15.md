# QA 結果レポート — Wave 15（2026-05-02 / 削除と修正）

**対象：** `app-source/familink.html` / `docs/index.html`
**目的：** ホームスクロール誤遷移バグ修正 + 書類保管庫機能削除 + カンバン機能撤廃

---

## 1. 修正内容

### 1.1 Wave 15-1：ホームスクロール誤遷移修正
**症状：** ホーム画面で上下スクロール時、タッチ開始位置のカード（書類保管庫など）に誤遷移してしまう

**原因：** `_hoTouchEnd` 関数が touch end 時に `_ho.active`（長押し時のみ true）以外のすべてを「タップ」と判定し `hoCardClick` を呼んでいた。スクロール中の touch end も区別なくタップ扱い。

**修正：**
- `_ho.scrolled` フラグを追加（`_hoTouchStart` で false 初期化）
- `_hoTouchMove` で 10px 以上の移動を検知した時に `_ho.scrolled = true`
- `_hoTouchEnd` で `_ho.scrolled` 時はタップを抑止
- `_hoTouchEnd` の hoCardClick 呼び出しを削除（click イベント側に一元化、二重発火防止）
- click ハンドラでも `_ho.scrolled` チェックを追加
- 長押しタイマー内でも `_ho.scrolled` 時は drag を起動しない
- 移動検知閾値を 14px → 10px に厳しく

### 1.2 Wave 15-2：書類保管庫の削除
**削除した画面（5 画面）：**
- `s-docs-receipt`（領収証撮影）
- `s-docs`（書類保管庫トップ）
- `s-docs-folder`（フォルダ詳細）
- `s-scan`（予定表スキャン）
- `s-scan-confirm`（スキャン結果確認）

**削除したモーダル（3 個）：**
- `m-folder`（フォルダ追加）
- `m-folder-menu`（フォルダメニュー）
- `m-doc`（書類追加）

**削除した JS 関数（約 1,287 行）：**
- folderSvg, docTypeSvg, renderDocs, renderDocsFolder
- openFolderModal, saveFolder, deleteFolderConfirm, openSubFolderModal
- openDocModal, saveDoc, deleteDocConfirm
- captureReceipt, cancelReceiptCapture, startReceiptCapture
- resetScan, renderScanConfirm, scanToggleAll, startScanCamera, stopScanCamera, scanSelectImport
- viewReceiptFromTx, migrateData

**ホーム画面：**
- 「書類保管庫」カード（b_docs）を削除
- HO_FIXED から `b_docs` 除去
- 既存ユーザーの `homeOrder` から `b_docs` を自動除外（HO_RETIRED マイグレーション）
- ヘッダー右上の「書類スキャン」ボタンを削除

**家計画面：**
- `rcptBadge`（領収証リンク）を削除
- 関連 `viewReceiptFromTx` 関数を削除

**設定画面：**
- 「書類保管庫」「予定表スキャン」のメニューエントリを削除

**LocalStorage：**
- `S.folders` / `S.docs` は PERSIST に残置（既存ユーザーデータ保護 / 害なし）
- 自動マイグレーション：seedDemo 内の folder/doc 生成ロジックも削除

### 1.3 Wave 15-3：カンバン機能撤廃
**削除した HTML：**
- タスク画面の「リスト / カンバン」切替ボタン（`task-view-list` / `task-view-kanban`）

**削除した JS 関数（約 220 行）：**
- `getKanbanCols`
- `renderKanbanView`
- `setTaskView`（リスト固定のため不要）
- `tkKanbanCard`
- `bindKanbanDrag`
- `bindColumnDrag`
- `KANBAN_COL_DEF` 定数

**削除した CSS（11 ルール）：**
- `.kanban-wrap`, `.kanban-col`, `.kanban-col-hd`, `.kanban-col-dot`
- `.kanban-card`, `.kanban-card.dragging`
- `.kanban-drop-zone`, `.kanban-drop-zone.drag-over`
- `.kanban-drag-placeholder`

**残存（後方互換）：**
- `_tkView` 変数：`'list'` で固定（古い保存データの互換性のみ）
- `S.kanbanCols` PERSIST：空配列で残置（破壊回避）

---

## 2. 静的検証

| 項目 | 結果 |
|---|---|
| md5 一致（src ↔ docs）| ✅ `8b33429165d2696c6ddbcbf0c0a0508f` |
| 行数一致 | ✅ 8457 行（10433 → 8457、**-1976 行**）|
| 画面 ID 数 | ✅ 17 画面（22 → 17、**-5 画面**）|
| JS 抽出 syntax check | ✅ エラーなし |
| HTTP 200（src / docs）| ✅ 両方 OK |
| 個人名 / 固定パスワード grep | ✅ なし |
| docs/scan/kanban 関数残存 | ✅ 0 件（CSS/PERSIST の互換のみ）|

---

## 3. 動的検証（Playwright / iPhone 13 viewport / hasTouch）

| カテゴリ | テスト | 結果 |
|---|---|---|
| 構造 | 17 画面に減少 | ✅ |
| 書類保管庫 | s-docs / s-scan 要素なし | ✅ |
| 書類保管庫 | ホームに b_docs カードなし | ✅ |
| 書類保管庫 | ヘッダー scan ボタンなし | ✅ |
| カンバン | task-view-kanban ボタンなし | ✅ |
| タスク | カード描画 4 件 | ✅ |
| タスク | 完了 → 4→4 維持 | ✅ |
| ホームスクロール | カード上で 60px 移動 → 遷移しない | ✅ |
| ホームタップ | 通常タップ → s-task に遷移 | ✅ |
| 既存ユーザーマイグレーション | homeOrder の b_docs を自動除外 | ✅ |

### コンソールエラー
- pageerror: 0 件
- Wave 15 関連 console.error: 0 件

---

## 4. 既存機能への影響

| 機能 | 影響評価 |
|---|---|
| ログイン / オンボーディング | 一切変更なし |
| 残 17 画面（ホーム / タスク / カレンダー / 家族ボード / 家計 / 体調 / 準備リスト / Hoku / 設定 等）| すべて維持 |
| MEMBERS / S.user / S.userProfile | 一切変更なし |
| LocalStorage 構造 | フィールドは保持（S.folders / S.docs / S.kanbanCols は不使用化）|
| 既存予定 / タスク / 投稿 / 家計 / 準備 / 体調データ | 完全維持 |

---

## 5. 残課題（H/M/L）

### High
- HIGH-1：iPhone Safari 実機での音声認識テスト（家族ベータで検証）
- HIGH-2：実機でのホームスクロール挙動最終確認（Playwright 模擬で OK だが、実際の指の動きでも確認）

### Medium
- MED-1：繰り返し予定（カレンダー） — 設計案 priority3-design §1
- MED-2：曜日ルーティン準備 — 設計案 §2
- MED-3：プロフィール編集画面

### Low
- LOW-1：時間割本格連携 — priority3-design §3
- LOW-2：子ども別ログ統合 — priority3-design §5
- LOW-3：通知 / リマインド — WKWebView 化後

---

## 6. iPhone 確認ポイント

1. **ホーム**：スクロールしてもカードに誤遷移しない
2. **ホーム**：書類保管庫カードが消えている、ヘッダー右上のスキャンボタンも消えている
3. **タスク**：「リスト / カンバン」切替ボタンが消えている、リスト型のみで動作
4. **タスク**：完了 → 薄表示で残る → 削除ボタンで削除
5. **設定**：「書類保管庫」「予定表スキャン」エントリが消えている
6. **家計**：領収証リンクバッジが消えている
7. 既存の予定 / タスク / 投稿 / 家計 / 準備データは無事
