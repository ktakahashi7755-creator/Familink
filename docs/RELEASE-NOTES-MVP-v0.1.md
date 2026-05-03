# Familink MVP v0.1 リリースノート

**リリース日：** 2026-05-03
**リリースタグ：** `mvp-v0.1`
**コミット：** `8db4785`
**公開 URL：** `https://ktakahashi7755-creator.github.io/Familink/`
**診断モード：** `https://ktakahashi7755-creator.github.io/Familink/#qa-debug`

---

## 🎯 一行紹介

> 家族みんなで、毎日をチームに。
> 家族運営 AI 「Hoku」が伴走する、子育て家庭向けの家族運営アプリ。

---

## 📦 MVP v0.1 同梱機能

### コア機能（10）
1. **ホーム** — 家族ボード / タスク / 今週の予定 + カスタムボード
2. **家族ボード** — 7 カテゴリ（家事/買い物/習い事/学校/重要/その他 + カスタム）/ ピン留め / コメント
3. **タスク管理** — リスト / フィルター 5 種 / メンバーフィルター / 完了→薄表示→削除
4. **カレンダー** — 月 / 週 / リスト 3 ビュー + 繰り返し予定 5 種（毎日/平日/毎週/毎月）
5. **家計管理** — メンバータブ 7 + 月切替 + カテゴリ別バーチャート + 担当者選択
6. **準備リスト** — 今日 / 明日 / すべて の 3 タブ + 双方向繰越
7. **体調管理** — 子ども別記録 / 体温・症状・食欲・服薬
8. **通知センター**
9. **設定** — プロフィール編集 / アバター / 家族メンバー管理 / オンボード再表示
10. **Hoku AI アシスタント** — 9 カテゴリ自然文分類 / アクションボタン / 音声入力

### Hoku 機能詳細
- **分類器：** 9 カテゴリ（calendar / task / prep / budget / health / board / notification / help / premium）/ multi-intent / アクションボタン
- **音声入力：** Web Speech API（対応端末で動作 / 非対応時は明確なフォールバック）
- **状態バナー：** 聞き取り中 / 非対応 / エラー の 3 状態を視覚化
- **3 秒セーフティ：** onstart 未到達時に自動フォールバック

### 7 用途ボード（intent）
| アイコン | 用途 | 自動セクション |
|---|---|---|
| 💬 | 家族共有 | — |
| 📝 | 準備リスト | 今日の準備 / 明日の準備 |
| 🎵 | 習い事 | — |
| 💛 | 体調管理（医療注記付き）| — |
| 🛒 | 買い物メモ | 今すぐ / 次の買い物 |
| 📋 | 提出物チェック | 今週 / 来週以降 |
| 📒 | 汎用メモ | — |

### オンボーディング 4 ステップ
1. 価値の説明（Familink + Hoku の 3 ポイント）
2. プロフィール作成（表示名 / 役割 9 択 / 家族名）
3. 最初の予定を 1 件登録
4. Hoku 紹介

---

## 📊 品質指標

| 指標 | 値 |
|---|---|
| コードサイズ | 8,463 行（単一 HTML / Vanilla JS / CSS）|
| 画面数 | 17 |
| 自動テスト PASS | **301/301（100.00%）**|
| pageerror | 0 件 |
| console.error | 0 件 |
| 4 viewport 整合 | iPhone SE / 13 / 15 Plus / Pro Max すべて overflow ≤ 1px |
| アクセシビリティ | aria-label 19 件追加 |
| 依存ライブラリ | **0**（npm / CDN いずれも使わず）|
| 外部 API | **0**（クラウド / AI / 認証なし）|

---

## 🔒 プライバシー設計

- **データ外部送信なし** — すべて端末内 LocalStorage に保存
- **個人情報収集なし** — メール / 住所 / 電話番号 不要
- **クッキー未使用**
- **クラッシュレポート自動送信なし**
- 詳細：`docs/privacy-policy.md`

---

## 🛠 技術スペック

- **フォーマット：** 単一 HTML ファイル（インライン CSS / JS）
- **対応ブラウザ：** Safari 15+ / Chrome 100+ / Firefox 100+
- **対応 OS：** iOS 15+ / Android 11+ / macOS 12+ / Windows 10+
- **必要な権限：** マイク（Hoku 音声入力時のみ・任意）
- **デプロイ：** GitHub Pages（HTTPS）
- **ローカル実行：** 単一ファイルをブラウザで開くだけ

---

## 🚀 累積改善履歴（Wave 1 〜 23）

| Wave | 内容 | スコア |
|---|---|---|
| 1〜10 | MVP 候補確立 / リリース前 QA | 92/100 |
| 11 | multi-intent + 公開準備 docs | 100/100（QA 軸）|
| 12 | 事業視点 10 軸診断 + 90 日ロードマップ | 78/100（事業軸）|
| 13 | 4 ステップオンボーディング | 82/100 |
| 14 | 7 領域品質改善 + Hoku 音声安定化 | 88/100 |
| 15 | スクロール修正 / 書類保管庫・カンバン撤廃 | 90/100 |
| 16 | カメラアイコン + 家計家族共有タブ | 96/100 |
| 17 | ボード 7 intent + 自動初期化 + 押せないボタン解消 | 97/100 |
| 18 | 全アプリ総点検 + ユニコーン視点レビュー | 93/100（厳格 9 軸）|
| 19 | コードクリーンアップ -260 行 | 96/100 |
| 20 | 最高クオリティ磨き + aria-label 19 件 | **100/100（S）**|
| 21 | プロフィール編集 + 繰り返し予定 + 家計チャート | 264/264 PASS |
| 22 | 最終検証 301/301 PASS（4 viewport / エッジケース）| 100% |
| **23** | **iPhone 検証プレイブック + #qa-debug 診断パネル** | **MVP v0.1 完成** |

---

## 🎁 公開後の戦略

### 短期（公開〜30 日）
- iPhone 実機での音声認識検証（家族ベータ 5〜10 組）
- App Store スクリーンショット撮影
- 法務確認（プライバシーポリシー / 利用規約）

### 中期（30〜90 日）
- 家族 2 端末同期（QR コード）— ユニコーン目標
- 通知 / 週次サマリー
- Hoku 文脈応答
- WKWebView 薄ラッパー → App Store 申請

### 長期（90〜365 日）
- iOS 版公開 → 30 家族で初週リテンション 40% 達成
- プレミアム実装（月額 480 円 / 30 日無料トライアル）
- Android 版 / 多言語対応 → 海外テスト

詳細：`docs/roadmap-to-mvp-v1.md` / `docs/sales-pitch-materials.md`

---

## 📁 主要ドキュメント

| ファイル | 内容 |
|---|---|
| `RELEASE-NOTES-MVP-v0.1.md` | 本ドキュメント |
| `iphone-verification-playbook-2026-05-03.md` | iPhone 実機検証手順 |
| `qa-results-2026-05-03-wave22-verification.md` | 最終検証 301 項目 |
| `unicorn-quality-review-2026-05-03.md` | 9 軸ユニコーン評価 |
| `roadmap-to-mvp-v1.md` | v0.1 → v1.0 90 日ロードマップ |
| `sales-pitch-materials.md` | App Store / LP / SNS / 投資家向け |
| `privacy-policy.md` | プライバシーポリシー（草案 / 法務確認前）|
| `terms-of-use.md` | 利用規約（草案 / 法務確認前）|
| `iap-integration-plan.md` | IAP 統合計画 |
| `architecture-overview.md` | アーキテクチャ概要 |
| `board-experience-design.md` | ボード体験設計指針 |
| `priority3-design-2026-05-02.md` | Priority 3 段階設計案 |
| `hoku-voice-notes-2026-05-02.md` | Hoku 音声デバッグノート |
| `code-cleanup-report-2026-05-03.md` | コードクリーンアップ詳細 |

---

## 🚦 公開可否判定

### 公開可能（Code Quality）
- ✅ 301/301 自動テスト PASS
- ✅ JS 構文 OK
- ✅ pageerror / console.error 0 件
- ✅ 4 viewport 整合
- ✅ LocalStorage 構造変更ゼロ（既存ユーザーデータ完全互換）
- ✅ アクセシビリティ強化済
- ✅ 単一 HTML / 依存ゼロ / 外部 API ゼロ

### 公開前推奨（実機）
- ☐ iPhone Safari 実機での Hoku 音声検証
- ☐ iPhone Safari 実機での操作感最終確認
- ☐ 弁護士による法務確認（プライバシーポリシー / 利用規約）
- ☐ App Store メタデータ用スクリーンショット撮影
- ☐ WKWebView 薄ラッパーアプリ作成

### 後日対応（公開後 OK）
- HIGH-3：家族 2 端末同期 / HIGH-4：通知
- MED-1〜7：Hoku 文脈応答 / プレミアム実体価値 等
- LOW：時間割 / 多言語 / etc

---

## 📞 アクセス情報

### 公開 URL
- **Production：** https://ktakahashi7755-creator.github.io/Familink/
- **診断付き：** https://ktakahashi7755-creator.github.io/Familink/#qa-debug

### リポジトリ
- **GitHub：** https://github.com/ktakahashi7755-creator/Familink
- **Default branch（Pages 元）：** `claude/merge-and-push-main-u44Ty`
- **作業ブランチ：** `claude/familylink-unicorn-product-TzM1F`

### サポート
- **GitHub Issues：** https://github.com/ktakahashi7755-creator/Familink/issues

---

## サインオフ

**MVP v0.1 / 8db4785 / 2026-05-03**

> 23 Wave の積み重ねを経て、Familink は MVP v0.1 として完成しました。
> 単一 HTML / Vanilla JS で 17 画面 / 9 機能を提供し、301 自動テストを全 PASS。
> 「動く」「迷わない」「保守しやすい」「アクセシブル」の 4 軸すべてで最高水準。
>
> 実機検証 + 法務確認 + WKWebView ラッパー → App Store 申請が次のステップです。
