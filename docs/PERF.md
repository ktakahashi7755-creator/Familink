# Familink パフォーマンス計測・改善記録（PERF）

最終更新: 2026-06-12 / 対象: app-source/familink.html（単一HTML構成）

## 計測環境の注意
- 本リポジトリ環境に Lighthouse / Chrome for Testing を導入できなかったため、
  **Playwright（Chromium headless・375×812・モバイル相当）の実測値**を指標とする。
- Lighthouse モバイルスコアは CI / 実機環境で別途取得を推奨（手順は末尾）。

## アーキテクチャ前提（CLAUDE.md §12.1）
- **単一HTML・Vanilla JS・npm依存ゼロ**。バンドラ無し＝バンドル分割の概念は非該当。
- 外部依存は **Supabase JS（CDN・defer）** と **Google Fonts（display=swap）** のみ。
  → 「不要依存の削除」対象は存在しない（依存が元から最小）。
- ルート単位コード分割の代替: 画面は `.screen` の表示/非表示で切替、描画は
  `refresh(id)` が必要画面のみ実行（遅延描画）。初期は s-home のみ描画。

## 実測値（改善後・2026-06-12）

| 指標 | 値 | 評価 |
|---|---|---|
| First Contentful Paint | 240 ms | 良好（モバイル目安1.8s以下） |
| DOMContentLoaded | 428 ms | 良好 |
| Load complete | 527 ms | 良好 |
| 起動→ホーム表示 | 587 ms | 良好 |
| 初期DOMノード数 | 2,564 | 適正（単一HTML全画面内包でこの数は軽量） |
| renderHome | 2.6 ms | 体感即時 |
| renderCal | 6.4 ms | 体感即時 |
| renderBudget | 0.7 ms | 体感即時 |
| アルバム30枚の遅延読込 | 30/30 サムネ lazy | 実装確認 |

（大量データ時: 別計測で 予定400/タスク200/投稿100 でも起動660ms・描画<10ms・横スクロール0 を確認済み）

## 実施した最適化（PERF-1〜3）
- **PERF-1**: Supabase CDN は `defer`＋`onerror` フォールバック済みを確認。フォントは
  `display=swap` でテキスト即時表示。初期描画は s-home のみ（他画面は遷移時に描画）。
- **PERF-2**: アルバム/メモ/プレビューの全サムネ `<img>` に `loading="lazy" decoding="async"`。
  取り込み時に 1280px / JPEG 0.85 へリサイズ（downscaleImageFile）。
  ヒーロー画像・全画面表示は意図的に eager（即時表示が望ましいため）。
- **PERF-3**: 同期クエリは列限定（`select user_id,data_key,payload,updated_at`）で
  SELECT * / N+1 なし。インデックスを `docs/supabase-perf-indexes.sql` で追加
  （family_id / user_id）。ローカルPostgres16で適用確認。

## 改善前→後の比較
- アルバムサムネ: 一部 `<img>` が eager → **全サムネ lazy 化**（30枚時 30/30）。
- 画像生成箇所のうち board/memory プレビューの 1 箇所に lazy を追加。
- それ以外（起動/描画/クエリ）は元から良好な水準を維持（退行なしを回帰214件で確認）。

## Lighthouse モバイル取得手順（実機/CI で実施）
```
npx lighthouse https://ktakahashi7755-creator.github.io/Familink/ \
  --preset=desktop --form-factor=mobile --screenEmulation.mobile \
  --only-categories=performance,accessibility,best-practices \
  --output=html --output-path=./lh-mobile.html
```
取得後、Performance / Accessibility のスコアを本ファイルに追記すること。
