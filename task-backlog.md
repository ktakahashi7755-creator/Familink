# Familink タスクバックログ

> 作成日: 2026-05-29  
> 単体テスト・結合テスト実施中の現時点で確認された残タスク一覧。  
> 優先度: **S**=即対応 / **A**=公開前必須 / **B**=公開後改善 / **C**=将来機能

---

## 見やすいタスク一覧（概要）

### 🔴 優先度 S（即対応・公開ブロッカー）

| # | カテゴリ | タスク |
|---|---------|--------|
| S-01 | QA | iPhone Safari 実機でHokuチップ7件の動作確認（タップ→回答） |
| S-02 | QA | iPhone 実機でHoku入力バー表示確認（枠内に収まっているか） |
| S-03 | QA | カレンダー・家計画面の戻るボタンをiPhone実機で確認 |
| S-04 | バグ | Hoku「今日のやることを出して」「体調管理を出して」「今月の家計を出して」が正しい回答を返すか最終確認 |
| S-05 | バグ | プレミアム画面でタップ操作後の画面遷移が正常か確認 |

### 🟠 優先度 A（App Store 公開前に必須）

| # | カテゴリ | タスク |
|---|---------|--------|
| A-01 | App Store | App Store メタデータ作成（タイトル・説明文・キーワード・スクリーンショット） |
| A-02 | App Store | プライバシーポリシーページ URL の確認・更新 |
| A-03 | App Store | アプリアイコン（1024×1024px）最終確認 |
| A-04 | UI/UX | 初回オンボーディングフロー全画面通し確認（スキップ→ホーム導線） |
| A-05 | UI/UX | プレミアムモーダル・課金導線の文言最終確認（β表示、決済未実装の明示） |
| A-06 | セキュリティ | XSS チェック（innerHTML に H() エスケープ漏れがないか） |
| A-07 | セキュリティ | LocalStorage 容量超過時のエラーハンドリング確認 |
| A-08 | QA | 全画面の横スクロール発生チェック（iPhone SE 幅 375px） |
| A-09 | QA | Playwright 84テスト全通過の再確認（main ブランチで実行） |
| A-10 | Hoku | Hoku 1日5回制限のダイアログが正常に表示されるか確認 |
| A-11 | UX | 家族ボード画面の投稿・コメント導線の動作確認 |
| A-12 | UX | 買い物リスト追加・チェック・削除の一連操作確認 |
| A-13 | UX | 体調記録の入力・保存・表示サイクル確認 |
| A-14 | データ | LocalStorage `familink_v3` の全キーの保存・復元確認 |

### 🟡 優先度 B（公開後の改善）

| # | カテゴリ | タスク |
|---|---------|--------|
| B-01 | Hoku | 「○○のタスクを追加して」入力後に送信→確認モーダルが出るか確認 |
| B-02 | Hoku | Hoku の回答で ACTION_BUTTONS が正しく表示されるか全インテント確認 |
| B-03 | UI/UX | 家計管理画面のFABボタンが収入リストを隠さないよう bottom-padding 調整 |
| B-04 | UI/UX | ホーム画面のHokuフローティングボタンがコンテンツと被らないか確認 |
| B-05 | 通知 | 通知一覧画面（s-notif）の空状態・データあり状態の確認 |
| B-06 | 設定 | 設定画面のすべての項目が正しく動作するか確認 |
| B-07 | 性能 | LocalStorage 1MB 近辺での動作確認（大量データ時） |
| B-08 | デザイン | ダークモード対応状況の確認（CSS 変数が対応しているか） |
| B-09 | Hoku | Hoku ウェルカム画面の空状態チップ（今日の予定/タスク/買い物）の動作確認 |

### ⚪ 優先度 C（将来機能）

| # | カテゴリ | タスク |
|---|---------|--------|
| C-01 | インフラ | Supabase クラウド同期の本実装（LocalStorage → DB 移行） |
| C-02 | インフラ | React Native / PWA 化の検討（現行: Vanilla JS 単一HTML） |
| C-03 | 課金 | Stripe / App Store 内課金の本実装 |
| C-04 | 機能 | 家族招待・共有機能の本実装（現行: 端末内のみ） |
| C-05 | 機能 | プッシュ通知の実装 |
| C-06 | Hoku | Claude API 連携（S.hokuApiUrl 設定時の外部 AI 応答） |
| C-07 | 機能 | 書類スキャン / PDF 管理機能 |
| C-08 | 機能 | 習い事記録・成長記録画面の追加 |
| C-09 | グロース | TestFlight 配布・SNS 露出・口コミ施策 |

---

## AIに渡すタスク（精度高く自動実行できる粒度）

以下はそのままAIに渡すことで自動実行可能なタスクです。

---

### [AI-S-01] iPhone 実機Hokuチップ動作の最終確認レポート作成

```
familink-qa-lead として以下を確認し報告してください。

対象: Hoku 画面のサジェストチップ7件
確認項目:
1. 以下7チップが hoku-suggs エリアに横スクロールで表示されること
   - 今日のやることを出して
   - ○○のタスクを追加して
   - 今週の予定
   - 体調管理を出して
   - 今月の家計を出して
   - 家族ボードの内容を教えて
   - ○○を買い物メモに追加して

2. fill:false チップ（上記1,3,4,5,6）をタップ → Hoku が回答を返すこと
3. fill:true チップ（上記2,7）をタップ → hoku-input に text が差し込まれること
4. 送信後、hoku-chat にユーザー発言とHoku返答が表示されること

期待する回答形式: QAテスト計画の出力形式に従う
```

---

### [AI-S-02] Hoku 各インテントの回答品質チェック

```
app-source/familink.html の sendHokuMsg 関数を解析し、
以下の7つのメッセージを sendHokuMsg に渡したときの
想定回答を列挙してください。

1. "今日のやることを出して" → 期待: task_view（未完了タスク一覧）
2. "今週の予定" → 期待: calendar_view（今週の予定一覧）
3. "体調管理を出して" → 期待: health_view（体調記録一覧）
4. "今月の家計を出して" → 期待: budget_view（今月収支）
5. "家族ボードの内容を教えて" → 期待: board_view（投稿・お知らせ）
6. "りんごのタスクを追加して" → 期待: task_add 確認モーダル
7. "牛乳を買い物メモに追加して" → 期待: shopping_add 確認

各インテントについて:
- parseHokuIntent が返す intentType と confidence
- _hokuExecuteView が返す message テキスト（データ空の場合）
- ACTION_BUTTONS の種類

コードを変更せず分析のみ行い報告してください。
```

---

### [AI-A-01] App Store メタデータ草稿作成

```
familink-appstore-release-lead として、
以下の App Store 申請用メタデータを日本語で作成してください。

アプリ情報:
- アプリ名: Familink（ファミリンク）
- カテゴリ: ライフスタイル / ユーティリティ
- 対象: 30〜40代の子持ち共働き夫婦・家族
- 主要機能: 予定共有/タスク管理/家計/体調記録/家族ボード/Hoku AI

作成する内容:
1. アプリ名（30文字以内）
2. サブタイトル（30文字以内）
3. 説明文（4000文字以内、3段落構成）
4. キーワード（100文字以内、カンマ区切り）
5. プロモーションテキスト（170文字以内）
6. プライバシーポリシー用 URL （仮: https://ktakahashi7755-creator.github.io/Familink/privacy）
7. サポート URL （仮: https://ktakahashi7755-creator.github.io/Familink/）

familink-core の方針（禁止語・Hoku 口調・上質感）に従ってください。
```

---

### [AI-A-04] オンボーディングフロー全通し QA

```
familink-qa-lead として、以下のオンボーディングフローのテストケースを設計し、
app-source/familink.html を読んで各ステップのコードが正しく実装されているか確認してください。

フロー:
1. アプリ起動 → s-ob（ウェルカム画面）表示
2. 「ログインせずに体験する」タップ → supaEntryClickGuest() 実行
3. startOnboarding() が呼ばれる（S.onboardCompleted が false の場合）
4. オンボーディング画面（s-onboard）表示
5. 「スキップしてホームへ」タップ → ホーム（s-home）表示
6. ホームで m-guide ガイドモーダルが 700ms 後に表示される
7. ガイドを閉じる → 通常ホーム表示、タブバー表示

各ステップで確認すべき:
- 対象 HTML 要素の id/class
- 対応する JS 関数名と行番号
- 期待する動作
- 失敗パターン（エラーケース）

コードを変更せず分析・報告のみ。
```

---

### [AI-A-06] XSS チェック（innerHTML 使用箇所の H() エスケープ確認）

```
app-source/familink.html 内で innerHTML を使用している箇所をすべて抽出し、
含まれる変数が H() でエスケープされているか確認してください。

確認ルール:
- `element.innerHTML = ...` または `.innerHTML +=` の形式を検索
- 代入値の中に変数（ユーザー入力由来の可能性がある）が含まれる場合は要注意
- H() でエスケープされていない変数があれば「XSS リスクあり」として報告

報告形式:
- 行番号
- コード断片（20文字程度）
- 判定: OK / 要確認 / XSS リスクあり
- 理由

コードを変更せず分析のみ。上位20件を報告してください。
```

---

### [AI-A-08] 全画面横スクロール発生チェック

```
app-source/familink.html の CSS を解析し、
iPhone SE 幅 375px で横スクロールが発生しうる箇所を洗い出してください。

確認観点:
- min-width が 375px を超える要素
- white-space: nowrap で折り返しなしの長いテキスト
- padding/margin で実効幅が 375px を超える要素
- position: fixed/absolute で width > 375px の要素
- flex-direction: row で flex-wrap: nowrap かつ子要素の合計幅 > 375px

報告形式:
- CSS クラス名 / ID
- 問題のあるプロパティ
- 推奨修正

コードを変更せず分析のみ。
```

---

### [AI-B-03] 家計画面 FAB ボタンによるコンテンツ隠れ問題の修正

```
app-source/familink.html の s-budget 画面を修正してください。

問題:
- 家計画面のスクロールリスト最下部の収支金額が、
  青い「+」FABボタン（.fab）に隠れて見えない

修正方針:
- .budget-scroll または 家計リスト scroll-area の padding-bottom を
  FABボタン高さ + bottom位置 + 余裕 に相当する値に設定する
- FABボタンは position:fixed / bottom: calc(84px + safe-area) 程度に位置している想定
- scroll-area の padding-bottom = calc(90px + env(safe-area-inset-bottom)) 程度に調整

修正後:
1. app-source/familink.html を変更
2. docs/index.html に同期（キャッシュバスターをバンプ）
3. git add → commit → push origin main
```

---

### [AI-B-04] Hoku フローティングボタンとホーム画面コンテンツの重なり修正

```
app-source/familink.html のホーム画面（s-home）を修正してください。

問題:
- ホーム画面の下部コンテンツが Hoku フローティングボタン（#hoku-fab）に隠れる
- 特に縦に長いリスト表示時に最下部が隠れる

修正方針:
- ホーム画面の scroll-area または home-scroll の padding-bottom を
  hoku-fab の高さ + bottom位置 に相当する値に加算する
- hoku-fab は bottom: calc(100px + safe-area) 程度に配置されているはず
- home-scroll の padding-bottom をその位置より大きくする

修正後:
1. app-source/familink.html を変更
2. docs/index.html に同期（キャッシュバスターをバンプ）
3. git add → commit → push origin main
```

---

### [AI-C-01-draft] Supabase クラウド同期 設計草稿（実装なし）

```
familink-cto-architect として、
現行の LocalStorage（familink_v3）から Supabase へのデータ移行設計を
提案のみ（コード変更なし）で行ってください。

現行データ構造:
- familink_v3 キー下に JSON で全データ保存
- 主要キー: events, tasks, health, txs, shoppingItems, posts, prep, members など

設計すべき内容:
1. Supabase テーブル設計（各データ型ごと）
2. RLS（Row Level Security）ポリシーの方針
3. LocalStorage → Supabase 移行時のデータ変換方針
4. オフライン時のフォールバック戦略
5. 移行の段階的実施計画（LocalStorage を壊さず並行運用）

CLAUDE.md §12.2 の不変条件（familink_v3 を破壊しない）を遵守してください。
出力はドキュメント形式で。
```

---

## 現状サマリー

| 区分 | 件数 | 状態 |
|------|------|------|
| 優先度 S | 5件 | iPhone 実機確認待ち |
| 優先度 A | 14件 | App Store 公開前に完了必要 |
| 優先度 B | 9件 | 公開後改善 |
| 優先度 C | 9件 | 将来計画 |
| **合計** | **37件** | |

**直近の完了タスク（このセッション）:**
- ✅ Playwright 84テスト: 83 PASS / 0 FAIL
- ✅ Hoku 7固定サジェストチップ実装
- ✅ Hoku board_view intent 追加
- ✅ プレミアム画面 ヒーロー→特典カード境界の改善
- ✅ Hoku 入力バー PC ではみ出し修正（min-height:0 + padding-bottom削減）
- ✅ isViewVerb に「出して」追加（Hoku 無回答バグ修正）
