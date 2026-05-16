# Familink 残タスク一覧

最終更新：2026-05-16（Wave 82 時点） / branch: `claude/familylink-unicorn-product-TzM1F`

現状のコード品質は公開水準に到達済み（VM テスト全 PASS、hoku-api pytest 18/18、
アプリ本体クリーン）。本書は **公開・拡張に向けて残っている作業** を、担当別・
優先度別にまとめた進行管理票。状態：☐ 未着手 / ◐ 進行中 / ☑ 完了

- App Store 公開項目の詳細：`appstore-readiness-checklist.md`
- 機能優先度の正本：`product-roadmap.md`
- Hoku AI の段階計画：`hoku-ai-assistant-plan.md`

---

## A. オーナーの判断・操作が必要

| # | タスク | 優先 | 状態 | メモ |
|---|---|---|---|---|
| A1 | 実機検証（iPhone SE / 13 / 15 Plus / Pro Max の4幅 + 音声入力） | A | ◐ | 自動レンダリング検証は5幅×7画面=35/35 PASS。**実機での目視・音声は要オーナー** |
| A2 | App Store アイコン作成 | A | ◐ | `docs/assets/app-icon/` に SVG 原本 + 全20サイズ PNG（草案 v1）。最終承認待ち |
| A3 | スクリーンショット 5 枚以上撮影 | A | ☐ | 実機 / シミュレータ推奨。サンドボックスは playwright 未導入で取得不可 |
| A4 | 法務専門家レビュー（privacy / terms 草案 v0.2） | A | ◐ | `legal-review-notes.md` に論点整理済み。**弁護士確認は要オーナー** |
| A5 | サポート URL / 連絡先の準備 | A | ◐ | `docs/support.html` 作成済み（FAQ + 問い合わせ）。本番 URL は Pages 反映後 |
| A6 | iOS ラッパー方式の決定 | C | ◐ | `ios-wrapper-decision.md` で **Capacitor を推奨**。実装着手は要オーナー確認 |
| A7 | Hoku API デプロイ可否の判断 | C | ◐ | `hoku-api-deployment-decision.md`：**MVP はデプロイ不要**を推奨 |
| A8 | 年齢区分・カテゴリの確定 | A | ◐ | **4+ / プライマリ:仕事効率化・セカンダリ:ライフスタイル** で確定推奨 |

---

## B. オーナー許可があれば実行できる

| # | タスク | 優先 | 状態 | メモ |
|---|---|---|---|---|
| B1 | dev ブランチ → Pages 配信ブランチへの反映 | A | ☑ | Wave 82 でオーナー許可を得て実施。法務/サポート HTML が本番 URL で公開 |
| B2 | Hoku API デプロイ後の URL 配線・実機 7 シナリオ検証 | C | ☐ | A7 でデプロイ可否を判断後 |
| B3 | LLM API 本連携（hoku-api/classifier の LLM 分岐実装） | C | ☐ | API キー・課金が発生。要確認 |

---

## C. Claude Code が自走で進められる

| # | タスク | 優先 | 状態 | メモ |
|---|---|---|---|---|
| C1 | hoku-api classifier の精度改善 / テスト強化 | B | ☑ | リアル入力10シナリオ + 万円抽出をリグレッションに固定（18/18 PASS）|
| C2 | App Store レビューメモ / What's New 文言の磨き込み | B | ☑ | metadata は公開水準。継続改善は随時 |
| C3 | docs 整理（DOCS-INDEX 更新等） | B | ☑ | 新規ドキュメントを DOCS-INDEX に反映 |
| C4 | 回帰テスト・バグ洗い出しの継続 | A | ◐ | 各 Wave で実施。VM 31 + width-sweep + pytest 18/18 緑を維持 |

---

## D. 公開済み / 完了

- ☑ 自動テスト全 PASS（VM スイート31 + width-sweep + hoku-api pytest 18/18）
- ☑ アプリ本体クリーン（console.log 0 / debugger 0 / div バランス完全 / 実 TODO 0）
- ☑ プライバシーポリシー・利用規約の HTML 公開（草案 v0.2）
- ☑ サポートページ `support.html`
- ☑ アプリアイコン草案（SVG + 全サイズ PNG）
- ☑ App Store メタデータ草案 / 公開前チェックリスト
- ☑ iOS ラッパー / Hoku API デプロイ / 法務レビューの決定ドキュメント
- ☑ Hoku API スキャフォルド（Phase 1-3）
- ☑ GitHub Pages 配信

---

## 次の一手（推奨順）

1. **A1 実機検証** — 実機での目視・音声確認（公開可否の最大ボトルネック）
2. **A3 スクリーンショット** — 実機 / シミュレータで撮影
3. **A4 法務専門家レビュー** — `legal-review-notes.md` を持って依頼
4. **A6 Capacitor 実装** — オーナー確認後（Apple Developer Program 登録が前提）

オーナー確認が必要な項目（A6 実装 / A7 デプロイ / B3）は CLAUDE.md §7・§10.2 に
従い、本実装前に必ず確認を挟む。
