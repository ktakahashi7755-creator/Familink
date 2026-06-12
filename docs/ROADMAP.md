# Familink セキュリティ・ロードマップ（Critical / High・データ分離）

対象: 家族ID外データへのアクセス遮断 / Storage / 認証 / シークレット / 入力検証
詳細な発見は `docs/AUDIT.md`、検証SQLは `docs/security-tests.sql` を参照。

## Critical
- [x] **C1 RLS 網羅・堅牢化** — fl_family_data の SELECT/INSERT/UPDATE/DELETE を
      家族ID外に一切アクセスさせない。CHECK 制約と明示ガードを追加し、検証SQLを残す。
- [~] **C2 招待コードの露出窓を閉じる**（機構=H3を納品/検証。クライアント実装はデプロイ後の後続） — family_id ベアラ問題への対策（→ H3 と一体）。
- [x] **C3 シークレットのクライアント露出ゼロ確認** — service_role / API キー非搭載を機械検証。

## High
- [x] **H1 Storage バケットポリシー** — 現状未使用（N/A）。将来移行用の RLS ひな型を用意。
- [x] **H2 ファイルアップロード検証** — 非画像/非動画/巨大ファイルを各入口で明示拒否。
- [x] **H3 招待コードの有効期限・使い捨て化** — fl_family_invites テーブル＋redeem RPC（SQL）。
- [x] **H4 セッション/未認証リダイレクト検証** — 未ログイン時に保護画面へ確実に戻ることを検証。

## 進め方
各タスク: 方針宣言 → 実装 → テスト（RLSは検証SQL、client は Playwright）→ バグ修正 →
チェック更新＆コミット。サーバ反映/実機が必要な項目は SQL/設計を納品し、その旨を明記。

---

# エラー処理・安定性（Error Handling & Stability）

詳細な状態は worklog 参照。基準: 落ち着いたエラー画面 / loading・empty・error の3状態 /
Supabase エラーの日本語共通化 / オフライン・リトライ導線 / 二重送信防止・ロールバック。

- [x] **E1 Error Boundary（画面レンダリング保護＋クラッシュ復旧画面）** —
      refresh(id) の各画面描画を try/catch で包み、失敗時は世界観に合う落ち着いた
      インライン・エラー（「もう一度試す」）を表示。致命時は全画面の復旧オーバーレイ
      （「再読み込み」）。本番でも有効化。
- [x] **E2 オフライン／通信失敗のリトライ導線** — online/offline 検知と、同期失敗時の
      落ち着いたバナー＋「再試行」。navigator.onLine と sync 失敗を可視化。
- [x] **E3 Supabase エラーの共通日本語ハンドラ徹底** — ユーザー向けは必ず _supaErr で
      日本語化し技術用語を出さない。同期失敗の握りつぶしを優しい通知に。
- [x] **E4 フォーム二重送信防止** — savePost/saveEvent/saveTaskEdit/saveTx/saveHealth/
      saveMemoEdit 等の保存に再入防止ロック（連打での重複作成を防ぐ）。
- [x] **E5 loading / empty / error の3状態整備** — 非同期（同期・AI・OCR）に loading と
      error、全リストに「次に何をすればいいか」が分かる empty を担保（不足分を補完）。

