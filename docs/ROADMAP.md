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
