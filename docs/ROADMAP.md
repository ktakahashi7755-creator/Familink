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

---

# カレンダー商用品質化（Calendar Polish）

世界観厳守（装飾絵文字なし・ラインアイコン・落ち着いた配色・余白・44pxタップ領域）。

- [x] **CAL-1 終日（all-day）予定サポート** — 予定モーダルに「終日」トグル。ONで時刻欄を隠し
      allDay:true / time:'' で保存。月・週・リスト・ホームで「終日」表示。
- [x] **CAL-2 タップ領域44px化** — 月送り(.cal-mn-btn 30×36)・ビュー切替(.cal-vtab h34)・
      連携/今日ピル(h31) を 44px に（::before オーバーレイで見た目維持）。
- [x] **CAL-3 メンバーフィルタ** — カレンダーに家族メンバーのフィルタチップを追加し、
      色分けと連動。誰の予定かを絞り込める（task画面の tkVisibleMembers と同思想）。
- [x] **CAL-4 データ整合性ガード** — 削除済み予定の参照・同時編集での欠落を安全化
      （存在しないIDの編集/削除を握りつぶしクラッシュさせない）。



---

# プレミアム課金導線（Monetization）

- [x] **BILL-1 機能境界の一元管理** — 無料/プレミアムの境界（件数制限・OCR/Hoku回数・テーマ・広告）を
      単一の PREMIUM 設定に集約し、isPremium() を唯一の判定アクセサにする。
- [x] **BILL-2 訴求文言の品質** — 押し付けがましくなく価値が伝わる文言（世界観維持・装飾なし）。
- [x] **BILL-3 サーバ側での課金状態検証** — クライアント任せにせず、fl_entitlements で
      サーバが書き込んだ権利をクライアントは読むだけ（RLSで偽造不可）。SQL納品＋ローカル検証。

---

# パフォーマンス（Performance）

- [ ] **PERF-1 バンドル/依存の点検** — 単一HTML構成（npm依存ゼロ・CDNはSupabase/Fontsのみ）を確認し、
      不要依存・重い処理を点検。非同期/遅延読み込みで初期表示を軽量化。
- [ ] **PERF-2 画像の遅延読み込み・リサイズ** — アルバム等の img に loading="lazy"、取り込み時リサイズ確認。
- [ ] **PERF-3 Supabaseクエリ見直し** — N+1・不要カラム・インデックス。fetchの列指定とインデックスSQL。
- [ ] **PERF-4 モバイル計測（PERF.md）** — 計測（Lighthouse 不可環境では Playwright 指標）を
      改善前後で docs/PERF.md に記録。
