# 05. 同期・リアルタイム・競合解決 設計

家族の「リアルタイムに共有できる」体験の中核。**データを絶対に失わない**ことを最優先に設計する。

## 5.1 同期モデル（俯瞰）
- **保存トリガ**：`saveS()` 後に 1.5s デバウンスで `_pushToSupabase()`。書きすぎを抑制。
- **取得トリガ**：ログイン直後 / 20秒ポーリング / フォーカス復帰 / オンライン復帰 / Realtime通知 → `_fetchFromSupabase()`。
- **手動操作なし**：クラウド送信/取得ボタンは撤去済み（完全自動）。状態は同期ドット（synced/syncing/error/offline）で提示。

## 5.2 送信 `_pushToSupabase()`
- `SYNC_KEYS` を `fl_family_data(user_id, family_id, data_key, payload, updated_at)` の**自分の行**に upsert（`onConflict: user_id,data_key`）。
- 20件バッチ・指数バックオフ最大3回リトライ。`_deletions` を先頭に置き、削除トゥームストーンが最初のバッチで必ず送られる（削除の耐久性）。
- 直近 push 時刻 `_lastPushAt` を記録（Realtime の echo 抑制に使用）。

## 5.3 取得＋マージ `_fetchFromSupabase()`
1. 自分＋家族（`family_id`）の行を取得（`family_id` があれば家族全員分、無ければ自分の user_id 分）。
2. `data_key` ごとに、複数メンバーの行を **行の `updated_at` 昇順（古→新）** に整列。
3. まず `_deletions` を全メンバー分 union マージ（`_mergeDeletions`・最新時刻優先）。
4. 各キー：
   - 共有キーは家族全員の行を、個人固有キーは自分の行のみを採用。
   - 配列 → `_mergeSyncArray(local, cloud)` を行ごとに適用（LWW）。トゥームストーンで削除済み項目を除外。
   - 非配列 → 最新 `updated_at` の値で上書き。
5. 内容重複を `_dedupByContent()` で畳む。
6. **実際に変わった時だけ** `saveS()` ＋再描画（無変更の再描画/再送を防止＝ポーリング空振り対策）。
7. 家族の members を取り込んだら `applyMembersFromS()` でピッカー/アバターを再構築。
8. 入力中モーダルがある/閲覧専用画面では再描画を見送り、次の遷移で自然に最新化（入力消失・チラつき防止）。

## 5.4 競合解決アルゴリズム（純関数・テスト済み）
### 5.4.1 LWW マージ `_mergeSyncArray(localArr, cloudArr)`
- `ts(x)=Date.parse(x.updatedAt||updated_at||createdAt||created_at)||0`。
- cloud を id で index → local を、`ts(local) > ts(cloud)` のときだけ上書き。
- 結果：ローカルのみ/クラウドのみは保持、両方あれば新しい方（同点はクラウド＝行の新しさで決着）。
- **重要**：予定/家計/タスク/体調は編集時に `updatedAt`（フルISO）を打刻するため、**「押した順」ではなく「編集した時刻」でLWWが決まる**。

### 5.4.2 削除トゥームストーン
- 削除時 `_recordDeletion(key, id)` → `S._deletions[key][id] = ISO時刻`。同期で家族へ伝播。
- `_isTombstoned(key, item)`：`tombTs >= itemTs` のときだけ削除優先。
  → **削除後に編集された項目は残る**（itemが新しければ復活）。**編集より後に削除されたら消える**。
- `_mergeDeletions(into, incoming)`：id ごとに最新時刻を採用（union）。
- `_gcDeletions()`：30日TTLで肥大化防止（端末が30日以上オフラインだと復活し得る＝許容）。

### 5.4.3 内容重複排除 `_dedupByContent()`
- カスタムボードは intent/名前で正規化し、配下項目の boardId を生存ボードへ付け替え（孤立防止）。
- 内容シグネチャ（例：予定=title|date|time|member、買い物=name|qty|section|memo）で2件目以降を除去。
- 差分（数量など）はシグネチャに含むため**別物は残す**（誤消し防止）。

## 5.5 リアルタイム購読 `startRealtimeSync()`
- `sb.channel('familink_sync_<uid8>_<rand>').on('postgres_changes', {event:'*', table:'fl_family_data'}, …)`。
- **echo 抑制**：`payload.new.user_id === 自分` かつ `|updated_at - _lastPushAt| < 3s` は無視（自分の書き込みで再取得しない）。
- 他者変更 → 800ms デバウンスで `_fetchFromSupabase()`。
- 購読状態：
  - `SUBSCRIBED` → 同期ドット synced ＋ 直後に再取得（取りこぼし防止）。
  - `CHANNEL_ERROR/TIMED_OUT/CLOSED` → wanted かつオンライン/ログイン中なら**指数バックオフ**で再購読（最大30s）＋再取得。
- `stopRealtimeSync(keepWanted)` でチャンネルを畳む。オンライン/オフラインイベントで駆動。

## 5.6 家族参加フロー（招待）
- 招待リンク：発行者が `?join=<code>` 付きURLを送る → 受信者が開く → `?join=` を捕捉しURLから除去→保留 → ログイン後 `_processPendingJoin()` で family に参加 → 家族同期開始。
- 招待コード：`m-supa-invite` にコード入力で参加。
- 参加時は fetch→push を回し、双方向に同期。

## 5.7 障害時の振る舞い
- オフライン：ローカルで全機能継続。復帰時に自動再取得＋Realtime再購読。
- 同期失敗バナー：**セッション中1回だけ**自動表示（`_netErrNotified`）。以降は赤ドットで静かに提示。自動リトライは継続。
- 保存失敗（容量超過）：通知＋ロールバック（メモリにだけ残してリロードで消える事故を防ぐ）。

## 5.8 検証（回帰テスト）
- `tools/qa_sync_merge_test.js`（22件）：LWW/トゥームストーン/union/GC/重複排除/繰り返し/2端末シナリオを実コードで検証（全緑）。
- `tools/qa_autosync_test.js` / `qa_cloudfirst_login_test.js` / `qa_invite_link_test.js` / `qa_invite_token_test.js` / `qa_e2e_flow_test.js`。
- **本番実機2台での end-to-end** は本番Supabaseでの最終確認事項（ロジック・モックは全緑）。

## 5.9 スケール上の留意（将来）
- Realtime は現状 `fl_family_data` 全変更を購読→RLSで自family分のみ取得（他家族の書き込みでも再取得が走る＝無駄トリガ）。
  規模拡大時は family_id フィルタ/専用チャンネル/サーバ側ファンアウトへ移行余地。
- 大きな配列（写真等）は行分割やStorage移行で payload 肥大を回避する余地。
