# 準備リスト / 時間割設計（Wave 55）

このドキュメントは、Familink の「準備リスト」を **今日 / 明日の単発準備** に加えて
**曜日別の繰り返し持ち物（時間割）** まで管理できるようにした設計の正本である。

---

## 1. 準備リストの役割

Familink における「準備リスト」は **朝の忘れ物を減らす中核機能** である。
忙しい家庭では、毎日の単発準備と「毎週月曜は国語と算数」のような曜日固定の持ち物が混在する。
本機能はこの 2 系統を **同じ画面・同じデータ流れで** 扱い、片手 3 秒で確認できることを目指す。

---

## 2. 今日 / 明日準備と曜日別持ち物の関係

| 観点 | 今日 / 明日準備 | 曜日別持ち物（ルーティン） |
|---|---|---|
| データキー | `S.prep[]` | `S.prepRoutines[]` |
| 単位 | 1 件 = 特定日付の持ち物 | 1 件 = 毎週繰り返す持ち物 |
| 入力フロー | + ボタン / Hoku 通常準備 | + ボタン（曜日タブ）/ Hoku 「毎週○曜は…」 |
| 表示 | 今日 / 明日 / すべてタブ | ルーティン・時間割タブ（曜日カード） |
| 反映 | そのまま表示 | バナー → ワンタップで `S.prep[]` へコピー |
| ライフサイクル | 完了 → done | 削除しても反映済みは残る |

ルーティンは **テンプレート**、当日 / 翌日に表示するのは **インスタンス**（`S.prep` の行）という関係。

---

## 3. S.prep[] と S.prepRoutines[] の役割分担

### S.prep[] — 既存
今日 / 明日に並ぶ実体。完了チェックや日付繰越の対象。
```
{
  id, text, cat, done, date,
  member, memberId,
  // Wave 55 で追加（任意）
  subject, quantity,
  // ルーティン由来の場合
  source: 'routine', routineId, dayOfWeek,
  createdAt, updatedAt
}
```
既存データに `subject / quantity` が無くても問題なく動作（互換読取）。

### S.prepRoutines[] — Wave 47 で導入、Wave 55 で拡張
毎週繰り返すテンプレート。
```
{
  id: 'pr_xxx',
  memberId, dayOfWeek: 'mon'|...|'sun',
  title, category,
  // Wave 55 で追加（任意）
  subject: '国語'|...|'',
  quantity: '1冊'|...|'',
  memo,
  showTiming: 'today' | 'previous_day' | 'previous_day_and_today',
  enabled: true, repeat: true,
  order, createdAt, updatedAt
}
```

### 削除禁止ルール
- `S.prep[]` の既存項目は touched しない（マイグレーション無し）
- `S.prepRoutines[]` を削除しても、その時点で `S.prep[]` に反映済みのインスタンスは保持される

---

## 4. 曜日別持ち物のデータ構造

`PREP_DAYS = ['mon','tue','wed','thu','fri','sat','sun']`
`PREP_DAY_LABELS_JA = {mon:'月', ...}`

### showTiming
| 値 | 動き |
|---|---|
| `today` | その曜日**当日**にだけ候補表示 |
| `previous_day` | 対象曜日の**前日**だけ候補表示 |
| `previous_day_and_today` | 前日と当日の両方で候補表示（デフォルト） |

### category（Wave 55 で再編）
教科書 / ノート / 教材 / 学校用品 / 提出物 / 体育 / 給食 / 習い事 / 園用品 / 学校 / 幼稚園 / 保育園 / 部活 / 病院 / お出かけ / その他

### subject（Wave 55 で追加）
国語 / 算数 / 生活 / 音楽 / 図工 / 体育 / 道徳 / 英語 / 理科 / 社会 / 書写 / その他 / 空文字（教科外）

---

## 5. 時間割表示の設計

ルーティン・時間割タブでは **メンバー × 曜日 × 教科** を一画面で見せる。

```
[全員] [星斗 ✓] [星旺] [星汰] ...
[今日の準備に反映] [明日の準備に反映]

月曜日 [今日]    + (この曜日に追加)
  📘 国語
    国語の教科書 [1冊] [教科書] [前日と当日] ☑
    国語ノート   [1冊] [ノート] [前日と当日] ☑
  📘 算数
    算数の教科書 ...
  教科外の持ち物
    体操服 / 給食袋 / 水筒
```

- 各日カードのヘッダーは今日なら primary 色 + 「今日」バッジ、明日なら indigo + 「明日」バッジ
- 教科ごとにサブヘッダー、教科未設定は末尾に「教科外の持ち物」グループ
- 行は 1 行 = 1 ルーティン、タップで編集モーダル、☑ で有効/無効、+ でその曜日に新規追加

---

## 6. 今日 / 明日への反映ロジック

`computePrepRoutineSuggestions(targetDateStr)`:

1. `targetDate` の曜日キーを算出（`prepDowKey`）
2. `S.prepRoutines` を走査し、enabled なルーティンのうち
   - `dayOfWeek === targetDow && (showTiming === today | previous_day_and_today)` → 当日候補
   - `dayOfWeek === nextDow && (showTiming === previous_day | previous_day_and_today)` → 前日候補
3. 重複判定（§7）に基づき `applied` フラグを返す

`applyPrepRoutinesForDate(targetDateStr)`:

- 候補のうち未適用のもの、かつ可視メンバーフィルタを通過したものだけ
  `S.prep` に追加（`source: 'routine', routineId: r.id, dayOfWeek: r.dayOfWeek` を埋める）
- 結果を toast で件数フィードバック
- ボタン：「今日の準備に反映」「明日の準備に反映」

---

## 7. 重複防止ロジック

`S.prep[]` 側で以下を満たすと重複として扱い、再反映しない：

1. 同じ `routineId` + 同じ `date` の `S.prep` 行が既存
2. 手動追加（routineId 無し）でも `text === r.title && date === targetDate && memberId === r.memberId` なら重複とみなす
3. ただし **異なる routineId 同士の同名ルーティン** は別物として両方反映できる（双子の似たようなルーティンを許容）

---

## 8. Hoku 連携仕様

### intent: `prep_routine_add`
- `毎週` `毎月` `曜日.*ルーティン` `時間割` のいずれかと **曜日語**（月〜日）
  + 持ち物関連語（持/準備/体操服/連絡帳/水筒/プールバッグ/給食袋/上履き/お着替え）の両方が
  含まれるとき分類される

### 教科抽出
`PREP_SUBJECTS` の単語が文中に含まれていれば `subject` に格納する。

### 複数持ち物分割
「火曜は算数ノートと計算ドリル」のような連続記述を `prepItems` 配列に分解：

- 「○曜は」または曜日語で本文を切り出し
- 「と / や / 、 / and / /」で分割
- 2 件以上のときだけ多重登録パスへ

### 多重登録パス
`executeHokuAction` が `prep_routine_add` 受信時に `entities.prepItems.length >= 2 && weekday != null` を満たす場合、
`window.confirm` で「★人の○曜ルーティンとして N 件を登録しますか？」を出し、承諾されたら
`addPrepRoutine` を N 回呼び出して `S.prepRoutines` に書き込む。

### 単一登録パス
これまで通り `_voiceParsed` を組み立てて `m-voice-confirm` モーダルへ流す。
Wave 55 で `subject` を `_voiceParsed` に橋渡しし、確認モーダルで保存時に
`addPrepRoutine` を経由して正規スキーマで保存するよう統一した。

### Hoku 入力例 → 解釈
| 入力 | intentType | weekday | subject | prepItems |
|---|---|---|---|---|
| 毎週月曜、星斗の国語の教科書を準備に入れて | prep_routine_add | 1 | 国語 | [] |
| 火曜は算数ノートと計算ドリル | prep_routine_add | 2 | 算数 | ['算数ノート','計算ドリル'] |
| 水曜の時間割に図工セットを追加 | prep_routine_add | 3 | 図工 | [] |
| 明日の準備に国語と算数を追加 | prep_add | - | 国語 | ['国語','算数']（次 Wave で複数分岐） |

### 安全装置
- 勝手に保存しない（必ず確認モーダル or `confirm()`）
- 曜日が不明な場合は通常の prep_add に降格（or 多重分岐をスキップ）
- メンバーが不明な場合は「対象メンバー」表示で確認、ユーザーが選択

---

## 9. 将来の通知 / 家族同期 / プレミアム化方針

### Wave 55 で実装した無料機能
- 7 曜日 × メンバー × 教科の時間割
- 持ち物の追加 / 編集 / 削除（確認あり）/ 有効・無効切替
- 当日 / 前日 / 前日+当日の表示タイミング
- 今日 / 明日への反映バナー + ワンタップ適用
- サンプル時間割の確認後一括作成（月・火・水の代表 12 件）
- Hoku 連携（教科抽出 + 複数持ち物の一括登録）

### プレミアム候補
- 時間割テンプレートの **複数保存**（学期切替 / 学年切替）
- 学校別 / 学年別の **公式テンプレート**
- 持ち物に **写真付与**（実物確認用）
- Hoku による **朝の準備サマリー**（音声ナレーション）
- **準備リマインド通知**（前夜 / 当朝のプッシュ）
- **家族同期**（パパ / ママのデバイス間で即時反映）
- 忘れ物 **チェック履歴**（メンバー別の達成率）
- **PDF / 共有出力**（祖父母にも紙で共有）

### 通知 / 家族同期は今 Wave 範囲外
- 通知：iOS Safari の制約と App Store 申請の都合で v1.0 以降
- 家族同期：Supabase / Firestore 等のバックエンドが必要 → CTO 設計上 v0.3 以降

---

## 10. テスト観点（spec 1〜66 と対応）

- 既存維持：1〜8（今日/明日表示、+ 追加、完了チェック、繰越、リロード保持）
- 曜日別：9〜30（7 曜日登録、カテゴリ、教科、数量、メモ、表示タイミング、有効/無効、編集、削除確認、リロード保持）
- 時間割：31〜39（メンバー切替、曜日切替、教科グループ、SE/13/15+/Pro Max 幅）
- 反映：40〜50（今日/明日候補、ワンタップ反映、showTiming 動作、重複防止、リロード保持）
- Hoku：51〜58（毎週○曜分類、複数分割、教科抽出、メンバー抽出、保存前確認）
- 回帰：59〜66（自動テスト、md5 同期、worklog、押せないボタン無し、横スクロール無し）

---

## 11. 実装ファイル参照（読みたい人向け）

| 参照対象 | ファイル / 行 |
|---|---|
| データ初期化 | `app-source/familink.html` `S.prepRoutines: []` 付近 |
| 定数 | `PREP_DAYS / PREP_DAY_LABELS_JA / PREP_TIMING_LABELS / PREP_CATEGORIES / PREP_SUBJECTS` |
| CRUD | `addPrepRoutine / updatePrepRoutine / deletePrepRoutine` |
| 候補計算 | `computePrepRoutineSuggestions` |
| 反映 | `applyPrepRoutinesForDate / applyTodayRoutines / applyTomorrowRoutines` |
| 描画 | `renderPrep / renderPrepRoutinesSectionHtml` |
| モーダル | `m-prep-routine` 要素、`openPrepRoutineModal / savePrepRoutineFromModal / deletePrepRoutineFromModal` |
| サンプル | `seedPrepSampleRoutines` |
| Hoku | `parseHokuIntent` 内の `prep_routine_add` 分岐、`_hokuExtractSubject / _hokuGuessPrepCategory`、`executeHokuAction` の prep_routine_add 多重登録分岐 |
