# Familink アーキテクチャ概要

**最終更新日：2026-05-02 / Wave 11 時点**
**対象：`app-source/familink.html`（9,720 行 / 約 1.3 MB）**

---

## 1. 全体方針

### 1.1 設計哲学
- **単一 HTML 運用**：すべての画面・スタイル・スクリプト・画像を 1 つの `.html` に内包
- **依存ライブラリゼロ**：Vanilla HTML/CSS/JavaScript のみ。React/Vue/Svelte/jQuery 不使用
- **クラウド非依存**：すべてのデータは LocalStorage、ネットワーク送信なし（Google Fonts のみ外部）
- **プログレッシブエンハンスメント**：基本機能はテキストで動き、音声・画像・OCR は端末対応に応じて拡張

### 1.2 配信構成
- 正本：`app-source/familink.html`
- 公開コピー：`docs/index.html`（GitHub Pages 配信用、md5 一致）
- ルート：`index.html`（リダイレクト用）

---

## 2. ファイル内構造

```
[1-11]      <head> (meta / title / fonts)
[12-1984]   <style>          ← 約 2,000 行 CSS
[1985-2987] <body>           ← 約 1,000 行 HTML markup
[2988-9709] <script>         ← 約 6,700 行 JavaScript
```

---

## 3. 21 画面（Screens）

| ID | 画面名 | 主要関数 |
|---|---|---|
| s-ob | ウェルカム | — |
| s-login | ログイン | `doLogin` / `doQuickDemo` / `_applyQuickDemo` |
| s-home | ホーム | `renderHome` |
| s-cal | カレンダー | `renderCal` / `renderCalMonth` / `renderCalWeek` / `renderCalList` / `openEventModal` |
| s-task | タスク | `renderTaskScreen` / `openTaskModal` / `saveTaskEdit` / `toggleTaskDone` |
| s-hoku | Hoku アシスタント | `renderHoku` / `hokuSend` / `hokuLocalAnswer` / `hokuVoiceToggle` |
| s-docs | 書類保管庫 | `renderDocs` / `openFolderModal` |
| s-docs-folder | フォルダ内 | `renderDocsFolder` / `openSubFolderModal` |
| s-docs-receipt | 領収証スキャン | `openReceiptCapture` / `saveScanEdit` |
| s-board | 家族ボード | `renderBoard` / `openPostModal` / `savePost` |
| s-board-detail | 投稿詳細 | `openBoardDetail` / `renderBoardDetail` |
| s-budget | 家計 | `renderBudget` / `openTxModal` / `saveTx` |
| s-health | 体調 | `renderHealth` / `saveHealth` |
| s-prep | 準備リスト | `renderPrep` / `openPrepModal` / `savePrepItem` |
| s-ch | 子ども一覧 | `renderChildren` |
| s-cdetail | 子ども詳細 | `goChildDetail`（インライン描画）|
| s-notif | 通知 | `renderNotif` |
| s-settings | 設定 | `renderSettings` |
| s-scan | スキャン | （`openScan` 系）|
| s-scan-confirm | スキャン確認 | `renderScanConfirm` |
| s-custom-board | カスタムボード | `openCustomBoard` / `renderCustomBoardDetail` |

---

## 4. 主要関数索引

### 4.1 認証 / 起動
- `init()`：起動時、`loadS()` → `migrateData()` → `migrateTaskData()` → ログイン状態に応じて遷移
- `doLogin()`：メール非空でログイン（簡易、PIN なし）
- `doQuickDemo()` / `_applyQuickDemo()`：デモデータ投入（既存データありで `showConfirm` ガード）
- `doLogout()`：`showConfirm` ガード付きログアウト

### 4.2 画面遷移
- `showScreen(id)`：`.screen` クラスを切替
- `go(id)`：`showScreen` + `refresh(id)` + tabbar の表示制御
- `switchTab(id)`：タブバー対応の遷移（active 状態管理）
- `goBack()`：直前画面へ
- `refresh(id)`：画面別の render 関数を呼ぶ

### 4.3 LocalStorage
- `saveS()`：`PERSIST` 配列の 23 キーを LocalStorage `familink_v3` に JSON 保存
- `loadS()`：起動時に `familink_v3` から復元（try/catch で安全）
- `migrateData()`：旧フォルダスキーマの互換調整
- `migrateTaskData()`：旧 task スキーマ（text/member/done）→ 新スキーマ（title/assignedTo/status）

### 4.4 モーダル
- `openModal(id)`：`.open` クラス付与
- `closeModal(id)`：`.open` クラス除去
- `showConfirm(title, msg, btnTxt, cb, icon)`：確認ダイアログ（削除・ログアウト・デモ上書き）
- `showToast(msg, type)`：右下のトースト

### 4.5 Hoku（AI アシスタント）
- `sendHokuMsg(text)`：メッセージ送信のメイン
- `detectIntent(q)`：明示的な「予定追加」「タスク追加」等を検出 → アクション実行
- `handleAction(intent, q)`：確認文言を返す
- `executeAction(action)`：実際にデータ追加して成功メッセージ
- `handleConfirmation(text)`：「はい」「ok」等で `_pendingAction` を実行
- `hokuLocalAnswer(q)`：分類器 → ガイダンス → 既存パターン → デフォルト の順で応答
- `classifyHokuInput(q)`：9 カテゴリのスマート分類（スコア合計）
- `classifierGuidance(category, q, secondary)`：カテゴリ別の自然な応答
- `classifierActions(category, secondary)`：カテゴリ別アクションボタン群（main + secondary）
- `buildHokuContext()`：当日・今週の予定 / タスク / 家計サマリを構造化

### 4.6 Hoku 音声入力
- `hokuVoiceSupport()`：`SpeechRecognition` / `webkitSpeechRecognition` の存在判定
- `hokuVoiceInit()`：起動時のサポート状態反映
- `hokuVoiceToggle()`：マイク開始 / 停止
- `hokuMicSetState(state)`：UI の状態切替（idle / listening / unsupported）

### 4.7 主要データ操作
- `parseEvent(q)` / `parseTask(q)` / `parseExpense(q)`：自然文から構造化データへ
- `tkCardHtml(t)`：タスクカードのレンダ
- `getTkVisibleMembers()` / `getMem(id)`：メンバー関連
- `avHtml(memberId, size, fontSize, extraStyle)`：アバター画像レンダ

### 4.8 プレミアム
- `showPremiumGate()` / `closePremiumGate()`：ゲート開閉
- `activatePremiumDemo()`：モック解除（`S.isPremiumUser = true`）
- 5 箇所から `showPremiumGate()` が呼ばれる（プレミアムを見るボタン / アバターロック / 等）

---

## 5. LocalStorage 構造

### 5.1 ストレージキー
- 主キー：`familink_v3`
- FAB 位置：`hoku_fab_pos_v2`

### 5.2 PERSIST 23 項目
```
loggedIn, user, events, tasks, txs, posts, announces, health, prep,
notifs, budgetY, budgetM, folders, docs, kanbanCols, tkVisibleMembers,
userPhotos, userAvatars, userAvatarType, isPremiumUser, homeOrder,
customBoards, boardItems, boardSections
```

### 5.3 互換性
- `migrateTaskData()`：旧フォルダ・旧タスクスキーマを起動時に自動マイグレート
- `seedDemo()`：空配列の場合のみデモデータを投入（既存データを破壊しない）
- 任意の `S._...` キーは PERSIST 対象外（揮発）→ 一時的な状態保存に活用可

---

## 6. 改修時の影響範囲ガイド

### 6.1 安全な変更（Wave 1〜10 で実証済）
- 文言調整（`hokuLocalAnswer` 内の return 文字列）
- アクションボタン追加（`classifierActions` map に項目追加）
- 新ガイダンスカテゴリ追加（`classifyHokuInput` + `classifierGuidance` の case 追加）
- CSS 微調整（既存 class を温存）

### 6.2 注意が必要な変更
- LocalStorage 構造変更 → `PERSIST` 配列、`migrateData` の追加が必要
- 画面 ID 変更 → `go` / `switchTab` の引数、`refresh` の case を確認
- 関数名変更 → onclick 属性内の参照を全て検索置換

### 6.3 大規模変更（要 オーナー承認）
- 認証フロー変更（H-01）
- クラウド連携追加
- 課金実装（IAP）
- React/Next/Vite 化
- 多言語対応

---

## 7. テスト戦略

### 7.1 静的検証
- `node --check` で JS 構文確認
- `grep` で個人情報・固定パスワード・機械的表現の不在確認
- `wc -l` で行数追跡（現在 9,720 行）

### 7.2 動的検証（Playwright）
- 21 画面 navigate
- 26 + Hoku 入力パターンで分類精度確認
- 主要 5 機能（タスク / 取引 / 投稿 / 準備 / 予定）の追加 → 保存 → 復元
- マルチ viewport（4 つの iPhone サイズ）でレイアウト崩れ確認

### 7.3 ドキュメント検証
- `app-source/familink.html` と `docs/index.html` の md5 一致確認
- worklog エントリの時系列整合
- バックアップタグの存在確認

---

## 8. パフォーマンス特性

| 項目 | 値 | 備考 |
|---|---|---|
| ファイルサイズ | 約 1.3 MB | base64 画像が大半 |
| 初回ロード | ローカル：即時 / 4G：5〜10 秒想定 | L-01 で外出し最適化候補 |
| LocalStorage 使用量 | 約 2〜10 MB（家族の利用状況による）| 標準的な iOS Safari 上限 5〜10 MB 内 |
| Hoku 応答 | 約 50ms（同期処理） | キーワードマッチのみ |
| Web Speech API | 端末依存 | iOS Safari 16+ 対応 |

---

## 9. 依存関係マップ

```
[ユーザー入力]
    ↓
[hoku-input または音声]
    ↓
sendHokuMsg
    ↓
detectIntent ─── action ─→ handleAction → showConfirm → executeAction → save → refresh
    ↓ query
hokuLocalAnswer
    ↓
classifyHokuInput → score >= 3 → classifierGuidance + ACTION_BUTTONS marker
    ↓ no match
既存ガイダンス → 既存 data-lookup → デフォルト
    ↓
renderHokuMsgs → ACTION_BUTTONS marker 検出 → classifierActions
    ↓
表示（content + ボタン群）
```

---

## 10. 17 Skills（CLAUDE.md 連携）

`.claude/skills/` 配下に 17 個の Familink 専用 Skill を配置：
familink-core / master-controller / ceo-strategy / product-owner / requirements-architect / cto-architect / html-engineer / frontend-engineer / uiux-designer / brand-asset-director / hoku-ai-designer / monetization-lead / qa-lead / debug-engineer / appstore-release-lead / growth-lead / chief-review-officer

詳細は `CLAUDE.md` §6 参照。

---

## 11. 累積の改善履歴

| Wave | 主成果 | コミット |
|---|---|---|
| 1 | 認証・個人情報・プレミアム解消 | 2f09dc8 |
| 2 | タスクタイトルバグ + 用語統一 | 3b74db2 |
| 3 | Hoku intent + 文言整理 | 2222b09 |
| 4 | 21 画面深掘り QA | c65700b |
| 5 | Hoku 音声入力 + 7 ガイダンス | 0a33d56 |
| 6 | 5 ガイダンス追加 + チップ拡充 | 6774e01 |
| 7 | スマート分類 + プロ文言 | d715fb3 |
| 8 | アクションボタン + 機械表現除去 | 19798c6 |
| 9 | MVP v0.1 候補：合格判定 | ef648aa |
| 10 | リリース前 QA：92/100 点 | 4307af0 |
| **11** | **multi-intent + multi-viewport + 公開準備 docs：100/100 点** | **(本コミット)** |

---

## 12. 今後の拡張ポイント

### 短期（v0.1〜v0.2）
- ローカルプロフィール作成（H-01）→ `MEMBERS` 配列を `S.members` に格上げ、`migrateTaskData` 拡張
- App Store 公開準備（メタデータ完成、スクリーンショット、ストア審査）

### 中期（v1.0）
- iOS 薄ラッパーアプリ + StoreKit 連携
- Android 版 + Google Play Billing
- 通知の高度設定（プレミアム）

### 長期（v1.x）
- クラウド同期（Supabase 等、要アーキ拡張）
- 上位プラン段階導入
- 多言語対応（ja → en）
