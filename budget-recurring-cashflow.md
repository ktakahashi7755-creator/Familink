# 家計管理：固定収支 + 資金繰り表（Wave 60）

このドキュメントは、Familink の家計管理機能を「単発取引の記録」だけでなく
「**固定収支テンプレート + 月次資金繰り表**」まで扱えるようにした設計の正本です。

---

## 1. 家計管理の役割

家計管理は Familink で「**お金の不安を減らす**」ための中核機能です。
単発の入力だけでは家計簿として閉じてしまうため、Wave 60 では:

- 毎月の固定収入（給料 / 児童手当 / ボーナス）
- 毎月の固定支出（家賃 / 保育料 / 月謝 / カード支払い / サブスク）
- 月初残高と月末残高見込み
- 予定 vs 実績の見える化

を扱えるようにしました。

---

## 2. S.txs[] と S.recurringTxs[] の役割分担

| 観点 | S.txs[]（既存） | S.recurringTxs[]（Wave 60） |
|---|---|---|
| 単位 | 1 件 = 特定日付の実取引 | 1 件 = 毎月（または毎週/毎年）繰り返すテンプレート |
| 入力 | + ボタン → m-budget | 固定収支タブ → m-recurring-tx |
| 表示 | 既存の家計タブ（変更なし） | 固定収支タブ + 資金繰り表 |
| ライフサイクル | 編集・削除 | 有効/無効切替・編集・削除（履歴は別） |
| 影響範囲 | 家計のチャート / メンバー集計 | 資金繰り表で予定として加算 |

**重要**: S.recurringTxs から S.txs への自動展開は **行わない**。
ユーザーが「今月分の予定を実績へ反映」ボタン or Hoku を押したときだけ展開する。

---

## 3. 繰り返し収支のデータ構造

```js
S.recurringTxs[i] = {
  id: 'rtx_xxx',
  type: 'income' | 'expense',
  amount: 80000,             // 円
  cat: '住居費' 等,           // CATS_EX または CATS_IN
  desc: '家賃',
  member: '太郎', memberId: 'seito',
  frequency: 'monthly' | 'weekly' | 'yearly' | 'daily',
  dayOfMonth: 25 | null,     // monthly / yearly のとき
  isMonthEnd: true | false,  // monthly のときに月末扱いするか
  dayOfWeek: 'mon' | ... | null, // weekly のとき
  monthOfYear: 4 | null,     // yearly のとき
  startDate: '2026-05-01' | '',
  endDate:   '2027-03-31' | '',
  enabled: true,
  memo: '',
  createdAt, updatedAt
};
```

### 毎月◯日 / 毎月末の扱い
- `frequency:'monthly'` + `dayOfMonth:25` → 毎月 25 日
- `frequency:'monthly'` + `isMonthEnd:true` → 月末（28〜31 日に自動調整）
- 月の最終日は `_daysInMonth(y, m0)` で計算（うるう年・小の月対応）

---

## 4. 月への展開（expandRecurringForMonth）

`expandRecurringForMonth(y, m0)` は対象月で発生する recurring を `[{date, recurring}]` で返す。
- `enabled === false` のものは除外
- `startDate` 以降 / `endDate` 以前のもののみ
- `monthly`：`dayOfMonth` または `isMonthEnd` で 1 日付
- `weekly`：その月のすべての該当曜日
- `yearly`：`monthOfYear === m0+1` のときのみ 1 日付
- `daily`：その月の毎日
- 戻り値は date 昇順

---

## 5. 実績反映ロジック（applyRecurringForMonth）

`applyRecurringForMonth(y, m0, opts)`：
1. `expandRecurringForMonth(y, m0)` で候補を列挙
2. 重複（同じ `recurringId` + 同じ `date`）はスキップ
3. `opts.onlyId` 指定で個別反映、`opts.skipDates` で個別スキップ
4. 残ったものを `S.txs` に push（`source:'recurring'`, `recurringId`, `member`, `memberId` を埋める）
5. 戻り値：追加件数

UI からは「資金繰り」タブの「今月分の予定を実績へ反映」ボタン経由で呼ぶ（confirm 必須）。

---

## 6. 重複防止ロジック

`_isRecurringApplied(recurringId, date)` が重複判定:
- `S.txs` を走査し、`source === 'recurring' && recurringId 一致 && date 一致` のものがあれば `true`
- 反映時 / 資金繰り計算時の予定/実績二重計上防止に使用

---

## 7. 資金繰り表の計算ロジック（computeMonthlyCashflow）

```js
result = {
  monthKey: 'YYYY-MM',
  openingBalance,                  // 月初残高（S.cashflowSettings から）
  actualIncome, actualExpense,     // S.txs[] のうち対象月のみ
  scheduledIncome, scheduledExpense,// S.recurringTxs[] のうち未反映のみ
  totalIncome   = actualIncome + scheduledIncome,
  totalExpense  = actualExpense + scheduledExpense,
  netCashflow   = totalIncome - totalExpense,
  endingBalanceForecast = openingBalance + netCashflow,
  actualTxs, scheduledItems        // 明細
};
```

### 表示方針
- マイナス見込み → 赤色警告バナー
- 支出予定 > 収入予定 → 黄色注意バナー
- 月初残高未設定 → 設定誘導
- 数値はカンマ区切り、`tabular-nums` で揃える

---

## 8. S.cashflowSettings の仕様

```js
S.cashflowSettings = {
  openingBalances: {
    'YYYY-MM': 100000,  // 月ごとの月初残高（数値）
    ...
  },
  defaultOpeningBalance: 0  // 月初残高未設定時のフォールバック
};
```

UI: 資金繰り画面の「月初残高を設定」ボタンから `m-opening-balance` モーダル経由で入力。
将来：前月末残高見込みを翌月開始残高へ自動反映、口座別残高、現金/銀行/カード別管理（プレミアム候補）。

---

## 9. Hoku 連携仕様

### 新 intent
- `recurring_budget_add` — 「毎月25日に給料30万円」「毎月末にカード支払い12万円」
- `cashflow_view` — 「資金繰りを見たい」「月末残高見込みを確認」

### `_hokuDetectRecurringBudget(text)` の挙動
1. **金額が無い** → null（他 intent に譲る）
2. **金額シグナルが一切ない**（円・収入語・支出語のいずれもなし）→ null
3. 周期：「毎月N日」「毎月末」「毎週X曜」「毎年M月D日」「毎日」
4. 種別：給料/振込等の収入語 vs 家賃/保育料等の支出語
5. カテゴリ：保育/学費 → 教育費、家賃 → 住居費、電気/水道 → 光熱費 等

### 確認 UX
`executeHokuAction` が `[[ACTION_BUTTONS:rtxconfirm]]` 付きの確認文を返す:
- 「はい、登録する」→ `_hokuRecurringConfirm()` で addRecurringTx
- 「キャンセル」→ `_hokuPendingRecurring = null`

### 例
| 入力 | 解釈 |
|---|---|
| 毎月25日に給料30万円 | type=income, amount=300000, frequency=monthly, dayOfMonth=25, desc=給料 |
| 毎月1日に家賃8万円 | type=expense, amount=80000, dayOfMonth=1, desc=家賃, cat=住居費 |
| 毎月末にカード支払い12万円 | type=expense, amount=120000, isMonthEnd=true, desc=カード支払い |
| 毎週月曜に食費10000円 | type=expense, amount=10000, frequency=weekly, dayOfWeek=mon |
| 毎年4月1日に学費30,000円 | type=expense, amount=30000, frequency=yearly, monthOfYear=4, dayOfMonth=1 |

---

## 10. 予定と実績の扱い

| 状態 | S.txs | S.recurringTxs | 資金繰り計算 |
|---|---|---|---|
| まだ反映していない予定 | – | あり (enabled) | scheduledIncome/Expense へ加算 |
| 反映済みの予定 | あり (source='recurring') | あり | actualIncome/Expense へ加算（scheduled には含めない） |
| 単発の実取引 | あり | – | actualIncome/Expense |
| ルーティン削除 | （履歴として残存） | 無 | 過去履歴は actual に残る |

---

## 11. 将来のプレミアム化候補

- 資金繰りの 3/6/12 ヶ月予測
- 口座別 / 現金/銀行/カード別 残高管理
- 固定費見直しサマリー
- Hoku による月次家計サマリー（月末通知）
- 支払いリマインド通知
- CSV / PDF 出力
- 夫婦間共有 / 家族同期
- 法人/家庭の切替管理

---

## 12. 通知 / 家族同期 / CSV 出力の将来方針

### 通知（v1.0 以降）
- 月末 3 日前の支払いリマインド
- 月初の月初残高入力リマインド
- 大きな支出の検知通知

### 家族同期（v0.3 以降、CTO 判断要）
- Supabase / Firestore で `S.recurringTxs` / `S.cashflowSettings` を共有
- 夫婦のうち一方が編集すると即時反映
- 競合解決：updatedAt のタイムスタンプ比較

### CSV / PDF 出力（プレミアム）
- 月別の収支サマリーを年末に PDF で出力
- 家計簿アプリ / 確定申告ソフトへの import 互換 CSV

---

## 13. 実装ファイル参照

| 参照対象 | 場所 |
|---|---|
| データ初期化 | `S.recurringTxs:[]` / `S.cashflowSettings` 周辺 |
| 画面 | `#s-budget` 内の `budget-section-recurring` / `budget-section-cashflow` |
| モーダル | `#m-recurring-tx` / `#m-opening-balance` |
| CRUD | `addRecurringTx / updateRecurringTx / deleteRecurringTx` |
| 月展開 | `expandRecurringForMonth(y, m0)` |
| 実績反映 | `applyRecurringForMonth(y, m0, opts)` |
| 計算 | `computeMonthlyCashflow(y, m0)` |
| 描画 | `renderRecurringSection / renderCashflowSection` |
| Hoku | `_hokuDetectRecurringBudget / _hokuExecuteRecurringBudget / _hokuRecurringConfirm` |

---

## 14. テスト観点（Wave 60 で検証済み）

Node VM 単体で 30 ケースが PASS：
- Hoku 検出 6 ケース（毎月◯日 / 毎月末 / 毎週 / 毎年）
- parseHokuIntent 統合 4 ケース（recurring_budget_add / cashflow_view）
- expand 5 ケース（5 月 3 件 / 2 月末 28 日 / 4 月年次）
- 資金繰り計算 9 ケース（opening / actual / scheduled / total / net / forecast）
- 反映 + 重複防止 6 ケース（first 3 / second 0 dedup / scheduled→0）

加えて既存 27 シナリオ + 16 メンバーテスト + スモークテストすべて回帰なし。
