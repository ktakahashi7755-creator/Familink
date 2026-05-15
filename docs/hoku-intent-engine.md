# Hoku Intent Engine — 仕様書 (Wave 52)

Hoku を「単なるチャット応答」から「家族運営を実行する AI アシスタント」へ進化させるための内部仕様。
外部 AI / API は使用しない。Vanilla JS のみで完結し、すべての処理は端末内 (LocalStorage) で行う。

---

## 1. Hoku の役割

- 家族の予定 / タスク / 持ち物 / 体調 / 家計 / 共有を **一言で記録できる窓口**
- 入力を解釈し、登録先の機能（カレンダー / タスク / 家計 / 準備 / 体調 / 家族ボード）へ **保存前確認つき** で反映する
- 医療判断・法的判断・断定的な助言はしない
- App Store 公開に耐える品質（誤登録ゼロ、家族が安心して使える）を担保する

---

## 2. テキスト / 音声入力の共通処理フロー

```
入力（テキスト / 音声）
        │
        ▼
voiceCorrectText  : 表記ゆれ正規化（カタカナ→漢字 / 単位補正）
        │
        ▼
parseHokuIntent(text, source)  ← 統一エントリーポイント
        │  ┌── ヘルプ系 (external_calendar_help / settings_help) は先に判定
        │  ├── 準備ルーティン (毎週 + 曜日 + 持ち物) を判定
        │  ├── 通知 (リマインド系) を判定
        │  └── parseVoiceIntent ─ classifyHokuInput でカテゴリ + エンティティ抽出
        │
        ▼
executeHokuAction(intent)
        │  ┌── 案内系 → メッセージのみ返却（保存しない）
        │  └── 保存系 → m-voice-confirm（保存前確認モーダル）を開く
        │
        ▼
ユーザーが確認・修正・キャンセル
        │
        ▼
voiceConfirmSave  → S.events / S.tasks / S.txs / S.prep / S.prepRoutines / S.health / S.announces
        │
        ▼
saveS() → 各画面の再描画
```

---

## 3. 正規化ルール (`voiceCorrectText`)

- 全角 / 半角の統一は JavaScript の `String` 操作で吸収
- 子育て用語の表記ゆれをカタカナ → 漢字へ：体操服 / 連絡帳 / 上履き / 給食袋 / 水筒 / 宿題 / ランドセル / ピアノ / スイミング / サッカー / 保育園 / 幼稚園 / 小学校 / 保護者会 / 面談 / 運動会 / 遠足
- 体調系：風邪 / 鼻水 / 頭痛 / 腹痛 / 発熱 / 小児科
- 家計系：食費 / 交通費 / 日用品 / 保育料

---

## 4. 意図分類ルール

### 4.1 ヘルプ系（先に判定 / 保存しない）

| intentType | 起動キーワード |
|---|---|
| `external_calendar_help` | Google / iPhone / Yahoo / LINE カレンダー、`.ics`、エクスポート、取込 |
| `settings_help` | 設定 / プロフィール / 家族構成 / メンバー追加・編集 / アバター変更 + 「教えて / 変更 / どこ / やり方」 |

### 4.2 通知系

| intentType | 起動キーワード |
|---|---|
| `notification_add` | 通知 / リマインド / 思い出させて / あとで教えて / アラーム / 朝に教えて / 前日に教えて |

OS プッシュ通知は v1.0 以降で対応予定。それまでは「カレンダーへ登録するのが最も確実」と案内する。

### 4.3 準備ルーティン

| intentType | 起動条件 |
|---|---|
| `prep_routine_add` | 「毎週 / 毎月 / 曜日ルーティン / 時間割」 + 曜日抽出可能 + 持ち物トークン |

通常の `prep_add` ではなく `S.prepRoutines[]` へ保存し、準備リスト画面の「ルーティン候補」から毎週反映できる。

### 4.4 通常 4 カテゴリ（既存 `classifyHokuInput` を使用）

| intentType | 主シグナル |
|---|---|
| `calendar_add` | 日時 + 行事 / 予約 / 通院 / 習い事 / カレンダー語 |
| `task_add` | やること / タスク / 提出 / 連絡 / 「○○までに動詞」 |
| `prep_add` | 持ち物 / 準備 / 忘れ物 / 学校用品 |
| `budget_add` | 円 / 支出 / 入金 / 食費 / 交通費 等 |
| `health_add` | 発熱 / 体温 / 咳 / 鼻水 / 薬名 / カロナール |
| `board_post_add` | 家族に共有 / シェア / 投稿 / 出来事 / 報告 |

---

## 5. エンティティ抽出ルール

| エンティティ | 抽出パターン |
|---|---|
| `memberId` | `VOICE_MEMBER_ALIASES` (パパ / ママ / 星斗 / 星旺 / 星汰 / 星愛 等) → 内部 id (kenya / seiai / seito / seio / seitaro) |
| `date` | 今日 / 明日 / 明後日 / 昨日 / 月〜日曜 / N月M日 / N/M |
| `time` | HH:MM / HH時(MM分) / 朝・昼・夕方・夜 |
| `amount` | NNNN円 / 1万円 / N千円 / 全角→半角 |
| `temperature` | 37.8度 / 37度8分 / 38℃（34.0〜42.0 範囲） |
| `medicine` | カロナール / 解熱剤 / 咳止め / 抗生剤 / 鼻水の薬 / 整腸剤 / タミフル / その他「薬を飲んだ」フラグ |
| `symptoms` | 咳 / 鼻水 / 発熱 / 頭痛 / 腹痛 / 嘔吐 / 下痢 / だるい / 喉痛い / 食欲なし / 便秘 |
| `category` (家計) | スーパー→食費、電車→交通費、薬局→医療費、習い事代→習い事 等 |
| `txType` (家計) | 入金/給料/振込→income、それ以外→expense |
| `weekday` (ルーティン) | 月=1 〜 日=0 |

---

## 6. 登録先ごとの必須項目

| intentType | 必須 | 任意 |
|---|---|---|
| `calendar_add` | title, date | time, member, note |
| `task_add` | title | dueDate, assignee |
| `budget_add` | amount | category, txType, date, member, memo |
| `prep_add` | title | date, member |
| `prep_routine_add` | title, weekday | member |
| `health_add` | member, (体温 ∨ 症状 ∨ 薬) | date, time, memo |
| `board_post_add` | title (本文) | member, category |

不足は `intent.missingFields[]` で返却し、確認モーダルのヘッダーに ⚠ 表示する。

---

## 7. 不足情報の質問ルール (`_hokuAskBackMessage`)

短文 (≤14 文字) かつクリティカルな情報が不足している場合は **モーダルを開かずに Hoku が質問で返す**：

| 状態 | 質問例 |
|---|---|
| 「3200円」のみ | 「金額は読み取れましたが、内容や種別を教えてください。例：スーパーで3,200円使った」 |
| 「薬飲んだ」のみ | 「誰の体調を記録しますか？体温・症状・薬名のいずれかも一緒に教えてください。」 |
| 「準備に追加して」のみ | 「準備リストに何を追加しますか？例：明日、星斗の体操服を準備に追加」 |
| 「スイミング入れて」のみ | 「日付・時刻・対象を教えてください。例：金曜18時、星旺のスイミング」 |

長めの入力では、まず確認モーダルを開いて ⚠ で不足を示し、ユーザーがその場で補えるようにする。

---

## 8. 保存前確認 UX (`m-voice-confirm`)

- **必ず** 保存前にモーダルが開く（ユーザーが目視 → 修正 → 確定）
- 表示項目：登録先 / 対象メンバー / タイトル / 日付 / 時刻 / 金額 / 体温 / メモ
- ヘッダーに ⚠ 不足項目を列挙
- ボタン：[追加する] / [手入力に切り替える] / [キャンセル]
- カテゴリ select で **登録先を変更** できる（曖昧な入力時の救済）
- 「手入力に切り替える」で `hoku-input` に補正後テキストを残し、ユーザーが書き直せる

---

## 9. 実行アクション一覧

```js
executeHokuAction({ intentType, entities, ... })
```

| intentType | 動作 |
|---|---|
| `calendar_add` | m-voice-confirm を開く → S.events |
| `task_add` | m-voice-confirm を開く → S.tasks |
| `budget_add` | m-voice-confirm を開く → S.txs（type: expense / income） |
| `prep_add` | m-voice-confirm を開く → S.prep |
| `prep_routine_add` | m-voice-confirm を開く → S.prepRoutines（weekday 付き） |
| `health_add` | m-voice-confirm を開く → S.health（symptoms / medicine 付き） |
| `board_post_add` | m-voice-confirm を開く → S.announces |
| `notification_add` | 案内メッセージのみ（OS 通知は v1.0 以降） |
| `external_calendar_help` | 案内メッセージのみ（書出 / 取込の現状を説明） |
| `settings_help` | 案内メッセージのみ（設定画面への誘導） |
| `unknown` | 「登録先を判定できませんでした」と質問で返す |

---

## 10. ガードレール（危険領域）

### 体調管理
- 診断・薬の量・服用判断は **絶対にしない**
- 不安が読み取れる文には「不安がある場合は医療機関へ相談」を添える
- 体温は 34.0〜42.0℃ の範囲チェック

### 家計
- 税務 / 法律判断はしない
- 入金 / 支出のラベル付けまでにとどめる

### 通知
- OS プッシュ通知ができるかのように見せない
- 現状はアプリ内通知センターのみ

### 外部カレンダー
- Google / iPhone カレンダーを **自動で読み取らない / 書き込まない**
- 書出は `.ics` または Google 追加 URL、取込はファイル経由のみ
- ユーザー許可なく外部から取得することはない

---

## 11. 今後の外部 AI / API 連携方針（v1.0 以降）

| 候補 | 用途 | 備考 |
|---|---|---|
| OpenAI `gpt-4o-mini` | 自然言語理解の高度化（曖昧入力の解釈） | プレミアム機能として有料側に閉じる |
| `gpt-4o-transcribe` | 音声認識精度の底上げ（騒音下） | 端末側で前処理してから送信 |
| Apple Speech Framework | iOS ネイティブ化後の音声入力 | OS 側依存 |
| iOS ショートカット連携 | 「Hey Hoku, 〇〇を準備に」 | URL Scheme 経由 |
| 家族同期後の Hoku 文脈記憶 | 直近 3 ターンの記憶 | Supabase 側 |

**今回 (v0.2 まで) はこれらを実装しない**。API キーを直書きしない。秘密情報をクライアント JS に埋め込まない。

---

## 12. v1.0 以降の Hoku 高度化ロードマップ

- v0.3：曜日ルーティンの完全表示 + ルーティン候補の編集
- v0.4：家計カテゴリのユーザー定義 + 過去入力の学習（端末内のみ）
- v0.5：家族メンバーごとの口調 / 呼び方カスタマイズ
- v0.6：プレミアム — Hoku 文脈記憶（直近 3 ターン）
- v1.0：Supabase 同期 + OAuth 連携（Google カレンダーの双方向同期）
- v1.1：プレミアム — 外部 LLM 連携（gpt-4o-mini）でフリーテキスト理解
- v1.2：iOS ネイティブ化 + Speech Framework / Push 通知

---

## 13. 関連ファイル

| ファイル | 内容 |
|---|---|
| `app-source/familink.html` (Wave 26 / Wave 52 ブロック) | parseVoiceIntent / parseHokuIntent / executeHokuAction / classifyHokuInput / m-voice-confirm |
| `docs/hoku-guideline.md` | Hoku の人格・口調 |
| `docs/hoku-quality-report-2026-05-02-wave8.md` | 過去の品質報告 |
| `docs/hoku-voice-notes-2026-05-02.md` | 音声入力の設計メモ |
| `docs/worklog.md` | Wave 52 の作業ログ |

---

## 14. Wave 66 追補 — 認証 / 同期 intent

外部カレンダー（calendar_import_help）に続き、ログイン・家族同期・バックアップ
についても Hoku が正しく案内できるよう intent を追加。

| intent | トリガー語 | 応答方針 |
|---|---|---|
| `login_help`  | ログイン / ログアウト / アカウント / 新規登録 / 本物のログイン | 「今はローカルモード。本物のログインは次の段階で対応予定」 |
| `sync_help`   | 同期 / 共有したい / 別の端末で見たい / 家族で共有 | 「家族で見るにはクラウド同期が必要。Supabase 連携で実装予定」 |
| `backup_help` | バックアップ / 機種変 / データが消えた / 引き継ぎ | 「今は端末保存。書き出しで手動バックアップ可。クラウド保存は今後」 |

判定順（parseHokuIntent §1.3）：backup_help → sync_help → login_help。
「ログアウトしたらデータ消えた」のような複合語でも backup_help を優先し、
データ保護の安心を伝える。

応答ガードレール：
- 「ログイン済み」「同期完了」など、未実装機能を完了したように偽らない
- ACTION_BUTTONS:account_sync で設定の「アカウントと同期」へ誘導
- 短文（HOKU_SHORT_REPLY に login_help / sync_help / backup_help を登録）

関連：`docs/auth-cloud-sync-plan.md` / `docs/security-auth-notes.md`
