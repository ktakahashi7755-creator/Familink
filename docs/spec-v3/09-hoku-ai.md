# Familink Hoku AI 仕様書

**文書番号**: SPEC-v3-09 ／ **版**: 1.0 ／ **作成日**: 2026-07-07 ／ **正本**
**対象読者**: AI/フロントエンドエンジニア・Hoku 文言担当・QA・プロダクトオーナー

> 本書は Hoku（Familink の AI ガイド）の人格・アーキテクチャ・インテントエンジン・LLM 連携・
> 安全ガードレールの正本である。数値・関数名・行番号は `app-source/familink.html`（全 28,836 行・2026-07 実測）
> および `supabase/functions/`（hoku / calendar-scan）の実装値を転記した。
> 人格の旧正本 `docs/hoku-guideline.md`・エンジン設計の初版 `docs/hoku-intent-engine.md`（Wave 52・外部 AI 不使用時代）は
> 歴史的前提として参照し、現行実装と食い違う箇所は本書（＝実装値）を正とする。
> 要件は `02-requirements.md`（FR-210）、視覚仕様は `08-design-system.md` §10、課金境界は `10-monetization.md` を参照。

---

## 1. Hoku の存在意義と人格

### 1.1 存在意義

> **Hoku はマスコットではなく「家族を支えるガイド役」である。**

- 家族の予定・タスク・持ち物・体調・家計・共有を**一言で記録できる窓口**（自然文 → 適切な保存先へ）
- 実データ（今日の予定数・未完了タスク・買い物リスト）を参照して答える「家族の共有脳」への入口
- アプリ内操作のナビゲーター（設定・外部カレンダー・ルーティンの案内）
- 長期的には家族 AI アシスタントへ進化する事業資産（`01-product-vision.md` §3.2 差別化の柱）

### 1.2 口調規定（正本）

| 規定 | 内容 |
|---|---|
| 基調 | **柔らかい常体「〜だよ／〜ね」**。家族の距離感（過剰敬語にしない） |
| 命令形 | **禁止**（「〜してください」ではなく「〜してね」「〜できるよ」） |
| 長さ | 1 発話 **1〜2 文**。3 文以上の独白禁止 |
| 姿勢 | 優しい・温かい・控えめ。押し付けない・煽らない・責めない |
| 対象 | 祖父母も使う前提。子どもっぽいセリフ（「やったね！」連発等）禁止 |
| 比較禁止 | 家族メンバーを比較する発言（「〇〇さんはやっていない」等）禁止 |
| 例外 | オンボーディング紹介文のみです・ます調で信頼感を出す（L4007「Hoku は家族運営をやさしく支える AI ガイドです。…」） |

> **旧ガイドとの差異**: `docs/hoku-guideline.md` §3 の文言例は「〜ですね／〜しますね」寄りだったが、
> 実装は柔らかい常体「〜だよ／〜ね」に統一されている。本書の口調規定（＝実装）を正とする。

### 1.3 実装コピー実例（実装から引用・文言変更時の基準）

| # | 実装コピー | 行 | 場面 |
|---|---|---|---|
| 1 | 「体調メモに残すね。不安なら医療機関に相談してね。」 | L25981 | 体調登録（免責同梱） |
| 2 | 「買い物リストは空だよ。」 | L26224 | 参照系・空 |
| 3 | 「資金繰りを開くね。※ 見込み値だよ。」 | L26292 | 家計案内（免責同梱） |
| 4 | 「タスクに追加できるよ。」 | L26942 | 機能案内 |
| 5 | 「家族ボードに共有できるよ。」 | L26958 | 機能案内 |
| 6 | 「Hoku は家族の予定・タスク・準備・家計・体調をまとめる相棒。話しかけるだけで登録も削除もできるよ。例：「明日15時に歯医者」…マイクで音声入力もOK。」 | L26962 | ヘルプ |
| 7 | 「お疲れさま。今日もよくがんばったね。無理しないで、少し休めますように。手伝えることがあれば言ってね。」 | L27141 | 気持ちの受けとめ |
| 8 | 「そういう日もあるよね。あなたのせいじゃないよ。ひと呼吸おいて、できそうなことだけで大丈夫。」 | L27144 | 気持ちの受けとめ |
| 9 | 「睡眠が削られると本当にこたえるよね。今日はできる範囲で。気になることはメモに残して、頭の中を軽くしておこう。」 | L27147 | 気持ちの受けとめ |
| 10 | 「ひとりで抱えなくて大丈夫。気になることを書き出すと、少し整理されるよ。」 | L27150 | 気持ちの受けとめ |
| 11 | 「うん、元気だよ。あなたは大丈夫？ 家族のこと、いつでも手伝うよ。」 | L27155 | 雑談 |
| 12 | 「どういたしまして。いつでも頼ってね。」 | L27162 | 雑談 |
| 13 | 「曜日ごとの準備は「準備リスト → ルーティン・時間割」タブで管理できるよ。」 | L27075 | 操作ナビ |
| 14 | 「アルバム機能で家族の写真をまとめて保存できるよ。」 | L27427 | 操作ナビ |
| 15 | 「…確認画面を出したよ。よければ「登録する」を押してね。」 | L26331 | 操作代行の確認誘導 |

---

## 2. アーキテクチャ（二層設計）

### 2.1 設計原則

> **Hoku は外部 AI に依存せずローカル（Vanilla JS・端末内）で完全動作し、
> LLM（Edge Function）はプレミアム＋ログイン時にのみ被せる上位レイヤーである。**

- 無料・オフライン・未ログインでもインテントエンジン・参照応答・定型 FAQ がすべて動く（FR-215）
- LLM 障害・上限超過・非対象ユーザーでは自動的にローカル層へフォールバックし、**無応答は発生しない**
- 初版設計 `docs/hoku-intent-engine.md`（Wave 52）は「外部 AI 不使用」を前提としたが、現行はその上に LLM 層を追加した二層構成である（同文書 §11 のロードマップ v1.1 が実現した形）

### 2.2 フォールバックチェーン（`sendHokuMsg` L23847–23946 が核心）

```
ユーザー入力（テキスト / 音声）
      │
      ▼
[LLM 層] _hokuAiAllowed?（L23749: isPremiumUser かつ Supabaseログイン or 独自URL）
  かつ _hokuChatActive?（L23751: opt-out S.hokuAiOff 以外は ON）
  かつ 日次 40 回以内?（HOKU_AI_DAILY_CAP L23757）
      │ YES                                     │ NO / 失敗 / 上限超過
      ▼                                         ▼
callHokuChat（L23673）                    reply === undefined のまま
  → _hokuCallBackend（L23602）                  │
  → sb.functions.invoke('hoku')                 │
  → 応答 or intent 候補                          │
      │ 失敗時 ─────────────────────────────────┤
      ▼                                         ▼
[ローカル層] parseHokuIntent（L25605）… インテントエンジン（§3）
      │ intent 確定せず
      ▼
hokuLocalAnswer（L27059）… 定型 FAQ・挨拶・気持ちの受けとめ
      │ それでも該当なし
      ▼
聞き返し（unknown・低信頼救済 L25787–25796）
```

---

## 3. インテントエンジン詳細

### 3.1 統一パイプライン

```
入力 → voiceCorrectText（正規化, L25121）
     → parseHokuIntent（統一エントリ, L25605）
     → executeHokuAction（L26255）
     → m-voice-confirm（保存前確認モーダル）
     → voiceConfirmSave（L26644）→ S.* へ push → saveS() → 再描画
```

音声・テキスト・LLM 提案のいずれの経路でも、**保存系はこのパイプラインの確認段を必ず通る**（§4）。

### 3.2 正規化レイヤー `voiceCorrectText`（L25121–25135）

| 処理 | 内容 |
|---|---|
| 文字正規化 | 全角英数→半角、漢数字→アラビア数字（`_hokuKanjiNumNormalize` L25141）、「N時半」→「N時30分」、先頭フィラー除去 |
| 用語辞書 | `VOICE_TERM_NORMALIZE`（L25055–25118）: 学校用語（体操服・連絡帳・上履き等）・体調・家計・食材・店名の表記ゆれを吸収 |
| メンバー辞書 | `VOICE_MEMBER_ALIASES`（L25046–25052）: 呼び名 → 内部 id（kenya / seiai / seito / seio / seitaro） |

### 3.3 エンティティ抽出関数表

| エンティティ | 関数 | 行 | 備考 |
|---|---|---|---|
| メンバー | `voiceResolveMember` | L25174 | 辞書経由で内部 id へ |
| 日付 | `voiceResolveDate` | L25196 | 今日/明日/曜日/N月M日 等 |
| 時刻 | `voiceResolveTime` | L25224 | HH:MM/N時/朝・昼・夕方・夜 |
| 金額 | `voiceResolveAmount` | L25245 | NNNN円/1万円/N千円 |
| 体温 | `voiceResolveTemp` | L25256 | **34.0〜42.0℃ に制限**（§10.2） |
| 薬 | `_hokuExtractMedicine` | L25567 | `HOKU_MEDICINE_TOKENS` |
| 症状 | `_hokuExtractSymptoms` | L25576 | `HOKU_SYMPTOM_TOKENS` |
| 家計カテゴリ | `_hokuExtractBudgetCategory` | L25583 | スーパー→食費 等 |
| 収支種別 | `_hokuExtractTxType` | L25598 | 入金/給料→income |
| タイトル整形 | `_hokuCleanTitle` | L25302 | 抽出済み要素の除去 |
| トリガー句除去 | `stripTriggerPhrases` | L25274 | 「〜を追加して」等の除去 |

### 3.4 全インテント一覧と発火条件（`parseHokuIntent` L25605・判定は先勝ち）

| # | intentType | トリガー（発火条件） | 行 |
|---|---|---|---|
| 1 | `calendar_import_help` | 取込動詞（取り込/読込/反映/インポート/連携/同期）＋カレンダー語 | L25615 |
| 2 | `external_calendar_help` | Google/iPhone/Yahoo/LINE カレンダー、`.ics`、書出/連携/同期 | L25622 |
| 3 | `settings_help` | 設定/プロフィール/家族構成/メンバー/アバター ＋ 教えて/変更/どこ/やり方 | L25625 |
| 4 | `cashflow_view` | 資金繰り/お金の見通し/月末残高/今月の収支 | L25630 |
| 5 | `*_view`（参照系） | view 動詞（教えて/見せて/確認/何件/一覧/`?`）かつ add 動詞なし → `_hokuDetectViewIntent`（L26108） | L25639 |
| 6 | `recurring_budget_add` | 毎月◯日/毎月末/毎週X曜/毎年 → `_hokuDetectRecurringBudget` | L25646 |
| 7 | `shopping_add` / `shopping_frequent_add` / `shopping_purchased` | `_hokuDetectShopping`（L25529）: 買い物リストに追加/よく買う/購入済み/買っといて/切らした/なくなった | L25652 |
| 8 | `notification_add` | 通知/リマインド/思い出させて/アラーム/朝に教えて（`isExplicitNotification` L25666） | L25682 |
| 9 | `prep_routine_add` | （毎週/毎月/時間割/「X曜は/の」）＋曜日抽出可＋持ち物語 | L25680 |
| 10 | `calendar_add` / `task_add` / `prep_add` / `budget_add` / `health_add` / `board_post_add` | `parseVoiceIntent`（L25347）＋ `classifyHokuInput` のカテゴリマップ | L25684–25690 |
| 11 | `unknown` | いずれも非該当。add 動詞ヒント＋ドメイン語で低信頼救済（L25787–25796） | — |

`_view` の下位種別（`_hokuDetectViewIntent` L26108・優先順）:
`health_view → budget_view → prep_view → shopping_view → board_view → task_view → calendar_view`

### 3.5 メタテーブルと保存先（`HOKU_INTENT_META` L25425–25449）

各 intent の `uiCat`（確認モーダル対象か）・保存先ストア・ラベルを一元定義する。

| 保存系 intent | 保存先 |
|---|---|
| calendar_add | `S.events` |
| task_add | `S.tasks` |
| budget_add / recurring_budget_add | `S.txs` / `S.recurringTxs` |
| prep_add / prep_routine_add | `S.prep` / `S.prepRoutines` |
| health_add | `S.health` |
| board_post_add | `S.announces` |
| notification_add | `S.notifs` |
| shopping_add 系 | `S.shoppingItems` |

`uiCat` を持つ intent のみ `needsConfirmation=true`（`_hokuMakeIntent` L25807）＝保存前確認必須。

### 3.6 分類器 `classifyHokuInput`（L26790・9 カテゴリスコア方式）

- 外部 AI 不使用のキーワードスコア加算方式。**スコア ≥3 で確定**。
- 9 カテゴリ: `{ calendar, task, prep, budget, health, board, notification, help, premium }`
- `premium` / `help` は先に強シグナルを評価（L26797–26799。例:「480円」「プレミアム」→ premium=6）

### 3.7 信頼度算出（L25694–25706）

| スコア | confidence | 挙動 |
|---|---|---|
| ≥6 | 0.92 | 確定 |
| ≥4 | 0.78 | 確定 |
| ≥3 | 0.62 | 確定（確認モーダルで担保） |
| ≥2 | 0.45 | 低信頼 |
| 1 語ドメイン語のみ（「家計」「体調」等） | 0.35 に抑制 | 聞き返しへ |

### 3.8 V2 レイヤー（`parseHokuIntentV2` L25912）

- `base = parseHokuIntent` を包み、`_hokuRankCandidates`（L25842）で**候補 3 件**をランキング。
- `nextAction ∈ { confirm, ask_clarification, clarify_unknown, answer }` を決定し、`_hokuComposeReply`（L25870）が自然文の返答を生成する。
- 不足情報が致命的な短文入力は、モーダルを開かず質問で返す（初版設計 §7 の `_hokuAskBackMessage` 方針を継承）。

### 3.9 旧経路（チャット互換レイヤー）

- `detectIntent`（L24156）＋ `handleAction`（L24209）。参照/追加ガード（`_addVerb` / `_viewQ` L24160–24162）を通した後、create 系は `parseHokuIntent` / `executeHokuAction` へ委譲（L24214）。
- 補助パーサ: `parseExpense`（L24097）/ `parseTask`（L24108）/ `parseEvent`（L24136）/ `guessCategory`（L23995・`CATEGORY_MAP` L23982）。

---

## 4. 操作代行と確認フロー（誤登録ゼロ方針）

### 4.1 保存前確認 `m-voice-confirm`（必須・省略禁止）

> **保存系 intent は必ず確認モーダルを経由する。Hoku が確認なしにデータを書き込む経路を作ってはならない。**（FR-213）

フロー: `executeHokuAction`（L26255）→ `_voiceParsed` セット（L26339）→ `hokuVoiceSetPhase('confirming')` → `voiceConfirmRender`（L26569）→ `openModal('m-voice-confirm')`（L26363）。

- ユーザーは内容を**目視・修正**でき、カテゴリ select（`vc-cat` L26582）で**登録先自体を変更**できる（曖昧入力の救済）。
- 確定: `voiceConfirmSave`（L26644）が `S.events / tasks / prep / txs / health / announces` へ push。
- 離脱: `voiceConfirmCancel`（L26768）／「手入力に切り替える」`voiceConfirmManual`（L26775・補正後テキストを入力欄に残す）。

### 4.2 特殊フロー

| ケース | 挙動 |
|---|---|
| 複数持ち物のルーティン一括登録 | `showConfirm` で確認後 `addPrepRoutine`（L26311–26330） |
| 買い物（`_hokuExecuteShopping` L26375） | 単品は `openShopAdd` prefill・複数は一括・曖昧「○○買う」は `[[ACTION_BUTTONS:shopchoice]]` で買い物/タスクを選択（`_hokuShoppingAddPending` L26482 / `_hokuShoppingTaskPending` L26496） |
| チャット確認（旧経路） | `_pendingAction`（L23589）＋ `handleConfirmation`（L24307）。「はい/うん/OK」判定（L24311）→ `executeAction`（L24378） |

### 4.3 削除代行（二重確認）

- 検出: `_hokuDetectDelete`（L24508）→ 実行: `_hokuHandleDelete`（L24600）。
- 番号・キーワード・「全部」で対象を絞り込み（`hoku_delete_pick` L24346）、**実削除前に「元には戻せないよ」の確認**を必ず挟む。
- 削除は登録より重い操作として、絞り込み確認＋最終確認の実質二重確認とする。

### 4.4 文脈修正 `applyHokuContext`（L26045）

- 直近 **10 分・5 ターン以内**の短文修正（「やっぱ星旺で」「明日にして」「支出で」）を直前 intent への修正として解釈し、`_hokuRebuildIntent`（L26095）で intent を再構築 → 再度確認モーダルへ。
- 文脈は `updateHokuContext`（L26021）が `S.hokuContext` に保持する。

---

## 5. LLM 連携（Edge Function `hoku`）

### 5.1 呼び出し経路と条件

| 項目 | 値 |
|---|---|
| ゲート | `_hokuAiAllowed`（L23749）= `isPremiumUser` かつ（Supabase ログイン or 独自 URL 設定）。ユーザー opt-out は `S.hokuAiOff`（`_hokuChatActive` L23751） |
| 経路 | `sendHokuMsg`（L23820）→ `_hokuTryChat`（L23781）→ `callHokuChat`（L23673）→ `_hokuCallBackend`（L23602）→ `sb.functions.invoke('hoku')`（L23618） |
| Edge Function | `supabase/functions/hoku/index.ts`（TypeScript/Deno） |
| モデル | OpenAI **`gpt-4o-mini`**・temperature 0.4・max_tokens 500・`response_format: json_object` |
| 認証 | Supabase JWT 検証＋任意 `HOKU_SHARED_KEY`。OpenAI キーは Edge Function シークレット（クライアント非搭載） |

### 5.2 SYSTEM_PROMPT 要点（hoku/index.ts L44–90）

- Hoku の人格（§1.2 と同一の口調規定）・箇条書き整形ルール
- intent 候補の列挙（`calendar_add` … `shopping_view`）→ クライアントの `_hokuIntentFromAI`（L23686）が intent へ変換
- 安全指針: 医療/お金/育児は「記録と整理の手伝い」のみ・診断/断定/専門助言禁止・心配な体調は受診/#7119 案内・不適切要求の拒否（§10.1）

### 5.3 コンテキスト送信とプライバシー

`_hokuChatContext`（L23632）が送信するもの: today / members / upcomingEvents / pendingTasks / shoppingList / todayHealth / prepItems / recentMemos / recentBoardPosts。会話履歴は直近 12 ターン。

> **家計の金額は LLM に送信しない**（FR-216・プライバシー配慮）。家計の参照質問はローカル層（§6）が実データで答える。

### 5.4 フェアユース上限

- `HOKU_AI_DAILY_CAP = 40`（L23757・プレミアムでも 1 日 40 回）
- 超過時は `_hokuAiCapNoticeOnce`（L23766）が優しい案内を **1 回だけ**返し、以降その日はローカル層へ自動切替
- 使用量は `_hokuBumpAiUsage`（L23764）が `S.hokuAiUsage` に集計

### 5.5 安全ガード `_hokuLooksLikeView`（L23775）

参照系の発話を LLM が誤って `*_add`（登録）と判定しても、クライアント側で `*_view` に矯正する（L23788）。
LLM の誤判断がそのまま登録フローへ進むことを防ぐ二重ガードであり、削除・変更してはならない。

### 5.6 フォールバック

LLM 失敗・無料ユーザー・上限超過では `reply === undefined` のままローカル判定（L23856–）へ完全移行する。ユーザーには切替を意識させない（上限案内のみ 1 回）。

---

## 6. 参照系応答（実データで答える）

- `_view` 系 intent は `_hokuExecuteView`（L26150）が処理。参照先: `S.events, S.tasks, S.txs, S.health, S.prep, S.prepRoutines, S.shoppingItems, S.announces, S.memos, MEMBERS, S.userProfile`。
- **期間フィルタ**: today / tomorrow / thisweek / nextweek / thismonth / lastmonth（`inPeriod` L26158）で絞り込み、件数＋箇条書き＋`[[ACTION_BUTTONS:*]]`（画面遷移ボタン）を返す。
- ローカル定型応答の実データ集計は `buildHokuContext`（L27462）が担う（LLM 用 `_hokuChatContext` とは別関数・送信しない情報も扱える）。
- 純ローカル FAQ: `hokuLocalAnswer`（L27059）— 曜日ルーティン/準備メンバー別/ボード削除/体調ログ/スワイプ操作/挨拶/気持ちの受けとめ。
- 短文定型: `HOKU_SHORT_REPLY`（L25977）・確認タイトル `HOKU_CONFIRM_TITLE`（L25995）。
- プロアクティブ表示: 常時サジェスト `renderHokuSuggs`（L24686・2 行マーキー: 上段=見る系 8 種を `sendHokuMsg` 直送、下段=追加系 8 種を入力欄へ差し込み）／空状態のデータ駆動チップ `renderHokuMsgs`（L24717・当日予定数/未完了タスク数/発熱/買い物件数/家族未参加）。
- 注記: Hoku 側から自発的に吹き出しを push する常駐通知は**未実装**（`docs/hoku-guideline.md` §4 は将来方針）。通知は通知センター（別系統・`02-requirements.md` FR-230）。

---

## 7. 音声入力

- Web Speech API による音声入力（FR-219）。マイクボタン `.hoku-mic`（44px 円・listening 時パルス。視覚仕様は `08-design-system.md` §10.3）。
- 認識結果はテキスト入力と**同一のパイプライン**（§3.1）を通る。音声専用の保存経路は存在しない＝確認モーダルも必ず通る。
- 表記ゆれは `VOICE_TERM_NORMALIZE` / `VOICE_MEMBER_ALIASES`（§3.2）で吸収する。子育て用語（体操服・上履き・連絡帳等）・体調・家計・店名を重点収録。
- 端末が非対応でもテキスト入力で全機能が使える（NFR-504・段階的機能）。

---

## 8. OCR 予定表取込（calendar-scan）

### 8.1 フロー

| 段階 | 関数 / 行 |
|---|---|
| 導入 UI | `openOcrIntro`（L13421）→ モード選択 `ocrSetMode`（L13433: monthly / weekly / annual） |
| 画像選択 | `ocrPick`（L13442）→ `ocrOnFilePicked`（L13453） |
| 解析開始 | `ocrStartAnalyze`（L13495）→ `analyzeCalendarImageWithAI`（L13546） |
| サーバ解析 | ログイン時 `_ocrCallScan`（L13565）が `sb.functions.invoke('calendar-scan')`。**分割クロップ＋同時実行 3＋各 1 回リトライ**（`_ocrMakeCrops` / `_ocrRunPool` / `_ocrMergeResults` L13585–） |
| 未ログイン時 | `mockAnalyzeCalendarImage`（外部送信なし・ローカルデモ） |
| 正規化 | `normalizeOcrEvents`（L13710） |
| **確認レビュー（必須）** | `m-ocr-review` で全件を確認・修正してからカレンダーへ取込（FR-147・誤登録ゼロ方針） |

### 8.2 Edge Function `calendar-scan`

- OpenAI Vision（既定 `gpt-4o`・404 時 `gpt-4o-mini` フォールバック）・temperature 0・max_tokens 4096。
- プロンプトで「誤検出ゼロ・日付を 1 日もずらさない・曜日自己補正」を厳命。月間/週間/年間モード対応。
- サーバ側整形: `sanitizeEvents`（index.ts L149）。

### 8.3 回数制限（プレミアムゲート）

- `_ocrMonthlyLimit`（L13400）= `PREMIUM_FEATURES.ocr`: **無料 月 1 回／プレミアム 月 30 回**。
- `_ocrCanScan`（L13404）で事前判定・`_ocrIncUsage`（L13405）は**成功時のみ消費**。使用量は `S.ocrScanUsage`。
- 超過時 `_ocrShowScanLimit`（L13406）→ 無料ユーザーは `showUpgradeModal`（訴求原則は `10-monetization.md` §8）。

---

## 9. 利用制限とプレミアムの関係

| 制限 | 無料 | プレミアム | 実装 |
|---|---|---|---|
| Hoku 相談回数（1 日） | **5 回**（`PREMIUM_FEATURES.hokuDaily.free=5`）＋ショップ購入ボーナス | 無制限 | `hokuSend`（L24787）が `_hokuDailyLimit`（L21681）をチェック。使用量 `S.hokuDailyUsage` |
| LLM 応答（Edge Function `hoku`） | 利用不可（ローカル層のみ） | 利用可（ただし日次 40 回のフェアユース） | `_hokuAiAllowed`（L23749） |
| OCR 予定表取込 | 月 1 回 | 月 30 回 | §8.3 |

- 無料上限超過時: `showConfirm` → `openShop`（ファミコインで「Hoku 追加チケット」+3 回 30 コイン / +10 回 90 コイン。L24797–24806）。
- 使用状況バー: `renderHoku`（L24670–24682）が「残り N/M 回」＋「無制限にする」ボタン（→ s-premium）を表示。
- **重要**: ローカルのインテントエンジン・参照応答・定型 FAQ は無料でも動作する。「Hoku の基本ナビは無料」（`docs/premium-strategy.md` §3）を壊さないこと。境界の正本は `10-monetization.md` §3。

---

## 10. 安全ガードレール

### 10.1 領域別の禁止と免責

| 領域 | 規定 | 実装 |
|---|---|---|
| 医療・体調 | 診断・薬の量・服用判断を**絶対にしない**。「記録と整理の手伝い」のみ。不安が読み取れる場合は医療機関・#7119 への相談を促す | Edge Function SYSTEM_PROMPT（hoku/index.ts L44–90）／ローカル: `HOKU_SHORT_REPLY.health_add`「不安なら医療機関に相談してね」（L25981）・health_view 末尾「※ 振り返り用、診断ではないよ」（L26206）・体調ログ FAQ「※ 診断や医療判断を行うものではありません」（L27111） |
| 家計・金銭 | 税務・法律判断をしない。入金/支出のラベル付けまで。見込み値は見込みと明示（L26292） | SYSTEM_PROMPT ＋ ローカル定型 |
| 育児 | 断定的な育児指導をしない。整理・共有の支援に留める | SYSTEM_PROMPT |
| 不適切要求 | 卑猥・暴力等は拒否 | SYSTEM_PROMPT |

### 10.2 入力値ガード

| ガード | 値 | 実装 |
|---|---|---|
| 体温レンジ | **34.0〜42.0℃** の範囲外は不採用 | `voiceResolveTemp`（L25256）・FR-192 |
| 参照→登録の誤変換防止 | LLM の `*_add` 誤判定を `*_view` へ矯正 | `_hokuLooksLikeView`（L23775・§5.5） |
| 保存前確認 | 保存系は全件 `m-voice-confirm` | §4.1 |

### 10.3 できないことを「できる」と見せない

- OS プッシュ通知: 「OS プッシュは v1.0 以降」と明示して案内する（L25989, L26275）。できるかのような表現禁止。
- 外部カレンダー: 自動で読み取らない・書き込まない旨を案内（L26262）。書出は `.ics`／取込はファイル・画像経由のみ。

---

## 11. Hoku 拡張ロードマップ（家族 AI アシスタント化への段階）

| 段階 | 内容 | 状態 |
|---|---|---|
| 第 1 段階: 記録の窓口 | インテントエンジン・保存前確認・参照応答・音声入力 | ✅ 実装済み |
| 第 2 段階: 理解の深化 | LLM 上位レイヤー（gpt-4o-mini）・OCR 取込・文脈修正（10 分/5 ターン） | ✅ 実装済み（LLM はプレミアム限定） |
| 第 3 段階: プロアクティブ化 | Hoku 発の常駐吹き出し通知・リマインド提案・家族レポート（週次/月次サマリ） | ⬜ 未実装（`docs/hoku-guideline.md` §4 / `docs/premium-strategy.md` §4 の候補） |
| 第 4 段階: 家族 AI アシスタント | 長期文脈記憶（Supabase 側）・外部カレンダー双方向連携・iOS ネイティブ音声（Speech Framework）・ショートカット連携 | ⬜ 構想（`01-product-vision.md` Phase 4） |

- 初版ロードマップ（`docs/hoku-intent-engine.md` §12）の v1.1「外部 LLM 連携」までは実現済み。以降の段階は本書を正本として更新する。
- 第 3 段階以降は「押し付けない」原則との両立設計（頻度上限・オフ設定）を必須とする。

---

## 12. 本書の運用

- 本書は Hoku の人格・アーキテクチャ・安全設計の**正本**である。旧 `docs/hoku-guideline.md`（人格）・`docs/hoku-intent-engine.md`（エンジン初版）と食い違う箇所は本書（＝実装値）を正とする。
- **変更に人間確認が必須の項目**（CLAUDE.md §7 / §14.3）: Hoku の人格・口調の大幅変更、保存前確認フローの省略・緩和、LLM 送信コンテキストへの家計金額追加、安全ガードレール（§10）の削除・緩和、無料/プレミアム境界の変更。
- 文言追加・修正は §1.2 の口調規定と §1.3 の実例に照らして `familink-hoku-ai-designer` Skill でレビューする。インテント追加は §3.4 の一覧表・`HOKU_INTENT_META`・本書を同時更新する。
- Edge Function（`hoku` / `calendar-scan`）の変更は `06-api-edge-functions.md`（存在する場合）と本書 §5・§8 を同時更新する。
- 関連文書: `02-requirements.md`（FR-210〜220）／ `08-design-system.md` §10（ビジュアル）／ `10-monetization.md`（利用制限の課金境界）／ `docs/hoku-intent-engine.md`（初版設計・歴史的文書）。
