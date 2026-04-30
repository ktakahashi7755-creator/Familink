# Familink 開発ワークフロー

このドキュメントは、Familink を「世界最高峰の AI 開発チーム（17 Skills）」で自走させるためのワークフロー定義です。
個別ルールの根拠は `CLAUDE.md`、Skill の責務は `.claude/skills/<name>/SKILL.md` を参照してください。

---

## 1. 1 セッションの基本ループ

```
[作業開始確認]
   ↓
[要件 / 優先度の確認]  ← product-owner / requirements-architect
   ↓
[技術影響の確認]        ← cto-architect
   ↓
[実装]                  ← html-engineer / frontend-engineer
   ↓
[QA / Debug]            ← qa-lead / debug-engineer
   ↓
[UI / Hoku 文言レビュー] ← uiux-designer / hoku-ai-designer
   ↓
[横断レビュー圧縮]      ← chief-review-officer
   ↓
[作業終了報告 + worklog + commit]
```

S 級バグの即時修正など軽微な作業は、上記ループの一部を省略してよいが、**作業開始確認と作業終了報告だけは絶対に省かない**。

---

## 2. 役割マトリクス（誰に聞く？）

| やりたいこと | 主担当 | 補助 |
|---|---|---|
| 何を作るか決める | product-owner | ceo-strategy |
| 仕様を固める | requirements-architect | product-owner |
| 技術判断 | cto-architect | core |
| HTML/JS/CSS 修正 | html-engineer | cto-architect |
| 画面整える | uiux-designer | brand-asset-director |
| Hoku 文言 | hoku-ai-designer | core / uiux-designer |
| 課金まわり | monetization-lead | cto-architect |
| バグ調査 | debug-engineer | qa-lead |
| テスト計画 | qa-lead | requirements-architect |
| App Store 提出 | appstore-release-lead | qa-lead |
| ユーザー獲得 | growth-lead | product-owner |
| 長文を圧縮 | chief-review-officer | — |
| Git / worklog | master-controller | — |

---

## 3. 優先度ルール（再掲）

- **S**: 致命的バグ（押せない / 保存されない / 閉じない / JS エラー / 主要画面開かない / iPhone で操作不能）
- **A**: App Store 公開前に直したい重要改善
- **B**: 公開後でよい改善
- **C**: 将来機能（Supabase / RN / 大規模課金 / グロース施策）

S は即着手・小コミット。A 以上はリリース前ブロッカー。B/C はバックログに置くだけ。

---

## 4. 自走 / 要事前確認の境界

### 自走可（独断で実装してよい）
- 優先度 S の小修正
- UI の軽微な調整
- Hoku 文言の軽微な調整
- テスト項目 / worklog / docs / CLAUDE.md の更新
- 安全な小コミット

### 要事前確認（独断禁止 → ユーザーに聞く）
- 認証 / DB / Supabase 移行
- 課金本実装
- LocalStorage 構造変更
- React Native 移行
- 大規模 UI 刷新
- 外部 API 追加 / 依存ライブラリ追加
- 全体リファクタリング
- 既存 Hoku デザイン変更
- 画像素材の削除 / 差し替え

判断に迷ったら **要事前確認** に倒す。

---

## 5. コミット粒度の指針

- 1 コミット = 1 論理単位
- 「機能追加」「バグ修正」「ドキュメント更新」「設定変更」を混ぜない
- worklog 追記は関連変更と同コミットに含めてよい
- メッセージは目的を 1 行（「fix」「update」だけは禁止）

---

## 6. テスト戦略（最小セット）

毎セッションで必ず回す回帰観点：
1. 入力 → 保存 → リロード → 復元
2. 空 / 最大長 / 特殊文字
3. 多重クリック / 連打
4. モーダル多重 / 戻る進む
5. オフライン / オンライン
6. iPhone Safari 実機（可能なら）

実機テストできないセッションでは、worklog の **iPhone 確認ポイント** に必ず項目を残す。

---

## 7. リリース前チェックの最終ゲート

`appstore-release-lead` の SKILL.md にあるチェックリストを通す：
1. S バグ ゼロ
2. 解約導線
3. プライバシーポリシー / 利用規約
4. データ取得開示
5. 課金表記（480 円 / 月、税込、30 日トライアル）
6. 年齢区分 / カテゴリ
7. スクショ
8. Hoku 応答の安全性
9. オフライン起動

通らなければ提出しない。

---

## 8. ドキュメント階層

- `CLAUDE.md`: 運用ルールの最上位
- `docs/development-workflow.md`: 本ドキュメント（チームの動き方）
- `docs/mobile-operation.md`: 携帯から運用するときのコマンド集
- `docs/worklog.md`: セッションごとの作業履歴
- `.claude/skills/<name>/SKILL.md`: 各ロールの責務・出力形式

迷ったら `CLAUDE.md` → `familink-core` → 該当 Skill の順で参照する。
