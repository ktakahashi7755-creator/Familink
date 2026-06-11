# Familink: Web MVP → React Native 移行マッピング

正本 = `app-source/familink.html`（Vanilla JS / 単一 HTML / 28,000 行）。
本ドキュメントは、その完成済み MVP を React Native + Expo + TypeScript へ
移植するにあたっての設計判断と対応表をまとめる。

---

## 1. 設計思想の継承

| 項目 | Web MVP | RN 版 |
|---|---|---|
| ビジュアル言語 | Apple ネイティブ (iOS) 風 | 同左。`:root` の CSS 変数をそのまま `src/theme/tokens.ts` へ移植 |
| 主要カラー | `--primary #0A84FF` / `--secondary #34C759` / `--accent #FF9F0A` | `palette` に 1:1 で保持 |
| 角丸 | `--r-sm 10 / --r 16 / --r-lg 20 …` | `radius` トークン |
| 影 | `--s-sm / --s / --s-lg` | `shadow` トークン |
| フォント | system-ui (SF Pro / Hiragino / Noto) | iOS=system, Android=system |
| トーン | 優しい・温かい・安心感、子どもっぽくしすぎない | UI 文言・空状態メッセージで継承 |

---

## 2. 画面（Web の 22 screen → RN ルート）

Web は単一 HTML 内で `id="s-*"` の `<section>` を切り替え。RN は
expo-router のファイルベースルーティングへ再編。

| Web screen id | 役割 | RN ルート |
|---|---|---|
| `s-home` | ホーム | `app/(tabs)/index.tsx` |
| `s-cal` / `s-cdetail` | カレンダー / 予定詳細 | `app/(tabs)/calendar.tsx` + `app/event-edit.tsx` |
| `s-task` / `s-board` / `s-board-detail` | タスク / 家族ボード | `app/(tabs)/board.tsx`（セグメント切替） |
| `s-hoku` / `s-ch` | Hoku チャット | `app/(tabs)/hoku.tsx` |
| `s-settings` / `s-account` | 設定 | `app/(tabs)/settings.tsx` |
| `s-album` / `s-archive` | アルバム | `app/album.tsx` |
| `s-shopping` | 買い物リスト | `app/shopping.tsx` |
| `s-budget` | 家計 | `app/budget.tsx` |
| `s-health` | 体調記録 | `app/health.tsx` |
| `s-login` | ログイン | `app/login.tsx` |
| `s-onboard` / `s-ob` | オンボーディング | `app/onboarding.tsx` |
| `s-premium` | プレミアム | 設定内のカード（独立画面化は今後） |
| `s-prep` / `s-memo` / `s-custom-board` / `s-notif` | 準備 / メモ / カスタムボード / 通知 | **未移植（次フェーズ）** |

下タブは Web の主要導線に合わせ **ホーム / カレンダー / ボード / Hoku / 設定**
の 5 つ。家計・買い物・アルバム・体調はホームのクイックリンクと設定から遷移。

---

## 3. データモデル（`familink_v3` PERSIST → 型 + ストア）

Web は LocalStorage 単一キー `familink_v3` に 90+ キーを JSON 保存。
RN は `src/types/index.ts` に型を定義し、`src/store/useFamilyStore.ts`
（Zustand + persist）で `familink_v3:family` に永続化。

| Web キー | RN 型 / ストアフィールド |
|---|---|
| `events` | `FamilyEvent[]` / `events` |
| `tasks` / `kanbanCols` | `Task[]` / `tasks`, `KanbanColumn[]` |
| `txs` / `recurringTxs` | `Transaction[]` / `txs` |
| `posts` / `announces` | `BoardPost[]` / `posts` |
| `health` | `HealthRecord[]` / `health` |
| `shoppingItems` / `shoppingFrequent` / `shoppingHistory` | `ShoppingItem[]` / `shoppingItems` |
| `albumPhotos` / `albumFolders` / `faceGroups` | `AlbumPhoto[]` / `albumPhotos`, `AlbumFolder[]` |
| `members` | `Member[]` / `members` |
| `userProfile` / `account` | `UserProfile` / `profile` |
| `isPremiumUser` / `premiumPaid` / `trialStartedAt` | `PremiumState` / `premium` |
| `onboardCompleted` | `useAuthStore.onboarded` |
| `supaSession` / `familyId` | Supabase セッションは AsyncStorage が自動管理 |

> 写真は Web では base64/blob だったが、RN ではデバイスの `uri` を保持
> （メモリ効率・iPhone 写真アプリ品質）。

---

## 4. Supabase / 認証

- クライアント: `src/lib/supabase.ts`。Web と同じ URL / anon キー。
  AsyncStorage にセッション永続化、`autoRefreshToken: true`、
  `detectSessionInUrl: false`（RN は URL バーが無い）。
- 認証フロー: **メール OTP**（`signInWithOtp` → 6 桁コード → `verifyOtp`）。
  Web のマジックリンク/PKCE をモバイル向けに OTP へ。
- ローカルモード: 未ログインでも全機能利用可（`authMode: 'local'`）。Web の
  「端末内表示モード」の思想を継承。
- 家族共有: `familyChannelName(familyId)` = `familink_family_${familyId}`
  で Realtime チャンネル名を Web と統一（同期実装は次フェーズ）。

---

## 5. Hoku AI

- 契約は Web と同一: `supabase.functions.invoke('hoku', { body: { text, context, history } })`
  → `{ reply, intent, confidence, entities }`。
- OpenAI キーはサーバ（Edge Function 環境変数）のみ。クライアントに置かない。
- `intent`（`calendar_add` / `task_add` / `shopping_add` / `budget_add` …）を
  受けてチャット内に「追加する」ボタンを出し、確認のうえストアへ反映
  （Web の「確認フロー」を踏襲）。
- 未ログイン or 関数到達不可時は、`hokuClient.ts` のルールベース
  オフライン応答にフォールバック（予定/買い物/タスクの一覧読み上げ）。

---

## 6. 安全・品質（Web の不変条件を継承）

- 入力値は React のテキストノードとして描画（`innerHTML` 相当の危険挿入なし）。
- 削除はその場 toggle/削除アイコン。今後、全削除系には二段階確認を追加予定。
- 体調記録に「診断ではない / #7119」注意書きを常設。
- プレミアムは β 表記の方針を維持（実決済は未実装）。

---

## 7. 次フェーズ（未移植・今後の優先度）

1. **A**: 準備リスト (`s-prep`) / メモ (`s-memo`) / 通知 (`s-notif`, expo-notifications)
2. **A**: Supabase テーブル同期（events/tasks/… の push/pull + Realtime 反映）
3. **B**: カスタムボード (`s-custom-board`) / カレンダー週・日ビュー / 繰り返し予定の展開
4. **B**: アルバムのフォルダ / OCR インポート / 顔グループ
5. **C**: プレミアム実決済（App Store / Google Play 課金）、Hoku スキン/ショップ

> 既存 Web 版は引き続き「完成済み MVP」として保守。RN 版が App Store 品質に
> 達するまで、両者のデータモデル互換を保ち、移行ブリッジ（インポート）を検討する。
