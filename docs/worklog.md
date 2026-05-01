# Familink 作業ログ

このファイルは PC / iPhone 双方の作業履歴を時系列で残すためのものです。
**追記のみ**。過去エントリは書き換えず、間違いがあれば新しいエントリで訂正してください。
書き方とタイミングは `CLAUDE.md` §5 を参照。

---

## 2026-04-30  env: 不明  branch: claude/merge-and-push-main-u44Ty

### 作業名
作業開始/終了プロトコルの導入（CLAUDE.md と worklog.md の新設）

### 変更ファイル
- `CLAUDE.md`（新規）
- `docs/worklog.md`（新規）

### 変更内容
- PC / iPhone 双方の作業状態を同期させるための運用ルールを `CLAUDE.md` に明文化
- 作業開始プロトコル（§1）：`git status` / `git log -1` / `git fetch` / 末尾 worklog の確認を必須化
- 作業終了プロトコル（§2）：トリガー語（作業終了 / 閉じて / 一区切り / コミットして）を定義し、報告フォーマット【作業終了報告】を厳守させる
- コミット禁止対象に `.claude/settings.local.json` を明記
- worklog テンプレートを §5 に定義
- アプリ本体コードは一切変更していない

### テスト結果
- 未実施: ドキュメントのみの追加で実行対象なし

### 未確認事項
- 現在のリポジトリは初期状態（コミット 0 件、ブランチ未確定）。本エントリを含む初回コミット作成可否はユーザー判断待ち
- GitHub remote (`origin`) はプロキシ経由で登録済みだが、push 動作は未検証

### iPhone確認ポイント
- なし（ドキュメント変更のみ。iPhone 側からは次回セッションで `CLAUDE.md` が読み込まれることを確認）

### 次にやること
- `main` ブランチ運用に切り替えるかどうかを決める（前回会話での懸案。現在は `claude/merge-and-push-main-u44Ty` 上で初回コミットを実施）
- 17 個の Familink Skills（`.claude/skills/` 配下）を別環境から取り込むか新規作成するかを決める
- 次回セッション冒頭で本エントリの「未確認事項」を引き継ぐ

### コミット
- ハッシュ: 本エントリを含む初回コミットで記録（`git log -1` で参照）
- メッセージ: `Add CLAUDE.md and docs/worklog.md for PC/iPhone work sync protocol`

---

## 2026-04-30  env: 不明  branch: claude/merge-and-push-main-u44Ty

### 作業名
Familink 自走開発チームのセットアップ（17 Skills 配置 + CLAUDE.md 拡張 + ワークフロー / 携帯運用ドキュメント新設）

### 変更ファイル
- `CLAUDE.md`（更新: §6 開発チーム / §7 自走ルール / §8 携帯短文指示 / §9 優先順位 を追加）
- `.claude/skills/familink-core/SKILL.md`（新規）
- `.claude/skills/familink-master-controller/SKILL.md`（新規）
- `.claude/skills/familink-ceo-strategy/SKILL.md`（新規）
- `.claude/skills/familink-product-owner/SKILL.md`（新規）
- `.claude/skills/familink-requirements-architect/SKILL.md`（新規）
- `.claude/skills/familink-cto-architect/SKILL.md`（新規）
- `.claude/skills/familink-html-engineer/SKILL.md`（新規）
- `.claude/skills/familink-frontend-engineer/SKILL.md`（新規）
- `.claude/skills/familink-uiux-designer/SKILL.md`（新規）
- `.claude/skills/familink-brand-asset-director/SKILL.md`（新規）
- `.claude/skills/familink-hoku-ai-designer/SKILL.md`（新規）
- `.claude/skills/familink-monetization-lead/SKILL.md`（新規）
- `.claude/skills/familink-qa-lead/SKILL.md`（新規）
- `.claude/skills/familink-debug-engineer/SKILL.md`（新規）
- `.claude/skills/familink-appstore-release-lead/SKILL.md`（新規）
- `.claude/skills/familink-growth-lead/SKILL.md`（新規）
- `.claude/skills/familink-chief-review-officer/SKILL.md`（新規）
- `docs/development-workflow.md`（新規）
- `docs/mobile-operation.md`（新規）

### 変更内容
- 17 個の Familink 専用 Skill を `.claude/skills/<name>/SKILL.md` として正式配置
- 各 SKILL.md に YAML frontmatter（自動ルーティング用キーワード入り description）と、役割 / 参照資料 / 判断基準 / やること / やらないこと / 作業前後チェック / テスト観点 / バグ観点 / iPhone 観点 / 出力形式 / レビューポイント / 指示形式 を網羅
- CLAUDE.md に §6（チーム一覧と使い分け原則）/ §7（自走可・要事前確認・優先度 S/A/B/C）/ §8（携帯短文 → 起動 Skill のマッピング表）/ §9（優先順位 + Skill 衝突時の core 裁定）を追加
- `docs/development-workflow.md` 新設：1 セッションの基本ループ、役割マトリクス、優先度、自走境界、コミット粒度、回帰テスト観点、リリース前チェック、ドキュメント階層
- `docs/mobile-operation.md` 新設：携帯短文コマンド集、運用パターン A〜D、抑止用短文、レビュー長さ基準、端末またぎ注意
- アプリ本体コード（HTML / JS / CSS / 画像）は未変更

### テスト結果
- 未実施: ドキュメントと Skill 定義のみの追加で実行対象なし
- 自動チェック: SKILL.md 17 ファイルの存在確認 (`find .claude/skills -name SKILL.md | wc -l` = 17) のみ実施

### 未確認事項
- アプリ本体コード（`src/familink.html` 等）が本リポジトリにまだ存在しない。別環境からの取り込み手順は未確定
- `main` ブランチ運用への切り替えは未実施。現在は `claude/merge-and-push-main-u44Ty` のまま
- Skill の自動ルーティング（短文指示 → Skill 自動選択）は次回以降の運用で実地検証が必要

### iPhone確認ポイント
- 次回 iPhone セッション冒頭で `CLAUDE.md` §8 の短文コマンドが期待どおりに Skill を起動するか観察
- `docs/mobile-operation.md` の運用パターン A（様子見）を最初に試して、報告長さが携帯で読み切れるか確認

### 次にやること
- 別指示で「アプリ本体コードの取り込み手順」を確認（このリポジトリに `src/` を持ってくるか、別リポジトリの subtree / submodule にするか）
- 取り込み後、`familink-master-controller` で開始 → `familink-qa-lead` で S 級総点検 → `familink-debug-engineer` + `familink-html-engineer` で修正
- `main` ブランチ運用切り替えの是非を決める

### コミット
- ハッシュ: 本エントリを含む 2 番目のコミットで記録（`git log -1` で参照）
- メッセージ: `setup Familink autonomous development team skills`

---

## 2026-04-30  env: 不明（自走セッション）  branch: claude/merge-and-push-main-u44Ty

### 作業名
Familink 本体コードの自走取り込み試行 + .gitignore 整備（取り込み元未発見につき素地のみ整備）

### 変更ファイル
- `.gitignore`（新規）
- `docs/worklog.md`（追記）

### 変更内容
- master-controller / cto-architect / html-engineer / qa-lead / debug-engineer の 5 ロールで自走を試行
- アクセス可能な範囲（`/home`, `/tmp`, `/old_root`, `/opt`, `/mnt`, `/media`, `/srv`）で `familink.html` / `index.html` / `*familink*` / `*backup*` を検索
- 結果: アプリ本体 HTML はサンドボックス内に存在しない。`/opt/node*` 配下の HTML は npm 関連のみ（無関係）
- 見つからないため、ユーザー指示「無理に作らず必要ファイルを明確に報告」に従い**取り込みコードは生成しない**
- `.gitignore` を新設（`.claude/settings.local.json` / OS 一時ファイル / node_modules / 機微情報を除外）
- 取り込み準備（`src/` 作成、画像分類、base64 抽出、LocalStorage キー把握）はすべて見送り
- アプリ本体コード・既存 Skills・既存 docs は一切変更していない

### 検索した場所と結果
- `/home/user/` → このリポジトリ `Familink/` のみ
- `/tmp/claude-0/-home-user-Familink/*` → Claude Code のセッションタスクキャッシュのみ（ユーザーデータなし）
- `/old_root`, `/mnt`, `/media`, `/srv` → 空
- `find` で `*.html` を最大深度 8 まで探索 → npm の docs HTML のみ
- `find` で `*backup*` → ヒットなし

### テスト結果
- 未実施: アプリ本体コードが存在しないため対象なし
- 静的検証として `.gitignore` の構文（コメントとパターンのみ）は問題なし

### 未確認事項
- ユーザーの PC ローカルから本セッション（`/home/user/Familink/`）への同期手段が未確立
- 想定される選択肢:
  1. PC で別クローンを作って push → このセッションで pull
  2. ユーザーが本体 HTML を直接このセッションに貼り付け（ファイル丸ごと貼り付け）
  3. iPhone / 別端末からアップロード可能な仕組みを使う
- どれにするかはユーザー判断待ち

### iPhone 確認ポイント
- なし（本体未取り込みのため）

### 次にやること
- ユーザーが復帰したら、本体 HTML をこのセッションに到達させる手段を 1 つ選ぶ
  - 推奨: PC でローカルクローンに `src/familink.html` をコピー → コミット & push → このセッションで `git pull` → 検証 → 必要なら追加コミット
- 本体到達後に再度 master-controller で開始 → 検証 → 取り込みコミット → S 級総点検
- 自走で出した【オーナー向け最終報告】を最初に確認

### コミット
- ハッシュ: 本エントリを含むコミットで記録
- メッセージ: `prepare repo for app source import (.gitignore + autonomous attempt log)`

---

## 2026-05-01 14:37  env: 不明  branch: claude/familylink-unicorn-product-TzM1F

### 作業名
完全自動化・ユニコーン企業プロジェクト方針の CLAUDE.md 追記 + docs 6 本新設

### 変更ファイル
- `CLAUDE.md`（追記: §10 / §11）
- `docs/product-roadmap.md`（新規）
- `docs/mvp-requirements.md`（新規）
- `docs/ui-ux-guideline.md`（新規）
- `docs/premium-strategy.md`（新規）
- `docs/test-checklist.md`（新規）
- `docs/hoku-guideline.md`（新規）
- `docs/worklog.md`（追記）

### 変更内容
- CLAUDE.md §10「完全自動化・ユニコーン企業プロジェクト方針」を新設
  - 10.1 中心価値（北極星）/ 10.2 自律実行と人間確認の境界 / 10.3 ユニコーン視点チェックリスト
  - 10.4 プレミアム戦略要点 / 10.5 UI/UX 品質基準要点 / 10.6 Hoku 役割要点
  - 10.7 機能優先順位（具体機能ベース）/ 10.8 自律改善 / 10.9 セルフレビュー観点
  - 10.10 ドキュメント体系 / 10.11 最終ゴール（短期 / 中期 / 長期）
- CLAUDE.md §11「絶対ルール（要約）」を新設
- 既存の §1〜§9（開始終了プロトコル / Skills / 自走ルール / 携帯短文）は **削除せず**、§10 から相互参照
- 重複回避のため、各テーマの正本を docs に分離：
  - `docs/product-roadmap.md`：Phase 0〜4 / 北極星 / 後回し明示
  - `docs/mvp-requirements.md`：MVP 必須機能 / 受け入れ条件 / 含めないもの
  - `docs/ui-ux-guideline.md`：絶対ルール / レイアウト / 色 / 文言 / 導線 / レビュー観点
  - `docs/premium-strategy.md`：480 円本命 / 上位プラン段階導入 / 候補機能 / 導線 / 計測
  - `docs/test-checklist.md`：コミット前チェック / 6 視点セルフレビュー / S 級 / iPhone / 回帰
  - `docs/hoku-guideline.md`：人格 / 口調 / UI 配置 / 応答パターン / 禁止事項
- アプリ本体コードは未変更（ユーザー指示「既存を消さない / MVP から外れた過剰実装をしない」を遵守）

### テスト結果
- 未実施: ドキュメントのみの追加で実行対象なし
- 静的検証: ファイル新規作成 6 件 + CLAUDE.md 追記の構文（Markdown）確認済み

### 未確認事項
- アプリ本体 HTML はまだ取り込まれていない（前回エントリの懸案を引き継ぎ）
- `docs/app-store-release-checklist.md` は §10.10 に項目登録のみ。実体は申請準備時に作成予定
- §10.11 の指標（北極星 / 計測）は本体取り込み後に再評価

### iPhone確認ポイント
- なし（ドキュメント変更のみ）
- 次回 iPhone セッション冒頭で CLAUDE.md §10 の新セクションが読み込まれることを確認

### 次にやること
- アプリ本体 HTML の取り込み（PC からの push 待ち）
- 取り込み後、`familink-master-controller` で開始 → `familink-qa-lead` で S 級総点検
- §10.3 ユニコーン視点チェックリストを既存機能に適用し、`docs/product-roadmap.md` の Phase 振り分けを更新
- `docs/mvp-requirements.md` の受け入れ条件を実装で満たせているか初回検証

### コミット
- ハッシュ: 本エントリを含むコミットで記録
- メッセージ: `add unicorn project policy to CLAUDE.md and split detail into 6 docs`

---

## 2026-05-01 15:10  env: 不明  branch: claude/familylink-unicorn-product-TzM1F

### 作業名
app-source/familink.html を unicorn ブランチへ取り込み + 構造解析

### 変更ファイル
- `app-source/familink.html`（新規取り込み: `origin/claude/merge-and-push-main-u44Ty` 4be200e からチェックアウト）
- `docs/worklog.md`（追記）

### 変更内容
- `git fetch origin` で `claude/merge-and-push-main-u44Ty` の最新（`4be200e add app source html`）を取得
- 現ブランチを切り替えずに `git checkout origin/claude/merge-and-push-main-u44Ty -- app-source/familink.html` でファイルのみ取り込み
- ブランチ運用は CLAUDE.md / 指示通り `claude/familylink-unicorn-product-TzM1F` を維持
- アプリ本体は **未改変**（取り込みのみ。React/Next/Vite への移植・改造は未実施）

### 構造解析サマリ
- 単一 HTML：9188 行 / 1.3MB（base64 画像が大半）
- セクション割り：
  - `<head>`: 1–11
  - `<style>`: 12–1984（CSS 1973 行）
  - `<body>`: 1985–2987（マークアップ 1003 行、画面 21 個）
  - `<script>`: 2988–8964（Vanilla JS 5977 行、`node --check` パス）
  - 末尾：8965–9188（プレミアムゲートモーダル / カスタムボード画面 / Hoku FAB）
- 外部依存：Google Fonts のみ（`Noto Sans JP`, `Poppins`）。外部 JS なし
- 画面 21 個（`<div id="s-*" class="screen">`）：
  ob / login / home / cal / task / hoku / docs / docs-folder / docs-receipt / board / board-detail / budget / health / prep / ch / cdetail / notif / settings / scan / scan-confirm / custom-board
- 状態管理：LocalStorage キー `familink_v3`、PERSIST 23 項目
  （loggedIn, user, events, tasks, txs, posts, announces, health, prep, notifs, budgetY, budgetM, folders, docs, kanbanCols, tkVisibleMembers, userPhotos, userAvatars, userAvatarType, isPremiumUser, homeOrder, customBoards, boardItems, boardSections）
- 主要定数：MEMBERS / CHILDREN / OFFICIAL_AVATARS / PREMIUM_AVATARS / AVATAR_CATEGORIES / EV_COLORS / CATS_EX / CATS_IN / IMGS
- CSS は `var(--*)` トークン運用済み

### テスト結果
- 静的検証：`node --check` で JS 構文 OK
- ブラウザ起動確認：未実施（理由：サンドボックスにブラウザなし。取り込み方針確定後に実機 / iPhone 確認）
- `npm run build` / `npm run dev`：未実施（理由：`package.json` 未存在。フレームワーク選定がユーザー判断待ち）

### 未確認事項
- 取り込み方針が未決定（A: 単一 HTML 運用継続 / B: Vite + Vanilla / C: React+Vite に段階移植 / D: Next.js）。CLAUDE.md §10.2 の「大規模設計変更 / 依存追加」に該当するため独断不可
- 実機での動作確認（特に iPhone Safari）

### iPhone確認ポイント
- 取り込み方針が決まり次第、`app-source/familink.html` を直接ブラウザで開いた時の起動 / 21 画面の表示 / LocalStorage 保存 / Hoku FAB 表示を iPhone で確認

### 次にやること
- ユーザーに取り込み方針 4 案（A/B/C/D）から選択してもらう
- 選択後：方針 A なら `src/familink.html` 等への配置整理 + `familink-html-engineer` で QA。B/C/D ならフレームワーク基盤を最小構成で生成し、画面単位で段階移植

### コミット
- ハッシュ: 本エントリを含むコミットで記録
- メッセージ: `import app source html from merge-and-push-main branch (analysis only, no migration)`

---

## 2026-05-01 15:18  env: 不明  branch: claude/familylink-unicorn-product-TzM1F

### 作業名
案 A 採用：単一 HTML 運用での起動環境整備 + 静的 QA + 課題一覧化

### 変更ファイル
- `src/familink.html`（新規 / `app-source/familink.html` への symlink。正本は app-source 一箇所のまま）
- `README.md`（新規 / 起動手順）
- `docs/qa-findings-2026-05-01.md`（新規 / QA 静的レビュー結果）
- `docs/worklog.md`（追記）

### 変更内容
- 案 A（単一 HTML 運用継続）採用に基づき、本体 HTML を改造せず以下を実施：
  - `src/familink.html` を `../app-source/familink.html` への symlink として設置（重複コピー回避）
  - `README.md` を新設し、`python3 -m http.server` での起動手順（PC ローカル / iPhone LAN 経由）を記録
  - `docs/qa-findings-2026-05-01.md` で `familink-qa-lead` 観点の静的 QA 結果と修正方針を一覧化
- 本体 HTML（`app-source/familink.html`）は **未改変**
- React / Next / Vite / 依存ライブラリ / 大規模分割は **すべて見送り**（指示通り）

### テスト結果
- 静的サーバ起動確認：`python3 -m http.server 8767` でリポジトリ直下から起動
  - `src/familink.html` → HTTP 200 / size=1296962
  - `app-source/familink.html` → HTTP 200 / size=1296962
  - symlink 経由でも実体経由でも同サイズで配信を確認
- JS 構文：`node --check` パス（前回確認済み）
- 静的 QA（致命要素）：
  - `eval` / `new Function`：使用なし
  - `console.*`：残骸なし
  - `TODO/FIXME/XXX`：なし
  - `setInterval`：なし
  - `id` 重複：`rcpt-*` 3 件は三項演算で排他レンダリングのため実害なし、`data-id="${H(t.id)}"` 2 件は list/kanban の排他描画のため実害なし
  - `onclick` 参照関数：未定義なし（全て定義済み）
  - LocalStorage：`SK='familink_v3'`（PERSIST 23 項目を JSON）と `FAB_KEY='hoku_fab_pos_v2'` の 2 キー、try/catch あり
  - `safe-area-inset-*`：CSS 内 40 箇所利用
- 重点 12 項目：画面遷移 / 保存 / スマホ表示 / Hoku FAB / プレミアムゲート / カレンダー / タスク / 家族ボード / 家計 / 体調 / 準備リスト / カスタムボード — 全関数が定義され、設計上の懸念は静的に検出されず
- 実機ブラウザ確認：未実施（理由：本サンドボックスにブラウザなし。次回 PC / iPhone Safari で実走必要）

### 致命バグ（S 級）
- **静的解析では検出なし**（実機 QA で発見されたら即起票）

### 静的に検出した観察事項
- A 級候補：`${...}` 補間 741 箇所中 `H()` エスケープは 187 箇所。ユーザー入力（name/title/merchant/memo/note）の経路に絞ってピンポイント点検が望ましい
- B 級候補：`data-id` 連打時の挙動 / リスナー解除網羅 / 3 桁 px の実機表示確認 / 画像 base64 1.3MB の初回ロード重さ
- 詳細と優先度別修正方針は `docs/qa-findings-2026-05-01.md` §4–§5 に記録

### 未確認事項
- **iPhone 実機での 21 画面テスト**（最重要 / 次回必須）
- LocalStorage の保存 → 再読み込み復元（実機）
- Hoku FAB の touchstart/move/end チェーン（実機）
- 4G 回線での初回ロード時間

### iPhone確認ポイント
- `README.md` の「同一 LAN の iPhone から確認」手順に従って起動
- `docs/qa-findings-2026-05-01.md` §3 の 12 項目を順に確認
- 発見したバグ・UI 崩れは worklog に追記し、qa-findings の §5 に S / A 級として転記

### 次にやること
1. PC で `python3 -m http.server 8000 --bind 0.0.0.0` 起動
2. iPhone Safari で `http://<PC-IP>:8000/src/familink.html` を開く
3. `docs/qa-findings-2026-05-01.md` §3 の 12 項目を実走
4. バグがあれば `familink-debug-engineer` + `familink-html-engineer` で最小差分修正（A/S 級のみ）
5. その後、`docs/mvp-requirements.md` の受け入れ条件を初回検証

### コミット
- ハッシュ: 本エントリを含むコミットで記録
- メッセージ: `set up single-HTML hosting (src symlink + README) and add static QA findings`

---

## 2026-05-01 15:25  env: 不明  branch: claude/familylink-unicorn-product-TzM1F

### 作業名
5 役割チームレビュー（PO/UX/FE/QA/Release）+ 課題一覧化（修正は未実施）

### 変更ファイル
- `docs/issues-2026-05-01-team-review.md`（新規 / 課題一覧と修正方針）
- `docs/worklog.md`（追記）

### 変更内容
- 5 役割（Product Owner / UX-UI Lead / Frontend Engineer / QA Lead / Release Manager）の観点で `app-source/familink.html` をレビュー
- 本体 HTML は **未改変**（指示通り、修正は確認後）
- 課題を **High / Medium / Low** で分類し、各課題に「役割 / 該当箇所（行番号）/ 影響範囲 / 修正方針 / 差分規模（XS/S/M/L）」を付与
- 推奨着手順（第 1〜4 弾）と着手前確認項目を明記

### 主要発見（要点のみ。詳細は issues-2026-05-01-team-review.md）

#### High（公開ブロッカー / 致命挙動）
- **H-01**: `doLogin()` がパスワードを検証しない（メール非空なら常に `MEMBERS[0]`=賢弥でログイン）。`familink.html:3355–3365`
- **H-02**: `MEMBERS` が賢弥家族 5 名固定。誰がログインしても賢弥家族になる。`familink.html:2995–3001`
- **H-03**: ログインフォームに dev プレフィル `kenya@familink.app` / `password` 残存。`familink.html:2030, 2034`
- **H-04**: `doQuickDemo()` が確認なしで全データ消去。`familink.html:3367–3377`
- **H-05**: プレミアムゲートのコピーが「アバター限定」と読め、480 円の価値が伝わらない（`docs/premium-strategy.md` 乖離）
- **H-06**: プレミアムゲートに絵文字 3 個（⭐🚫👨‍👩‍👧）— UI ガイドライン「1 画面 2 個以下」違反

#### Medium（公開前に直したい）
- M-01: Hoku の口調がガイドライン微ズレ（「だよ」「のんびり」系）
- M-02: Hoku 応答に絵文字 ⚠️ / 👍 混入
- M-03: `switchTab(refresh)` で `s-cdetail` のレンダ分岐抜け（`familink.html:3320–3349`）
- M-04: 用語ゆれ「掲示板」(UI 9 箇所) vs「家族ボード」(docs)
- M-05: ブランド表記ゆれ「ファミリンク」3 vs「Familink」12
- M-06: オンボード CTA 2 つが両方とも同一遷移
- M-07: 通知に ⭐ + 🌟 同行重複
- M-08: m-confirm のデフォルトアイコンが ⚠️（情報確認でも警告色）

#### Low（公開後でよい）
- L-01: 画像 base64 1.3MB の初回ロード重さ
- L-02: XSS サーフェス点検（H() 経由 187/741）
- L-03: addEventListener 47 vs removeEventListener 12 のリーク懸念
- L-04: seedDemo の二度目セーフガード

### テスト結果
- 静的解析のみ実施（grep + sed + 各関数の前後行精読）
- アプリ実行：未実施（実機 QA は別途）

### 未確認事項
- iPhone 実機で 21 画面の動作（特に H-03, H-04, H-06 修正後の表示）
- H-01 / H-02 の **実装方針**（ローカル PIN / クラウド認証 / プロフィール選択のみ）— ユーザー判断待ち
- H-05 の **プレミアム差分機能**（実装済み機能のうち何を有料線引きにするか）— ユーザー判断待ち

### iPhone確認ポイント
- 修正前の現状確認として、`README.md` 手順で iPhone Safari から起動 → 21 画面の起動 / 戻る / 保存を確認
- `docs/qa-findings-2026-05-01.md` §3 の 12 項目チェックを並走

### 次にやること
1. **ユーザー確認**：着手前確認 4 項目（issues-2026-05-01-team-review.md 末尾）に回答してもらう
2. ユーザー GO 後、第 1 弾（H-03 / H-04 / H-06 / H-05）を最小差分で実装
3. 第 2 弾（H-01 / H-02 / M-06）の前に `familink-cto-architect` で LocalStorage 構造変更の影響範囲確認
4. 並走で iPhone 実機 QA

### コミット
- ハッシュ: 本エントリを含むコミットで記録
- メッセージ: `add 5-role team review with prioritized issue catalog (no code changes)`
