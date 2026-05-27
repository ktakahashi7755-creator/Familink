# テスト設計テンプレート

Phase 11 のテスト設計・動作確認で使う。Familink は単一 HTML / Vanilla JS のため、
VM ベースの自動テスト（Node の `vm` モジュール）+ 手動 / 実機確認の二本立て。

---

## テスト種別（10 種）

| # | 種別 | 内容 | Familink での手段 |
|---|---|---|---|
| 1 | 単体テスト | 関数単位の入出力 | `/tmp/*.js` VM テスト |
| 2 | 結合テスト | 複数機能の連携 | VM テスト（integration.js 系） |
| 3 | E2E テスト | ユーザー操作の一連の流れ | VM シナリオ / 実機 |
| 4 | モンキーテスト | ランダム操作で異常検出 | 手動 / 実機 |
| 5 | 回帰テスト | 既存機能の非破壊確認 | 全 VM スイート再実行 |
| 6 | 表示崩れテスト | レイアウト崩れ検出 | 実機 / ブラウザ |
| 7 | スマホ実機テスト | iPhone SE〜Pro Max | 実機目視 |
| 8 | 境界値テスト | 0 件 / 最大件数 / 限界値 | VM テスト |
| 9 | 異常系テスト | 不正入力 / エラー時 | VM テスト |
| 10 | データ保持テスト | リロード後の復元 | VM（loadS/saveS）/ 実機 |

---

## テスト計画（test-plan.md）

```
## テスト対象: <機能 / Wave 名>
## テスト範囲: <対象画面・関数>

| 種別 | 実施 | 手段 | 担当 |
|---|---|---|---|
| 単体 | ○ | /tmp/xxx.js | AI |
| 結合 | ○ | ... | AI |
| E2E | ○ | ... | AI + 手動 |
| 回帰 | ○ | 全 VM スイート | AI |
| 実機 | △ | iPhone 目視 | 人間 |
```

---

## テストケース（test-cases.md）

```
| ID | 観点 | 前提 | 操作 | 期待結果 | 結果 |
|---|---|---|---|---|---|
| TC-001 | 追加 | 空状態 | 予定を1件追加 | 一覧に1件表示 | PASS |
| TC-002 | 保存 | TC-001 後 | リロード | 1件残る | PASS |
| TC-003 | 異常 | - | 空タイトルで保存 | エラー表示・保存されない | PASS |
| TC-004 | 境界 | 0件 | 一覧を開く | 空状態が自然に表示 | PASS |
```

---

## 必須確認項目（全機能共通）

各機能で必ず以下を確認：

- [ ] 表示されるか
- [ ] 追加できるか
- [ ] 編集できるか
- [ ] 削除できるか
- [ ] 保存されるか
- [ ] リロード後も残るか
- [ ] エラー時に画面が崩れないか
- [ ] 空状態が自然か
- [ ] ボタンが押せるか
- [ ] 行き先のない導線がないか
- [ ] スマホで崩れないか
- [ ] 横スクロールが出ないか
- [ ] 既存機能が壊れていないか

---

## VM テストの雛形（Familink 用）

`/tmp/<name>.js` に作成。`app-source/familink.html` の `<script>` を VM で実行し、
グローバル関数を `globalThis.__t` 経由で取り出して検証する。

```js
const vm=require('vm'),fs=require('fs');
const html=fs.readFileSync('app-source/familink.html','utf8');
let script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
script+='\nglobalThis.__t={S,PERSIST,/* 検証したい関数 */};';
// fakeFields / lsStore / ctx を用意（既存 /tmp/*.js を流用）
// vm.createContext(ctx); vm.runInContext(script,ctx);
const T=ctx.__t;
let pass=0,fail=0;
function expect(n,c){ if(c){pass++;}else{fail++;console.log('FAIL',n);} }
// ... 検証 ...
console.log('PASS:',pass,'FAIL:',fail);
process.exit(fail?1:0);
```

---

## 回帰チェックリスト（regression-checklist.md）

```
## 回帰テスト: <Wave 名> 後
## 実行日: YYYY-MM-DD

| スイート | PASS | FAIL |
|---|---|---|
| hoku-redesign | 29 | 0 |
| integration | 55 | 0 |
| ... | ... | ... |
| 合計 | NNN | 0 |

判定: 退行ゼロ ○ / 退行あり ✗
```

合計件数が前回以上 + FAIL 0 でなければ次フェーズへ進まない。

---

## QA レポート（qa-report.md）

```
## QA レポート: <Wave 名>
## 完成度判定: NN%

### テスト結果サマリ
- 単体 / 結合 / E2E / 回帰: NNN/NNN PASS
- 実機: iPhone <機種> 目視 ○
- 境界値 / 異常系: ○

### 発見した不具合
| ID | 内容 | 重要度 | 状態 |
|---|---|---|---|

### 未確認事項
- ...

### 結論
実ユーザー検証に進めるか（GO / NO-GO）
```
