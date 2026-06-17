# ITs経営OS ⇄ Familink 開発チーム 連携仕様

ITs経営OS（claude.ai 上の「経営の頭脳」）の指示を、Familink 開発チーム
（このリポジトリの Claude Code ＋ 17 Skill＝「開発の手足」）に自動で流し込み、
**発注 → 実装 → テスト → 公開** までを最小の人手で回すための仕組みを定める。

> 役割分担：**ITs経営OS＝何を/なぜ/優先度を決める。Familink 開発チーム＝どう作るかを決めて作る。**
> 開発側の判断・自律範囲・テスト基準・開始終了プロトコルは `CLAUDE.md`（特に §1/§2/§6/§7/§14）が正本。

---

## 1. なぜ「橋」が要るか（前提）

claude.ai のプロジェクト（会話AI）は、それ自体ではコードを実行・コミット・push できない。
そのため ITs経営OS の指示を開発に落とすには、両者をつなぐ **受け渡し口（橋）** が必要。
現行ツールで最も確実な橋は **GitHub Issue**。Claude Code on the web は Issue を起点に起動できる。

```
[ITs経営OS / claude.ai]   経営判断・優先順位・発注書(構造化指示)
        │  ① 発注書を GitHub Issue 化（テンプレ familink:dev-order）
        ▼
[GitHub Issue]            familink リポジトリ・ラベル familink:dev-order
        │  ② Issue を起点に Claude Code on the web が起動
        ▼
[Familink 開発チーム]      該当 Skill を自動選択 → 実装 → QA84/84 → docs同期 → 公開/PR
        │  ③ 完了報告を Issue/PR に記録（CLAUDE.md §2 終了報告フォーマット）
        ▼
[ITs経営OS]               Issue/PR の結果を吸い上げ、次の打ち手へ
```

---

## 2. 発注書フォーマット（ITs経営OS の出力 ＝ Issue の中身）

GitHub の Issue テンプレート **「Familink 開発指示書（ITs経営OS 発注）」**
（`.github/ISSUE_TEMPLATE/familink-dev-order.yml`）に対応する。1 Issue = 1 オーダー。

| 項目 | 内容 | 必須 |
|---|---|---|
| 目的・背景 | なぜやるか（家族の課題・経営意図） | ◯ |
| 対象 | 画面ID（例 `s-ob`/`s-cal`）や機能（ログイン/同期） | － |
| 種別 | バグ修正 / 改善 / 新機能 / 調査 / UI調整 | ◯ |
| 優先度 | S / A / B / C（`CLAUDE.md` §7） | ◯ |
| 受け入れ条件 | 「これが満たされたら完了」を箇条書き | ◯ |
| 制約 | 壊してはいけない前提（例 `familink_v3` を壊さない） | － |
| 希望 Skill | 指定があれば。空なら Claude が自動選択 | － |
| 公開要否 | main 反映で即公開 / PRレビュー後 / 公開しない | ◯ |

> 受け入れ条件は「画面の見え方」「操作の結果」で書くと精度が上がる（実装手段は開発側に任せる）。

---

## 3. 指示 → Skill 自動ルーティング（CLAUDE.md §6/§8 準拠）

発注書の「種別／対象／文言」から、開発チームが自動で担当 Skill を選ぶ。代表例：

| 発注の中身 | 主担当 Skill |
|---|---|
| 仕様が曖昧・要件を固めたい | `familink-requirements-architect` |
| 入れるか/後回しか・優先度 | `familink-product-owner` |
| バグ・動かない・保存されない | `familink-debug-engineer` ＋ `familink-html-engineer` |
| UI を整えたい・文言・導線 | `familink-uiux-designer` |
| Hoku のセリフ・通知文 | `familink-hoku-ai-designer` |
| 課金・無料/有料の線引き | `familink-monetization-lead` |
| 技術設計・DB/認証/同期の影響範囲 | `familink-cto-architect` |
| テスト・総点検・回帰 | `familink-qa-lead` |
| 公開前品質・審査・メタデータ | `familink-appstore-release-lead` |
| 事業インパクト・差別化 | `familink-ceo-strategy` |
| 複数 Skill 横断の最後に圧縮 | `familink-chief-review-officer` |

最上位の世界観・整合性の裁定は `familink-core`。Git/worklog/開始終了は `familink-master-controller`。

---

## 4. 開発チームが 1 オーダーで保証すること（実行契約）

Issue を受けた Claude Code は、CLAUDE.md に従い必ず以下を実行する：

1. **開始**：`git status`/最新化（§1）→ 担当 Skill 選択
2. **実装**：`app-source/familink.html` を最小差分で（単一HTML・Vanilla維持＝§12）
3. **テスト**：`node qa_full_test.js` で **84/84 PASS**＋関連 tools スイート（§14.5）
4. **公開準備**：`app-source → docs` 同期。**`var V` と `docs/sw.js` の `SW_VERSION` を必ず同時に更新**（§12.3／cache-first SW のため版不一致だと実機に届かない）
5. **反映**：発注書の「公開要否」に従い main へ push（即公開）／PR 作成／ブランチ保留
6. **報告**：Issue または PR に §2 終了報告フォーマットで記録（変更/テスト/未確認/次アクション）

---

## 5. セットアップ（最初の一度だけ・人間が行う）

ITs経営OS（claude.ai）と GitHub をつなぐ部分は、プラットフォーム設定のため利用者側で行う。

1. **GitHub 連携**：ITs経営OS の Claude プロジェクトに GitHub コネクタ（または GitHub MCP）を接続し、
   `ktakahashi7755-creator/familink` への Issue 作成を許可する。
   - 連携できない場合は「半自動」：ITs経営OS が出力した発注書を、人間が New Issue に貼って作成する。
2. **自動起動トリガー**：Claude Code on the web で、ラベル `familink:dev-order` の新規 Issue を
   起点にセッションを自動起動する設定を行う（手順は下記ドキュメント参照）。
   - トリガー未設定でも運用可：Claude Code を開いて「Issue #N を進めて」と言えば同じ流れで走る。
3. 参考：Claude Code on the web の起動・トリガー・環境設定 →
   https://code.claude.com/docs/en/claude-code-on-the-web

---

## 6. ITs経営OS に貼り付ける指示文（プロジェクトのカスタム指示へ）

ITs経営OS 側が「正しい発注書」を毎回出せるよう、以下をそのプロジェクトの指示に追加する。

```
あなたは ITs経営OS（経営の頭脳）。Familink の開発は別系統の「Familink 開発チーム
（GitHub: ktakahashi7755-creator/familink / Claude Code＋17 Skill）」が担当する。
開発を依頼するときは、自分でコードを書こうとせず、必ず次の「発注書」を1件=1タスクで出力する：

# 発注書
- 目的・背景：（なぜ。家族の課題／経営意図）
- 対象：（画面IDや機能。分かる範囲で）
- 種別：（バグ修正/改善/新機能/調査/UI調整）
- 優先度：（S/A/B/C）
- 受け入れ条件：（完了の定義。画面の見え方・操作結果で箇条書き）
- 制約：（壊してはいけない前提。なければ「特になし」）
- 希望Skill：（指定なければ「自動」）
- 公開要否：（即公開／PRレビュー後／公開しない）

出力後は、可能なら GitHub に Issue（テンプレ familink:dev-order）として登録する。
実装の可否・手段・技術判断は開発チーム側に委ねる（あなたは判断・優先順位・受け入れに集中）。
```

---

## 7. 運用のコツ

- **1 Issue = 1 オーダー**に保つ（大きい構想は分割）。横断の総括は最後に `chief-review-officer`。
- **受け入れ条件を具体的に**：これが自動開発の精度を決める。曖昧なら開発側が確認で止まる。
- **公開要否を明示**：S級バグは即公開、設計変更は PR レビュー、が安全。
- 認証/課金/DB/LocalStorage構造/外部API追加など重い変更は、自動でも**人間確認で停止**する（§7/§10.2）。
- 進捗・履歴の正本は Issue/PR と `docs/worklog.md`。ITs経営OS はそこを見れば現状を把握できる。
