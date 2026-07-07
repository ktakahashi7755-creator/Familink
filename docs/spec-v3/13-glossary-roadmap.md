# 13. 用語集・ロードマップ

## 13.1 用語集
| 用語 | 意味 |
|---|---|
| Familink | 本プロダクト（家族をチームにするアプリ）。提供 ITS合同会社 |
| Hoku | 家族を支える AI ガイド/エージェント（星型マスコット） |
| ファミコイン | 毎日ログインで貯まる通貨。Hoku 着せ替えに使う習慣化ループ |
| `familink_v3` | LocalStorage 主キー（全ローカル状態の保存先） |
| `S` | クライアントのグローバル状態オブジェクト |
| PERSIST | LocalStorage に保存する S のキー配列（88キー） |
| SYNC_KEYS | クラウド同期する data_key の集合 |
| FAMILY_SHARED_KEYS | 家族間で共有する data_key（RLS allowlist と一致） |
| `fl_family_data` | 家族データの key-value ストア（Supabase）。RLS で分離 |
| `fl_entitlements` / `fl_my_premium` | 課金権利テーブル/ビュー（サーバ権利の正本） |
| `fl_push_subscriptions` / `fl_push_log` | Web Push 購読/送信ログ |
| トゥームストーン | 削除記録 `_deletions`。削除の家族伝播・復活防止 |
| LWW | Last-Write-Wins。`updatedAt` の新しい方を採用 |
| OCR取込 | 予定表の写真をAI解析し予定を一括登録（Edge `calendar-scan`） |
| RLS | Postgres Row Level Security（家族分離の本体） |
| VAPID | Web Push の鍵方式（公開鍵=クライアント / 秘密鍵=サーバ） |
| `H()` | XSSエスケープヘルパー |
| `_lockSubmit` | 二重送信防止（700ms） |
| `var V` / `SW_VERSION` | 版文字列（両者一致で自動更新検知） |
| 権利の正本 | 改ざん不可の真実源をサーバに置く原則（課金等） |

## 13.2 優先度（S/A/B/C）
- S：致命/必須（押せない・保存されない・落ちる・家族分離破れ・XSS 等）。
- A：公開前に直したい重要改善（導線/バリデーション/分かりづらさ）。
- B：公開後でよい改善。C：将来機能。

## 13.3 プロダクトロードマップ（ユニコーンへの道）
### 短期（〜公開）
- 実機2台の同期 end-to-end 確認。Web Push / Stripe の本番設定・疎通。
- App Store/Google Play 審査対応（ネイティブ配布時は IAP）。プレスキット/LP 整備。

### 中期（初期成長）
- 無料ユーザー獲得（3児パパの物語 × ショート動画/インスタ × 招待バイラル）。
- 月額480円の初期課金・継続率改善。予定チャット（予定への家族コメント/既読）でコラボ粘着性。
- 通知の高度化（宛先制御/静音時間/週次サマリー）。上位プラン（680/780/980円）の設計。

### 長期（家族のOS化）
- Hoku を家族 AI アシスタントへ（予定/家計/成長の縦断理解・先回り提案）。
- 学校/自治体/EC/保険等との連携余地。家族単位の継続基盤を資産化（同意ベース・匿名集計）。
- 事業売却/資金調達に耐えるプロダクト資産（継続する家族基盤 × 独自体験 × プライバシー設計 × 拡張余地）。

## 13.4 未実装/残タスク（v20260615j 時点）
- Web Push：クライアント/SW 完了、サーバ設定（VAPID/SQL/Edge/cron）が残（`WEB-PUSH-SETUP.md`）。
- 決済：クライアント/権利判定 完了、Stripe/SQL/Edge/Webhook 設定と本番切替が残（`BILLING-SETUP.md`）。
- 実機2台の本番同期 end-to-end 確認。
- （任意）予定への家族コメント/既読、通知宛先制御、text-muted の微コントラスト調整。

## 13.5 正本ドキュメント地図
- 運用ルール：`CLAUDE.md`（開発憲法）
- 完全仕様（本セット）：`docs/spec-v3/`
- 監査/セキュリティ：`docs/AUDIT.md` / `docs/security-audit.md` / `docs/security-tests.sql`
- セットアップ：`docs/WEB-PUSH-SETUP.md` / `docs/BILLING-SETUP.md`
- プレス/素材：`docs/press/`（PRESS.md / tokens.json / screens / assets）
- 履歴：`docs/worklog.md`
