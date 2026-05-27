# Familink — AI 駆動プロダクト開発フロー

Familink を「AI で雑に作ったプロトタイプ」ではなく「実ユーザー検証できる 60% 品質の MVP」
へ引き上げるための、12 フェーズの開発プロセス正本。

**大前提：AI にいきなり実装させない。** モック → 要件 → 設計 → タスク分解 → 実装 → テスト
の順で、各フェーズの完了条件を満たしてから次へ進む。

> Familink は既に MVP v3.x が稼働中。本フローでは **稼働中アプリ自体を「モック」とみなし**、
> フェーズ 1-2（モック作成）は「現状アプリの棚卸し」に読み替えて適用する。

---

## 0. 全体像

```
P1  理想モック作成 ──┐
P2  モック作り込み  ─┤ ← Familink では「現状アプリの棚卸し・理想とのギャップ抽出」
                    │
P3  要件定義 ───────┤
P4  設計図分解 ─────┤ ← ドキュメント整備フェーズ
P5  詳細設計 ───────┤
P6  Markdown/HTML 化 ┘
                    │
P7  ChatGPT ブラッシュアップ ─┐
P8  違和感レビュー＆潰し込み ─┘ ← レビューフェーズ
                    │
P9  AI 開発タスク分解 ─┐
P10 自動開発 ─────────┤ ← 実装フェーズ
P11 テスト設計＆動作確認┤
P12 複数視点レビュー ──┘
                    │
                    ▼
            完成度 60%（実ユーザー検証可能な MVP）
```

完成度の認識：本フロー完走で **60%**。残り 40% は実ユーザー検証 / 本番運用 /
課金 / 同期 / セキュリティ / 法務 / 審査 / マーケティングで積み上げる。

---

## 1. 各フェーズの目的・成果物・完了条件

### Phase 1 — 理想モック作成
- **目的**：頭の中の理想を可視化し、画面構成と導線を固める
- **Familink での読み替え**：稼働中アプリ（18 画面）をモックとみなし、理想とのギャップを抽出
- **成果物**：`mock/screen-list.md`（画面一覧）/ `mock/screen-flow.md`（画面遷移）/ `mock/ux-hypothesis.md`
- **完了条件**：全画面が列挙され、各画面の目的・主要導線・遷移先が 1 行で言える

### Phase 2 — モック作り込み
- **目的**：AI 感のある雑な UI を排除し、ユーザーに見せられる品質へ
- **成果物**：`mock/polish-checklist.md`（11 観点チェック結果）/ 改善済みアプリ本体
- **完了条件**：スマホ表示・タップ領域・空状態・エラー状態・横スクロール無し が全画面で OK

### Phase 3 — 要件定義
- **目的**：機能一覧ではなく「ユーザー成功体験 → US → 機能 → BR」をつなぐ
- **成果物**：`requirements.md` / `user-stories.md` / `business-rules.md` / `use-cases.md` / `mvp-scope.md`
- **完了条件**：全機能が US に紐づき、BR 計算式がテスト可能な形で書かれている

### Phase 4 — 設計図分解
- **目的**：モックを開発可能な設計図（画面・コンポーネント単位）へ分解
- **成果物**：`screen-design.md` / `component-design.md` / `ui-flow.md` / `state-design.md`
- **完了条件**：全画面に表示項目・入力項目・状態・バリデーション・保存タイミングが定義済み

### Phase 5 — 詳細設計
- **目的**：開発に必要な技術設計を確定
- **成果物**：`data-model.md` / `er-diagram.md` / `sequence-diagram.md` / `folder-structure.md` /
  `api-design.md` / `validation-design.md` / `error-design.md` / `auth-design.md` / `test-design.md`
- **完了条件**：ER 図・主要シーケンス図が揃い、AI が迷わないフォルダ構成が確定

### Phase 6 — Markdown / HTML 化
- **目的**：ドキュメントを Git 管理しやすい Markdown で統一し、人間向けに HTML ポータル化
- **成果物**：`docs/*.md` / `docs/docs-portal.html`（既存を更新）
- **完了条件**：全 md がポータルから 1 タップで辿れ、スマホで読める

### Phase 7 — ChatGPT ブラッシュアップ
- **目的**：外部 AI で表現・抜け漏れ・矛盾・曖昧表現を洗い出す
- **成果物**：`review/chatgpt-feedback.md`（指摘一覧）/ ブラッシュアップ済み各 md
- **完了条件**：曖昧表現・矛盾・抜けセクションがゼロ

### Phase 8 — 違和感レビュー＆潰し込み
- **目的**：6 視点（ユーザー / PdM / エンジニア / QA / デザイナー / 事業）で違和感を全潰し
- **成果物**：`review/review-notes.md` / `review/issues-to-fix.md` / `review/final-review.md`
- **完了条件**：違和感リストの重要度 High が全て解消、「これでいけそう」判定

### Phase 9 — AI 開発タスク分解
- **目的**：「全部作って」を禁じ、AI が 1 回で安全に実装できる単位へ分解
- **成果物**：`tasks/wbs.md` / `tasks/development-tasks.md` / `tasks/task-dependencies.md` / `tasks/acceptance-criteria.md`
- **完了条件**：全タスクに受け入れ条件・テスト条件・完了条件・依存・優先度が付く

### Phase 10 — 自動開発
- **目的**：Claude Code 等で 1 タスクずつ実装
- **成果物**：実装コード / コミット / `docs/worklog.md` 追記
- **完了条件**：1 タスク = 1 論理コミット、テスト緑、動作確認済み

### Phase 11 — テスト設計＆動作確認
- **目的**：単体 / 結合 / E2E / モンキー / 回帰 / 表示崩れ / 実機 / 境界値 / 異常系 / データ保持
- **成果物**：`test/test-plan.md` / `test/test-cases.md` / `test/e2e-tests.md` / `test/regression-checklist.md` / `test/qa-report.md`
- **完了条件**：全テスト種別の結果が記録され、致命バグゼロ

### Phase 12 — 複数視点レビュー
- **目的**：実装後に 5 視点（ユーザー / PdM / エンジニア / QA / 事業）で最終確認
- **成果物**：`review/multi-perspective-review.md`
- **完了条件**：各視点で重大指摘なし → 完成度 60% 到達を宣言

---

## 2. フォルダ構成

成果物は Familink リポジトリ内 `docs/ai-dev-flow/` 配下に集約する。

```
docs/ai-dev-flow/
  README.md                     ← 本ファイル（フロー正本）
  template-task.md               ← AI 開発タスク分解テンプレート
  template-review.md             ← レビューテンプレート
  template-test-design.md        ← テスト設計テンプレート
  mock/
    screen-list.md               P1 画面一覧
    screen-flow.md               P1 画面遷移
    ux-hypothesis.md             P1 UX 仮説
    polish-checklist.md          P2 作り込みチェック
  spec/
    requirements.md              P3 要件定義
    user-stories.md              P3 US
    business-rules.md            P3 BR / 計算式
    use-cases.md                 P3 ユースケース
    mvp-scope.md                 P3 MVP 範囲
  design/
    screen-design.md             P4 画面設計
    component-design.md          P4 コンポーネント設計
    ui-flow.md                   P4 UI フロー
    state-design.md              P4 状態管理設計
    data-model.md                P5 データ設計
    er-diagram.md                P5 ER 図（Mermaid）
    sequence-diagram.md          P5 シーケンス図（Mermaid）
    folder-structure.md          P5 フォルダ構成
    api-design.md                P5 API 設計
    validation-design.md         P5 バリデーション設計
    error-design.md              P5 エラー設計
    auth-design.md               P5 認証設計
  tasks/
    wbs.md                       P9 WBS
    development-tasks.md          P9 AI 開発タスク一覧
    task-dependencies.md          P9 タスク依存
    acceptance-criteria.md        P9 受け入れ条件
  test/
    test-plan.md                 P11 テスト計画
    test-cases.md                P11 テストケース
    e2e-tests.md                 P11 E2E
    regression-checklist.md       P11 回帰チェック
    qa-report.md                 P11 QA レポート
  review/
    chatgpt-feedback.md          P7 ChatGPT 指摘
    review-notes.md              P8 レビューメモ
    issues-to-fix.md             P8 違和感リスト
    final-review.md              P8 最終レビュー
    multi-perspective-review.md   P12 複数視点レビュー
```

既存の `docs/` 直下ドキュメント（mvp-requirements.md 等）は **廃止せず**、
本フローの spec/ 系へ統合・参照する（正本は 1 箇所ルールを維持）。

---

## 3. docs 配下に作るべき Markdown 一覧

上記フォルダ構成の全 `.md`（計 30 ファイル）。HTML ポータルは既存 `docs/docs-portal.html`
を更新して全 md へのリンクを追加する。

---

## 4. モックアップの進め方（Phase 1 の具体手順）

Familink は稼働中のため、ゼロからモックは作らない。代わりに：

1. **画面棚卸し**：稼働アプリの全 18 画面 + 16 モーダルを `mock/screen-list.md` に列挙
2. **各画面に 4 項目**：画面 ID / 目的（1 行）/ 主要操作 / 遷移先
3. **画面遷移図**：`mock/screen-flow.md` に Mermaid で全遷移を図示
4. **理想とのギャップ**：各画面で「現状」と「理想」の差分を `mock/ux-hypothesis.md` に記録
5. **作り込み**：`mock/polish-checklist.md` の 11 観点で全画面を採点、改善タスクを抽出

新機能を足す場合のみ、その機能だけ HTML モック（押せるが保存はダミー）を別途作る。

---

## 5. 進行ルール

- **1 フェーズ完了 = 完了条件を満たす + worklog 追記**してから次へ
- フェーズを飛ばさない（要件なしで設計しない、設計なしで実装しない）
- AI への実装依頼は必ず `template-task.md` 形式の 1 タスク単位
- 各タスク後にテスト・動作確認・コミット
- 違和感を残したまま次フェーズへ進まない

---

## 6. 関連既存ドキュメント

| 既存ファイル | 本フローでの位置づけ |
|---|---|
| `docs/mvp-requirements.md` | P3 requirements.md の素材 |
| `docs/product-roadmap.md` | P3 mvp-scope.md / 将来拡張の素材 |
| `docs/ui-ux-guideline.md` | P2 polish-checklist.md の基準 |
| `docs/test-checklist.md` | P11 test-cases.md の素材 |
| `docs/worklog.md` | 全フェーズの進行ログ |
| `CLAUDE.md` | 開発運用ルール（本フローの上位） |
