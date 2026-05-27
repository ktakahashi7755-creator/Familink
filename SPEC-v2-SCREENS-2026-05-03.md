# Familink 画面一覧 + 画面遷移図 v2（Wave 24 / 2026-05-03）

**画面数：** 17（書類保管庫 5 画面は Wave 15 で意図撤廃済）

---

## 1. 画面一覧（17 画面）

### グループ A：認証 / オンボード（3 画面）
| ID | 画面名 | 役割 | 主要要素 |
|---|---|---|---|
| `s-ob` | ウェルカム | 初回起動時のブランド画面 | ヒーロー画像 / 「はじめる」/「ログイン」 |
| `s-login` | ログイン | メール + パス（モック）/ デモログイン | フォーム / デモボタン |
| `s-onboard` | オンボーディング 4 ステップ | 価値説明 / プロフィール / 最初の予定 / Hoku 紹介 | 進捗バー / 役割 9 択 |

### グループ B：メインタブ 5 画面
| ID | 画面名 | タブ | 主要要素 |
|---|---|---|---|
| `s-home` | ホーム | tab-home | 挨拶 / カメラ / 設定 / 3 固定カード + カスタム |
| `s-task` | タスク | tab-task | フィルター 5 / メンバー / リスト |
| `s-cal` | カレンダー | tab-cal | 月/週/リスト / 月送り / 今日 / FAB |
| `s-budget` | 家計 | tab-budget | メンバータブ 7 / ヒーロー / チャート / 一覧 |
| `s-board` | 家族ボード | tab-board | フィルターバー / カスタムタブ / 投稿一覧 |

### グループ C：詳細・サブ画面（6 画面）
| ID | 画面名 | 親画面 | 役割 |
|---|---|---|---|
| `s-board-detail` | 投稿詳細 | s-board | コメント / リアクション / 編集 |
| `s-custom-board` | カスタムボード詳細 | s-home | 7 intent ボード / ヒーロー / 入力例 / 追加 |
| `s-prep` | 準備リスト | （設定 / Hoku）| 今日/明日/すべて + 双方向繰越 |
| `s-health` | 体調管理 | （設定 / Hoku）| 子ども別タブ / 体温 / 服薬 |
| `s-ch` | こども一覧 | s-settings | 子ども 3 名 |
| `s-cdetail` | こども詳細 | s-ch | 個別プロフィール |

### グループ D：システム画面（3 画面）
| ID | 画面名 | 役割 |
|---|---|---|
| `s-notif` | 通知センター | 既読 / 未読 |
| `s-settings` | 設定 | プロフィール / アバター / メンバー / 通知 / オンボ再表示 / ログアウト |
| `s-hoku` | Hoku AI | 入力欄 / 送信 / マイク / 状態バナー / 応答 + アクションボタン |

---

## 2. 画面遷移図

### 起動フロー
```
[初回] s-ob → s-login → (デモ or ログイン) → s-onboard (4 step) → s-home
[既ユーザー] → s-home (直行)
```

### メインフロー（タブバー切替）
```
s-home ⇄ s-task ⇄ s-cal ⇄ s-budget ⇄ s-board
  │
  ├→ s-custom-board (カスタムカードタップ)
  ├→ s-settings (ハンバーガー)
  └→ openPostModal (カメラアイコン)
```

### 設定からのサブフロー
```
s-settings
  ├→ openProfileEdit (modal)
  ├→ openOfficialAvatarModal (modal)
  ├→ s-ch → s-cdetail
  ├→ s-notif
  ├→ s-prep
  ├→ s-health
  ├→ reopenOnboarding → s-onboard
  └→ doLogout (confirm) → s-ob
```

### Hoku フロー（全画面 FAB から）
```
[全画面] → ホクの妖精 FAB → s-hoku
  ├→ classifyHokuInput → アクションボタン
  │  ├→ s-cal (カレンダーを開く)
  │  ├→ s-task (タスクを追加)
  │  ├→ s-prep (準備リスト)
  │  ├→ s-budget (家計)
  │  ├→ s-health (体調)
  │  ├→ s-board (家族ボード)
  │  └→ openPremiumGate (プレミアム)
  └→ goBack → 元の画面
```

### 戻る導線（goBack 関数）
```
s-hoku → S.prev safe screens のいずれか
s-settings → s-home
s-custom-board → s-home
s-board-detail → s-board
s-task → s-home
default → S.prev || s-home
```

---

## 3. 画面間データ連動

### 連動マトリクス
| 元データ | 反映先 |
|---|---|
| `S.events` | s-home（今週の予定カード）/ s-cal |
| `S.tasks` | s-home（タスクカード）/ s-task |
| `S.announces`（投稿）| s-home（家族ボードカード）/ s-board / s-board-detail |
| `S.txs`（取引）| s-budget（ヒーロー / チャート / 一覧 / メンバータブ）|
| `S.prep` | s-prep（3 タブ）|
| `S.health` | s-health（子ども別）|
| `S.notifs` | s-notif（通知センター）/ home-greeting badge |
| `S.customBoards` + `S.boardItems` + `S.boardSections` | s-home（カスタムカード）/ s-custom-board |
| `S.userProfile` | s-home（挨拶）/ s-settings / openProfileEdit |
| `S.user` | 全画面（avHtml() ヘルパー）|

---

## 4. モーダル一覧

| ID | 役割 | 起動元 |
|---|---|---|
| `m-event` | 予定追加・編集（繰り返し含）| カレンダー / Hoku |
| `m-task-edit` | タスク追加・編集 | タスク / Hoku |
| `m-budget` | 取引追加（金額・カテゴリ・担当者）| 家計 FAB |
| `m-post` | 家族ボード投稿 | カメラアイコン / 家族ボード ＋ |
| `m-prep` | 準備リスト項目追加 | 準備リスト ＋ |
| `m-health` | 体調記録追加 | 体調管理 ＋ |
| `m-board-create` | カスタムボード作成（7 intent）| ホーム ＋ |
| `m-board-item` | ボード項目追加（intent-aware）| カスタムボード詳細 |
| `m-board-menu` | ボード管理メニュー | カスタムボード詳細 |
| `m-folder` / `m-doc` | 旧書類関連（Wave 15 撤廃 / 残骸）| なし（呼び出されない）|
| `m-confirm` | 確認モーダル | showConfirm() |
| `m-premium-gate` | プレミアムゲート | showPremiumGate() |
| `m-avatar-select` | アバター選択 | 設定 |
| `m-profile-edit` | プロフィール編集（Wave 21）| 設定 |

---

## 5. 各画面の主要操作

### s-home
- 上下スクロール（誤遷移防止済）
- カードタップ → 関連画面
- カード長押し → 並び替え
- カメラ → 投稿モーダル
- 設定（≡）→ s-settings
- 「＋ ボードを追加」→ ボード作成モーダル

### s-task
- フィルタータブ × 5
- メンバーアバタータブ（フィルター）
- カードタップ → 編集モーダル
- チェックボックス → 完了切替（消えない）
- ゴミ箱アイコン（done のみ）→ 削除確認
- 右上 ＋ → タスク追加モーダル

### s-cal
- 月 / 週 / リスト ビュータブ
- 前月・次月ボタン
- 「今日」ピル
- 日付タップ → 日付選択
- リスト：「↻ 毎週」等バッジ
- FAB → 予定追加モーダル

### s-budget
- メンバー切替タブ × 7（横スクロール）
- 月送り / 月名タップで今月へ
- 支出 / 収入 トグル
- カテゴリ別バーチャート
- 取引タップ → 削除確認
- FAB → 取引追加モーダル（担当者選択含）

### s-board
- フィルターバー（カテゴリ + 「＋ タブ」）
- カスタムタブ追加（prompt）/ 長押し削除
- 投稿カードタップ → s-board-detail
- 右上 ＋ → 投稿モーダル

### s-prep
- 今日 / 明日 / すべて タブ
- カテゴリ別グルーピング
- チェック → 完了
- 「明日に回す」/「今日に回す」ボタン
- 過去未完了は「今日に回す」候補表示
- 右上 ＋ → 追加モーダル

### s-hoku
- 入力欄（テキスト）
- マイクボタン（音声）
- 送信ボタン（紙飛行機）
- 状態バナー（聞き取り中 / 非対応 / エラー）
- 応答メッセージ + アクションボタン
- ヘルプチップ（事前用意の例文）
