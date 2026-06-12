# Familink 監査記録（AUDIT）

最終更新: 2026-06-12 / 本ファイルは全セッションの監査発見を引き継ぐ正本。
分類: Critical（即対応/データ漏えい・損失）/ High（リリース前必須）/ Medium（公開後改善）/ Low（将来）。
ステータス: ✅対応済 / 🟡部分対応（要デプロイ等）/ ⬜未対応。

## アーキテクチャ前提（事実）
- 単一 HTML（`app-source/familink.html`）＋ Vanilla JS。状態は global `S`＋LocalStorage `familink_v3`。
- Supabase は **1テーブル `fl_family_data`**（key-value JSONB）。Storage バケットは未使用（写真は base64 同期）。
- クライアントは anon キーのみ。Edge Functions（Deno）が Hoku/OCR。

---

## Critical

| ID | 発見 | 該当 | リスク | 修正方針 / 状態 |
|---|---|---|---|---|
| A-C1 | RLS 網羅・堅牢化 | docs/supabase-setup-sql.sql | 家族ID外アクセス | 4操作RLS＋CHECK制約。ローカルPG16で別ユーザー検証。✅（本番Run要🟡） |
| A-C2 | family_id がベアラトークン的 | familink.html 招待フロー | コード漏れで共有データ閲覧窓が無期限 | 使い捨て招待(H3)で露出窓を限定。機構✅／client配線⬜（要デプロイ） |
| A-C3 | シークレット露出 | familink.html | service_role/APIキー漏れ | anonのみ・機械検証で非搭載確認。✅ |
| A-C4 | ログアウトで家族データが端末残存 | doLogout | 共有端末で次の人に見える | クラウド時に端末データ消去（再ログインで復元）。✅ |

## High

| ID | 発見 | 該当 | リスク | 修正方針 / 状態 |
|---|---|---|---|---|
| A-H1 | Storage バケットポリシー | （未使用） | 将来移行時の漏えい | 家族分離バケットRLSひな型を用意。✅（N/A現状） |
| A-H2 | ファイルアップロード検証 | 各file handler | 不正ファイル/巨大ファイル | _validateUploadFile を全入口に。✅ |
| A-H3 | 招待コード有効期限・使い捨て | docs/supabase-invites-sql.sql | 無期限ベアラ | fl_family_invites＋redeem RPC。ローカル検証✅／本番Run要🟡 |
| A-H4 | セッション/未認証リダイレクト | 起動ガード | 保護画面バイパス | 未ログインはs-ob固定・?screen不可。✅ |
| A-H5 | アカウント削除の不正直報告 | confirmDeleteAccount | クラウド削除失敗でも成功表示 | 成否を捕捉し正直に報告。✅ |
| A-H6 | 課金状態のサーバ検証 | docs/supabase-entitlements-sql.sql | クライアント改ざんで付与 | fl_entitlements（書込はservice_roleのみ）＋isPremium()がサーバ権利優先。ローカル検証✅／本番Run要🟡 |

## Medium

| ID | 発見 | 該当 | リスク | 修正方針 / 状態 |
|---|---|---|---|---|
| A-M1 | 紐付け（ホーム未更新） | 各mutation | 保存後ホームが古い | 15箇所に renderHome 追加。✅ |
| A-M2 | エラー処理（Error Boundary無） | refresh(id) | 1画面例外で全白 | 画面オーバーレイ＋復旧画面。✅ |
| A-M3 | オフライン/通信失敗導線 | 同期 | 失敗が無通知 | バナー＋再試行。✅ |
| A-M4 | Supabaseエラーの技術用語露出 | _supaErr他 | UX/不安 | 日本語共通化・生エラー排除。✅ |
| A-M5 | フォーム二重送信 | save系6関数 | 重複作成 | _lockSubmit 700ms。✅ |
| A-M6 | 動画取込上限18MB | albumOnFilesPicked | 容量超過で失敗 | 3MBへ。✅ |
| A-M7 | FAMILY_SHARED_KEYS不一致 | familink.html/SQL | 同期不整合 | 未使用faceGroups除去。✅ |
| A-M8 | OCR不正日付(2/30) | _ocrDateIsReal | 誤った予定登録 | 成分一致で実在確認＋ブロック。✅ |
| A-M9 | カレンダー終日予定なし | 予定モーダル | 終日が作れない | 終日トグル追加。✅ |
| A-M10 | カレンダーのタップ領域<44px | cal-mn-btn等 | 押しにくい | 44px化。✅ |

## Low

| ID | 発見 | 該当 | リスク | 修正方針 / 状態 |
|---|---|---|---|---|
| A-L1 | Edge Functionサーバ側レート制限なし | functions/* | コスト濫用 | per-userレート制限（client側はOCR/Hoku上限で抑止済）。⬜要デプロイ |
| A-L2 | OAuth(Google/Apple)実機未検証 | onboarding | ログイン不能 | Supabase設定＋実機往復。⬜（docs/commercial-release-blockers.md） |
| A-L3 | パスワード再設定の完了UI無 | auth | 再設定不可 | リンク復帰後フォーム（暫定OTP代替）。⬜ |
| A-L4 | auth.users完全削除なし | 退会 | メール再利用可 | service_role Edge Function。⬜ |
| A-L5 | LocalStorage 5MB制約 | 写真/動画 | 端末消失リスク | IndexedDB/Storage移行（要人間確認）。⬜将来 |
| A-L6 | board空状態がデモ再投入で未到達 | renderBoard | 全削除でデモ復活 | 仕様（要判断）。⬜ |

---

## 検証資産（再現可能）
- RLS/招待/権利/Storage/インデックス: `docs/security-tests.sql`, `supabase-*.sql`（ローカル Postgres16 で検証済み）。
- クライアント: `tools/qa_*.js`（Playwright 各スイート）, `tests/unit.test.mjs`（Vitest 実コード抽出）。
