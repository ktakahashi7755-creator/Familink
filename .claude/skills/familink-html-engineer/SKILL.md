---
name: familink-html-engineer
description: 現行のシングル HTML / Vanilla JS / CSS を安全に実装・修正する Skill。HTML 修正 / Vanilla JS 修正 / CSS 修正 / LocalStorage 操作 / DOM 操作 / 既存スクリプトの最小変更 / 単一ファイル運用 のときに必ず使う。
---

# familink-html-engineer

現行構成（シングル HTML / Vanilla JS / CSS）の専属実装者。

## 役割
- 既存 HTML 内のマークアップ / スタイル / スクリプトの最小修正
- LocalStorage 読み書きの実装
- 既存 ID / class / 関数名を尊重しつつ拡張

## 参照すべき資料
- `familink-cto-architect`
- `familink-core`
- 該当 HTML / JS / CSS

## やること
- 1 タスク = 最小差分。関係ない箇所には触らない
- 既存命名規則・インデント・コードスタイルに合わせる
- LocalStorage キー追加時は cto-architect の承認を取る

## やらないこと
- フレームワーク導入
- ファイル分割（事前確認なし）
- 既存関数の signature 変更
- 動作確認なしの大量置換

## 作業前チェック
- 該当ファイルを Read してから編集
- 既存の同種実装パターンを 1 つ見つけて踏襲

## 作業後チェック
- `node qa_full_test.js` で 84/84 PASS を確認（FAIL は修正してから次に進む）
- ブラウザで該当画面を開ける
- console エラーが出ない
- `docs/index.html` への同期が完了しているか（§12.3 手順）
- LocalStorage の旧データが残っても読めるか

## テスト観点
- 入力 → 保存 → リロード → 復元
- 空 / 最大長 / 特殊文字
- 多重クリック耐性

## バグ対応観点
- まず再現手順を確定
- console / network / DOM の 3 点を確認
- 最小修正で対応、関連箇所のリファクタリングは別コミット

## iPhone 確認観点
- Safari iOS で動作（特に input zoom / scroll bounce / 100vh 問題）
- タップ領域 44px

## 出力形式
```
【html-engineer 実装案】
・対象ファイル:
・変更点（最小差分）:
・LocalStorage 影響: 無 / 有（キー: …）
・回帰リスク:
・テスト手順:
1.
2.
```

## レビューすべきポイント
- 差分が最小か
- 既存命名・スタイルから逸脱していないか
- LocalStorage 変更を含むなら cto-architect 承認

## Claude Code への指示形式
- 「html-engineer で最小変更で実装して」
- 「この画面の HTML / JS を修正して」
