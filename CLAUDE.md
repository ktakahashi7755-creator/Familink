# Familink 開発運用ルール

このリポジトリは PC（ローカル Claude Code）と iPhone（claude.ai/code 等の Web 経由）の双方から作業されることを前提とします。両環境で状態がズレないよう、**すべての作業は以下の開始・終了プロトコルに従って**実施してください。

---

## 1. 作業開始プロトコル（必須）

新しいセッションでコードに触れる前に、以下を**この順番**で必ず実行します。未確認のまま編集を始めてはいけません。

1. `git status` を実行し、作業ツリーが clean か確認する
2. `git log -1 --oneline` で最新コミットを確認する
3. `git fetch origin` で remote の更新を取り込む（オフライン時は省略可だが終了時に明示）
4. `git status -sb` でローカルと remote の差分を確認する
5. `docs/worklog.md` の末尾エントリを読み、前回の「未確認事項」「iPhone確認ポイント」「次にやること」を引き継ぐ

### 開始トリガーフレーズ

ユーザーが「作業開始」「再開」「続き」と言ったら、上記 1〜5 を実行し、**必ず以下の形式で報告**してから具体作業に入る。

```
【作業開始報告】
・作業環境：PC / iPhone経由 / 不明
・現在のブランチ：
・git status：
・最新コミット：
・remote差分：
・前回の申し送り：
・本日の作業候補：
```

### 未コミット変更があった場合

- **勝手に作業を開始しない**。以下のいずれかをユーザーに確認する：
  - 前回セッションの続きか（→ 内容を確認してから続行）
  - 別端末からの未 push 作業か（→ 取り込み方針を相談）
  - 退避すべき変更か（→ stash か commit か破棄かを確認）
- `.claude/settings.local.json` のみが差分の場合は、後述のとおりコミット対象外として扱う。

---

## 2. 作業終了プロトコル（必須）

### 終了トリガーフレーズ

ユーザーが以下のいずれかを言ったら、**必ず**この終了処理を実行する：

- 「作業終了」
- 「閉じて」
- 「一区切り」
- 「コミットして」

### 実施手順（この順で全項目を実行）

1. `git status` を確認
2. 変更ファイルを一覧化
3. 変更内容を要約
4. 実施したテスト・lint・ビルドの結果を記録（未実施なら「未実施: 理由」と明記）
5. 未確認事項を記録
6. iPhone で確認すべきポイントを記録
7. 次にやるべきことを記録
8. `docs/worklog.md` に新規エントリを追記（テンプレートは §5）
9. 問題がなければコミット（`.claude/settings.local.json` は絶対に含めない）
10. コミットハッシュを取得（`git rev-parse --short HEAD`）
11. 作業終了メモを下記形式で報告

### 終了報告フォーマット（厳守）

```
【作業終了報告】
・作業名：
・作業環境：PC / iPhone経由 / 不明
・変更ファイル：
・変更内容：
・テスト結果：
・未確認事項：
・iPhone確認ポイント：
・次にやること：
・コミット有無：
・コミットハッシュ：
・現在のgit status：
```

### コミットルール

- `.claude/settings.local.json` は**絶対にコミットしない**（端末固有の権限設定のため）
- 不要ファイル（OS の一時ファイル、ビルド成果物、依存ディレクトリ）はコミットしない
- **大きな作業を 1 コミットにまとめすぎない**。論理単位で分割する
- 各コミットには**意味のある日本語または英語のメッセージ**を付ける（「fix」「update」だけは禁止）
- worklog の追記は、関連する変更コミットの末尾に同梱してよい
- **未コミットのまま作業を終えない**。終わらせるならコミットするか、明示的に stash する

---

## 3. PC / iPhone 共通ルール

- 作業端末がどちらであっても、**この CLAUDE.md のプロトコルに従う**
- 端末をまたぐ前に必ず `git push` して remote を最新化する
- 端末を切り替えた直後は §1 の開始プロトコルを必ず実行する
- worklog のエントリには `env:` フィールドで PC か iPhone かを明示する（不明なら `不明` と書く）

---

## 4. コミット対象外（永久）

以下はリポジトリに含めない：

- `.claude/settings.local.json`（端末固有の Claude Code 権限）
- OS / エディタの一時ファイル（`.DS_Store`, `*.swp`, `Thumbs.db` 等）
- ビルド成果物・依存ディレクトリ（`node_modules/`, `dist/`, `build/` 等）
- 認証情報を含むファイル（`.env`, `*.pem`, `credentials.json` 等）

---

## 5. worklog の運用

- 場所：`docs/worklog.md`
- 1 セッション = 1 エントリ。**追記のみ**、過去エントリの書き換え禁止
- セッションを閉じる直前に追記し、同一コミットに含める
- 「次回への申し送り」を必ず書く（無ければ「特になし」と明記）

### worklog テンプレート

```markdown
## YYYY-MM-DD HH:MM  env: PC | iPhone | 不明  branch: <branch-name>

### 作業名
（一文）

### 変更ファイル
- path/to/file

### 変更内容
- （箇条書き）

### テスト結果
- （実行したコマンドと結果。未実施なら「未実施: 理由」）

### 未確認事項
- （後追いが必要な点。なければ「なし」）

### iPhone確認ポイント
- （実機で見るべきもの。なければ「なし」）

### 次にやること
- （次セッションの最初のタスク）

### コミット
- ハッシュ: `xxxxxxx`
- メッセージ: `...`
```

---

## 6. Familink 開発チーム（Skills）

このリポジトリの `.claude/skills/` 配下に、Familink 専用の 17 ロールを Skill として配置している。Claude Code は短文指示でも適切な Skill を自動選択して使い分けること。

### ロール一覧（17 Skills）

| Skill | 役割 |
|---|---|
| `familink-core` | ブランド / 世界観 / Hoku 方針 / 価格 / UI 方針の最上位 |
| `familink-master-controller` | 親スレ / Git / worklog / 開始終了プロトコル |
| `familink-ceo-strategy` | ユニコーン / 売却 / 資金調達 / 競合差別化 |
| `familink-product-owner` | MVP / 優先度（S/A/B/C）/ リリース判断 |
| `familink-requirements-architect` | 要件定義 / 受け入れ条件 / 画面仕様 / データ要件 |
| `familink-cto-architect` | 技術設計 / LocalStorage / 認証 / DB / 課金影響範囲 |
| `familink-html-engineer` | シングル HTML / Vanilla JS / CSS の最小修正 |
| `familink-frontend-engineer` | UI ロジック / 状態管理 / 画面遷移 |
| `familink-uiux-designer` | 画面導線 / 余白 / 文言 / 上質 UI |
| `familink-brand-asset-director` | 画像 / アバター / カラー / プレミアム素材 |
| `familink-hoku-ai-designer` | Hoku の人格 / 口調 / 短文応答 / 確認フロー |
| `familink-monetization-lead` | 無料 / 480 円 / 30 日トライアル / 課金導線 |
| `familink-qa-lead` | 手動テスト / 回帰 / iPhone 確認項目 |
| `familink-debug-engineer` | バグ調査 / 最小修正 / 副作用確認 |
| `familink-appstore-release-lead` | App Store 公開前品質 / 審査 / メタデータ |
| `familink-growth-lead` | 初期ユーザー獲得 / SNS / 口コミ / TestFlight |
| `familink-chief-review-officer` | 横断レビュー / 携帯向けに 3 件以内へ圧縮 |

### Skill の使い分け原則

- **判断 / 設計** が必要な作業は、対応する Skill を**呼んでから**動く
- Skill の出力は各 SKILL.md の「出力形式」に従う
- 1 タスクで複数 Skill を使う場合、最後に `familink-chief-review-officer` で圧縮する（特に携帯閲覧時）
- Skill 同士で判断が衝突した場合、`familink-core` を最上位として裁定する

---

## 7. 自走開発ルール（指示が出せない時間帯の運用）

ユーザーは日中、細かい指示ができない。Claude Code は以下のルールで自律的に動いてよい。

### 自走してよい作業
- 現状確認 / 総点検 / バグ洗い出し
- 優先度 S の小修正（押して動かない / 保存されない / 閉じない / JS エラー / 主要画面開かない / iPhone で操作不能）
- UI の軽微な調整 / Hoku 文言の軽微な調整
- テスト項目作成 / worklog 更新 / docs 更新 / CLAUDE.md 更新
- 安全な小コミット

### 必ず事前確認が必要な作業（独断禁止）
- 認証変更
- DB / Supabase 移行
- 課金本実装
- LocalStorage 構造変更
- React Native 移行
- 大規模 UI 刷新
- 外部 API 追加
- 依存ライブラリ追加
- 全体リファクタリング
- 既存 Hoku デザイン変更
- 画像素材の削除 / 差し替え

### 優先度ルール（S/A/B/C）
- **S**: すぐ直すべき致命的バグ。押せない / 保存されない / 閉じない / JS エラー / iPhone で操作不能
- **A**: App Store 公開前に直したい重要改善。導線 / バリデーション / 分かりづらさ
- **B**: 公開後でよい改善。細かい UX / 整理 / 便利機能
- **C**: 将来機能。Supabase / RN / 大規模課金 / グロース施策

---

## 8. 携帯短文指示への対応

ユーザーは携帯から数語の指示しか出せないことが多い。以下の短文を受けたら、対応する Skill を自動選択して動く。

| 短文指示 | 起動する Skill |
|---|---|
| 次 / 進めて | `familink-master-controller` → 前回 worklog の「次にやること」へ |
| 確認して / 作業開始確認 | `familink-master-controller`（開始プロトコル） |
| 修正して / バグ直して | `familink-debug-engineer` + `familink-html-engineer` |
| テストして / 総点検して | `familink-qa-lead` |
| iPhone 確認ポイント出して | `familink-qa-lead` |
| 作業終了 / 閉じて / 一区切り / コミットして | `familink-master-controller`（終了プロトコル） |
| 優先度 S だけ直して | `familink-product-owner` で抽出 → `familink-debug-engineer` |
| プロっぽくして / この画面整えて | `familink-uiux-designer` |
| Hoku の文言直して | `familink-hoku-ai-designer` |
| 最小変更で実装して | `familink-html-engineer`（最小差分） |
| まだコード変更しないで | 全 Skill：設計 / 提案のみ。Write/Edit を保留 |
| まとめて / 短く報告して | `familink-chief-review-officer` |

短文指示を受けても、§1 の開始プロトコルと §2 の終了プロトコルは省略しないこと。

---

## 9. このルールの優先順位

ユーザーからの個別指示がこのドキュメントと競合した場合は、**ユーザー指示を優先**しつつ、worklog の「未確認事項」にその旨を記録する。
Skill 間の判断衝突は `familink-core` を最上位として裁定する。
