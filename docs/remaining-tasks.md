# Familink 残タスク一覧

最終更新：2026-05-16（Wave 80 時点） / branch: `claude/familylink-unicorn-product-TzM1F`

現状のコード品質は公開水準に到達済み（VM テスト全 PASS、hoku-api pytest 16/16、
アプリ本体クリーン）。本書は **公開・拡張に向けて残っている作業** を、担当別・
優先度別にまとめた進行管理票。状態：☐ 未着手 / ◐ 進行中 / ☑ 完了

- App Store 公開項目の詳細：`appstore-readiness-checklist.md`
- 機能優先度の正本：`product-roadmap.md`
- Hoku AI の段階計画：`hoku-ai-assistant-plan.md`

---

## A. オーナーの判断・操作が必要（自走不可）

| # | タスク | 優先 | 状態 | メモ |
|---|---|---|---|---|
| A1 | 実機検証（iPhone SE / 13 / 15 Plus / Pro Max の4幅 + 音声入力） | A | ☐ | 実機必須。崩れ・横スクロール・iOS ズーム・Web Speech API を確認 |
| A2 | App Store アイコン作成（1024×1024 + 各サイズ） | A | ☐ | デザイン素材の最終承認が必要 |
| A3 | スクリーンショット 5 枚以上撮影 | A | ☐ | 実機 / シミュレータ推奨。キャプション案は metadata に記載済み |
| A4 | 法務専門家レビュー（privacy-policy / terms-of-use 草案 v0.2） | A | ☐ | 弁護士・行政書士の確認 |
| A5 | サポート URL / 連絡先の準備 | A | ☐ | 専用ページ or 問い合わせ窓口 |
| A6 | iOS ラッパー方式の決定（Capacitor / WKWebView） | C | ☐ | 外部技術採用の判断。決定後 TestFlight 配布へ |
| A7 | Hoku API デプロイ可否の判断（Render / Fly.io 等） | C | ☐ | 外部サービス追加。コードは Phase 3 まで完了・休眠中 |
| A8 | 年齢区分・カテゴリの確定（4+ / 仕事効率化想定） | A | ☐ | App Store Connect 入力時に確定 |

---

## B. オーナー許可があれば実行できる

| # | タスク | 優先 | 状態 | メモ |
|---|---|---|---|---|
| B1 | dev ブランチ → Pages 配信ブランチへのマージ | A | ☐ | privacy-policy.html 等を本番 URL で公開するため。別ブランチ push は要許可 |
| B2 | Hoku API デプロイ後の URL 配線・実機 7 シナリオ検証 | C | ☐ | A7 決定後。設定画面で URL 入力すれば即有効 |
| B3 | LLM API 本連携（hoku-api/classifier の LLM 分岐実装） | C | ☐ | API キー・課金が発生。要確認 |

---

## C. Claude Code が自走で進められる（オーナー操作不要）

| # | タスク | 優先 | 状態 | メモ |
|---|---|---|---|---|
| C1 | hoku-api classifier の精度改善（タスク種別判定の強化等） | B | ☐ | ルールベースの範囲で安全に改善可 |
| C2 | App Store レビューメモ / What's New 文言の磨き込み | B | ☐ | metadata の文章ブラッシュアップ |
| C3 | docs 整理（古い qa-results-* 等の集約・DOCS-INDEX 更新） | B | ☐ | 正本 1 箇所の原則で重複削減 |
| C4 | 回帰テスト・バグ洗い出しの継続 | A | ◐ | 各 Wave で実施。緑を維持 |

---

## D. 公開済み / 完了

- ☑ 自動テスト全 PASS（VM スイート + hoku-api pytest 16/16）
- ☑ アプリ本体クリーン（console.log 0 / debugger 0 / div バランス完全 / 実 TODO 0）
- ☑ プライバシーポリシー・利用規約の HTML 公開（草案 v0.2、専門家レビューは A4）
- ☑ App Store メタデータ草案（`app-store-metadata.md`）
- ☑ Hoku API スキャフォルド（Phase 1-3：ローカル分類強化 + FastAPI + フロント休眠連携）
- ☑ GitHub Pages 配信（Deploy from a branch）

---

## 次の一手（推奨順）

1. **A1 実機検証** — 公開可否の最大のボトルネック
2. **A2 / A3 アイコン・スクリーンショット** — 提出物として必須
3. **A4 法務レビュー** — 並行で進められる
4. **A6 iOS ラッパー方式の決定** — TestFlight 配布の前提

オーナー確認が必要な項目（A6 / A7 / B3）は CLAUDE.md §7・§10.2 に従い、
本実装前に必ず確認を挟む。
