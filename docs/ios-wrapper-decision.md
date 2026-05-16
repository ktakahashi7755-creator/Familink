# iOS ラッパー方式 — 決定ドキュメント（A6）

最終更新：2026-05-16 / 状態：**推奨案提示（オーナー最終判断待ち）**

Familink は単一 HTML（Vanilla JS / CSS / LocalStorage）で完結している。
App Store / Google Play に出すには、この Web アプリをネイティブアプリの
「殻（ラッパー）」に入れる必要がある。本書は方式を比較し、推奨案を示す。

---

## 1. 選択肢の比較

| 方式 | 概要 | 長所 | 短所 |
|---|---|---|---|
| **A. Capacitor** | Ionic 製。Web 資産をネイティブにラップ。プラグインで通知・カメラ等に拡張可 | 単一 HTML をほぼそのまま使える / 通知・カメラ等のネイティブ API に段階拡張可 / iOS・Android 両対応 / 情報が豊富 | Node / Xcode のビルド環境が必要 / 依存追加 |
| **B. WKWebView 手書き** | Xcode で WKWebView を持つ最小ネイティブアプリを自作 | 依存が最小 / 構成が完全に把握できる | 通知・カメラ連携を都度自前実装 / 保守コスト高 |
| **C. PWA のまま** | App Store に出さず、ホーム画面追加で使う | 申請不要 / 即配信 | App Store に並ばない＝発見性・信頼性で不利 / 課金は App Store 課金が使えない |

---

## 2. 推奨案：**A. Capacitor**

### 理由
- Familink は単一 HTML。Capacitor は `webDir` に HTML 一式を置くだけで動く＝**改修コストが最小**。
- ロードマップ上、**プッシュ通知・カメラ（領収証スキャン）・EventKit（カレンダー連携）**を段階追加する予定がある。Capacitor はこれらを公式 / コミュニティプラグインで足せる。WKWebView 手書きだと毎回ネイティブ実装が要る。
- iOS・Android 両対応。将来 Google Play にも同一資産で出せる。
- 課金（IAP）も Capacitor のプラグイン経由で実装でき、`iap-integration-plan.md` の設計と接続しやすい。

### Capacitor 採用時の最小手順（概要）
1. `npm init` + `@capacitor/core` `@capacitor/cli` `@capacitor/ios` を導入
2. `capacitor.config.json` の `webDir` に Familink の HTML 一式を指定
3. `npx cap add ios` → Xcode プロジェクトが生成される
4. アプリアイコン（`docs/assets/app-icon/`）・スプラッシュを設定
5. 実機 / シミュレータで動作確認 → Archive → App Store Connect へアップロード

### 注意（CLAUDE.md §7・§10.2）
- Capacitor の導入は**依存ライブラリ追加**にあたるため、本実装はオーナー確認後に着手する。
- 単一 HTML 運用（GitHub Pages 配信）は**ラッパー導入後も維持**する。Web 版とアプリ版を同一資産で並行配信できる。

---

## 3. 見送る案と理由

- **B. WKWebView 手書き**：通知・カメラ・課金を都度ネイティブ実装する保守コストが、個人開発では重い。MVP 後の機能拡張速度を落とす。
- **C. PWA のまま**：App Store に並ばないと、子育て層への発見性・信頼性・課金導線で不利。ユニコーン視点（CLAUDE.md §10.3）の「無料→有料の自然な転換」が成立しにくい。

---

## 4. オーナーへの確認事項

1. Capacitor 採用でよいか（推奨）
2. ビルド環境（Mac + Xcode）の準備可否
3. Apple Developer Program（年 99 USD）の登録可否 — App Store 提出に必須
4. 初回は iOS 優先か、iOS / Android 同時か

> 本書は方式比較と推奨。実装着手はオーナー確認後（CLAUDE.md §10.2「大規模設計変更 / 外部サービス連携追加」に該当）。
