# Familink 画面設計書

**文書番号**: SPEC-v3-04 ／ **版**: 1.0 ／ **作成日**: 2026-07-07 ／ **正本**
**対象読者**: エンジニア・UI/UX デザイナー・QA

> 本書は Familink の全 22 画面・ナビゲーション・グローバル UI の正本である。
> 要件は `02-requirements.md`、ビジュアル仕様は `08-design-system.md`、Hoku の挙動は `09-hoku-ai.md`、
> データ構造は `05-data-design.md` を参照。記述は 2026-07-07 時点の実装
> （`app-source/familink.html` 約 29,300 行）の実測に基づく。

---

## 1. ナビゲーションモデル

### 1.1 画面一覧（22 画面・不変条件）

| # | 画面 ID | 画面名 | 種別 | タブバー |
|---|---|---|---|---|
| 1 | `s-ob` | ウェルカム | 認証前 | 非表示 |
| 2 | `s-login` | ログイン | 認証前 | 非表示 |
| 3 | `s-onboard` | オンボーディング（4 ステップ） | 認証前 | 非表示 |
| 4 | `s-home` | ホーム | メイン | 表示 |
| 5 | `s-task` | やること（タスク） | メイン | 表示（候補タブ） |
| 6 | `s-cal` | カレンダー | メイン | 表示（候補タブ） |
| 7 | `s-budget` | 家計 | メイン | 表示（候補タブ） |
| 8 | `s-board` | 家族ボード | メイン | 表示（候補タブ） |
| 9 | `s-health` | 体調管理 | メイン | 表示（候補タブ） |
| 10 | `s-memo` | メモ | メイン | 表示（候補タブ） |
| 11 | `s-shopping` | 買い物リスト | メイン | 表示（候補タブ） |
| 12 | `s-prep` | 持ち物・準備 | サブ | 表示 |
| 13 | `s-hoku` | Hoku（AI ガイド） | 全画面チャット | 非表示 |
| 14 | `s-notif` | 通知 | サブ | 表示 |
| 15 | `s-settings` | 設定 | サブ | 表示 |
| 16 | `s-premium` | プレミアム紹介 | サブ | 非表示 |
| 17 | `s-album` | アルバム | サブ | 表示 |
| 18 | `s-archive` | 書類保管庫 | サブ | 表示 |
| 19 | `s-ch` | 家族メンバー管理 | サブ | 表示 |
| 20 | `s-cdetail` | メンバー詳細 | サブ | 表示 |
| 21 | `s-board-detail` | ボード投稿詳細 | サブ | 表示 |
| 22 | `s-custom-board` | カスタムボード詳細 | サブ | 表示 |

### 1.2 タブバー（Floating Dock）

- 実装: `renderTabBar` / `switchTab`。候補 8 タブ = `TAB_DEFS`（ホーム[固定]／やること／カレンダー／家計／ボード／体調／メモ／買い物）
- 既定は 5 タブ表示。`S.tabConfig` でユーザーがカスタマイズ可能（設定モーダル `m-tab-settings`）
- 非表示画面: `s-ob` / `s-login` / `s-onboard` / `s-hoku` / `s-premium`（＋モーダル表示中は `body.modal-open` で隠す）
- ビジュアル仕様（高さ 64px・blur・角丸 22px 等）は `08-design-system.md` §2.6

### 1.3 画面遷移機構

- `showScreen(id)`: `.screen` 表示切替。**不正 ID は `s-home` にフォールバック**
- `go(id)`: `showScreen` + `refresh(id)`（画面別 render 呼出）+ タブバー制御。ナビ履歴 `_navStack`（最大 24 件）に積む
- `goBack()`: `_navStack` から直前画面へ復帰
- `refresh(id)`: 画面別 render をエラーバウンダリ付きで呼ぶ（例外時は `_showScreenError` で復帰導線を表示し、アプリ全体は落とさない）

### 1.4 グローバルコンポーネント

| 部品 | 実装 | 用途 |
|---|---|---|
| トースト | `showToast(msg, type)` | 成功/エラー/情報の非モーダル通知（上部・自動消滅） |
| 確認ダイアログ | `showConfirm(...)`（`m-confirm`） | 削除・ログアウト・上書き等の破壊的操作の必須ガード |
| ローディング | `showLoading` | 非同期処理中の表示 |
| モーダル | `openModal(id)` / `closeModal(id)` | ボトムシート方式。`m-*` ID で約 80 個 |
| Hoku FAB | `#hoku-fab`（`openHoku`） | 全メイン画面に常駐・ドラッグ移動可・タップで s-hoku へ |
| 同期ドット / net-banner | `_setSyncDot` ほか | クラウド同期状態・オフラインの可視化 |
| ワークスペース帯 | `currentWorkspace` / `wsFilter` | 「みんなで共有／自分用」の切替を各画面上部に表示 |

---

## 2. 認証・初期設定フロー

### 2.1 s-ob（ウェルカム）

- **目的**: 初回起動の入口。登録/ログイン/ゲストの 3 択を 1 画面で提示
- **主要 UI**: Hoku ビジュアル（base64 直埋め・即時表示）、メール+パスワード欄、Google/Apple ボタン、ゲスト導線、法的文書リンク
- **操作**: `ob2Login` / `ob2GoogleLogin` / `ob2AppleLogin` / `supaEntryClickGuest` / `openLegalDoc`
- **備考**: 招待リンク（`?join=`）で起動した場合はトークンを保留し、ログイン完了後に自動参加（`05-data-design.md` §4.6）

### 2.2 s-login（ログイン）

- **目的**: 既存ユーザーの再ログイン（「おかえりなさい」）
- **操作**: `doLogin`（パスワード）／パスワード再設定 `openForgot`（`m-forgot`）／新規登録 `openSignup`（`m-signup`）／デモ体験 `doQuickDemo`（既存データありは確認ガード）
- **バリデーション**: 認証エラーは原因別の日本語文言（`02-requirements.md` FR-101 受け入れ条件）

### 2.3 s-onboard（オンボーディング・4 ステップ）

- **フロー**: `ob2Next` → プロフィール（表示名必須）`ob2SaveProfile` → 最初の予定（タイトル/日付必須）`ob2SaveFirst` → Hoku 紹介 → `ob2Done`。各所 `ob2Skip` 可
- **完了時**: `onboardCompleted=true` → ホームへ → 初回のみ `m-tour-offer`（アプリツアー `startAppTour` の提案）
- **備考**: 招待保留があればこの完了時点でも自動参加が走る。ログインボーナス付与 `checkLoginBonus`

---

## 3. メイン画面

### 3.1 s-home（ホーム）

- **目的**: 家族の「今日」を 3 秒で把握するダッシュボード
- **ヘッダー**: 設定・ワークスペース切替・ファミコイン（`showCoinsInfo`）・同期ドット・通知ベル（未読バッジ）
- **本文**: 時間帯挨拶＋名前 → クラウド未接続バナー（ローカルモード可視化）／家族招待 CTA → ボードカードグリッド（`hoRenderCard`・固定カード `HO_FIXED`＋カスタムボード）→ ボード追加
- **操作**: カードタップで各画面へ 1 タップ遷移／カード順は `homeOrder` で並替可／プルトゥリフレッシュで再同期
- **空状態**: 各カードが件数 0 時の案内文を持つ
- **Hoku**: FAB 常駐

### 3.2 s-task（やること）

- **目的**: 家族共有 ToDo。1 タップ完了が最重要操作
- **UI**: ステータスフィルタ `setTaskFilter`／担当者フィルタ（`tkVisibleMembers`）／タスクカード（期限切れは色/バッジで警告）／一括削除 `runTkBulkDelete`（確認付き）
- **編集**: `m-task-edit`（`saveTaskEdit`）— タイトル必須・担当・期限・繰返し（間隔/単位）・優先度・カテゴリ・ステータス
- **ゲート**: 無料 30 件（80% で近接警告 → 超過で `showUpgradeModal`）

### 3.3 s-cal（カレンダー）

- **目的**: 家族全員の予定共有。月/週/リストの 3 ビュー
- **操作**: `setCalView`（ビュー切替）／`changeCalMonth`・`goToday`（移動）／メンバーフィルタ（`calVisibleMembers`）
- **予定編集**: `openEventModal`（`m-event`・`saveEvent`）— タイトル/日付必須・時刻/終了/終日・担当・繰返し（終了日対応）・リマインド（分前選択）・色・メモ
- **取込/連携**: OCR 取込 `openOcrIntro`（`m-ocr-*` 一連: モード選択→撮影→解析→レビュー確認→取込。`09-hoku-ai.md` §8）／ICS 取込 `openIcsImportModal`／書き出し `openExportCalModal`
- **ゲート**: 無料 500 件・OCR 無料月 1 回

### 3.4 s-budget（家計）

- **目的**: 家族のお金の記録と見通し（記録支援であり金融助言でない旨を常設注記）
- **タブ**: `setBudgetTab` — 家計（月次収支）／固定収支（`m-recurring-tx`）／資金繰り（月末残高見通し・繰越 `m-opening-balance`）
- **操作**: 月ナビ・支出/収入切替・FAB `onBudgetFabTap` → `m-budget`（`saveTx`・金額 1〜10 億バリデーション）
- **ゲート**: 無料 100 件

### 3.5 s-board（家族ボード）／ s-board-detail（投稿詳細）

- **目的**: 家族への連絡・お知らせの掲示
- **操作**: 投稿 `openPostModal`（`m-post`・`savePost`・タイトル必須・カテゴリ・宛先・ピン留め・期限）／並替 `toggleBoardReorder`
- **詳細画面**: `renderBoardDetail` — 既読・リアクション・コメント／メニュー `m-board-detail-menu`（編集/ピン/削除）
- **通知連動**: 新規投稿は `addNotif` でアプリ内通知を生成

### 3.6 s-health（体調管理）

- **目的**: 子どもごとの体調・服薬・受診の記録と家族共有
- **UI**: 子どもタブ切替／記録カード時系列
- **記録**: `openHealthModal`（`m-health`）— 状態・体温（34.0〜42.0℃）・症状チップ・服薬・受診・食欲/睡眠/便チップ・メモ
- **安全表示**: 「診断ではなく家族の振り返り用」注記＋緊急時 119 / #7119 案内を常設
- **ゲート**: 無料 50 件

### 3.7 s-prep（持ち物・準備）

- **目的**: 園・学校の持ち物の抜け漏れ防止
- **タブ**: `setPrepTab` — 今日／明日／すべて／ルーティン・時間割
- **操作**: 項目追加 `m-prep`／曜日ルーティン `m-prep-routine`（前日と当日に表示）／対象メンバー `m-prep-members`
- **連携**: OCR・Hoku からの一括登録に対応

### 3.8 s-shopping（買い物リスト)

- **タブ**: `setShopTab` — リスト／よく購入／履歴
- **操作**: `m-shop-add`（`saveShopAdd`・商品名必須・数量チップ・カテゴリ・セクション・担当）／購入済みチェック → 履歴へ
- **連携**: Hoku の「〇〇買っといて」「切らした」で追加代行（確認付き）

### 3.9 s-memo（メモ）

- **UI**: フォルダ階層（`m-memo-folder`・親子・色）＋メモ一覧
- **操作**: FAB → `m-memo-edit`（本文最大 8,000 字・添付対応）
- **ゲート**: 無料 20 件

### 3.10 s-album（アルバム）／ s-archive（書類保管庫）

- **s-album**: FAB 追加（写真/動画・自動縮小）／検索 `onAlbumSearch`／複数選択バー（共有・人物タグ `m-people-pick`・フォルダ移動・削除）／閲覧 `m-album-view`・`m-photo-full`。ゲート: 無料 20 枚
- **s-archive**: 書類の撮影保存とフォルダ管理。`openArchiveAddMode` → `m-archive-add`（タイトル必須・カテゴリ・写真）。ゲート: 無料 15 件。※ホームの固定カードからは撤廃済み（設定・導線経由）
- **共通**: 端末にも原本保管を促す案内（データ消失リスク告知）

---

## 4. Hoku・通知・設定・課金

### 4.1 s-hoku（Hoku AI・全画面チャット）

- **UI**: ヘッダー（Hoku アバター・戻る）／利用量バー（無料 1 日 5 回・残数表示・「無制限にする」→ s-premium）／サジェスト 2 段マーキー／チャットログ／入力欄＋音声 `hokuVoiceToggle`＋送信 `hokuSend`
- **空状態**: データ駆動チップ（今日の予定 N 件・未完了タスク・体調・買い物・家族招待）
- **登録代行**: 保存系は必ず確認モーダル `m-voice-confirm` を経由（`09-hoku-ai.md` §4）
- **超過時**: ショップ（Hoku 追加チケット）またはプレミアム案内

### 4.2 s-notif（通知）

- **UI**: 通知リスト（新しい順・未読ハイライト）／全既読 `markAllRead`／全削除 `confirmClearAllNotifs`（確認付き）／個別 `readNotif`・`deleteNotif`
- **空状態**: おやすみ Hoku＋「通知はまだありません」
- **設定**: `m-notif-settings` — アプリ内 9 種トグル・OS 通知 `toggleBrowserNotif`・Web Push `toggleWebPush`（VAPID 未設定時は「準備中」表示）

### 4.3 s-settings（設定）

6 セクション構成（`renderSettings`）:

1. **プロフィール・家族**: 表示名・家族名・メンバー管理（→ s-ch）・アバター・家族を招待（`m-my-invite`）
2. **クラウド連携**: ログイン状態・自動同期状態・家族 ID・ログイン/ログアウト
3. **表示と通知**: タブ構成 `m-tab-settings`・テーマ・通知設定
4. **データ・保管**: ストレージ使用量・整理・書き出し/読み込み（`openDataShareModal`）
5. **ヘルプ・アプリ情報**: 使い方・FAQ・法的文書・バージョン
6. **ログアウト/リセット**: 確認ガード付き

※ 開発用プレミアム切替は `#qa-debug` ハッシュ時のみ表示（一般ユーザーには非表示）。

### 4.4 s-premium（プレミアム紹介）

- **構成**: ヒーロー（「30日間無料で体験」）→ ベネフィット → 機能カード → プラン比較表（¥480/月・¥4,800/年）→ 利用規約要旨
- **操作**: `selectPremiumPlan` → `openPremiumCheckout`。`STRIPE_ENABLED=false` の間はβ明示バー＋デモ決済（`activatePremiumDemo`）、true で Stripe Checkout 実決済（`10-monetization.md` §6）
- **状態表示**: トライアル残日数バッジ／プレミアム利用中は管理導線（Billing Portal）

### 4.5 s-ch（家族メンバー管理）／ s-cdetail（メンバー詳細）

- **s-ch**: メンバー一覧・追加/編集 `openMemberEdit`（`m-member-edit`・名前/役割/カラー）・アバター選択 `m-avatar-select`（公式/写真。プレミアムアバターはロック表示）。ゲート: 無料 4 人
- **s-cdetail**: `goChildDetail` で遷移。メンバー個人のサマリ（`#cdetail-body` 動的生成）

### 4.6 s-custom-board（カスタムボード詳細）

- **目的**: 用途別の自由ボード（準備/共有/メモ型のインテント別レイアウト）
- **操作**: アイテム追加 `openBoardItemAdd`（`m-board-item`）・セクション・完了トグル・ボードメニュー `openBoardMenuModal`（名称/色/削除）
- **ゲート**: 無料 3 ボード

---

## 5. 横断仕様

### 5.1 プレミアムゲートの画面別マッピング

| 画面 | ゲート | 無料上限 |
|---|---|---|
| s-cal | events 件数・OCR 回数 | 500 件・月 1 回 |
| s-task | tasks 件数 | 30 件 |
| s-budget | txs 件数 | 100 件 |
| s-health | health 件数 | 50 件 |
| s-album | albumPhotos 件数 | 20 枚 |
| s-archive | docs 件数 | 15 件 |
| s-memo | memos 件数 | 20 件 |
| s-ch | members 人数・プレミアムアバター | 4 人 |
| s-custom-board | customBoards 枚数 | 3 枚 |
| s-hoku | 相談回数 | 1 日 5 回 |

挙動は共通: 80% 到達で近接警告（セッション 1 回）→ 超過で `showUpgradeModal`（「30日間無料でためす／今はこのままでいい」）。

### 5.2 空状態の原則

- 全一覧画面が空状態ビュー（イラスト＋一言＋次の一手）を持つ。責めない文言・追加導線つき（`08-design-system.md` §2.10）

### 5.3 実装されていないもの（誤解防止）

- **ダークモード**: 未実装（背景テーマ 8 種のみ。Phase 2 検討）
- **グローバル検索**: なし（アルバム内検索のみ）
- **Hoku の自発プッシュ吹き出し**: 未実装（将来方針）
- **書類保管庫のホーム固定カード**: 撤廃済み

### 5.4 モーダル一覧（主要・約 80 個の代表）

`m-confirm`（確認）/ `m-event` / `m-task-edit` / `m-budget` / `m-recurring-tx` / `m-opening-balance` / `m-post` / `m-board-detail-menu` / `m-health` / `m-prep` / `m-prep-routine` / `m-prep-members` / `m-shop-add` / `m-memo-edit` / `m-memo-folder` / `m-archive-add` / `m-album-view` / `m-photo-full` / `m-people-pick` / `m-member-edit` / `m-avatar-select` / `m-voice-confirm`（Hoku 確認）/ `m-ocr-*`（OCR 一連）/ `m-notif-settings` / `m-tab-settings` / `m-my-invite`（招待）/ `m-signup` / `m-forgot` / `m-premium-checkout` / `m-shop`（ファミコインショップ）/ `m-tour-offer`

---

## 6. 本書の運用

- 画面の追加・撤去・導線変更・モーダル追加は本書を同時更新する（画面 ID は不変条件・CLAUDE.md §12.1）
- 新画面は §1.1 の表・§5.1 のゲート表・`02-requirements.md` の FR を揃えて追記する
- UI 文言・ビジュアルの変更は `08-design-system.md` の規定に従い、本書には構造（導線・操作・関数）のみを記す
