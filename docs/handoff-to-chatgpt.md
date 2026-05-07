# Familink プロジェクト引き継ぎドキュメント

> このファイルは、これまでの開発作業（Wave 1〜59）を別の AI（ChatGPT 等）に
> **そのままコピペして引き継ぐ**ための完全版ハンドオフです。
> ChatGPT を新規スレッドで開き、このファイル全文を貼り付けてから依頼してください。

---

## 0. 最初に読むべきこと（AI 向け前置き）

あなたはこれから **Familink** という家族向けスーパーアプリの開発を、現行の状態
から引き継ぎます。以下のルールを **必ず** 守ってください。

1. 単一 HTML 構成（依存ライブラリゼロ / npm 不使用）を維持する
2. 既存 LocalStorage 構造を破壊しない（追加のみ）
3. `app-source/familink.html` を編集したら必ず `docs/index.html` へミラー
4. `docs/worklog.md` に必ず追記してから commit
5. 1 機能 / 1 改善 = 1 commit、コミットメッセージは具体的に英語または日本語で書く
6. `.claude/settings.local.json` は絶対に commit しない
7. 開発は `claude/familylink-unicorn-product-TzM1F` ブランチで行い、完成後に
   default branch `claude/merge-and-push-main-u44Ty` へマージ＋ push
8. 変更前に必ず VM スモークテスト（後述）を通す
9. 確認モーダルなしの自動保存はしない（必ず保存前確認 UX）
10. 押せないボタン / 行き先のない導線 / 保存されないフォームを残さない

---

## 1. プロダクト概要

| 項目 | 値 |
|---|---|
| プロダクト名 | **Familink** |
| ブランド AI | **Hoku**（家族を支えるガイド役 / 単なるキャラクターではない） |
| コンセプト | 3 児パパ視点で「家族の子育てをチームで回す」家族向けスーパーアプリ |
| 北極星 | 家族が毎日使う理由を作る / 朝の準備をラクにする / 忘れ物を減らす |
| 価格 | 無料 + 月額 480 円プレミアム（将来 680/780/980 円も検討） |
| 配信 | GitHub Pages（`docs/index.html` を直接配信） |
| 最終ゴール | App Store 公開 → ユニコーン化 / 事業売却 / 資金調達 |

家族のメンバー候補：パパ / ママ / 太郎 / 花子 / 健太（DEFAULT_MEMBERS、Wave 59 で追加・削除可能）。

---

## 2. 技術スタック（必ず守る）

- 単一 HTML：`app-source/familink.html`
- 公開ファイル：`docs/index.html`（**app-source からミラーするだけ**）
- Vanilla JS / CSS のみ
- 依存ライブラリ **ゼロ**
- npm **不使用**
- バックエンド **なし**
- LocalStorage キー：`familink_v3`
- Web 配信：GitHub Pages（リポジトリの default branch `docs/` 配信）
- 想定ブラウザ：iPhone Safari / Chrome / Edge
- 想定ビューポート：iPhone SE / 13 / 15 Plus / Pro Max（横スクロール禁止）

---

## 3. リポジトリ構造

```
Familink/
├── app-source/familink.html       # 編集元の単一 HTML（約 1.5MB）
├── docs/
│   ├── index.html                 # 上記のミラー（GitHub Pages 配信ファイル）
│   ├── worklog.md                 # 作業履歴（追記のみ）
│   ├── prep-routine-timetable.md  # Wave 55 設計ドキュメント
│   ├── hoku-intent-engine.md      # Wave 52 設計ドキュメント
│   ├── handoff-to-chatgpt.md      # この資料
│   ├── product-roadmap.md / mvp-requirements.md / ui-ux-guideline.md ほか
│   └── ...
├── CLAUDE.md                      # 開発ルール（最優先で読む）
└── .claude/                       # Claude Code 設定（commit 禁止）
```

---

## 4. ブランチ構成

| ブランチ | 役割 |
|---|---|
| `claude/familylink-unicorn-product-TzM1F` | **開発ブランチ**（ここに先に push） |
| `claude/merge-and-push-main-u44Ty` | **default branch / GitHub Pages 配信元**（マージで反映） |
| `backup/014-v3.1-near-ideal-archive-album` | Wave 57.1 スナップショット（v3.1） |
| `backup/015-v3.1-wave58-quality-sweep` | Wave 58 スナップショット（品質スイープ後） |

開発フロー：
```bash
# 1) 開発ブランチで作業
git checkout claude/familylink-unicorn-product-TzM1F
# … 編集 + commit …
git push -u origin claude/familylink-unicorn-product-TzM1F

# 2) default にマージ（これで Pages に反映される）
git checkout claude/merge-and-push-main-u44Ty
git merge --no-ff claude/familylink-unicorn-product-TzM1F -m "merge wave NN into default"
git push origin claude/merge-and-push-main-u44Ty

# 3) 開発ブランチに戻る
git checkout claude/familylink-unicorn-product-TzM1F
```

**重要**: `app-source/familink.html` を変更したら **必ず** `cp app-source/familink.html docs/index.html` で同期。md5 が一致することを `md5sum` で確認。

---

## 5. データモデル（S オブジェクト）

`familink_v3` LocalStorage キーに保存される `S` オブジェクトの主要フィールド：

```js
S = {
  // 認証 / プロファイル
  loggedIn, user, userProfile, onboardCompleted,

  // メンバー（Wave 59 で動的化）
  members: null,                // null = DEFAULT_MEMBERS / 配列 = カスタム

  // メイン機能データ
  events: [],                   // カレンダー
  tasks: [],                    // タスク
  txs: [],                      // 家計
  health: [],                   // 体調
  prep: [],                     // 単発準備（今日/明日）
  prepRoutines: [],             // 曜日別ルーティン（Wave 47-55.1）
  announces: [], posts: [],     // 家族ボード / 投稿

  // 買い物（Wave 54）
  shoppingItems: [], shoppingFrequent: [], shoppingHistory: [], shoppingTab: 'list',

  // 過去機能の復活 / 新設（Wave 57）
  folders: [], docs: [],        // 書類保管庫
  albumPhotos: [],              // アルバム

  // ボード / カスタム
  customBoards: [], boardItems: [], boardSections: [],
  homeOrder: [],                // ホームのボード並び順
  defaultCustomBoardsSeeded,    // Wave 52.3 自動投入フラグ

  // 通知 / 可視メンバー
  notifs: [],
  tkVisibleMembers, budgetVisibleMembers,

  // アバター
  userPhotos, userAvatars, userAvatarType,

  // 会計 / 予算
  budgetY, budgetM,

  // プレミアム
  isPremiumUser,
};
```

`PERSIST` 配列に列挙されたフィールドのみ LocalStorage に保存される。新規キーを足したら必ず `PERSIST` にも追加すること。

### 主要レコードのスキーマ

```js
// MEMBERS の各エントリ（DEFAULT_MEMBERS / S.members）
{ id, name, role:'parent'|'child', av, grad }

// S.events
{ id, title, date, time, color, member, allDay? }

// S.tasks
{ id, title, memo, assignedTo, dueDate, priority:'none'|'low'|'med'|'high',
  category, status:'todo'|'done', order, completedAt, createdAt, updatedAt }

// S.prepRoutines（Wave 55 で subject/quantity 追加）
{ id:'pr_xxx', memberId, dayOfWeek:'mon'|...|'sun', title, category,
  subject, quantity, memo, showTiming:'today'|'previous_day'|'previous_day_and_today',
  enabled, repeat, order, createdAt, updatedAt }

// S.shoppingItems / shoppingFrequent / shoppingHistory（Wave 54）
shoppingItems:    { id:'shop_xxx', name, qty, category, memo, assignedTo, status:'active', createdAt, updatedAt }
shoppingFrequent: { id:'freq_xxx', name, defaultQty, category, memo, order, createdAt, updatedAt }
shoppingHistory:  { id:'hist_xxx', name, qty, category, memo, purchasedAt, sourceItemId }

// S.docs（Wave 57）
{ id:'doc_xxx', title, cat, memo, photo:'data:image/jpeg;base64,...', folderId, createdAt, updatedAt }

// S.albumPhotos（Wave 57）
{ id:'ph_xxx', dataUrl:'data:image/jpeg;base64,...', takenAt, memberId, caption }
```

---

## 6. 画面構成（s-* スクリーン）

| ID | 名称 | 主要関数 |
|---|---|---|
| `s-ob` | オンボーディング初期 | – |
| `s-login` | ログイン | doLogin |
| `s-onboard` | オンボーディング | – |
| `s-home` | ホーム | renderHome（ベル / メンバー / 6 ボード） |
| `s-cal` | カレンダー | renderCal |
| `s-task` | タスク | renderTaskScreen + 音声マイク（Wave 53） |
| `s-board` | 家族ボード | renderBoard |
| `s-board-detail` | ボード詳細 | renderBoardDetail |
| `s-budget` | 家計 | renderBudget |
| `s-health` | 体調管理 | renderHealth |
| `s-prep` | 準備リスト | renderPrep（4 タブ：今日/明日/すべて/ルーティン） |
| `s-shopping` | 買い物（Wave 54） | renderShopping（3 タブ：リスト/よく買う/履歴） |
| `s-archive` | 書類保管庫（Wave 57） | renderArchive |
| `s-album` | アルバム（Wave 57） | renderAlbum |
| `s-ch` | 家族メンバー管理（Wave 59） | renderChildren（追加/編集/削除） |
| `s-cdetail` | メンバー詳細 | goChildDetail |
| `s-notif` | 通知一覧 | renderNotif |
| `s-settings` | 設定・メニュー | renderSettings |
| `s-hoku` | Hoku チャット | renderHoku |
| `s-custom-board` | カスタムボード | renderCustomBoardDetail |

`switchTab(id)` または `go(id)` で遷移。

---

## 7. Hoku 意図エンジン（Wave 52 + 55.1 + 58）

`parseHokuIntent(text, source)` がテキスト/音声を統一的に解釈し、`{intentType, entities, confidence, ambiguous}` を返す。

### 対応する intentType

| 種別 | 例 |
|---|---|
| `calendar_add` | 「明日18時、太郎のスイミング」 |
| `task_add` | 「明日までに学校へ電話」「金曜までに提出物確認」 |
| `budget_add` | 「スーパーで3,200円使った」「5万円給与振込」 |
| `health_add` | 「太郎が37.8度で咳あり」「カロナール飲んだ」 |
| `prep_add` | 「明日、太郎の体操服を準備に追加」 |
| `prep_routine_add` | 「毎週月曜、太郎の国語の教科書」「火曜は算数ノートと計算ドリル」（複数分割） |
| `shopping_add` | 「牛乳を買い物リストに追加」「卵とパンを追加」 |
| `shopping_frequent_add` | 「おむつをよく購入するものに追加」 |
| `shopping_purchased` | 「ティッシュ買った」「牛乳を購入済みに」 |
| `notification_add` | 「明日の朝にリマインドして」 |
| `external_calendar_help` | 「Google カレンダーと連携できる？」 |
| `settings_help` | 「プロフィールを変えたい」 |
| `unknown` | 判定不能 |

### 重要関数

- `classifyHokuInput(q)`：カテゴリスコアリング（calendar/task/prep/budget/health/board/notification/help/premium）
- `parseVoiceIntent(rawText)`：title/date/time/member/amount/temp 抽出
- `_hokuParsePrepRoutine(text)`：Wave 55.1 で追加。曜日ルーティンの専用パーサー（X曜は対応 / クリーン title）
- `_hokuDetectShopping(text)`：Wave 54 の買い物意図検出
- `executeHokuAction(intent)`：意図に応じて確認モーダル or 即時保存（複数件の prep_routine_add は confirm() で一括登録）

### 確認モーダル
- `m-voice-confirm`：単品 prep / calendar / task / budget / health / board / shopping
- `m-shop-add`：buy 単品確認
- `m-task-edit`：タスク音声入力時の prefill 確認（Wave 53）
- 多重 prep_routine_add：`window.confirm()` ダイアログで一括承認

---

## 8. ホーム画面の構成（Wave 52.3 + 57）

ホーム右上 → 通知ベル（Wave 57：未読バッジ付き）→ s-notif

ホーム右上 → 三本線メニュー → s-settings

ホームの 6 デフォルトボード（Wave 52.3 で自動投入）：
1. 家族ボード（b_board）
2. タスク（b_task）
3. 今週の予定（b_cal）
4. 体調管理（b_health）
5. 買い物メモ（cb_xxxx, intent='shopping' → タップで s-shopping）
6. 準備リスト（cb_xxxx, intent='prep'）

`hoCardClick(bid)` がカードタップを各画面へルーティング。

---

## 9. 設定・メニュー（Wave 56〜59 で確定）

| セクション | 項目 |
|---|---|
| ブランドヘッダー | ロゴ + アバター |
| Premium カード | プレミアム導線 |
| アカウント・設定 | アバター設定 / 家族メンバー管理 / プロフィールを編集 |
| 家族の保管 | 書類保管庫 / アルバム |
| その他 | ログアウト |
| Footer | `Familink v3.1（Wave 57 / 設定再編・書類保管庫・アルバム）` |

**意図的に削除済**: ホーム/カレンダー/タスク/家族ボード/準備/体調/家計/Hoku（重複）/ 通知（ホーム右上ベルへ移動）/ はじめての方ガイド（一過性）

---

## 10. Wave 履歴（重要なものだけ）

| Wave | 内容 |
|---|---|
| 47 | S.prepRoutines 導入（曜日ルーティン基盤） |
| 50.x | カレンダー週ビュー / 24h / スワイプ |
| 51.x | 週ビュー空スロット → イベント作成 / モーダルレイアウト |
| 52 | parseHokuIntent / executeHokuAction 統一 API + 4 新 intent |
| 52.1 | Hoku title 抽出バグ修正（trigger phrase ストリップ） |
| 52.2 | チャットアイコンを正式 Hoku に統一 |
| 52.3 | ホーム既定 6 ボード自動投入（買い物メモ / 準備リスト） |
| 53 | タスク画面の音声入力（マイク + m-task-edit prefill） |
| 54 | 買い物リスト 3 タブ（リスト / よく買う / 履歴）+ Hoku 連携 |
| 55 | 準備リスト時間割化（教科 / 数量 / カテゴリ刷新 / サンプル / Hoku 多重） |
| 55.1 | prep_routine_add パーサー修正（X曜は対応 / クリーン title） |
| 56 | 設定・メニューから重複ナビ 8 項目削除 |
| 57 | 通知/初回ガイド削除 / ホーム通知ベル / 書類保管庫復活 / アルバム新設 |
| 57.1 | フッター v3.1 表示（キャッシュ判別用） |
| 57.2 | バックアップ枝 014 作成 |
| 58 | 品質スイープ（分類精度 3 件 + 容量保護 + 27 シナリオ） |
| 59 | 家族メンバー動的化（追加/編集/削除 + 11 種類のデータ自動連携） |

詳細は `docs/worklog.md`（最末尾が最新）。

---

## 11. CLAUDE.md の最重要ポイント

`CLAUDE.md` 全文を読むことを **強く推奨**。要点:

### 作業開始プロトコル
```
1. git status
2. git log -1 --oneline
3. git fetch origin
4. git status -sb
5. docs/worklog.md の末尾を読む
```

### 作業終了プロトコル
```
1. git status / 変更要約 / テスト結果
2. docs/worklog.md に新規エントリを追記
3. .claude/settings.local.json を除外して commit
4. git rev-parse --short HEAD でハッシュを取得
5. push（端末またぎ前は必須）
```

### 自走してよい範囲
- 仕様整理 / UI 改善 / バグ修正 / リファクタ（小規模）/ ドキュメント更新

### 必ず確認を取るべき範囲
- 認証 / DB 移行 / 課金本実装 / LocalStorage 構造変更 / React Native 化 /
  外部 API 追加 / 依存ライブラリ追加 / 大規模リファクタ / Hoku デザイン変更 /
  画像素材削除

---

## 12. テスト方法（自動 CI なし）

このリポジトリには `tests/` ディレクトリ・実行可能な自動テストが**ない**。
ChatGPT は VM ベースのスモークテストで検証してください。

### 構文 check（必須）
```bash
node -e "
const html=require('fs').readFileSync('app-source/familink.html','utf8');
const re=/<script\b[^>]*>([\s\S]*?)<\/script>/g;
let m,i=0,ok=0;
while((m=re.exec(html))){i++;try{new Function(m[1]);ok++;}catch(e){console.log('err:',e.message);}}
console.log('scripts ok',ok+'/'+i);
"
```

### スモークテスト用テンプレ
`/tmp/smoke.js` 風に書く（Wave 58 で確立）：vm.createContext で script を実行し、
`globalThis.__test = { S, MEMBERS, parseHokuIntent, ... }` を script 末尾に append、
mock な document/localStorage/window で各 render 関数を呼び runtime エラーを検出。
Wave 58 のコミット (`317fac5`) のスモーク結果を基準ラインとして温存。

### 実機チェックは iPhone Safari
- 「Familink v3.1（Wave 57 …）」の **フッターでバージョンを目視確認**
- 完全リロード手順：アドレスバー長押し → 再読み込み or Safari → 履歴と Web サイトデータを消去

---

## 13. 既知の制約 / 未対応課題

| 領域 | 内容 |
|---|---|
| LocalStorage 容量 | iOS Safari で 5–10MB 上限。Wave 58 で写真自動圧縮 + saveS 失敗を toast 通知。長期は IndexedDB 移行候補 |
| 通知 | OS プッシュ通知未対応（PWA / TestFlight 後の課題） |
| 家族同期 | Supabase / Firestore 等のバックエンド導入が必要（v0.3 以降） |
| 音声認識 | Safari は webkitSpeechRecognition。権限ダイアログまわりの UX 余地あり |
| 写真ストレージ | Album / Archive 写真は base64。容量逼迫時は要圧縮 / 整理 |
| prep_add 多重分割 | 「明日の準備に国語と算数」のような今日/明日の複数分割は未実装（routine 多重のみ実装） |
| メンバー並び替え | Wave 59 では順序変更 UI 未実装 |
| Hoku 「○○を買う」曖昧 | shopping/task の選択 UI は実装済（`_hokuPendingShopping` 経由） |

---

## 14. 次にやるべきタスクの候補（優先度 S/A/B/C）

| 優先 | タスク |
|---|---|
| A | 家族メンバー編集モーダルから openOfficialAvatarModal を直接呼べるようにする |
| A | prep_add 多重分割（「明日の準備に国語と算数」のような） |
| A | iPhone 実機で SpeechRecognition の権限ダイアログ UX 調整 |
| B | アルバムにメンバータグ・キャプション |
| B | 書類保管庫のフォルダ分け（S.folders 復活） |
| B | 大量データ時のリスト仮想化 |
| B | カスタムボード「買い物メモ」を s-shopping への純導線化 |
| C | OS プッシュ通知（v1.0 以降、要 CTO 判断） |
| C | Supabase 連携（v0.3 以降、要 CTO 判断） |
| C | リスト履歴の月別折りたたみ / 上限ページング |

---

## 15. すぐ使えるコマンド集

```bash
# md5 同期確認
md5sum app-source/familink.html docs/index.html

# 最新コミット確認
git log -5 --oneline

# default branch にマージして反映
git checkout claude/merge-and-push-main-u44Ty
git merge --no-ff claude/familylink-unicorn-product-TzM1F -m "merge wave NN into default"
git push origin claude/merge-and-push-main-u44Ty
git checkout claude/familylink-unicorn-product-TzM1F

# バックアップ枝を切る
git branch backup/NNN-description origin/claude/merge-and-push-main-u44Ty
git push -u origin backup/NNN-description

# 過去状態に戻す
git fetch origin
git checkout -b restore origin/backup/015-v3.1-wave58-quality-sweep
```

---

## 16. ChatGPT への最初の依頼テンプレ

このファイルを貼った後、たとえば以下のように依頼してください：

```
あなたは Familink プロジェクトの引き継ぎを受けた開発者です。
docs/handoff-to-chatgpt.md に書かれたルール・データモデル・Wave 履歴を厳守してください。

依頼：
- [ここに具体的な依頼内容]

完了したら以下を必ずやってください：
1. 構文 check
2. docs/worklog.md に新規エントリ追記
3. app-source/familink.html → docs/index.html ミラー
4. 開発ブランチに commit + push
5. default branch にマージ + push
6. md5 同期確認
7. 「【作業終了報告】」を出力
```

---

## 17. 連絡先 / 参考

- リポジトリ：`ktakahashi7755-creator/Familink`（GitHub Pages 配信）
- 開発ブランチ：`claude/familylink-unicorn-product-TzM1F`
- default branch：`claude/merge-and-push-main-u44Ty`
- 最新バックアップ：`backup/015-v3.1-wave58-quality-sweep`
- 設計ドキュメント：
  - `docs/prep-routine-timetable.md`（準備リスト時間割）
  - `docs/hoku-intent-engine.md`（Hoku 意図エンジン）
  - `docs/product-roadmap.md` / `docs/mvp-requirements.md` / `docs/ui-ux-guideline.md`

---

## 付録 A：ChatGPT 1 メッセージ用 短縮版（コピペ可）

> 私は Familink という家族向けスーパーアプリを開発しています。単一 HTML（`app-source/familink.html`、Vanilla JS / 依存ライブラリゼロ / npm 不使用 / GitHub Pages 配信、`docs/index.html` がミラー）。LocalStorage キーは `familink_v3`。
>
> 現在の状態：v3.1 / Wave 59 まで実装済。
> - 18 画面（s-home / s-cal / s-task / s-board / s-budget / s-health / s-prep / s-shopping / s-archive / s-album / s-ch / s-cdetail / s-notif / s-settings / s-hoku / s-custom-board / s-board-detail / s-ob / s-login / s-onboard）
> - Hoku 意図エンジン（calendar/task/budget/health/prep/prep_routine/shopping/notification の 13 種類分類）
> - 家族メンバー動的化（S.members）
> - 買い物リスト 3 タブ（リスト/よく買う/履歴）
> - 準備リスト時間割（教科/数量/曜日ルーティン）
> - 書類保管庫 + アルバム（写真 1280px JPEG 自動圧縮）
> - ホーム右上の通知ベル
>
> 開発ブランチ `claude/familylink-unicorn-product-TzM1F` で作業して、完了後 default branch `claude/merge-and-push-main-u44Ty` にマージ + push してください。`docs/worklog.md` に追記、md5 同期は `cp app-source/familink.html docs/index.html` で。
>
> 制約：依存ライブラリ追加禁止 / npm 禁止 / バックエンド禁止 / 既存 LocalStorage 破壊禁止 / 確認なし保存禁止 / 押せないボタン残さない / 横スクロール禁止 / 完成度の低い実装はしない。
>
> 詳細は `docs/handoff-to-chatgpt.md` 参照。
>
> 依頼：[ここに具体的な作業内容]

---

最終更新：Wave 59 完了時点 / 2026-05-07
