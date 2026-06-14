# Familink 開発運用ルール

このリポジトリは PC（ローカル Claude Code）と iPhone（claude.ai/code 等の Web 経由）の双方から作業されることを前提とします。両環境で状態がズレないよう、**すべての作業は以下の開始・終了プロトコルに従って**実施してください。

---

## 0. プロジェクト要点（最初に読む・以後の実装はすべて本ファイルの原則に従う）

> **本ファイルは Familink の開発憲法である。以後のすべての実装・変更は本ファイルの原則
> （技術的不変条件・デザイン原則・セキュリティ原則）に必ず従うこと。**
> 個別指示が原則と衝突する場合は §9 に従い、worklog に理由を残す。

### 技術スタック
- **本体**: 単一 HTML（`app-source/familink.html`）／**Vanilla JS / CSS**／フレームワーク・バンドラなし。
- **公開**: GitHub Pages（`docs/index.html`＝本体＋先頭の Service Worker。`docs/sw.js` は cache-first＝即時起動/オフライン対応）。
- **保存**: ブラウザ LocalStorage（主キー `familink_v3`）。写真は base64。
- **クラウド**: Supabase（CDN `@supabase/supabase-js@2`・**anon キーのみ**）。テーブルは
  `fl_family_data`（key-value JSONB）＋ `fl_family_invites` / `fl_entitlements`（SQL は docs/）。
- **サーバ処理**: Supabase Edge Functions（TypeScript/Deno）= Hoku応答 / 予定表OCR。
- **依存**: npm 依存ゼロ。CDN は Supabase と Google Fonts のみ。新規追加は要人間確認（§12.1）。

### 起動 / ビルド / テストコマンド
ビルド工程は無い（単一HTML）。ローカル確認とテストは以下。
```sh
# ローカルサーバ（プレビュー）
python3 -m http.server 9000 --bind 127.0.0.1 --directory app-source

# QA 自動テスト（Playwright・84件）
node qa_full_test.js

# ユニットテスト（Vitest・実コード抽出・23件）
npm run test:unit        # = npx vitest run

# 追加スイート（Playwright・tools/ 配下）— カレンダー/課金/エラー処理/結合フロー等
node tools/qa_<name>_test.js
```
- 実装・修正後は **`node qa_full_test.js` で 84/84 PASS を確認してからコミット**（§2/§14.5）。
- 公開前は **app-source → docs を §12.3 の手順で同期**する。
- RLS 等の SQL は本番 Supabase 適用が前提（検証用: `docs/security-tests.sql`、ローカル Postgres で検証可）。

### デザイン原則（世界観・絶対遵守）
- **装飾的な絵文字を使わない**（🎉✨等の多用禁止）。アイコンは**ラインアイコン（SVG stroke）**で統一。
- **落ち着いた配色**（派手・原色の乱用禁止）、**十分な余白**、角丸・影・フォントの統一。
- **簡潔でやさしい日本語コピー**（です・ます調を基調・押し付けがましくしない）。
- **老若男女が迷わない UI**: スマホ片手操作・**タップ領域 44px 以上**・3秒で理解できる画面。
- 子どもっぽくしすぎず、温かく・安心感のある家族向けトーン（詳細 §10.5 / docs/ui-ux-guideline.md）。

### セキュリティ原則（最優先・絶対遵守）
- **パスワード・認証コード（OTP）は必ず本人が入力**する。アプリが代行・推測・平文保存しない。
- **家族間データの完全分離**: 別家族のデータは読み書き不可。サーバ側 RLS で担保し、
  クライアント判定に依存しない（`fl_family_data` の RLS／`docs/security-tests.sql` で実証）。
- **課金状態はサーバ権利（`fl_entitlements`）を正本**とし、クライアントの改ざんで付与できない。
- 入力は `H()` でエスケープ（XSS）。ファイルは種別・サイズ検証。秘密鍵（service_role 等）は搭載しない。
- 詳細は §13 / docs/AUDIT.md / docs/security-tests.sql。

### ドキュメントの正本
- 運用ルール=本 CLAUDE.md ／ 監査=`docs/AUDIT.md` ／ タスク=`docs/ROADMAP.md` ／
  履歴=`docs/worklog.md` ／ リリース=`docs/RELEASE-CHECKLIST.md` ／ 性能=`docs/PERF.md`。

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
4. **`node qa_full_test.js` を実行し 84/84 PASS を確認**（サーバ起動が必要な場合は §14.5 参照）
5. 実施したテスト・lint・ビルドの結果を記録（未実施なら「未実施: 理由」と明記）
6. 未確認事項を記録
7. iPhone で確認すべきポイントを記録
8. 次にやるべきことを記録
9. `docs/worklog.md` に新規エントリを追記（テンプレートは §5）
10. 問題がなければコミット（`.claude/settings.local.json` は絶対に含めない）
11. コミットハッシュを取得（`git rev-parse --short HEAD`）
12. 作業終了メモを下記形式で報告

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

---

## 10. 完全自動化・ユニコーン企業プロジェクト方針

このプロジェクトは「家族向けアプリ Familink を、ユニコーン化・事業売却・資金調達を狙えるプロダクトに育てる」ことをゴールとする長期プロジェクトである。Claude Code は単なる実装者ではなく、**要件整理 / 仕様設計 / UI/UX / 実装 / テスト / 改善提案 / 事業判断**までを自律的に担う。

### 10.1 プロダクト中心価値（北極星）

Familink は「家族みんなで子育てをチームにするアプリ」。単なる予定共有ではなく、3 児パパ・ママ・祖父母・家族全員が、子育てをチームで回せる状態を作る。詳細：`docs/mvp-requirements.md`。

中心価値（MVP 範囲）：予定共有 / タスク管理 / 持ち物管理 / 家計・お金管理 / 体調記録 / 習い事記録 / 幼稚園・小学校準備 / 家族共有ボード / Hoku のサポート。

### 10.2 自律実行と人間確認の境界

**Claude Code が自律実行してよい作業**（§7 の自走可作業に追加）：

- 要件整理 / 仕様設計 / UI/UX 改善案
- リファクタリング（小規模・既存挙動を変えない範囲）
- テスト設計 / バグ検知 / 改善提案 / ドキュメント更新
- プロダクト価値向上のための小コミット
- 事業化視点での優先順位判断（提案ベース）

**必ず人間確認を挟む作業**（§7 の要事前確認に追加）：

- 本番環境への破壊的変更
- データ削除を伴う変更
- 課金・決済関連の本実装
- 認証・個人情報・家族情報に関わる重大変更
- 大規模設計変更 / 外部サービス連携追加
- App Store / Google Play 申請に関わる最終判断

### 10.3 ユニコーン視点チェックリスト（機能追加時に必ず通す）

機能を追加・変更する前に、対応する Skill（特に `familink-ceo-strategy` / `familink-product-owner` / `familink-monetization-lead`）で以下を自問する：

- 家族の課題を本当に解決するか
- 子育て家庭が毎日使いたくなるか
- 無料 → 有料への自然な転換動線になるか
- 月額 480 円の価値を感じられるか / 将来 680〜980 円の上位プランに拡張可能か
- 競合に真似されにくい体験か
- 家族単位で継続利用される仕組みがあるか
- 世界観が一貫しているか
- 事業売却・資金調達時にプロダクト資産として説明できるか

YES が過半に満たない機能は B / C に格下げするか実装を見送る。

### 10.4 プレミアム戦略（要点）

- 無料プラン：習慣化に必要な最低限を必ず残す（無料が弱すぎると継続しない）
- 本命：月額 **480 円**
- 将来：680 円 / 780 円 / 980 円の上位プランを段階導入
- 詳細・候補機能・課金導線：`docs/premium-strategy.md`

### 10.5 UI/UX 品質基準（最低ライン）

- 安っぽい絵文字多用は禁止
- 家族向けだが子どもっぽくしすぎない（優しい・温かい・安心感）
- App Store 上で違和感のない品質（余白・角丸・色・フォント・ボタン配置の統一）
- スマホ片手操作前提 / 忙しい親が **3 秒で理解** できる画面
- 初回利用時に価値が即伝わる / 無料とプレミアムの差が自然に伝わる
- 詳細：`docs/ui-ux-guideline.md`

### 10.6 Hoku の役割（要点）

Hoku はキャラクターではなく「家族を支えるガイド役」。詳細：`docs/hoku-guideline.md`。

- 予定案内 / 忘れ物・準備サポート / 家計可視化 / 体調・成長記録の整理 / 操作ナビ
- 画面右下などに常駐可能、吹き出しで案内、軽い浮遊・呼吸アニメ
- 過度なアニメ風にしない。優しい・信頼感・家族向けを優先

### 10.7 機能優先順位（具体機能ベース）

§7 の S/A/B/C と併用。具体機能の優先度マッピングは `docs/product-roadmap.md` に集約。要点：

- **最優先（MVP）**：ログイン / ホーム / 予定共有 / タスク管理 / 家族ボード / Hoku 基本導線 / プレミアム制限の基礎 / データ保存 / 最低限テスト / App Store 公開品質
- **次点**：家計管理 / 体調記録 / 習い事記録 / 準備リスト / 通知 / 招待機能 / 画像・アイコン選択 / Hoku アニメ強化
- **後回し**：過度なアバター / 複雑ゲーミフィケーション / SNS / 高度 AI / 初期 MVP に不要な大量機能

### 10.8 自律改善（提案と実行の分離）

Claude Code は以下を自律的に検知し、**提案 / 小規模改善** に分けて扱う。提案は worklog の「未確認事項」または別途レビュー枠に記録、小規模改善のみ即時コミット可。

- UI の違和感 / 文言の不自然さ / 導線の弱さ
- 機能の重複 / 不要な複雑化 / MVP から外れた実装
- 将来の技術負債 / 申請時に問題になりそうな点
- 有料化に弱い点 / 家族向けアプリとして信頼感を損なう点

**勝手に大規模変更はしない**。§10.2 の「人間確認必須」に該当する場合は提案のみで止める。

### 10.9 セルフレビュー観点（コミット前の自問）

実装後は最低限：起動 / 主要画面表示 / ログイン導線 / ボタン反応 / 画面遷移 / スマホ表示 / TS lint / console.log 残骸 / 既存機能の非破壊 / 過剰実装でないか。
余裕があれば次の 6 視点でセルフレビュー：プロダクト責任者 / UI/UX / QA / グロース / 投資家目線 / 子育て家庭目線。
詳細チェックリスト：`docs/test-checklist.md`。

### 10.10 ドキュメント体系

このプロジェクトは以下の docs を正本とする。CLAUDE.md は運用ルール、docs は仕様・指針・履歴。

| ファイル | 内容 |
|---|---|
| `CLAUDE.md` | 運用ルール（このファイル） |
| `docs/worklog.md` | 作業履歴（追記のみ） |
| `docs/product-roadmap.md` | 機能優先度ロードマップ（短期 / 中期 / 長期） |
| `docs/mvp-requirements.md` | MVP の機能・受け入れ条件 |
| `docs/ui-ux-guideline.md` | UI/UX 品質基準 |
| `docs/premium-strategy.md` | 無料 / 課金設計 / 価格戦略 |
| `docs/test-checklist.md` | テスト観点・セルフレビュー観点 |
| `docs/hoku-guideline.md` | Hoku の人格・役割・UI 方針 |
| `docs/app-store-release-checklist.md` | 公開前チェック（必要時に作成） |
| `docs/development-workflow.md` | 1 セッションの基本ループ |
| `docs/mobile-operation.md` | 携帯運用の短文指示マッピング |

ドキュメントは過度に肥大化させず、**正本は 1 箇所** を徹底する（同じ内容を複数ファイルに書かない）。

### 10.11 最終ゴール

- **短期**：MVP 完成 → 実機テスト → 家族内テスト → App Store / Google Play 公開
- **中期**：無料ユーザー獲得 → 月額 480 円で初期課金 → SNS / ショート動画で認知 → 「3 児パパが作る家族向けアプリ」としてブランド化
- **長期**：子育て家庭向けスーパーアプリ化 → Hoku を家族 AI アシスタントへ → 有料会員基盤 → 事業売却 / 資金調達 / ユニコーン化

---

## 11. 絶対ルール（要約）

- 既存ファイルを確認せずに上書きしない
- 既存の重要ルールを消さない（消す場合は理由を worklog に明記）
- 重複ルールを増やさない（正本は 1 箇所）
- MVP から外れた過剰実装をしない
- 本番影響がある変更は確認を挟む
- 家族向けアプリとして信頼感を損なうデザインにしない
- 作業ログを必ず残す
- 最後に必ず次回アクションを明確にする

---

## 12. 技術的不変条件（壊してはいけない技術前提）

§11 の絶対ルールを Familink 固有の技術前提として具体化する。これらは「既存ベースを壊さず磨き込む」運用の土台であり、変更には必ず人間確認を挟む（§7 / §10.2）。役割分担・自律範囲・承認境界・開始終了プロトコル・テスト基準は §1・§2・§6（17 Skills）・§7・§10 に既に定義済みのため、ここでは重複させず技術前提のみを記す。

### 12.1 構成の不変条件
- **単一 HTML 構成を維持**する（複数ファイル分割・SPA フレームワーク化 / React・Vue・Next.js 化はしない）
- **Vanilla JS / CSS を基本とする**。npm 依存は禁止。新規 CDN 追加は必ず人間確認
  - 現在許可済み CDN: `@supabase/supabase-js@2`（CDN jsdelivr経由）/ Google Fonts のみ
  - Supabase は Wave 202 で採用確定。service_role キーは絶対に置かない（anon キーのみ）
- 本体は `app-source/familink.html`、GitHub Pages 公開用は `docs/index.html`
- 全 22 画面の screen id: `s-home` / `s-task` / `s-cal` / `s-budget` / `s-board` / `s-health` / `s-prep` / `s-shopping` / `s-hoku` / `s-notif` / `s-settings` / `s-login` / `s-onboard` / `s-ob` / `s-album` / `s-archive` / `s-memo` / `s-ch` / `s-cdetail` / `s-premium` / `s-board-detail` / `s-custom-board`

### 12.2 データの不変条件
- LocalStorage の主キー `familink_v3` を破壊・初期化しない
- 既存の PERSIST 配列（現在 66 キー超）を壊さない。**新規保存キーを足す場合は PERSIST 配列にも必ず追加**する
  - キーの現在数は `grep "const PERSIST" app-source/familink.html` で確認すること
- 既存の画面 ID・関数名・データ構造を尊重する（大幅変更は要人間確認）
- 確認なしのデータ削除をしない
- familyId は Wave 219 で実装済み。Supabase Realtime チャンネル `familink_family_${familyId}` で家族同期

### 12.3 app-source ⇄ docs 同期義務（必須）
- `app-source/familink.html` を修正したら、必ず `docs/index.html` に同期する（逆も同様）
- `docs/index.html` は GitHub Pages 公開用で、先頭が **Service Worker 登録ブロック**。本体との差分は
  この先頭ブロックのみで、末尾の `<!-- FL-HEAD-END -->` マーカーまでが先頭ブロック（行数固定ではなくマーカーで区切る）。
- **SW はキャッシュ優先（cache-first）方式**：開いた瞬間にキャッシュから即表示＝遅い回線でも待たせず
  オフラインでも動く。`docs/sw.js` の `SW_VERSION` と `docs/index.html` の `var V` は**必ず同じ値**にする
  （sw.js のバイトが変わることで更新が検知され、画面下に「更新」バナーが出る＝強制リロードしない）。
- **同期コマンド**（毎回このパターンで実施）:
  ```sh
  # 1. 先頭ブロック(マーカーまで)を取得し V をバンプ + app-source本体(4行目以降)を結合
  { sed '/<!-- FL-HEAD-END -->/q' docs/index.html | sed 's/v20260614q/v20260614r/'; \
    tail -n +4 app-source/familink.html; } > /tmp/new_index.html
  cp /tmp/new_index.html docs/index.html
  # 2. sw.js の SW_VERSION も同じ値へ（更新検知に必須・忘れない）
  sed -i "s/var SW_VERSION = '[^']*'/var SW_VERSION = 'v20260614r'/" docs/sw.js
  # 3. 確認（3つが一致していること）
  grep "var V=" docs/index.html; grep "SW_VERSION =" docs/sw.js
  diff <(tail -n +4 app-source/familink.html) <(sed '1,/<!-- FL-HEAD-END -->/d' docs/index.html) && echo 本体一致OK
  ```
- バージョン文字列形式: `v{YYYYMMDD}{a-z}` 例 `v20260614q` → 同日更新なら `v20260614r`
- 「片方だけ修正して同期忘れ」「var V と SW_VERSION の不一致」は禁止

### 12.4 安全な実装姿勢
- 入力値をそのまま `innerHTML` に渡さない（XSS 回避。家族情報・体調・写真・家計情報は特に慎重に）
- 押せないボタン / 保存されないフォーム / 遷移先のない導線 / 戻るループ を残さない
- iPhone SE 幅で横スクロールを発生させない
- TODO・仮・ダミー・準備中の放置、console の重大エラー残しを禁止

---

## 13. セキュリティ・リスクマネジメント方針

Familink は家族情報・子ども情報・体調・家計・写真・書類という高プライバシー情報を扱う前提で設計する。詳細監査は `docs/security-audit.md`、公開前監査は `docs/pre-release-audit.md` を参照。

### 13.1 データ保護
- LocalStorage 保存であるため、端末紛失・ブラウザ削除・容量超過・端末変更時のデータ消失リスクを常に考慮する
- 大切な写真・書類は端末本体にも保管する旨をユーザーへ案内する
- 保存失敗時は黙殺せず必ず通知（既存：容量超過時のトースト＋ストレージ管理導線）

### 13.2 XSS / 入力値処理
- ユーザー入力は原則として HTML に直接挿入しない。挿入する場合は `H()` ヘルパーで必ずエスケープする
- `innerHTML` を新規追加する際は、含まれる変数がすべて `H()` 済かを確認
- 外部リンクの `window.open(url, '_blank')` には `'noopener,noreferrer'` を付ける

### 13.3 医療・育児・金銭の表示
- 体調・服薬管理は記録支援であり、診断・医療判断・医師の指示の代替ではないことを明記
- 緊急時は医療機関や #7119 等への相談を促す
- 家計管理は記録支援であり、金融助言ではない旨を明記
- Hoku は AI による提案役であり、最終判断はご家族・専門家へ、を画面常設で示す

### 13.4 認証なし時の表現
- 「共有用 / 自分用 / チャンネル」は、バックエンド認証が未実装である限り、本物のアクセス制御として誤読されない表現にする（端末内表示モードである旨を明示）
- 将来バックエンド化までの暫定状態を、UI 文言で必ず伝える

### 13.5 課金表示
- 実決済が未実装の β 状態では、決済モーダルに β 明示バナーを置き、入力欄の `autocomplete` を `off` とする
- 月額・年額・無料体験などの表示は実装状態と矛盾させない

### 13.6 削除・上書き
- データ削除・初期化・上書きには `showConfirm` 等の確認導線を必ず設ける
- 「全削除」「リセット」は二段階確認が望ましい

### 13.7 リリース前確認
- リリース前は必ず P0/P1 リスクの再確認を行う（`docs/security-audit.md` のリスト）
- セキュリティ改善は既存機能を壊さず小さく実施する（属性追加・文言追加・確認モーダル追加が中心）

---

## 14. 自律開発・承認最小化ルール

ユーザーはスマホ・Remote Control・別業務中に確認するため、細かい確認待ちで作業を止めない。

### 14.1 基本方針
- 安全な読み取り・確認・テスト・軽微な編集は自律的に進める
- `app-source/familink.html` の編集は原則進めてよい
- 実装 → テスト → 修正 → 再テストを自律ループする
- commit 直前のみ変更内容・テスト結果・懸念点を報告する
- ユーザーへの逐一確認は禁止
- **ゴールが与えられたら完走する**: 途中報告だけで止まらない。調査→実装→テスト→修正→品質確認→完了報告まで一気通貫で完遂する

### 14.2 確認なしで進めてよい操作
- `pwd` / `cd` / `ls` / ファイル検索 / コード読解
- `git status` / `git branch` / `git fetch` / `git log` / `git diff`
- `node --check` / `node qa_full_test.js`（QA 自動実行）
- Playwright / puppeteer / スクショ生成
- `app-source/familink.html` 編集
- `docs/index.html` 同期（§12.3 手順に従う）
- `docs/worklog.md` 更新
- CSS / JS / UI 修正 / レスポンシブ調整 / console error 修正
- Supabase Auth 接続 / ログイン画面実装
- CLAUDE.md 更新（§15 のルールに従う）
- 不足タスクの自律的な洗い出しと補完

### 14.3 必ず停止する操作
- `rm` / `del` / 大量削除
- `git reset --hard` / `git clean` / force push
- LocalStorage 構造破壊 / `familink_v3` 初期化
- service_role key 利用 / 本番 DB 削除
- 外部課金 / 認証方式変更
- Familink の世界観・Hoku 人格を大きく変える変更

### 14.4 作業場所
- リモート環境（claude.ai/code 等）: `/home/user/Familink`
- ローカル PC: `C:\Users\ktaka\Familink`（OneDrive 側では作業しない）
- 正本は `app-source/familink.html`
- 公開用は最後に `docs/index.html` へ同期する（§12.3 手順）
- 既存 LocalStorage `familink_v3` は削除禁止

### 14.5 QA 自動テスト（必須）
- `node qa_full_test.js` で 84 件の自動テストを実行できる（Playwright 使用）
- **実装・修正後は必ず実行し、84/84 PASS を確認してからコミット**
- サーバ起動: `python3 -m http.server 9000 --bind 127.0.0.1 --directory app-source &`
- テスト実行: `node qa_full_test.js 2>&1 | tail -15`
- FAIL が出た場合は修正 → 再実行を繰り返し、PASS 確認後にコミット

---

## 15. CLAUDE.md 更新ルール

CLAUDE.md は Familink の「開発憲法」である。更新する場合は以下を守ること。

### 更新の原則
- **全面書き換えは禁止**。改善・統合・補強のみ
- 更新前に必ず現状コード・既存 Skill・過去 worklog を確認する
- 良いルールは残し、古いルールのみ更新する
- 既存の世界観・文体・トーンを変えない
- 重複を増やさない（同じ内容を複数セクションに書かない）
- 長文化が目的ではない。**次回 Claude Code が迷わず動ける実務ドキュメント**であることが目的

### 更新してよいこと
- 古いパス・バージョン・キー数など事実が変わった箇所の修正
- 新機能・新ルールの追加（既存ルールとの重複がない場合）
- 曖昧な表現を実装判断に使える具体的記述へ変更
- 現状コードと矛盾する記述の修正

### 更新してはいけないこと
- Familink の世界観・プロダクト哲学・北極星の変更
- 既存の良いルールの削除（削除する場合は worklog に理由を明記）
- 未確認情報の断定的記述
- CLAUDE.md をコード置き場にすること（コードは HTML 本体に書く）

### 更新後は必ず
- `git diff CLAUDE.md` で変更点を確認
- worklog に更新内容を記録
- コミットメッセージ例: `docs: CLAUDE.md スキル補強（Supabase/QA/同期手順）`
