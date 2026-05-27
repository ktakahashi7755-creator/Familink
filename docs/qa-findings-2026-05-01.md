# QA 静的レビュー結果（2026-05-01）

対象：`app-source/familink.html`（9188 行 / 21 画面 / Vanilla JS / LocalStorage）
担当：`familink-qa-lead` 観点 + `familink-debug-engineer` 静的解析
方針：**修正は実施せず、課題の一覧化と優先度付き修正方針の提示のみ**（CLAUDE.md §10.2 / 今回ユーザー指示に従う）

---

## 1. 総評

- **致命バグ（S 級）は静的解析では検出されず**
- 設計品質は高い：`eval` / `new Function` 不使用、`console.*` 残骸ゼロ、`TODO/FIXME` ゼロ、`setInterval` 不使用、`safe-area` 40 箇所利用、`H()` エスケープユーティリティ完備、LocalStorage 単一キー（`familink_v3`）+ FAB 位置別キー の整理済み構造
- ただし **実機（特に iPhone Safari）での動作確認は未実施** — 静的だけでは判定不能な項目を §3 にリスト化
- 本ドキュメントの所見は MVP 公開前の実機 QA に渡す前提

---

## 2. 重点 12 項目の静的チェック結果

| 項目 | 関数 / 場所 | 静的判定 |
|---|---|---|
| 画面遷移 | `showScreen()` 3248 / `goBack()` 3263 | OK（ロジック存在） |
| LocalStorage 保存 | `saveS()` 3131 / `loadS()` 3136、`saveS()` 呼び出し 66 箇所 | OK（PERSIST 23 項目を JSON で永続化、`try/catch` あり） |
| スマホ表示 | `viewport-fit=cover` 設定済 / `env(safe-area-inset-*)` 40 箇所 | OK（要実機） |
| Hoku FAB | CSS 1908-1980 / JS 8787- / `FAB_KEY='hoku_fab_pos_v2'` で位置永続 | OK（drag/tap 実装済） |
| プレミアムゲート | `m-premium-gate` モーダル + `S.isPremiumUser` チェック 6046/6065/6113 / 既定 `false` 3122 | OK（既定でロック） |
| カレンダー | `renderCalMonth/Week/List/Detail` 3767-3951 | 4 ビュー揃い |
| タスク | `renderTaskScreen` 4229 / list ⇔ kanban トグル `_tkView` / D&D `bindListDrag` | OK（list/kanban は排他描画） |
| 家族ボード | `renderBoard` 5211 / `savePost` 5510 / `deletePost` 5564 / カスタムボード対応 | OK |
| 家計 | `renderBudget` 4829 / `saveTx` 4931 / カテゴリ EX 10 種 + IN 5 種 | OK |
| 体調 | `renderHealth` 5606 / `saveHealth` 5658 | OK |
| 準備リスト | `renderPrep` 5681 / `savePrepItem` 5715 | OK |
| カスタムボード | `openCustomBoard` 6183 / `saveBoardCreate/Item/Section` | OK |

---

## 3. 実機でしか判定できない項目（QA TODO）

PC ブラウザ（最小） + iPhone Safari（必須）で、`docs/test-checklist.md` §4 の観点に沿って確認が必要：

1. 21 画面の起動 / 表示 / 戻る導線
2. LocalStorage 保存・**再読み込み後の復元**（特に `events / tasks / txs / posts / health / prep`）
3. iPhone セーフエリア（ノッチ・ホームインジケータ）の侵食有無
4. Hoku FAB のドラッグ（touch + mouse の双方）/ 位置記憶 / タップ反応
5. プレミアムゲートの開閉と背景タップで閉じない仕様確認（`NO_BACKDROP_CLOSE` で除外指定済み）
6. カレンダー：月 / 週 / リストビュー切替、日付タップで詳細
7. タスク：list ⇔ kanban トグル、長押し D&D、メンバーフィルタ
8. 家族ボード：投稿 / 削除 / カスタムボード作成 / セクション追加
9. 家計：収支登録、月切替、合計計算
10. 体調：記録、子ども別表示
11. 準備リスト：チェックボックスの状態保持
12. カスタムボード：項目追加 / セクション分け

---

## 4. 静的に検出した「気になる点」一覧（致命ではない）

### 4-1. テンプレ補間の HTML エスケープ網羅性（A 級候補）
- `${...}` 補間 **741 箇所** のうち、`H()` でエスケープしているのは **187 箇所**
- 残りの大半は数値・定数文字列・配列長など安全だが、**ユーザー入力を含む文字列（name / title / merchant / memo / note 等）が H() を通っていない箇所がないか、ピンポイント点検が望ましい**
- 影響：単一家族 LocalStorage 運用なので XSS は基本的に「自家撞着」だが、家族メンバー間の信頼境界として一応潰しておきたい

### 4-2. `data-id="${H(t.id)}"` の同一画面での意図せぬ重複（B 級候補 / 実機確認）
- `tk-card`（4313）と `kanban-card`（4331）の両方で同じタスク ID を `data-id` に出す
- ロジック上は `_tkView` で list ⇔ kanban が排他のため重複しない見込み
- 実機で「list と kanban を素早く連打した瞬間」「アニメ中の重複描画」が発生しないか要確認

### 4-3. リスナー解除の網羅性（B 級候補）
- `addEventListener` 47 件 / `removeEventListener` 12 件
- ドラッグ系（mousemove/mouseup）と popup 外側クリックは正しく解除されている
- 残り 35 件のうち、画面切替で再バインドされる listener がメモリリークしていないか、長時間運用テスト時に確認

### 4-4. CSS 3 桁 px の使用（B 級 / 多くは max-width で安全）
- 23 箇所中ほぼ全てが `max-width: 480px` 等のレスポンシブ上限・装飾用 min/max
- iPhone SE（幅 375px）で 350px を超える固定 width が出ないか、実機の横スクロール発生を確認

### 4-5. 画像 base64 インラインによる初回ロード重さ（B 級）
- 1.3MB 単一 HTML。iPhone 4G 環境での初回読み込み時間を実測したい
- 公開時は画像を `public/images/` に外出ししてキャッシュさせる選択肢あり（Phase 2 候補）

### 4-6. プレミアム解除の永続化（C 級観察）
- `S.isPremiumUser = true` セット → `saveS()` で LocalStorage 保存
- 課金本実装時には端末固有 LocalStorage ではなくサーバ検証が必要（CLAUDE.md §10.2 で確認必須項目に明記済み）

---

## 5. 修正方針（優先度付き / 実装は別タスク）

実装は **本タスクでは行わない**。以下は次回作業以降の候補として提示。

### S 級（即時着手）
- **現時点でなし**（実機 QA で発見された場合のみ着手）

### A 級（App Store 公開前に直したい）
1. **実機 QA を通す**：iPhone Safari で §3 の 12 項目を実走 → 発生したバグを A 級で起票
2. **XSS サーフェス点検**：ユーザー入力（name / title / merchant / memo / note 系）が `${...}` で innerHTML に流れる全箇所を grep し、`H()` 経由か確認
3. **保存→再読み込み回帰**：21 画面の主要操作後にブラウザ再読み込みでデータが復元されるか確認

### B 級（公開後でよい）
4. **`data-id` 重複の連打テスト**：list ⇔ kanban の高速トグル / アニメ中タップ
5. **リスナー解除の網羅レビュー**：35 件のうち画面切替で再バインドされるものを洗い、必要なら removeEventListener 追加
6. **画像外出しの検討**：base64 → `public/images/` 化で初回ロード軽量化

### C 級（将来）
7. **クラウド同期（Supabase）**：CLAUDE.md §10.2 該当 / 人間確認必須
8. **課金本実装（IAP）**：CLAUDE.md §10.2 該当 / 人間確認必須
9. **自動テスト導入**：単一 HTML 運用継続前提なら、Playwright による E2E が現実的

---

## 6. 次にやるべきこと

1. **実機 QA 実走**：`python3 -m http.server` 起動 → iPhone Safari で §3 を 1 つずつ確認
2. 発生したバグ・UI 崩れを worklog に追記し、本ファイルの §5 に S/A 級として転記
3. A 級が確定したら `familink-debug-engineer` + `familink-html-engineer` で最小差分修正
4. MVP 公開前最終チェックとして `docs/test-checklist.md` §6 を `familink-appstore-release-lead` で実施

---

## 7. 参考

- `docs/test-checklist.md`：テスト観点の正本
- `docs/mvp-requirements.md`：受け入れ条件
- `docs/ui-ux-guideline.md`：UI 品質基準
- `docs/hoku-guideline.md`：Hoku 関連の文言・配置
- `docs/premium-strategy.md`：プレミアムゲート設計
