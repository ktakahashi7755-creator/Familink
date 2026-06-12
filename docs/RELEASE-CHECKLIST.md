# Familink リリースチェックリスト

最終更新: 2026-06-12 / 対象: app-source/familink.html（公開: docs/index.html v20260612o）
自動テスト: Vitest 23 + Playwright 各スイート + QA84 = すべて緑

---

## 1. 全機能の動作確認結果（自動テストで担保）

| 機能 | 確認内容 | テスト | 結果 |
|---|---|---|---|
| 起動/画面遷移 | 全16画面の遷移・描画・横スクロール0 | qa_full_test(84) | ✅ |
| カレンダー | 追加/編集/削除/終日/繰り返し/メンバーフィルタ/整合性 | qa_cal_*(37) | ✅ |
| タスク | 追加/フィルタ/完了/ホーム紐付け | qa_ext_test(36) | ✅ |
| 家計 | 月集計/カテゴリ/境界(月跨ぎ/年跨ぎ/閏年) | qa_content/boundary(32) | ✅ |
| 買い物 | 追加/購入済み/履歴 | qa_e2e_flow(14) | ✅ |
| アルバム | 追加/遅延読込/容量超過ロールバック | qa_perf_lazy/release | ✅ |
| 体調 | 記録/最新値/グラフ | qa_content | ✅ |
| 家族共有 | コード生成/参加/切替確認/同時編集 | qa_fam_ocr(18) | ✅ |
| OCR | 読み取り/正規化/不正日付ブロック/確認画面 | qa_ocr_unit(16) | ✅ |
| Hoku | ローカル応答/loading/日次上限 | qa_3states | ✅ |
| プレミアム | 境界一元管理/訴求文言/サーバ権利優先 | qa_bill_*(21) | ✅ |
| 使い方ツアー | 19ステップ実演/初回選択 | qa_tour_*(21) | ✅ |
| エラー処理 | Error Boundary/オフライン/二重送信防止 | qa_errbound/netbanner/doublesubmit(28) | ✅ |
| 認証ガード | 未ログイン保護/?screenバイパス不可 | qa_authguard(7) | ✅ |
| 入力検証 | 不正ファイル拒否/XSSエスケープ | qa_fileval(16) | ✅ |

---

## 2. セキュリティ最終確認

### RLS（fl_family_data）— ローカルPostgres16で実証済み（docs/security-tests.sql）
- [x] 別家族のデータは SELECT/UPDATE/DELETE 一切不可
- [x] 私的キー（userProfile等）は家族にも漏れない（共有許可キーのみ）
- [x] user_id 偽装 INSERT は RLS 拒否
- [x] CHECK 制約で不正 family_id / 空 data_key を拒否

### 招待コード（fl_family_invites）— 検証済み（docs/supabase-invites-sql.sql）
- [x] 他家族の招待発行は拒否／使い捨て・期限切れで失効／被招待者は直接SELECT不可

### Storage — 現状未使用（base64をJSONB同期）
- [x] バケット未使用のため漏えい面なし。将来移行用ポリシーをdocs/supabase-storage-policy.sqlに用意

### プレミアム権利（fl_entitlements）— 検証済み（docs/supabase-entitlements-sql.sql）
- [x] クライアントからの premium 偽造（INSERT/UPDATE）は RLS 拒否。書き込みは service_role のみ

### シークレット
- [x] クライアントは anon/publishable キーのみ。service_role/sk-/OpenAIキー非搭載（機械検証済み）

### ⚠️ サーバ適用が必要（リリース前に本番Supabaseで実行）
- [ ] docs/supabase-setup-sql.sql（RLS・CHECK）を本番で Run
- [ ] docs/supabase-invites-sql.sql / supabase-entitlements-sql.sql / supabase-perf-indexes.sql を Run
- [ ] アプリの #qa-debug → 家族共有セルフテストで各レイヤー合格を確認

---

## 3. スマホ実機で確認すべき項目（手動・iPhone Safari）

### 表示・操作性
- [ ] iPhone SE幅(375px)/小型端末(320px)で横スクロールが出ない
- [ ] 月送り・ビュー切替・各＋ボタンが指で押しやすい（44px）
- [ ] カレンダーのメンバーフィルタで誰の予定か絞れる
- [ ] 終日トグルON/OFFで時刻欄が出入りする

### 主要フロー
- [ ] ログイン（メール＋パスワード / メールOTP）
- [ ] 家族を招待→別端末で参加→予定が同期される（本番Supabase適用後）
- [ ] 予定追加→カレンダー/ホームに反映
- [ ] 買い物追加→購入済み→履歴
- [ ] アルバムに写真追加→他の家族端末に表示（本番適用後）
- [ ] 予定表をカメラ読み取り→確認画面→登録

### 体験
- [ ] 初回起動でウェルカム→ツアー/スキップが選べる
- [ ] 実演ツアー19ステップでスポットライトがズレない
- [ ] 機内モードで「オフライン」バナー→復帰で自動同期
- [ ] 画面が万一壊れた時の復旧画面（落ち着いた文言＋再読み込み）
- [ ] 保存ボタン連打で重複作成されない

### 課金導線
- [ ] 無料上限到達時の訴求が押し付けがましくない
- [ ] プレミアム画面の「30日間無料」表記・解約導線

---

## 4. 未解決の既知課題と推奨対応

| 課題 | 重大度 | 推奨対応 |
|---|---|---|
| 招待トークン redeem のクライアント配線 | 中 | 本番SQL適用後、family_id直接共有→トークンredeemへ切替（C2完全クローズ） |
| OAuth(Google/Apple)実機未検証 | 中 | Supabaseダッシュボードでプロバイダ有効化＋Redirect URL登録＋実機往復（docs/commercial-release-blockers.md） |
| パスワード再設定の完了UI | 中 | メールリンク復帰後の新パスワード入力フォーム（暫定: OTPで代替可） |
| Edge Functionサーバ側レート制限 | 中 | per-userレート制限を追加（クライアント側はOCR月1-30/Hoku日次で抑止済み） |
| auth.users完全削除 | 低 | service_role Edge Functionで退会者削除（現状fl_family_data行は削除済み・メール再利用可） |
| LocalStorage 5MB制約（特に動画） | 低 | IndexedDB/Storage移行（将来・要人間確認）。現状は容量超過時ロールバックで安全 |
| board空状態がデモ再投入で未到達 | 低 | 仕様（新規ユーザーにデモ価値提示）。全削除でデモ復活する点のみ要判断 |

---

## 5. リリース可否の総合判定

詳細はセッション報告参照。クライアント品質・データ分離設計は**リリース可能水準**。
**前提条件**: 上記2の「サーバ適用が必要」項目を本番Supabaseで実行し、3の実機確認を完了すること。
