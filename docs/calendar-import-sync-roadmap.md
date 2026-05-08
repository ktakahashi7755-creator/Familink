# Familink カレンダー取り込み・同期 ロードマップ（Wave 40 / 2026-05-04）

**目的：** Google / iPhone / Yahoo / Outlook 等の外部カレンダーと Familink の予定連携を、現構成（依存ゼロ・GitHub Pages・LocalStorage）で可能な範囲と将来必要な技術を明確化し、段階的に実装する。

---

## 1. 現在のカレンダー連携状況

### 実装済み
- **Wave 25**：書き出し方向の最小実装
  - Google Calendar Add URL（`action=TEMPLATE` パラメータ、OAuth ゼロ）
  - RFC5545 ICS 書き出し（iPhone Safari は data URL、PC は Blob）
  - RRULE 変換（daily / weekdays / weekly / monthly）
  - 予定詳細 →「外部カレンダーに追加」ボタン
- **Wave 40（今回）**：取り込み方向の最小実装
  - .ics ファイル選択取込
  - .ics テキスト貼り付け取込
  - Vanilla JS 製 ICS パーサー（VEVENT / SUMMARY / DTSTART / DTEND / DESCRIPTION / LOCATION / UID / RRULE）
  - 取込前プレビュー + チェック選択
  - 重複候補検知（externalId / title+date+time）

### 未実装（v0.2 で対応予定 or 将来）
- Google Calendar API 双方向同期
- iPhone EventKit からの予定読み取り
- Yahoo / LINE カレンダー直接 API 連携
- 定期自動同期（バックグラウンド）
- 差分同期 / 競合解決

---

## 2. Web 版で「できること」「できないこと」

### ✅ できること（Phase 1：v0.2 / 現構成）
- ユーザーが選択した `.ics` ファイルを `<input type="file">` で読み込む
- ユーザーが貼り付けた ICS テキストをパースする
- Familink から予定を Add URL / .ics で書き出す
- ICS 形式のサブセット（VEVENT / 主要プロパティ）を Vanilla JS で解析
- 取込前にプレビューしてユーザーが選択
- 重複検知 + スキップ / 上書き
- LocalStorage に S.events として保存

### ❌ できないこと（現構成）
- **Google Calendar の自動読み取り** → OAuth 2.0 / Client Secret 管理が必要、GitHub Pages 単体では Secret を安全に保持できない
- **iPhone カレンダーの直接読み取り** → ブラウザに EventKit API は無い。iOS の WKWebView 経由 + Swift 側での CalendarKit 実装が必要
- **Yahoo カレンダーの API 連携** → 公式 API なし（2025 年現在 / LINE 統合検討中）
- **定期バックグラウンド同期** → Service Worker は使えるが OAuth/API キー管理ができないため意味がない
- **クロスデバイス同期** → バックエンド（Supabase/Firebase 等）が必要

---

## 3. Phase 1：v0.2 実装方針（今回 Wave 40）

### UI フロー
```
カレンダー画面ヘッダー
  → [取込] ボタン
    → m-ics-import モーダル
      ├ ① .ics ファイル選択（<input type=file>）
      ├ ② .ics テキスト貼り付け（<textarea>）
      ├ ③「解析してプレビュー」ボタン
      ├ ④ プレビュー一覧（チェックボックス + タイトル/日時/場所/メモ/重複警告）
      ├ ⑤「すべて選択 / すべて解除」
      └ ⑥「選択した予定を取り込む」
         → S.events.push or 既存上書き
         → renderCal()
         → toast「N 件を取り込みました」
```

### S.events 拡張フィールド（任意・後方互換）
```js
{
  id: "event_xxx",                 // 既存
  title: "スイミング",              // 既存
  date: "2026-05-04",              // 既存
  time: "18:00",                   // 既存
  endDate: "2026-05-04",           // ★ 新規（任意）
  endTime: "19:00",                // ★ 新規（任意）
  location: "プールセンター",       // ★ 新規（任意）
  member: "seio",                  // 既存
  color: "#4A90E2",                // 既存
  note: "",                        // 既存
  repeat: "weekly",                // 既存
  // ↓ ICS 取込時のみ追加
  source: "ics",                   // ★ "ics" | "manual"
  externalId: "uid_xxx@google.com",// ★ 重複検知用
  externalProvider: "google",      // ★ "google" | "apple" | "yahoo" | "outlook" | "unknown"
  importedAt: "2026-05-04T10:00:00Z",
  createdAt: "...",
  updatedAt: "..."
}
```

### 重複検知ロジック
1. `externalId` が既存と一致 → 重複候補
2. `title + date + time` が既存と一致 → 重複候補
3. UI で「⚠ 重複の可能性」表示、デフォルトでチェック外し
4. 取込実行時：重複は既存予定を **上書き**（ユーザーが選択した場合）

### ICS パーサーの対応範囲
- 折返し（CRLF + 行頭スペース）の連結
- VEVENT ブロック抽出
- プロパティパラメータ（`DTSTART;VALUE=DATE:` 等）のパース
- 日付形式：YYYYMMDD（終日）/ YYYYMMDDTHHMMSS（フローティング）/ YYYYMMDDTHHMMSSZ（UTC → ローカル変換）
- TZID 付きはローカルとして扱う（タイムゾーン変換は v1.0 以降で精緻化）
- RRULE：`FREQ=DAILY` / `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR` / `FREQ=WEEKLY` / `FREQ=MONTHLY` のみ簡易対応
- 不明プロパティは破棄
- PRODID からプロバイダ推定（google / apple / yahoo / outlook / familink）

### プライバシー説明（モーダル内に表示）
> Familink は、ユーザーが選択した .ics ファイルまたは貼り付けたカレンダーデータのみを読み込みます。Google / iPhone / Yahoo カレンダーを自動で読み取ることはありません。

---

## 4. Phase 2：v1.0（WKWebView ネイティブ化後）

### 目的
iPhone 標準カレンダー（Apple Calendar）との連携を強化。

### 構成
```
WKWebView ラッパー（Swift）
  ├─ Info.plist：NSCalendarsUsageDescription を追加
  ├─ ボタン押下 → JS bridge：nativeImportCalendar()
  ├─ Swift 側で EKEventStore.requestAccess(for: .event)
  ├─ 許可後、ユーザー選択カレンダー（家族 / 仕事 / 学校 等）を読み取り
  ├─ EKEvent[] → JSON 化（title/startDate/endDate/notes/location/...）
  └─ webView.evaluateJavaScript('nativeIcsBridgeReceive(...)')
     → Familink 既存 ICS 取込パイプラインへ注入
```

### 機能
- 端末内 iOS カレンダーから予定読み取り（読み取り専用）
- 取り込むカレンダーをユーザーが選択（家族・仕事 等）
- 自動同期 ON/OFF 設定
- 将来：Familink 予定を iPhone カレンダーへ書き戻し（双方向）

### 必要な作業
- WKWebView ラッパーアプリ作成（既に v1.0 計画済）
- `Info.plist` に `NSCalendarsUsageDescription` 追加
- App Store プライバシー宣言更新
- Swift 側 EventKit 実装
- JS bridge：`nativeImportCalendar()` / `nativeWriteCalendar(event)`
- ユーザー設定 UI：取り込みカレンダー選択 / 自動同期 ON/OFF
- プライバシーポリシー：「カレンダー読み取り権限を使用する目的」を明記

---

## 5. Phase 3：v1.5（OAuth + バックエンド導入後）

### 目的
Google Calendar / Outlook 365 等との本格双方向同期。

### 構成
```
Familink バックエンド（Cloudflare Worker / Supabase Edge Function）
  ↑↓ OAuth 2.0 トークン管理
Google Calendar API（または Microsoft Graph）
  ↑↓ 差分同期（incrementalSync token）
Familink クライアント（HTML / JS）
  → 定期同期 or 手動「同期」ボタン
```

### 機能
- Google Calendar OAuth 認可フロー（リダイレクト → トークン取得 → バックエンド保存）
- 定期同期（cron / on-demand）
- 差分取込（updated since last sync）
- 競合解決（last-write-wins / ユーザー選択）
- 同期ログ画面
- 連携解除（トークン削除）
- 外部カレンダー単位の表示 ON/OFF

### 必要な作業
- バックエンドサーバー構築（OAuth Secret を安全管理）
- Google Cloud Project / OAuth クライアント作成
- リダイレクト URI 登録
- Google API 利用規約確認（Calendar API v3）
- プライバシーポリシー：「サードパーティ連携と取得データ」を明記
- 法務レビュー（個人情報保護法 / 海外サーバー保管）

---

## 6. Yahoo カレンダーの考え方

- 公式 API：**なし**（2025 年現在）
- LINE カレンダーへの統合予告あり、仕様確定前
- 当面の方針：**ICS 書き出し / 取込で間接対応**
- v1.5 以降で API 公開された場合は対応検討

---

## 7. プレミアム機能化の可能性

### 無料プラン（v0.2 / Phase 1）
- ICS 取込 / 書き出し
- 月 10 件までの取り込み制限なし

### プレミアム（月額 480 円 / Phase 2 〜 3）
- iPhone カレンダー自動同期（v1.0）
- Google Calendar 双方向同期（v1.5）
- 複数カレンダーの色分け表示
- 同期ログ閲覧
- 月 100 件以上の自動取込

### 上位プラン候補（680 / 980 円）
- Outlook 365 同期
- 家族メンバー個別カレンダー連携
- 学校 / 自治体カレンダー（自動取込テンプレ）

---

## 8. 法務・プライバシー確認事項

### Phase 1（現構成）
- ユーザーが選択したファイルのみ読込 → 通常のファイル操作扱い、特別な許可不要
- 端末外への送信なし
- App Store プライバシー宣言：「データ収集なし」

### Phase 2（iPhone EventKit）
- カレンダー読み取り権限が必要 → `NSCalendarsUsageDescription` 必須
- 「家族予定を一元管理するため、カレンダー読み取りを許可してください」
- App Store プライバシー宣言：「カレンダーデータを使用するが収集しない」（端末内処理）

### Phase 3（Google OAuth）
- 個人情報保護法：第三者（Google）への情報提供にあたるか要確認
- プライバシーポリシー更新：取得項目 / 保管期間 / 削除手順 / 第三者提供
- Google API ユーザーデータポリシー遵守
- 海外サーバー保管時：越境移転の同意取得
- 法務レビュー必須

---

## 9. リスクと対策

### Phase 1（今回）
- **リスク**：壊れた ICS 入力で JS エラー → ユーザー UX 悪化
  - **対策**：パーサーを try/catch で囲み、不正項目はエラー一覧へ
- **リスク**：大量予定（1000 件以上）の取込でブラウザフリーズ
  - **対策**：プレビュー段階で件数表示、過大時は警告（Wave 41 候補）
- **リスク**：タイムゾーン誤変換で時刻ズレ
  - **対策**：Z（UTC）以外はローカル扱いと明示、v1.0 で精緻化

### Phase 2 / 3
- 権限取消時の挙動
- ネットワーク切断時の同期失敗
- 競合時の優先ルール

---

## 10. 段階別ロードマップサマリー

| Phase | バージョン | 機能 | 必要な技術基盤 |
|---|---|---|---|
| **1** | v0.2（現在） | .ics 書き出し / 取込 | 依存ゼロ Vanilla JS |
| 2 | v1.0（公開後 90 日） | iPhone カレンダー連携 | WKWebView + EventKit |
| 3 | v1.5（公開後 6〜9 ヶ月） | Google / Outlook 双方向同期 | OAuth + バックエンド |
| 4 | v2.0（12 ヶ月以降） | 学校 / 自治体テンプレ自動取込 | バックエンド + 提携 |

---

## 11. 検証指標

| 観点 | 指標 | 目標値 |
|---|---|---|
| 取込成功率 | プレビュー後の保存成功 | > 95% |
| 重複検知 | 重複予定の自動警告 | 100%（externalId 一致時） |
| パース対応率 | 主要プロバイダの ICS | Google / Apple / Outlook：> 95% |
| プライバシー | 外部送信件数 | 0（Phase 1） |
| 速度 | プレビュー表示まで | < 1 秒（100 件以下） |

---

## 12. 結論

- **Phase 1（v0.2 / Wave 40）**：依存ゼロで Google / Apple / Yahoo / Outlook の ICS を取込み可能。プライバシーは完全な端末内処理。
- **Phase 2 以降**：自動同期にはネイティブ化（v1.0）または OAuth + バックエンド（v1.5）が必須。段階的に拡張する。
- **Yahoo 直接 API 連携**：公式 API がない限り ICS 経由で対応継続。
- 既存 LocalStorage 構造を壊さずに `S.events` を拡張、後方互換維持。

「家族の予定を一元管理する」中核機能として、技術制約を踏まえた現実的なロードマップで段階実装を進める。

---

## ▼ Wave 64 追補（2026-05-08）— プロバイダ選択 UI / Hoku 取込ヘルプ

### A. m-ics-import モーダルを 3 ステップ化
- **select**：Google / Apple / Yahoo / ICS 直接の 4 択カードを表示（プライバシー説明を冒頭に固定）
- **provider**：選択肢別のガイダンス（手順 1〜4 + 完全自動同期の v1.0 注記）+ ファイル / テキスト入力 + プレビュー
- **done**：取込件数表示 + 「カレンダーを見る / 続けて取り込む」

### B. プロバイダ別ガイダンス（_icsProviderGuideHtml）
| プロバイダ | 主要メッセージ |
|---|---|
| google | エクスポートして取り込み / 自動同期は OAuth + バックエンドで v1.0 以降 |
| apple  | iCloud 公開 or 共有 / EventKit 直接連携は App Store 版 |
| yahoo  | ICS 書き出し / 完全同期は API 確認中 |
| ics    | 任意 .ics ファイル / 対応プロパティ列挙 |

### C. Hoku 連携：calendar_import_help intent
- 取り込み / 反映 / 読み込み 動詞 × カレンダー語 で発火
- entities.provider（google / apple / yahoo / ''）で応答を切替
- ACTION_BUTTONS:cal_import / cal_import_google / cal_import_apple / cal_import_yahoo の 4 種

### D. PRODID プロバイダ推定の優先順序を修正（バグ fix）
旧コードは `apple|icloud|mac|cal` で「YCalendar / Familink Calendar」が apple と誤判定されていた。
判定順を **google → yahoo → familink → outlook → apple** に変更（固有名詞優先）。
apple の正規表現も `cal` を外して `apple|icloud|ical` に。

### E. executeIcsImport の改善
- 選択中プロバイダで `externalProvider` を補正（unknown を google/apple/yahoo に）
- 取込後はモーダルを閉じず「done」ステップへ遷移（完了感 + 続行導線）

### F. テスト
新 `/tmp/ics-import.js` 57 件 PASS（パーサー / TZID / RRULE / エスケープ / 不正 / PRODID / Hoku intent / ACTION ボタン / ガイダンス）。
既存 21 スイート 631 件すべて PASS（退行ゼロ）。

合計 **688 / 688 PASS**。

### G. 実装ファイル
| 項目 | 場所 |
|---|---|
| 取込ボタン | `s-cal` ヘッダー（onclick=openIcsImportModal） |
| モーダル | `m-ics-import` の 3 ステップ |
| ステップ切替 | `setIcsImportStep(step)` |
| ガイダンス | `_icsProviderGuideHtml(step)` |
| Hoku intent | parseHokuIntent / executeHokuAction の calendar_import_help 分岐 |
| ACTION ボタン | classifierActions の cal_import / cal_import_google/apple/yahoo |
| 短文応答 | `HOKU_SHORT_REPLY.calendar_import_help` |
