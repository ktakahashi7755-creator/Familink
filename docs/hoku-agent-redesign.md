# Hoku 刷新ドキュメント（Wave 61）

「説明が長いヘルプ係」だった Hoku を、**短く・ラフに・文脈を読んで実行する**家族運営エージェントへ刷新。

## 1. 刷新の目的
- 回答が長い → 1〜2 文 / 20–80 字
- いちいち確認 → 信頼度に応じて省略
- 例文と説明 → 必要な時だけ
- 文脈読まない → 直近 5 ターンを覚える
- ヘルプ寄り → 実行寄り

## 2. 旧 Hoku の課題
- `classifierGuidance` が 4–10 行の長文ヘルプ
- 確認モーダルタイトル「内容を確認してください。修正があればその場で編集できます。」
- 「ありがとう」→「どういたしまして。他にも気になることがあれば、いつでも話しかけてください。」（過剰）
- 「やっぱ花子で」「明日にして」のような短い修正入力が解釈不能

## 3. 新 Hoku の会話方針
| 旧 | 新 |
|---|---|
| 予定として整理できそうな内容ですね。日時が分かる場合は… | 予定に入れられるよ。 |
| 家計メモに残しておくと、あとで見直しやすくなります… | 家計に入れられるよ。金額があればそのまま登録できる。 |
| 内容を確認してください。修正があればその場で編集できます。 | これで保存する？ |
| うまく聞き取れませんでした。もう一度お試しください。 | ごめん、聞き取れなかった。もう一回いける？ |
| ちょっとエラーが出たみたい。もう一回試してみて。 | ごめん、うまくいかなかった。もう一回試して。 |

## 4. 短文応答カタログ（HOKU_SHORT_REPLY）
```
calendar_add:           予定に入れられるよ。
task_add:               タスクに追加するね。
budget_add:             家計に入れるね。
health_add:             体調メモに残すね。不安なら医療機関に相談してね。
prep_add:               準備リストに入れるね。
prep_routine_add:       曜日ルーティンに登録するね。
shopping_add:           買い物リストに追加するね。
shopping_frequent_add:  よく買うものに登録するね。
shopping_purchased:     購入履歴に入れるね。
recurring_budget_add:   固定収支に登録するね。
cashflow_view:          資金繰りを開くね。
notification_add:       通知センターに残すね（OS プッシュは v1.0 以降）。
external_calendar_help: 今は ICS の取込・書き出しに対応。完全自動同期は今後対応予定。
settings_help:          設定から変えられるよ。開く？
```

## 5. 確認モーダルタイトル（HOKU_CONFIRM_TITLE）
カテゴリ別に動的更新（`voiceConfirmRender` 内で `getHokuConfirmTitle(p.category)`）。
```
calendar  → この予定を追加する？
task      → このタスクを追加する？
budget    → この金額で記録する？
health    → 体調メモに残す？
prep      → 準備に追加する？
shopping  → 買い物リストに追加する？
recurring → 固定収支に登録する？
default   → これで保存する？
```

## 6. 文脈エンジン（S.hokuContext）
```js
S.hokuContext = {
  turns: [{role, text, at}, …最大 5 件],
  lastIntentType: 'calendar_add' | …,
  lastEntities: { memberId, memberName, title, date, time, amount, weekday, subject, category, txType },
  lastUpdatedAt: ISO 文字列
}
```
- `updateHokuContext(role, text, intent)`：毎ターン保存。turns は 5 件で頭打ち
- `applyHokuContext(text)`：直近 10 分以内 + 30 文字以下の短文修正を解釈
  - メンバー切替：「やっぱ花子で」「太郎にして」
  - 日付切替：「明日にして」「来週で」
  - 時刻切替：「19時にして」
  - 支出/収入切替：「収入で」（直前 budget のとき）
  - タスク化：「やっぱタスクで」（直前カレンダーのとき）

## 7. テキスト/音声共通フロー
```
1. 入力取得（テキスト or SpeechRecognition）
2. voiceCorrectText() で家族名・金額・体温・日付の表記揺れ補正
3. applyHokuContext() で文脈修正候補を試行
4. parseHokuIntent() で意図分類
5. confidence ≥ 0.85 → 確認モーダルへ直行
   0.40–0.84 → 通常確認 + 必要なら登録先選択
   <0.40    → 短く聞き返す or 「どこに入れる？」
6. m-voice-confirm（or 専用モーダル）で intent 別タイトル
7. 保存 → 短い toast + ACTION_BUTTONS で開く導線
8. updateHokuContext() で次の修正入力に備える
```

## 8. confidence 別挙動
| 範囲 | 挙動 | 例 |
|---|---|---|
| ≥ 0.85 | 聞き返さず確認モーダル | 「明日18時、太郎のスイミング」→ 即「この予定を追加する？」 |
| 0.60–0.84 | 通常確認、注意表示あり | 「水筒を買う」→ shopping_add (ambiguous) → 「買い物リストに追加？タスクに追加？」 |
| 0.40–0.59 | 登録先選択チップ | 短文の曖昧入力 |
| < 0.40 | 短い聞き返し | 「それお願い」→「どこに入れる？」 |

## 9. ガードレール
**短文化しても削らない**：
- 体調：「不安なら医療機関に相談してね」（診断しない）
- 薬：「薬の記録として残すね」（量を指示しない）
- 家計：「家計メモとして記録するね」（税務判断しない）
- 外部カレンダー：「今は ICS 対応。完全自動同期は v1.0 以降」（誤認回避）

## 10. ACTION_BUTTONS 整理
- 全応答に出さない（保存系は確認モーダル経由のため不要）
- ヘルプ系（unknown / cashflow_view / settings_help）にのみ画面遷移ボタン
- 保存完了時は「○○を見る」ボタンのみ

## 11. Hoku Quick Save モード（将来構想）
`S.hokuQuickSave`（Boolean）追加済み。設定で有効化すると低リスク項目（タスク追加 / 買い物追加）はワンタップ保存に短縮可能。今 Wave では UI 未実装、データキーのみ準備。

## 12. 将来の外部 AI API 連携
- 現状は完全ローカル分類（外部 API 不使用）
- 検討中：
  - OpenAI Realtime API での音声 → 意図変換（v1.0+）
  - Whisper.cpp の WASM 化でオフライン音声認識強化（v0.5+）
  - 端末ローカル LLM（MLX / WebLLM）での文脈強化（v0.6+）
- 必ず opt-in 設定 + プレミアム連動 + プライバシー説明を伴う想定

## 13. 実装ファイル参照
| 機能 | 場所 |
|---|---|
| 短文カタログ | `HOKU_SHORT_REPLY` / `HOKU_CONFIRM_TITLE` 定数 |
| 文脈エンジン | `_ensureHokuContext` / `updateHokuContext` / `applyHokuContext` / `_hokuRebuildIntent` |
| ask-back 短文 | `_hokuAskBackMessage` |
| ガイダンス短文化 | `classifierGuidance` |
| 確認タイトル動的化 | `voiceConfirmRender` |
| 文脈解決の組み込み | `sendHokuMsg` 内 ctxIntent 経路 |

## 14. テスト
新 `/tmp/hoku-redesign.js` 29 件 PASS：
- 短文カタログ存在 5 件
- 確認タイトル 4 件
- ガイダンス短文化 4 件
- ask-back 短文 3 件
- 文脈解決 6 件
- budget 文脈 1 件
- turn ストレージ + 5 件頭打ち 4 件
- 既存意図実行短文化 2 件

既存 19 スイート 448 件すべて PASS（退行ゼロ）。

合計 **477 / 477 PASS**。

---

## 15. Wave 62 追補 — 参照系 intent (`*_view`) と入力レイアウト修正

### 15.1 背景（実機スクショからの課題）
- 「明日俺の予定を教えて」→ 追加系に誤分類
- 「今週の予定を確認したい」→ 追加系に誤分類
- 「子どもの体調をメモしたい」→ unknown で「どこに入れる？」（無情報）
- Hoku 入力バーが下部 tabbar と被って見えない / 提案 chip が画面外へ溢れる

### 15.2 追加 intent（6 種）
| intentType | 表示内容 |
|---|---|
| `calendar_view`  | 期間内の予定（最大 5）+ 「カレンダーを見る」 |
| `task_view`      | 未完了タスク（最大 5）+ 「タスクを見る」 |
| `budget_view`    | 期間の収入 / 支出 / 差額 |
| `health_view`    | 直近 3 件 + 医療免責 1 行 |
| `prep_view`      | 今日 / 明日の準備リスト（最大 5） |
| `shopping_view`  | 買い物リスト（最大 5） |

すべて `HOKU_INTENT_META` に `isView:true`, `uiCat:null` で登録（保存系扱いしない）。

### 15.3 振り分けルール
1. `isViewVerb` ∈ {教えて, 見たい, 見せて, 見直したい, 確認したい, チェック, 何がある, 開いて, を見る, を確認}
2. `isAddVerb` ∈ {追加, 入れて, 登録, 反映, 計上, 記録して, メモして, 残す, タスクに(追加|して), カレンダーに入れて}
3. `isViewVerb && !isAddVerb` → view 経路 → `_hokuDetectViewIntent`
4. それ以外で unknown 落ちし、かつ `isAddVerb` + ドメイン語あり → 低信頼 (0.45) で `*_add` に振り直す（ask-back に繋ぐ）

### 15.4 期間 / 日付の解釈
今日 / 明日 / 明後日 / 今週 / 来週 / 今月 / 先月 を識別（`e.date`）、無指定なら直近 7 日。

### 15.5 結果フォーマット
- 件数を最初に提示（例：「今週の予定 4 件あるよ。」）
- 上位 5 件、超過分は「…ほか N 件」
- `[[ACTION_BUTTONS:cat]]` で画面遷移ボタンを 1 つだけ
- 空のときは短文 1 行 + ボタンのみ

### 15.6 レイアウト修正
- `.hoku-bar` padding-bottom: 90px → 100px、max-width:100%, box-sizing:border-box
- `.hoku-sugg-wrap` に max-width:100%, box-sizing:border-box（横スクロールは chip 帯のみ）

### 15.7 提案チップ刷新（HOKU_SUGGESTIONS）
view 系 7 件 + add 系 3 件 + ヘルプ 1 件 = 計 11 件。
"〜したい" を曖昧な誘導文として使わず、view と add を語尾で分離。

### 15.8 テスト
新 `/tmp/hoku-view.js` 32 / 32 PASS。既存 16+ VM スイートすべて従前通り PASS（退行ゼロ）。
